import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock
import httpx
import pytest
from fastapi import FastAPI, HTTPException
from backend.book_quiz import create_book_quiz_router


class Cursor:
    def __init__(self, rows): self.rows = rows
    def sort(self, *a): return self
    async def to_list(self, n): return self.rows


@pytest.fixture
def book_api():
    user = {'id': 's', 'nome': 'Aluna Leitora', 'role': 'student', 'turma': '7º ANO'}
    store = {'progress': 50, 'cert': None, 'attempts': []}
    quiz = {'book_id': 'b', 'perguntas': [{'texto': f'P{i}', 'opcoes': ['A', 'B', 'C'], 'correta': 1} for i in range(10)]}

    async def cert_find(query, projection=None): return dict(store['cert']) if store['cert'] else None
    async def cert_insert(doc): store['cert'] = doc
    async def attempt_insert(doc): store['attempts'].append(doc)
    async def progress_find(*a, **k): return {'percentage': store['progress']}

    db = SimpleNamespace(
        books=SimpleNamespace(find_one=AsyncMock(return_value={'id': 'b', 'titulo': 'Livro', 'autor': 'Autora'})),
        book_quizzes=SimpleNamespace(find_one=AsyncMock(return_value=quiz), update_one=AsyncMock(), delete_one=AsyncMock()),
        reading_progress=SimpleNamespace(find_one=AsyncMock(side_effect=progress_find)),
        book_quiz_attempts=SimpleNamespace(find=lambda *a, **k: Cursor([{'percentual': x['percentual'], 'enviado_em': x['enviado_em']} for x in store['attempts']]), insert_one=AsyncMock(side_effect=attempt_insert)),
        certificates=SimpleNamespace(find_one=AsyncMock(side_effect=cert_find), insert_one=AsyncMock(side_effect=cert_insert), find=lambda *a, **k: Cursor([store['cert']] if store['cert'] else [])),
    )

    async def current(): return user
    async def staff():
        if user['role'] not in ('teacher', 'admin'): raise HTTPException(403)
        return user

    app = FastAPI()
    app.include_router(create_book_quiz_router(db, current, staff))

    def request(method, path, **kw):
        async def run():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as c:
                return await c.request(method, path, **kw)
        return asyncio.run(run())
    return request, user, store


def test_quiz_locked_until_book_is_finished(book_api):
    req, _, store = book_api
    data = req('GET', '/books/b/quiz').json()
    assert data['disponivel'] and not data['liberado'] and data['perguntas'] == []
    assert req('POST', '/books/b/quiz/answers', json={'respostas': [1] * 10}).status_code == 409
    store['progress'] = 100
    data = req('GET', '/books/b/quiz').json()
    assert data['liberado'] and len(data['perguntas']) == 10
    assert all('correta' not in q for q in data['perguntas'])


def test_seventy_percent_issues_certificate_once(book_api):
    req, _, store = book_api
    store['progress'] = 100
    failed = req('POST', '/books/b/quiz/answers', json={'respostas': [1] * 6 + [0] * 4}).json()
    assert failed['percentual'] == 60 and not failed['aprovado'] and store['cert'] is None
    passed = req('POST', '/books/b/quiz/answers', json={'respostas': [1] * 7 + [0] * 3}).json()
    assert passed['aprovado'] and passed['certificado']['percentual'] == 70
    assert store['cert']['user_nome'] == 'Aluna Leitora' and store['cert']['book_titulo'] == 'Livro'
    assert req('POST', '/books/b/quiz/answers', json={'respostas': [1] * 10}).status_code == 409
    pdf = req('GET', '/books/b/certificate')
    assert pdf.status_code == 200 and pdf.content.startswith(b'%PDF')


def test_only_staff_edits_and_answers_are_validated(book_api):
    req, user, store = book_api
    payload = {'perguntas': [{'texto': 'P', 'opcoes': ['A', 'B'], 'correta': 0}]}
    assert req('PUT', '/admin/books/b/quiz', json=payload).status_code == 403
    store['progress'] = 100
    assert req('POST', '/books/b/quiz/answers', json={'respostas': [1, 1]}).status_code == 422
    user['role'] = 'teacher'
    assert req('PUT', '/admin/books/b/quiz', json=payload).status_code == 200
    assert req('POST', '/books/b/quiz/answers', json={'respostas': [1] * 10}).status_code == 403
