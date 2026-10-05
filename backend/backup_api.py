"""Backup sob demanda: o GitHub Actions (com BACKUP_TOKEN) ou a coordenação baixam um ZIP verificado."""
import asyncio
import hmac
import os
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

BRASILIA = timezone(timedelta(hours=-3))
_running = asyncio.Lock()


def token_ok(sent):
    expected = os.environ.get('BACKUP_TOKEN', '')
    # Exige um segredo longo; comparação em tempo constante.
    return len(expected) >= 32 and bool(sent) and hmac.compare_digest(sent, expected)


def create_backup_router(db, current_user, make_backup=None):
    router = APIRouter()

    async def authorized(request, token):
        if token_ok(token):
            return 'github'
        auth = request.headers.get('authorization', '')
        if auth.lower().startswith('bearer '):
            from fastapi.security import HTTPAuthorizationCredentials
            user = await current_user(HTTPAuthorizationCredentials(scheme='Bearer', credentials=auth[7:]))
            if user.get('role') == 'admin':
                return user['nome']
        raise HTTPException(403, 'Acesso restrito à coordenação.')

    @router.get('/admin/backup')
    async def download_backup(request: Request, arquivos: int = 1, x_backup_token: str = Header(default='')):
        who = await authorized(request, x_backup_token)
        if _running.locked():
            raise HTTPException(409, 'Já existe um backup sendo gerado. Tente em alguns minutos.')
        async with _running:
            stamp = datetime.now(BRASILIA).strftime('%Y-%m-%d_%H%M')
            folder = Path(tempfile.mkdtemp(prefix='eti-backup-'))
            target = folder / f'eti-leitura-{stamp}{"" if arquivos else "-banco"}.zip'
            run = make_backup
            if run is None:
                from scripts.backup import backup as run
            manifest = await asyncio.to_thread(run, target, bool(arquivos))
            await db.backup_log.insert_one({'criado_em': datetime.now(timezone.utc).isoformat(), 'por': who, 'arquivos': bool(arquivos),
                                            'documentos': sum(manifest.get('collections', {}).values()), 'tamanho': target.stat().st_size})

        def cleanup():
            target.unlink(missing_ok=True)
            folder.rmdir()

        return FileResponse(target, media_type='application/zip', filename=target.name, background=BackgroundTask(cleanup),
                            headers={'Cache-Control': 'no-store'})

    @router.get('/admin/backup/status')
    async def backup_status(request: Request, x_backup_token: str = Header(default='')):
        await authorized(request, x_backup_token)
        last = await db.backup_log.find({}, {'_id': 0}).sort('criado_em', -1).to_list(5)
        return {'configurado': len(os.environ.get('BACKUP_TOKEN', '')) >= 32, 'ultimos': last}

    return router
