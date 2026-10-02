"""Questionário de compreensão ao final de cada livro e certificado de leitura."""
import asyncio
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field, model_validator
from pymongo.errors import DuplicateKeyError

PASSING = 70


def stamp():
    return datetime.now(timezone.utc).isoformat()


class BookQuestion(BaseModel):
    texto: str = Field(min_length=1, max_length=2000)
    opcoes: list[str] = Field(min_length=2, max_length=4)
    correta: int = Field(ge=0, le=3)

    @model_validator(mode='after')
    def valid(self):
        if not self.texto.strip() or any(not o.strip() or len(o) > 500 for o in self.opcoes) or self.correta >= len(self.opcoes):
            raise ValueError('Preencha a pergunta, as alternativas e escolha a resposta correta.')
        return self


class BookQuizIn(BaseModel):
    perguntas: list[BookQuestion] = Field(min_length=1, max_length=30)


class BookQuizAnswers(BaseModel):
    respostas: list[int] = Field(min_length=1, max_length=30)


def create_book_quiz_router(db, current, staff):
    router = APIRouter()

    async def book_or_404(book_id):
        book = await db.books.find_one({'id': book_id}, {'_id': 0, 'id': 1, 'titulo': 1, 'autor': 1})
        if not book:
            raise HTTPException(404, 'Livro não encontrado.')
        return book

    async def progress_of(user, book_id):
        row = await db.reading_progress.find_one({'user_id': user['id'], 'book_id': book_id}, {'_id': 0, 'percentage': 1})
        return row['percentage'] if row else 0

    def public_certificate(cert):
        return {k: cert[k] for k in ('codigo', 'percentual', 'emitido_em')} if cert else None

    @router.get('/books/{book_id}/quiz')
    async def get_quiz(book_id: str, user=Depends(current)):
        await book_or_404(book_id)
        quiz = await db.book_quizzes.find_one({'book_id': book_id}, {'_id': 0})
        if user['role'] != 'student':
            return {'perguntas': quiz['perguntas'] if quiz else [], 'atualizado_em': quiz.get('atualizado_em') if quiz else None, 'minimo': PASSING}
        progress = await progress_of(user, book_id)
        attempts = await db.book_quiz_attempts.find({'user_id': user['id'], 'book_id': book_id}, {'_id': 0, 'percentual': 1, 'enviado_em': 1}).sort('enviado_em', -1).to_list(100)
        cert = await db.certificates.find_one({'user_id': user['id'], 'book_id': book_id}, {'_id': 0})
        released = bool(quiz) and progress >= 100
        return {
            'disponivel': bool(quiz),
            'liberado': released,
            'progresso': progress,
            'total': len(quiz['perguntas']) if quiz else 0,
            # O gabarito nunca é enviado ao aluno.
            'perguntas': [{'texto': q['texto'], 'opcoes': q['opcoes']} for q in quiz['perguntas']] if released and not cert else [],
            'tentativas': len(attempts),
            'melhor': max((a['percentual'] for a in attempts), default=None),
            'ultima': attempts[0] if attempts else None,
            'aprovado': bool(cert),
            'certificado': public_certificate(cert),
            'minimo': PASSING,
        }

    @router.put('/admin/books/{book_id}/quiz')
    async def save_quiz(book_id: str, data: BookQuizIn, user=Depends(staff)):
        await book_or_404(book_id)
        doc = {'book_id': book_id, 'perguntas': [q.model_dump() for q in data.perguntas], 'atualizado_em': stamp(), 'atualizado_por': user['nome']}
        await db.book_quizzes.update_one({'book_id': book_id}, {'$set': doc}, upsert=True)
        return {'ok': True, 'total': len(data.perguntas)}

    @router.delete('/admin/books/{book_id}/quiz', status_code=204)
    async def delete_quiz(book_id: str, user=Depends(staff)):
        await db.book_quizzes.delete_one({'book_id': book_id})

    @router.post('/books/{book_id}/quiz/answers')
    async def answer(book_id: str, data: BookQuizAnswers, user=Depends(current)):
        if user['role'] != 'student':
            raise HTTPException(403, 'Somente alunos respondem o questionário.')
        book = await book_or_404(book_id)
        quiz = await db.book_quizzes.find_one({'book_id': book_id}, {'_id': 0})
        if not quiz:
            raise HTTPException(404, 'Este livro ainda não tem questionário.')
        if await progress_of(user, book_id) < 100:
            raise HTTPException(409, 'Termine a leitura do livro para liberar o questionário.')
        if await db.certificates.find_one({'user_id': user['id'], 'book_id': book_id}):
            raise HTTPException(409, 'Você já foi aprovado neste questionário.')
        questions = quiz['perguntas']
        if len(data.respostas) != len(questions) or any(a < 0 or a >= len(q['opcoes']) for a, q in zip(data.respostas, questions)):
            raise HTTPException(422, 'Responda todas as perguntas.')
        hits = sum(a == q['correta'] for a, q in zip(data.respostas, questions))
        percent = round(hits * 100 / len(questions))
        passed = percent >= PASSING
        await db.book_quiz_attempts.insert_one({'user_id': user['id'], 'book_id': book_id, 'respostas': data.respostas, 'acertos': hits, 'total': len(questions), 'percentual': percent, 'aprovado': passed, 'enviado_em': stamp()})
        cert = None
        if passed:
            cert = {
                'id': secrets.token_hex(8), 'codigo': secrets.token_hex(5).upper(),
                'user_id': user['id'], 'user_nome': user['nome'], 'user_turma': user.get('turma'),
                'book_id': book_id, 'book_titulo': book['titulo'], 'book_autor': book.get('autor') or '',
                'percentual': percent, 'acertos': hits, 'total': len(questions), 'emitido_em': stamp(),
            }
            try:
                await db.certificates.insert_one(cert.copy())
            except DuplicateKeyError:
                cert = await db.certificates.find_one({'user_id': user['id'], 'book_id': book_id}, {'_id': 0})
        return {'acertos': hits, 'total': len(questions), 'percentual': percent, 'aprovado': passed, 'minimo': PASSING, 'certificado': public_certificate(cert)}

    @router.get('/books/{book_id}/certificate')
    async def certificate(book_id: str, user=Depends(current)):
        cert = await db.certificates.find_one({'user_id': user['id'], 'book_id': book_id}, {'_id': 0})
        if not cert:
            raise HTTPException(404, 'Certificado não encontrado.')
        from backend.certificate_pdf import build_certificate
        content = await asyncio.to_thread(build_certificate, cert)
        slug = ''.join(c if c.isalnum() else '-' for c in cert['book_titulo'].lower())[:40].strip('-')
        return Response(content, media_type='application/pdf', headers={'Content-Disposition': f'attachment; filename="certificado-{slug}.pdf"'})

    @router.get('/admin/books/overview')
    async def overview(user=Depends(staff)):
        # Indicadores por livro para a tela de gestão do acervo.
        result = {}
        async def add(collection, match, field):
            async for row in db[collection].aggregate([{'$match': match}, {'$group': {'_id': '$book_id', 'n': {'$sum': 1}}}]):
                result.setdefault(row['_id'], {})[field] = row['n']
        await add('reading_progress', {'percentage': {'$gt': 0}}, 'leitores')
        await add('reading_progress', {'percentage': {'$gte': 100}}, 'concluidos')
        await add('certificates', {}, 'certificados')
        async for quiz in db.book_quizzes.find({}, {'_id': 0, 'book_id': 1, 'perguntas': 1}):
            result.setdefault(quiz['book_id'], {})['perguntas'] = len(quiz.get('perguntas', []))
        return result

    @router.get('/certificates/verify/{code}')
    async def verify(code: str):
        # Público (aberto pelo QR code do PDF): confirma o certificado sem expor dados além do necessário.
        if not code.isalnum() or len(code) > 20:
            raise HTTPException(404, 'Certificado não encontrado.')
        cert = await db.certificates.find_one({'codigo': code.upper()}, {'_id': 0})
        if not cert:
            raise HTTPException(404, 'Certificado não encontrado.')
        parts = cert['user_nome'].split()
        name = parts[0] + (f' {parts[-1][0]}.' if len(parts) > 1 else '')
        return {'valido': True, 'aluno': name, 'turma': cert.get('user_turma'), 'livro': cert['book_titulo'], 'autor': cert.get('book_autor'),
                'percentual': cert['percentual'], 'emitido_em': cert['emitido_em'], 'codigo': cert['codigo']}

    @router.get('/certificates')
    async def my_certificates(user=Depends(current)):
        return await db.certificates.find({'user_id': user['id']}, {'_id': 0, 'user_id': 0}).sort('emitido_em', -1).to_list(500)

    return router


async def ensure_indexes(db):
    await db.book_quizzes.create_index('book_id', unique=True)
    await db.certificates.create_index([('user_id', 1), ('book_id', 1)], unique=True)
    await db.certificates.create_index('codigo')
    await db.book_quiz_attempts.create_index([('user_id', 1), ('book_id', 1)])
