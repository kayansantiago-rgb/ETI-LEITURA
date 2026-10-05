import asyncio
import zipfile
from types import SimpleNamespace
from unittest.mock import AsyncMock
import httpx
from fastapi import FastAPI, HTTPException
from backend.backup_api import create_backup_router, token_ok

TOKEN = 'x' * 40


def fake_backup(target, include_files):
    with zipfile.ZipFile(target, 'w') as z:
        z.writestr('manifest.json', '{"version": 1}')
    return {'collections': {'users': 3}, 'arquivos': include_files}


def make_app(role='admin'):
    db = SimpleNamespace(backup_log=SimpleNamespace(insert_one=AsyncMock()))

    async def current(credentials):
        if credentials.credentials != 'valid':
            raise HTTPException(401, 'Token inválido')
        return {'id': 'u', 'nome': 'Coordenação', 'role': role}

    app = FastAPI()
    app.include_router(create_backup_router(db, current, make_backup=fake_backup))
    return app, db


def get(app, headers=None, path='/admin/backup'):
    async def go():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://t') as c:
            return await c.get(path, headers=headers or {})
    return asyncio.run(go())


def test_token_must_be_long_and_match(monkeypatch):
    monkeypatch.setenv('BACKUP_TOKEN', 'curto')
    assert not token_ok('curto')
    monkeypatch.setenv('BACKUP_TOKEN', TOKEN)
    assert token_ok(TOKEN) and not token_ok('y' * 40) and not token_ok('')


def test_github_token_downloads_zip(monkeypatch):
    monkeypatch.setenv('BACKUP_TOKEN', TOKEN)
    app, db = make_app()
    r = get(app, {'X-Backup-Token': TOKEN})
    assert r.status_code == 200 and r.headers['content-type'] == 'application/zip'
    assert r.content[:2] == b'PK'
    assert db.backup_log.insert_one.await_args.args[0]['por'] == 'github'


def test_only_admin_or_token(monkeypatch):
    monkeypatch.setenv('BACKUP_TOKEN', TOKEN)
    assert get(make_app()[0]).status_code == 403
    assert get(make_app()[0], {'X-Backup-Token': 'errado'}).status_code == 403
    assert get(make_app('teacher')[0], {'Authorization': 'Bearer valid'}).status_code == 403
    assert get(make_app('admin')[0], {'Authorization': 'Bearer valid'}).status_code == 200
