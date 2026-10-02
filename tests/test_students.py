import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock
import httpx
from fastapi import FastAPI
from backend.students import create_students_router


class Cursor:
    def __init__(self, rows): self.rows = rows
    def sort(self, *a): return self
    async def to_list(self, n): return self.rows


def collection(rows=(), one=None):
    return SimpleNamespace(find=lambda *a, **k: Cursor(list(rows)), find_one=AsyncMock(return_value=one), count_documents=AsyncMock(return_value=3))


def make_db(teacher_scope=True):
    student = {'id': 's', 'nome': 'Ana Souza', 'turma': '7º ANO'}

    async def users_find_one(query, *a):
        if 'turma' in query and not teacher_scope:
            return None
        return student

    return SimpleNamespace(
        users=SimpleNamespace(find_one=users_find_one),
        books=collection([{'id': 'b', 'titulo': 'Dom Casmurro'}]),
        activities=collection([{'id': 'a1', 'titulo': 'Leitura 1', 'valor_nota': 5}]),
        quizzes=collection([{'id': 'q', 'titulo': 'Quiz'}]),
        reading_progress=collection([{'book_id': 'b', 'percentage': 100, 'updated_at': '2026-09-01'}]),
        activity_submissions=collection([{'activity_id': 'a1', 'nota': 4, 'tentativa': 1}]),
        summaries=collection([{'id': 'r', 'book_id': 'b', 'nota': 8}]),
        text_productions=collection([]),
        quiz_attempts=collection([{'quiz_id': 'q', 'acertos': 3, 'total': 4, 'enviado_em': '2026-09-02'}]),
        certificates=collection([{'book_titulo': 'Dom Casmurro', 'percentual': 90, 'codigo': 'X'}]),
        reading_days=collection([{'dia': '2020-01-01', 'paginas': 40}]),
    )


def get(db, role):
    app = FastAPI()
    app.include_router(create_students_router(db, lambda: {'id': 't', 'role': role, 'turmas': ['7º ANO']}))

    async def go():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://t') as client:
            return await client.get('/admin/students/s/history')
    return asyncio.run(go())


def test_history_summarizes_student():
    res = get(make_db(), 'admin')
    assert res.status_code == 200
    body = res.json()
    assert body['aluno']['nome'] == 'Ana Souza'
    assert body['resumo']['media'] == 8.0  # 4/5 -> 8 e resumo 8
    assert body['resumo']['livros_concluidos'] == 1 and body['resumo']['paginas_lidas'] == 40
    assert body['atividades'][0]['titulo'] == 'Leitura 1' and body['quizzes'][0]['titulo'] == 'Quiz'
    assert body['resumos'][0]['titulo'] == 'Dom Casmurro'


def test_teacher_cannot_open_student_outside_classes():
    assert get(make_db(teacher_scope=False), 'teacher').status_code == 404
    assert get(make_db(), 'teacher').status_code == 200
