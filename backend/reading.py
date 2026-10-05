"""Sequência de leitura, meta diária, medalhas e ranking de leitores da turma."""
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

BRASILIA = timezone(timedelta(hours=-3))
DEFAULT_GOAL = 10


def today():
    return datetime.now(BRASILIA).date()


class Goal(BaseModel):
    paginas_dia: int = Field(ge=1, le=200)


class Reminder(BaseModel):
    ativo: bool


async def record_page(db, user_id, previous_page, page):
    """Conta uma página lida no dia quando o aluno avança no leitor (voltar não conta)."""
    if previous_page is not None and page <= previous_page:
        return
    await db.reading_days.update_one(
        {'user_id': user_id, 'dia': today().isoformat()},
        {'$inc': {'paginas': 1}, '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )


def streaks(days):
    """Retorna (sequência atual, melhor sequência) a partir das datas com leitura."""
    dates = sorted({date.fromisoformat(d) for d in days})
    best = run = 0
    previous = None
    for d in dates:
        run = run + 1 if previous and d - previous == timedelta(days=1) else 1
        best = max(best, run)
        previous = d
    current = 0
    if dates and today() - dates[-1] <= timedelta(days=1):
        current, cursor = 0, dates[-1]
        lookup = set(dates)
        while cursor in lookup:
            current += 1
            cursor -= timedelta(days=1)
    return current, best


def medals(total_pages, best, finished, certificates):
    items = [
        ('primeira-pagina', 'Primeira página', 'Começou a ler na plataforma', total_pages, 1),
        ('sequencia-3', 'Em ritmo', '3 dias seguidos lendo', best, 3),
        ('sequencia-7', 'Semana de leitor', '7 dias seguidos lendo', best, 7),
        ('sequencia-30', 'Leitor imparável', '30 dias seguidos lendo', best, 30),
        ('livro-1', 'Primeiro livro', 'Terminou o primeiro livro', finished, 1),
        ('livro-5', 'Devorador de livros', 'Concluiu 5 livros', finished, 5),
        ('paginas-500', '500 páginas', 'Leu 500 páginas na plataforma', total_pages, 500),
        ('certificado-1', 'Certificado!', 'Conquistou o primeiro certificado', certificates, 1),
        ('certificado-3', 'Mestre da compreensão', 'Conquistou 3 certificados', certificates, 3),
    ]
    return [{'id': key, 'titulo': title, 'descricao': text, 'atual': min(value, target), 'meta': target, 'conquistada': value >= target} for key, title, text, value, target in items]


async def reading_profile(db, user_id):
    days = await db.reading_days.find({'user_id': user_id}, {'_id': 0, 'dia': 1, 'paginas': 1}).to_list(5000)
    finished = await db.reading_progress.count_documents({'user_id': user_id, 'percentage': {'$gte': 100}})
    certificates = await db.certificates.count_documents({'user_id': user_id})
    return days, finished, certificates


async def earned_medals(db, user_id):
    """Ids das medalhas que o aluno já conquistou."""
    days, finished, certificates = await reading_profile(db, user_id)
    by_day = {d['dia']: d.get('paginas', 0) for d in days}
    _, best = streaks(by_day)
    return {m['id'] for m in medals(sum(by_day.values()), best, finished, certificates) if m['conquistada']}


def create_reading_router(db, current):
    router = APIRouter()

    async def profile(user_id):
        return await reading_profile(db, user_id)

    @router.get('/reading/stats')
    async def stats(user=Depends(current)):
        days, finished, certificates = await profile(user['id'])
        by_day = {d['dia']: d.get('paginas', 0) for d in days}
        current_streak, best = streaks(by_day)
        total = sum(by_day.values())
        goal = (await db.reading_goals.find_one({'user_id': user['id']}) or {}).get('paginas_dia', DEFAULT_GOAL)
        start = today() - timedelta(days=6)
        week = [{'dia': (start + timedelta(days=i)).isoformat(), 'paginas': by_day.get((start + timedelta(days=i)).isoformat(), 0)} for i in range(7)]
        return {
            'sequencia': current_streak,
            'melhor_sequencia': best,
            'paginas_hoje': by_day.get(today().isoformat(), 0),
            'meta_paginas': goal,
            'paginas_total': total,
            'semana': week,
            'livros_concluidos': finished,
            'certificados': certificates,
            'medalhas': medals(total, best, finished, certificates),
            'lembrete_leitura': user.get('lembrete_leitura') is not False,
        }

    @router.put('/reading/goal')
    async def set_goal(data: Goal, user=Depends(current)):
        await db.reading_goals.update_one({'user_id': user['id']}, {'$set': {'paginas_dia': data.paginas_dia}}, upsert=True)
        return {'meta_paginas': data.paginas_dia}

    @router.put('/reading/reminder')
    async def set_reminder(data: Reminder, user=Depends(current)):
        await db.users.update_one({'id': user['id']}, {'$set': {'lembrete_leitura': data.ativo}})
        return {'lembrete_leitura': data.ativo}

    @router.get('/reading/ranking')
    async def ranking(turma: str = None, user=Depends(current)):
        if user['role'] == 'student':
            turma = user.get('turma')
        elif user['role'] == 'teacher' and turma not in user.get('turmas', []):
            turma = (user.get('turmas') or [None])[0]
        if not turma:
            raise HTTPException(400, 'Escolha uma turma.')
        students = await db.users.find({'role': 'student', 'turma': turma}, {'_id': 0, 'id': 1, 'nome': 1, 'moldura': 1, 'titulo': 1, 'avatar_url': 1}).to_list(2000)
        ids = [s['id'] for s in students]
        since = (today() - timedelta(days=29)).isoformat()
        days = {}
        async for row in db.reading_days.find({'user_id': {'$in': ids}, 'dia': {'$gte': (today() - timedelta(days=90)).isoformat()}}, {'_id': 0}):
            days.setdefault(row['user_id'], {})[row['dia']] = row.get('paginas', 0)
        finished, certs = {}, {}
        async for row in db.reading_progress.aggregate([{'$match': {'user_id': {'$in': ids}, 'percentage': {'$gte': 100}}}, {'$group': {'_id': '$user_id', 'n': {'$sum': 1}}}]):
            finished[row['_id']] = row['n']
        async for row in db.certificates.aggregate([{'$match': {'user_id': {'$in': ids}}}, {'$group': {'_id': '$user_id', 'n': {'$sum': 1}}}]):
            certs[row['_id']] = row['n']
        from backend.account import REWARD_BY_ID
        titles = {k: r['nome'] for k, r in REWARD_BY_ID.items()}
        rows = []
        for s in students:
            mine = days.get(s['id'], {})
            pages = sum(v for d, v in mine.items() if d >= since)
            row = {
                'nome': s['nome'],
                'moldura': s.get('moldura'),
                'titulo': titles.get(s.get('titulo')),
                'avatar_url': s.get('avatar_url'),
                'livros': finished.get(s['id'], 0),
                'certificados': certs.get(s['id'], 0),
                'paginas_mes': pages,
                'sequencia': streaks(mine)[0],
                'voce': s['id'] == user['id'],
            }
            # Livros concluídos pesam mais que páginas; certificados premiam a compreensão.
            row['pontos'] = row['livros'] * 100 + row['certificados'] * 50 + pages
            rows.append(row)
        rows.sort(key=lambda r: (-r['pontos'], r['nome'].casefold()))
        position, previous = 0, None
        for index, row in enumerate(rows, 1):
            if row['pontos'] != previous:
                position = index
            previous = row['pontos']
            row['posicao'] = position
        return {'turma': turma, 'alunos': rows}

    return router


async def ensure_indexes(db):
    await db.reading_days.create_index([('user_id', 1), ('dia', 1)], unique=True)
    await db.reading_goals.create_index('user_id', unique=True)
