"""Turmas da escola: lista guardada no banco (coleção `turmas`) e gerenciada pela coordenação.

As validações espalhadas pelo projeto usam `activities.CLASSES` (set com 'TODAS') e
`server.ALL_CLASSES` (lista). Os dois objetos são atualizados no lugar por `refresh`, então
uma turma criada ou excluída vale na hora para todo o servidor.
"""
import re
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.activities import CLASSES

DEFAULT_CLASSES = [
    ('7º ANO', 'FUNDAMENTAL'), ('8º ANO', 'FUNDAMENTAL'), ('9º ANO', 'FUNDAMENTAL'),
    ('1º SÉRIE A', 'MÉDIO'), ('1º SÉRIE B', 'MÉDIO'), ('2º SÉRIE', 'MÉDIO'), ('2º SÉRIE A', 'MÉDIO'),
    ('2º SÉRIE B', 'MÉDIO'), ('3º SÉRIE A', 'MÉDIO'), ('3º SÉRIE B', 'MÉDIO'),
]
LEVEL_LABEL = {'FUNDAMENTAL': 'Ensino Fundamental', 'MÉDIO': 'Ensino Médio', 'AMBOS': ''}

NAMES = [name for name, _ in DEFAULT_CLASSES]   # mesma lista usada como server.ALL_CLASSES
LEVELS = dict(DEFAULT_CLASSES)


def order(name):
    """Ordena 7º, 8º, 9º ANO antes de 1ª a 3ª SÉRIE; turmas novas fora do padrão vão para o fim."""
    upper = name.upper()
    number = re.match(r'\d+', upper)
    stage = 0 if 'ANO' in upper else 1 if 'SÉRIE' in upper else 2
    return (stage, int(number.group()) if number else 99, name)


def as_option(doc):
    level = LEVEL_LABEL.get(doc.get('nivel'), '')
    return {'value': doc['nome'], 'label': f"{doc['nome']} - {level}" if level else doc['nome'], 'nivel': doc.get('nivel', 'AMBOS')}


async def refresh(db):
    docs = sorted(await db.turmas.find({}, {'_id': 0}).to_list(1000), key=lambda d: order(d['nome']))
    NAMES[:] = [d['nome'] for d in docs]
    LEVELS.clear()
    LEVELS.update({d['nome']: d.get('nivel', 'AMBOS') for d in docs})
    CLASSES.clear()
    CLASSES.update({'TODAS', *NAMES})
    return docs


async def ensure_classes(db):
    """Na primeira execução copia as turmas fixas antigas (e as que já existirem nos alunos) para o banco."""
    await db.turmas.create_index('nome', unique=True)
    if not await db.turmas.count_documents({}):
        now = datetime.now(timezone.utc).isoformat()
        known = dict(DEFAULT_CLASSES)
        for turma in await db.users.distinct('turma', {'role': 'student'}):
            if turma and turma not in known:
                known[turma] = 'AMBOS'
        await db.turmas.insert_many([{'nome': n, 'nivel': lvl, 'created_at': now} for n, lvl in known.items()])
    await refresh(db)


def level_of(turma):
    return LEVELS.get(turma, 'AMBOS')


class ClassCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=40)
    nivel: Literal['FUNDAMENTAL', 'MÉDIO', 'AMBOS'] = 'AMBOS'


class StudentMove(BaseModel):
    turma: str = Field(min_length=1, max_length=40)


def clean_name(value):
    name = re.sub(r'\s+', ' ', value).strip().upper()
    if not name or name == 'TODAS' or '/' in name:
        raise HTTPException(422, 'Use um nome de turma válido, por exemplo "1º SÉRIE C".')
    return name


def create_classes_router(db, admin):
    router = APIRouter()

    @router.get('/classes')
    async def list_classes():
        # Público: a tela de criar conta precisa da lista.
        return [as_option(d) for d in await refresh(db)]

    @router.get('/admin/classes')
    async def manage(user=Depends(admin)):
        docs = await refresh(db)
        students = {r['_id']: r['n'] async for r in db.users.aggregate([
            {'$match': {'role': 'student'}}, {'$group': {'_id': '$turma', 'n': {'$sum': 1}}}])}
        teachers = {r['_id']: r['n'] async for r in db.users.aggregate([
            {'$match': {'role': 'teacher'}}, {'$unwind': '$turmas'}, {'$group': {'_id': '$turmas', 'n': {'$sum': 1}}}])}
        return [{**as_option(d), 'alunos': students.get(d['nome'], 0), 'professores': teachers.get(d['nome'], 0)} for d in docs]

    @router.post('/admin/classes', status_code=201)
    async def create(data: ClassCreate, user=Depends(admin)):
        name = clean_name(data.nome)
        if any(n.casefold() == name.casefold() for n in NAMES):
            raise HTTPException(409, f'A turma {name} já existe.')
        doc = {'nome': name, 'nivel': data.nivel, 'created_at': datetime.now(timezone.utc).isoformat(), 'criada_por': user['id']}
        await db.turmas.insert_one(dict(doc))
        await refresh(db)
        return {**as_option(doc), 'alunos': 0, 'professores': 0}

    @router.delete('/admin/classes/{nome}', status_code=204)
    async def remove(nome: str, user=Depends(admin)):
        if nome not in NAMES:
            raise HTTPException(404, 'Turma não encontrada.')
        students = await db.users.count_documents({'role': 'student', 'turma': nome})
        if students:
            plural = 'aluno' if students == 1 else 'alunos'
            raise HTTPException(409, f'A turma {nome} tem {students} {plural}. Mude os alunos de turma antes de excluir.')
        await db.turmas.delete_one({'nome': nome})
        # Professores e livros deixam de apontar para a turma excluída.
        await db.users.update_many({'role': 'teacher', 'turmas': nome}, {'$pull': {'turmas': nome}})
        await db.books.update_many({'turmas': nome}, {'$pull': {'turmas': nome}})
        await refresh(db)

    @router.put('/admin/students/{student_id}/turma')
    async def move_student(student_id: str, data: StudentMove, user=Depends(admin)):
        if data.turma not in NAMES:
            raise HTTPException(422, 'Turma não encontrada.')
        result = await db.users.update_one({'id': student_id, 'role': 'student'}, {'$set': {'turma': data.turma}})
        if not result.matched_count:
            raise HTTPException(404, 'Aluno não encontrado.')
        return {'turma': data.turma}

    return router
