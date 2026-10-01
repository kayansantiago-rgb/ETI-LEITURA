import asyncio
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock
import httpx
from fastapi import FastAPI
import backend.reading as reading


def iso(days_ago):
    return (reading.today() - timedelta(days=days_ago)).isoformat()


def test_streak_counts_consecutive_days_until_today_or_yesterday():
    assert reading.streaks([iso(0), iso(1), iso(2), iso(5)]) == (3, 3)
    assert reading.streaks([iso(1), iso(2)]) == (2, 2)
    assert reading.streaks([iso(2), iso(3), iso(4), iso(5)]) == (0, 4)
    assert reading.streaks([]) == (0, 0)


def test_medals_progress():
    earned = {m['id']: m for m in reading.medals(total_pages=520, best=7, finished=1, certificates=0)}
    assert earned['sequencia-7']['conquistada'] and not earned['sequencia-30']['conquistada']
    assert earned['paginas-500']['conquistada'] and earned['livro-1']['conquistada']
    assert earned['certificado-1']['atual'] == 0


def test_only_forward_pages_are_counted():
    db = SimpleNamespace(reading_days=SimpleNamespace(update_one=AsyncMock()))
    asyncio.run(reading.record_page(db, 's', 5, 4))
    asyncio.run(reading.record_page(db, 's', 5, 5))
    assert db.reading_days.update_one.await_count == 0
    asyncio.run(reading.record_page(db, 's', 5, 6))
    asyncio.run(reading.record_page(db, 's', None, 1))
    assert db.reading_days.update_one.await_count == 2


class Cursor:
    def __init__(self, rows): self.rows = rows
    def __aiter__(self):
        async def gen():
            for r in self.rows: yield r
        return gen()
    async def to_list(self, n): return self.rows


def test_ranking_orders_class_and_marks_student():
    user = {'id': 'a', 'nome': 'Ana', 'role': 'student', 'turma': '7º ANO'}
    students = [{'id': 'a', 'nome': 'Ana'}, {'id': 'b', 'nome': 'Bruno'}, {'id': 'c', 'nome': 'Caio'}]
    days = [{'user_id': 'a', 'dia': iso(0), 'paginas': 30}, {'user_id': 'b', 'dia': iso(1), 'paginas': 10}, {'user_id': 'b', 'dia': iso(0), 'paginas': 5}]
    finished = [{'_id': 'b', 'n': 1}]
    db = SimpleNamespace(
        users=SimpleNamespace(find=lambda *a, **k: Cursor(students)),
        reading_days=SimpleNamespace(find=lambda *a, **k: Cursor(days)),
        reading_progress=SimpleNamespace(aggregate=lambda *a, **k: Cursor(finished)),
        certificates=SimpleNamespace(aggregate=lambda *a, **k: Cursor([])),
    )

    async def current(): return user
    app = FastAPI()
    app.include_router(reading.create_reading_router(db, current))

    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as c:
            return await c.get('/reading/ranking?turma=8º ANO')
    data = asyncio.run(run()).json()
    assert data['turma'] == '7º ANO'
    assert [r['nome'] for r in data['alunos']] == ['Bruno', 'Ana', 'Caio']
    bruno, ana, caio = data['alunos']
    assert bruno['pontos'] == 115 and bruno['sequencia'] == 2
    assert ana['voce'] and ana['posicao'] == 2 and caio['pontos'] == 0
