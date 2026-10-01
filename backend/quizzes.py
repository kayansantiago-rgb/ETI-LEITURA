"""Quizzes por turma, com correção no servidor e uma entrega por aluno."""
from datetime import datetime, timezone, timedelta
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
    perguntas: list[QuizQuestion] = Field(min_length=1, max_length=50)
    nota_maxima: float = Field(default=10, gt=0, le=100)
    segundos: int = Field(default=0, ge=0, le=600)

    @model_validator(mode='after')
    def valid_settings(self):
        if not self.titulo.strip() or 0 < self.segundos < 5:
            raise ValueError('Informe um título e pelo menos 5 segundos quando houver temporizador.')
        return self


class QuizAnswers(BaseModel):
    respostas: list[int] = Field(min_length=1, max_length=50)


class TimedAnswer(BaseModel):
    indice: int = Field(ge=0, le=49)
    resposta: int = Field(ge=-1, le=3)


def grade_answers(quiz, answers):
    if len(answers) != len(quiz['perguntas']) or any(type(a) is not int or a < 0 or a >= len(q['opcoes']) for a, q in zip(answers, quiz['perguntas'])):
        raise HTTPException(422, 'Responda todas as perguntas com uma alternativa válida.')
    return sum(a == q['correta'] for a, q in zip(answers, quiz['perguntas']))


def create_quiz_router(db, current, staff):
    router = APIRouter()

    def scope(user):
        if user['role'] == 'student':
            return {'turma': user.get('turma'), 'rascunho': {'$ne': True}}
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
        quiz = {**data.model_dump(), 'id': str(uuid4()), 'professor_id': user['id'], 'aberto': False, 'rascunho': True, 'total': len(data.perguntas), 'criado_em': datetime.now(timezone.utc).isoformat()}
        await db.quizzes.insert_one(quiz.copy())
        return quiz

    @router.put('/quizzes/{id}')
    async def edit(id: str, data: QuizCreate, user=Depends(staff)):
        quiz = await find(id, user)
        if not quiz.get('rascunho'):
            raise HTTPException(409, 'Somente rascunhos podem ser editados.')
        from backend.activities import CLASSES
        if data.turma not in CLASSES - {'TODAS'} or (user['role'] == 'teacher' and data.turma not in user.get('turmas', [])):
            raise HTTPException(403, 'Turma não permitida.')
        result = await db.quizzes.update_one({'id': id, 'rascunho': True}, {'$set': {**data.model_dump(), 'total': len(data.perguntas)}})
        if not result.matched_count:
            raise HTTPException(409, 'Este quiz já foi publicado.')
        return {'ok': True}

    @router.post('/quizzes/{id}/publish')
    async def publish(id: str, user=Depends(staff)):
        await find(id, user)
        result = await db.quizzes.update_one({'id': id, 'rascunho': True}, {'$set': {'rascunho': False, 'aberto': True, 'publicado_em': datetime.now(timezone.utc).isoformat()}})
        if not result.matched_count:
            raise HTTPException(409, 'Este quiz não é um rascunho.')
        return {'ok': True}

    @router.delete('/quizzes/{id}', status_code=204)
    async def remove(id: str, user=Depends(staff)):
        quiz = await find(id, user)
        await db.quiz_attempts.delete_many({'quiz_id': id})
        await db.quizzes.delete_one({'id': id})

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

    @router.get('/quizzes/{id}/ranking')
    async def ranking(id: str, user=Depends(current)):
        quiz = await find(id, user)
        if user['role'] == 'student' and not await db.quiz_attempts.find_one({'_id': f"{id}:{user['id']}"}):
            raise HTTPException(403, 'Conclua o quiz para ver o ranking.')
        attempts = await db.quiz_attempts.find({'quiz_id': id}, {'_id': 0, 'user_id': 1, 'nome': 1, 'acertos': 1, 'total': 1}).to_list(None)
        attempts.sort(key=lambda a: (-a['acertos'], a.get('nome', '').casefold()))
        rows, previous, position = [], None, 0
        for index, attempt in enumerate(attempts, 1):
            if attempt['acertos'] != previous:
                position = index
            previous = attempt['acertos']
            rows.append({'posicao': position, 'nome': attempt['nome'], 'acertos': attempt['acertos'], 'total': attempt['total'], 'voce': attempt['user_id'] == user['id']})
        return {'participantes': rows, 'encerrado': not quiz['aberto']}

    @router.post('/quizzes/{id}/answers')
    async def submit(id: str, data: QuizAnswers, user=Depends(current)):
        if user['role'] != 'student':
            raise HTTPException(403, 'Somente alunos podem responder.')
        quiz = await find(id, user)
        if not quiz['aberto']:
            raise HTTPException(409, 'Este quiz foi encerrado.')
        if quiz.get('segundos'):
            raise HTTPException(409, 'Use o modo temporizado para responder.')
        score = grade_answers(quiz, data.respostas)
        attempt = {'_id': f"{id}:{user['id']}", 'quiz_id': id, 'user_id': user['id'], 'nome': user['nome'], 'respostas': data.respostas, 'acertos': score, 'nota': round(score / len(quiz['perguntas']) * quiz.get('nota_maxima', 10), 2), 'total': len(quiz['perguntas']), 'enviado_em': datetime.now(timezone.utc).isoformat()}
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

    async def timed_result(quiz, session, user):
        if session['indice'] < len(quiz['perguntas']):
            return {k: v for k, v in session.items() if k != '_id'}
        score = sum(a == q['correta'] for a, q in zip(session['respostas'], quiz['perguntas']))
        result = {'_id': session['_id'], 'quiz_id': quiz['id'], 'user_id': user['id'], 'nome': user['nome'], 'respostas': session['respostas'], 'acertos': score, 'total': len(quiz['perguntas']), 'nota': round(score / len(quiz['perguntas']) * quiz.get('nota_maxima', 10), 2), 'enviado_em': datetime.now(timezone.utc).isoformat()}
        try:
            await db.quiz_attempts.insert_one(result)
        except DuplicateKeyError:
            pass
        return {'concluido': True}

    @router.post('/quizzes/{id}/start')
    async def start(id: str, user=Depends(current)):
        quiz = await find(id, user)
        if user['role'] != 'student' or not quiz.get('segundos') or not quiz['aberto']:
            raise HTTPException(409, 'Este quiz temporizado não está disponível.')
        key = f"{id}:{user['id']}"
        if await db.quiz_attempts.find_one({'_id': key}):
            return {'concluido': True}
        session = {'_id': key, 'indice': 0, 'respostas': [], 'limite': (datetime.now(timezone.utc) + timedelta(seconds=quiz['segundos'])).isoformat()}
        try:
            await db.quiz_sessions.insert_one(session.copy())
        except DuplicateKeyError:
            session = await db.quiz_sessions.find_one({'_id': key})
        return await timed_result(quiz, session, user)

    @router.post('/quizzes/{id}/step')
    async def timed_step(id: str, data: TimedAnswer, user=Depends(current)):
        quiz = await find(id, user)
        if user['role'] != 'student' or not quiz.get('segundos') or not quiz['aberto']:
            raise HTTPException(409, 'Quiz indisponível.')
        key = f"{id}:{user['id']}"
        session = await db.quiz_sessions.find_one({'_id': key})
        if not session or session['indice'] != data.indice or data.indice >= len(quiz['perguntas']):
            raise HTTPException(409, 'Atualize a pergunta para continuar.')
        if data.resposta >= len(quiz['perguntas'][data.indice]['opcoes']):
            raise HTTPException(422, 'Alternativa inválida.')
        expired = datetime.now(timezone.utc) >= datetime.fromisoformat(session['limite'])
        if data.resposta == -1 and not expired:
            raise HTTPException(409, 'A pergunta ainda está aberta.')
        next_session = {**session, 'indice': data.indice + 1, 'respostas': [*session['respostas'], -1 if expired else data.resposta], 'limite': (datetime.now(timezone.utc) + timedelta(seconds=quiz['segundos'])).isoformat()}
        result = await db.quiz_sessions.update_one({'_id': key, 'indice': data.indice}, {'$set': {k: v for k, v in next_session.items() if k != '_id'}})
        if not result.matched_count:
            raise HTTPException(409, 'Esta pergunta já foi respondida.')
        return await timed_result(quiz, next_session, user)

    return router
