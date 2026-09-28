"""Quizzes por turma, com correção no servidor e uma entrega por aluno."""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
from pymongo.errors import DuplicateKeyError


class QuizQuestion(BaseModel):
    texto: str = Field(min_length=1, max_length=2000)
    opcoes: list[str] = Field(min_length=2, max_length=4)
    correta: int = Field(ge=0, le=3)

    @model_validator(mode='after')
    def valid(self):
        if not self.texto.strip() or any(not o.strip() or len(o) > 500 for o in self.opcoes) or self.correta >= len(self.opcoes):
            raise ValueError('Preencha a pergunta, as alternativas e escolha uma resposta correta.')
        return self


class QuizCreate(BaseModel):
    titulo: str = Field(min_length=1, max_length=160)
    turma: str
    perguntas: list[QuizQuestion] = Field(min_length=1, max_length=20)


class QuizAnswers(BaseModel):
    respostas: list[int] = Field(min_length=1, max_length=20)


def grade_answers(quiz, answers):
    if len(answers) != len(quiz['perguntas']) or any(type(a) is not int or a < 0 or a >= len(q['opcoes']) for a, q in zip(answers, quiz['perguntas'])):
        raise HTTPException(422, 'Responda todas as perguntas com uma alternativa válida.')
    return sum(a == q['correta'] for a, q in zip(answers, quiz['perguntas']))


def create_quiz_router(db, current, staff):
    router = APIRouter()

    def scope(user):
        if user['role'] == 'student':
            return {'turma': user.get('turma')}
        return {} if user['role'] == 'admin' else {'professor_id': user['id']}

    async def find(id, user):
        quiz = await db.quizzes.find_one({'id': id, **scope(user)}, {'_id': 0})
        if not quiz:
            raise HTTPException(404, 'Quiz não encontrado.')
        return quiz

    @router.get('/quizzes')
    async def listing(user=Depends(current)):
        return await db.quizzes.find(scope(user), {'_id': 0, 'perguntas': 0}).sort('criado_em', -1).to_list(1000)

    @router.post('/quizzes', status_code=201)
    async def create(data: QuizCreate, user=Depends(staff)):
        from backend.activities import CLASSES
        if data.turma not in CLASSES - {'TODAS'} or (user['role'] == 'teacher' and data.turma not in user.get('turmas', [])):
            raise HTTPException(403, 'Escolha uma turma atribuída a você.')
        if not data.titulo.strip():
            raise HTTPException(422, 'Informe o título.')
        quiz = {**data.model_dump(), 'id': str(uuid4()), 'professor_id': user['id'], 'aberto': True, 'total': len(data.perguntas), 'criado_em': datetime.now(timezone.utc).isoformat()}
        await db.quizzes.insert_one(quiz.copy())
        return quiz

    @router.get('/quizzes/{id}')
    async def detail(id: str, user=Depends(current)):
        quiz = await find(id, user)
        if user['role'] == 'student':
            attempt = await db.quiz_attempts.find_one({'_id': f"{id}:{user['id']}"}, {'_id': 0})
            quiz['resultado'] = attempt
            if not attempt:
                quiz['perguntas'] = [{k: v for k, v in q.items() if k != 'correta'} for q in quiz['perguntas']]
        else:
            quiz['resultados'] = await db.quiz_attempts.find({'quiz_id': id}, {'_id': 0}).to_list(10000)
        return quiz

    @router.post('/quizzes/{id}/answers')
    async def submit(id: str, data: QuizAnswers, user=Depends(current)):
        if user['role'] != 'student':
            raise HTTPException(403, 'Somente alunos podem responder.')
        quiz = await find(id, user)
        if not quiz['aberto']:
            raise HTTPException(409, 'Este quiz foi encerrado.')
        score = grade_answers(quiz, data.respostas)
        attempt = {'_id': f"{id}:{user['id']}", 'quiz_id': id, 'user_id': user['id'], 'nome': user['nome'], 'respostas': data.respostas, 'acertos': score, 'total': len(quiz['perguntas']), 'enviado_em': datetime.now(timezone.utc).isoformat()}
        try:
            await db.quiz_attempts.insert_one(attempt.copy())
        except DuplicateKeyError:
            raise HTTPException(409, 'Você já respondeu este quiz.')
        return {k: v for k, v in attempt.items() if k != '_id'}

    @router.post('/quizzes/{id}/close')
    async def close(id: str, user=Depends(staff)):
        await find(id, user)
        await db.quizzes.update_one({'id': id}, {'$set': {'aberto': False}})
        return {'ok': True}

    return router
