"""Regressões de autorização, sem conexão com um banco real."""
import asyncio
import importlib
import os
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import jwt
import pytest

os.environ['MONGO_URL'] = 'mongodb://127.0.0.1:27017'
os.environ['DB_NAME'] = 'eti_leitura_test'
os.environ['JWT_SECRET'] = 'test-only-secret-with-more-than-32-characters'
server = importlib.import_module('backend.server')


def request(method, path, **kwargs):
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=server.app), base_url='http://test') as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(run())


def test_public_registration_cannot_create_admin(monkeypatch):
    users = SimpleNamespace(find_one=AsyncMock(return_value=None), insert_one=AsyncMock())
    monkeypatch.setattr(server, 'db', SimpleNamespace(users=users))
    monkeypatch.setattr(server, 'get_password_hash', lambda value: 'test-hash')
    response = request('POST', '/api/auth/register', json={
        'email': 'student@example.com', 'password': 'student-password',
        'nome': 'Aluno', 'turma': '7º ANO', 'role': 'admin', 'aceite_termos': True,
    })
    assert response.status_code == 200
    assert response.json()['user']['role'] == 'student'
    assert users.insert_one.call_args.args[0]['role'] == 'student'


def test_registration_requires_terms(monkeypatch):
    users = SimpleNamespace(find_one=AsyncMock(return_value=None), insert_one=AsyncMock())
    monkeypatch.setattr(server, 'db', SimpleNamespace(users=users))
    response = request('POST', '/api/auth/register', json={
        'email': 'student@example.com', 'password': 'student-password', 'nome': 'Aluno', 'turma': '7º ANO',
    })
    assert response.status_code == 400
    users.insert_one.assert_not_called()


def test_admin_payload_does_not_bypass_required_class(monkeypatch):
    users = SimpleNamespace(find_one=AsyncMock(return_value=None), insert_one=AsyncMock())
    monkeypatch.setattr(server, 'db', SimpleNamespace(users=users))
    response = request('POST', '/api/auth/register', json={
        'email': 'student@example.com', 'password': 'student-password', 'nome': 'Aluno', 'role': 'admin',
    })
    assert response.status_code == 400
    users.insert_one.assert_not_called()


@pytest.mark.parametrize('token', ['malformed-token', jwt.encode({'sub': 'missing'}, 'different-test-secret-with-32-characters', algorithm='HS256')])
def test_invalid_token_returns_401(token):
    response = request('GET', '/api/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 401


@pytest.mark.parametrize('endpoint', ['/api/books', '/api/admin/books'])
def test_student_cannot_add_book(endpoint):
    async def student():
        return {'id': 'student', 'role': 'student'}
    server.app.dependency_overrides[server.get_current_user] = student
    try:
        response = request('POST', endpoint, json={
            'titulo': 'Teste', 'autor': 'Autor', 'descricao': 'Livro', 'capa_url': '/cover.jpg',
        })
        assert response.status_code == 403
    finally:
        server.app.dependency_overrides.clear()
