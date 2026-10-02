import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock
import httpx
import pytest
from fastapi import FastAPI
import backend.account as account

SECRET = 'test-secret-with-at-least-32-characters!!'
CLASSES = ['7º ANO', '8º ANO']


def public(doc):
    return {'id': doc['id'], 'nome': doc['nome'], 'role': doc.get('role', 'student')}


def make_app(db, user=None, verifier=None):
    app = FastAPI()
    current = lambda: user or {'id': 's', 'nome': 'Ana', 'role': 'student', 'turma': '7º ANO'}
    app.include_router(account.create_account_router(
        db, current, current, public, lambda u: 'token-' + u['id'], lambda p: 'hash', SECRET, CLASSES,
        verifier=verifier or (lambda c: {'email': 'ana@escola.com', 'nome': 'Ana Lima', 'foto': None, 'sub': 'g1'})))
    return app


def call(app, method, path, **kw):
    async def go():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://t') as c:
            return await c.request(method, path, **kw)
    return asyncio.run(go())


def test_google_login_existing_account(monkeypatch):
    monkeypatch.setenv('GOOGLE_CLIENT_ID', 'cid')
    users = SimpleNamespace(find_one=AsyncMock(return_value={'id': 'u1', 'nome': 'Ana', 'email': 'ana@escola.com'}), update_one=AsyncMock())
    r = call(make_app(SimpleNamespace(users=users)), 'POST', '/auth/google', json={'credential': 'x' * 30})
    assert r.status_code == 200 and r.json()['access_token'] == 'token-u1'
    users.update_one.assert_awaited()  # guarda o vínculo com a conta Google


def test_google_new_account_needs_class_and_terms(monkeypatch):
    monkeypatch.setenv('GOOGLE_CLIENT_ID', 'cid')
    monkeypatch.delenv('GOOGLE_ALLOWED_DOMAINS', raising=False)
    users = SimpleNamespace(find_one=AsyncMock(return_value=None), insert_one=AsyncMock())
    app = make_app(SimpleNamespace(users=users))
    first = call(app, 'POST', '/auth/google', json={'credential': 'x' * 30}).json()
    assert first['novo'] and first['email'] == 'ana@escola.com'
    no_terms = call(app, 'POST', '/auth/google/register', json={'cadastro_token': first['cadastro_token'], 'turma': '7º ANO'})
    assert no_terms.status_code == 400
    bad_class = call(app, 'POST', '/auth/google/register', json={'cadastro_token': first['cadastro_token'], 'turma': 'X', 'aceite_termos': True})
    assert bad_class.status_code == 400
    ok = call(app, 'POST', '/auth/google/register', json={'cadastro_token': first['cadastro_token'], 'turma': '7º ANO', 'aceite_termos': True})
    assert ok.status_code == 200
    saved = users.insert_one.await_args.args[0]
    assert saved['role'] == 'student' and saved['termos_versao'] == account.TERMS_VERSION and saved['turma'] == '7º ANO'


def test_google_domain_restriction(monkeypatch):
    monkeypatch.setenv('GOOGLE_CLIENT_ID', 'cid')
    monkeypatch.setenv('GOOGLE_ALLOWED_DOMAINS', 'estudante.ifto.edu.br')
    users = SimpleNamespace(find_one=AsyncMock(return_value=None))
    r = call(make_app(SimpleNamespace(users=users)), 'POST', '/auth/google', json={'credential': 'x' * 30})
    assert r.status_code == 403


def test_forged_signup_token_rejected():
    r = call(make_app(SimpleNamespace(users=SimpleNamespace())), 'POST', '/auth/google/register',
             json={'cadastro_token': 'forjado-' * 5, 'turma': '7º ANO', 'aceite_termos': True})
    assert r.status_code == 401


@pytest.mark.parametrize('choice,status', [('moldura-ouro', 403), ('moldura-lavanda', 200), ('titulo-explorador', 400), ('nao-existe', 400)])
def test_style_requires_unlocked_reward(monkeypatch, choice, status):
    monkeypatch.setattr(account, 'earned_medals', AsyncMock(return_value={'primeira-pagina'}))
    users = SimpleNamespace(update_one=AsyncMock())
    r = call(make_app(SimpleNamespace(users=users)), 'PUT', '/auth/me/style', json={'moldura': choice})
    assert r.status_code == status


def test_teacher_cannot_self_request_deletion():
    app = make_app(SimpleNamespace(deletion_requests=SimpleNamespace()), user={'id': 't', 'nome': 'Prof', 'role': 'teacher'})
    assert call(app, 'POST', '/auth/me/deletion-request', json={}).status_code == 400
