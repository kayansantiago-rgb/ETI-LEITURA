"""Conta do usuário: entrar com Google, termos de uso (LGPD), exportar/excluir dados e recompensas."""
import asyncio
import os
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
import requests
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from backend.reading import earned_medals

TERMS_VERSION = '2026-10'
GOOGLE_ISSUERS = ('accounts.google.com', 'https://accounts.google.com')

# Recompensas desbloqueadas pelas medalhas de leitura.
REWARDS = [
    {'id': 'moldura-lavanda', 'tipo': 'moldura', 'nome': 'Lavanda', 'medalha': 'primeira-pagina'},
    {'id': 'moldura-fogo', 'tipo': 'moldura', 'nome': 'Chama', 'medalha': 'sequencia-3'},
    {'id': 'moldura-oceano', 'tipo': 'moldura', 'nome': 'Oceano', 'medalha': 'sequencia-7'},
    {'id': 'moldura-ouro', 'tipo': 'moldura', 'nome': 'Ouro', 'medalha': 'livro-1'},
    {'id': 'moldura-galaxia', 'tipo': 'moldura', 'nome': 'Galáxia', 'medalha': 'livro-5'},
    {'id': 'moldura-arcoiris', 'tipo': 'moldura', 'nome': 'Arco-íris', 'medalha': 'sequencia-30'},
    {'id': 'titulo-explorador', 'tipo': 'titulo', 'nome': 'Explorador de histórias', 'medalha': 'primeira-pagina'},
    {'id': 'titulo-constante', 'tipo': 'titulo', 'nome': 'Leitor constante', 'medalha': 'sequencia-7'},
    {'id': 'titulo-devorador', 'tipo': 'titulo', 'nome': 'Devorador de livros', 'medalha': 'livro-5'},
    {'id': 'titulo-maratonista', 'tipo': 'titulo', 'nome': 'Maratonista das páginas', 'medalha': 'paginas-500'},
    {'id': 'titulo-sabio', 'tipo': 'titulo', 'nome': 'Mestre da compreensão', 'medalha': 'certificado-3'},
    {'id': 'titulo-imparavel', 'tipo': 'titulo', 'nome': 'Leitor imparável', 'medalha': 'sequencia-30'},
]
REWARD_BY_ID = {r['id']: r for r in REWARDS}

# Dados pessoais exportados pelo próprio titular (LGPD, art. 18).
EXPORT_COLLECTIONS = [
    ('leituras', 'reading_progress'), ('dias_de_leitura', 'reading_days'), ('metas', 'reading_goals'),
    ('resumos', 'summaries'), ('producoes_textuais', 'text_productions'), ('atividades', 'activity_submissions'),
    ('quizzes', 'quiz_attempts'), ('questionarios_de_livros', 'book_quiz_attempts'), ('certificados', 'certificates'),
]


class GoogleCredential(BaseModel):
    credential: str = Field(min_length=20, max_length=5000)


class GoogleSignup(BaseModel):
    cadastro_token: str = Field(min_length=20, max_length=5000)
    turma: str = Field(min_length=1, max_length=40)
    aceite_termos: bool = False


class DeletionRequest(BaseModel):
    motivo: Optional[str] = Field(default='', max_length=500)


class Style(BaseModel):
    moldura: Optional[str] = Field(default=None, max_length=40)
    titulo: Optional[str] = Field(default=None, max_length=40)


def google_client_id():
    return (os.environ.get('GOOGLE_CLIENT_ID') or '').strip() or None


def allowed_domains():
    return [d.strip().lower().lstrip('@') for d in (os.environ.get('GOOGLE_ALLOWED_DOMAINS') or '').split(',') if d.strip()]


def verify_google_token(credential):
    """Valida o token do botão "Entrar com Google" no serviço do Google e devolve os dados da conta."""
    client_id = google_client_id()
    if not client_id:
        raise HTTPException(503, 'O login com Google ainda não foi configurado pela escola.')
    try:
        response = requests.get('https://oauth2.googleapis.com/tokeninfo', params={'id_token': credential}, timeout=10)
    except requests.RequestException:
        raise HTTPException(503, 'Não foi possível falar com o Google. Tente novamente.')
    if response.status_code != 200:
        raise HTTPException(401, 'Login com Google inválido ou expirado.')
    info = response.json()
    if info.get('aud') != client_id or info.get('iss') not in GOOGLE_ISSUERS or str(info.get('email_verified')).lower() != 'true':
        raise HTTPException(401, 'Login com Google inválido.')
    if int(info.get('exp', 0)) < datetime.now(timezone.utc).timestamp():
        raise HTTPException(401, 'Login com Google expirado. Tente novamente.')
    return {'email': info['email'].lower(), 'nome': info.get('name') or info['email'].split('@')[0], 'foto': info.get('picture'), 'sub': info.get('sub')}


def create_account_router(db, current, admin, public_user, issue_token, hash_password, secret, valid_classes, verifier=verify_google_token):
    router = APIRouter()

    def token_response(user):
        return {'access_token': issue_token(user), 'token_type': 'bearer', 'user': public_user(user)}

    # ---------- Entrar com Google ----------
    @router.get('/auth/google/config')
    async def google_config():
        return {'client_id': google_client_id(), 'dominios': allowed_domains()}

    @router.post('/auth/google')
    async def google_login(data: GoogleCredential):
        info = await asyncio.to_thread(verifier, data.credential)
        user = await db.users.find_one({'email': {'$regex': f'^{re.escape(info["email"])}$', '$options': 'i'}}, {'_id': 0})
        if user:
            if not user.get('active', True):
                raise HTTPException(403, 'Esta conta está desativada. Fale com a coordenação.')
            if info.get('sub') and not user.get('google_sub'):
                await db.users.update_one({'id': user['id']}, {'$set': {'google_sub': info['sub']}})
            return token_response(user)
        domains = allowed_domains()
        if domains and info['email'].split('@')[1] not in domains:
            raise HTTPException(403, 'Use o e-mail da escola (' + ', '.join('@' + d for d in domains) + ') para criar a conta.')
        # Conta nova: o aluno ainda precisa escolher a turma e aceitar os termos.
        signup = jwt.encode({'purpose': 'google-signup', 'email': info['email'], 'nome': info['nome'], 'foto': info.get('foto'), 'sub': info.get('sub'),
                             'exp': datetime.now(timezone.utc) + timedelta(minutes=15)}, secret, algorithm='HS256')
        return {'novo': True, 'cadastro_token': signup, 'nome': info['nome'], 'email': info['email']}

    @router.post('/auth/google/register')
    async def google_register(data: GoogleSignup):
        try:
            info = jwt.decode(data.cadastro_token, secret, algorithms=['HS256'])
        except jwt.InvalidTokenError:
            raise HTTPException(401, 'O cadastro expirou. Entre com o Google novamente.')
        if info.get('purpose') != 'google-signup':
            raise HTTPException(401, 'Cadastro inválido.')
        if not data.aceite_termos:
            raise HTTPException(400, 'Aceite os termos de uso e a política de privacidade para continuar.')
        if data.turma not in valid_classes:
            raise HTTPException(400, 'Escolha uma turma válida.')
        if await db.users.find_one({'email': {'$regex': f'^{re.escape(info["email"])}$', '$options': 'i'}}):
            raise HTTPException(400, 'Este e-mail já tem conta. Use "Entrar com Google".')
        now = datetime.now(timezone.utc).isoformat()
        user = {'id': str(uuid.uuid4()), 'email': info['email'], 'nome': info['nome'][:120], 'turma': data.turma, 'avatar_url': info.get('foto'),
                'role': 'student', 'created_at': now, 'google_sub': info.get('sub'),
                # Senha aleatória: a conta entra pelo Google (ou pelo link de nova senha da coordenação).
                'password_hash': hash_password(secrets.token_urlsafe(32)),
                'termos_versao': TERMS_VERSION, 'termos_aceitos_em': now}
        await db.users.insert_one(user.copy())
        return token_response(user)

    # ---------- Termos e privacidade (LGPD) ----------
    @router.get('/auth/terms')
    async def terms():
        return {'versao': TERMS_VERSION}

    @router.post('/auth/me/accept-terms')
    async def accept_terms(user=Depends(current)):
        await db.users.update_one({'id': user['id']}, {'$set': {'termos_versao': TERMS_VERSION, 'termos_aceitos_em': datetime.now(timezone.utc).isoformat()}})
        return {'versao': TERMS_VERSION}

    @router.get('/auth/me/export')
    async def export(user=Depends(current)):
        data = {'gerado_em': datetime.now(timezone.utc).isoformat(), 'conta': public_user(user).model_dump()}
        for label, collection in EXPORT_COLLECTIONS:
            data[label] = await db[collection].find({'user_id': user['id']}, {'_id': 0}).to_list(10000)
        return JSONResponse(data, headers={'Content-Disposition': 'attachment; filename="meus-dados-eti-leitura.json"'})

    @router.get('/auth/me/deletion-request')
    async def deletion_status(user=Depends(current)):
        return await db.deletion_requests.find_one({'user_id': user['id']}, {'_id': 0}) or {}

    @router.post('/auth/me/deletion-request', status_code=201)
    async def request_deletion(data: DeletionRequest, user=Depends(current)):
        if user.get('role') != 'student':
            raise HTTPException(400, 'Contas de professores são encerradas pela coordenação.')
        doc = {'id': user['id'], 'user_id': user['id'], 'nome': user['nome'], 'turma': user.get('turma'),
               'motivo': (data.motivo or '').strip(), 'created_at': datetime.now(timezone.utc).isoformat()}
        await db.deletion_requests.update_one({'user_id': user['id']}, {'$setOnInsert': doc}, upsert=True)
        return await db.deletion_requests.find_one({'user_id': user['id']}, {'_id': 0})

    @router.delete('/auth/me/deletion-request', status_code=204)
    async def cancel_deletion(user=Depends(current)):
        await db.deletion_requests.delete_one({'user_id': user['id']})

    @router.get('/admin/deletion-requests')
    async def deletion_requests(user=Depends(admin)):
        return await db.deletion_requests.find({}, {'_id': 0}).sort('created_at', 1).to_list(1000)

    # ---------- Recompensas (moldura e título) ----------
    @router.get('/auth/me/rewards')
    async def rewards(user=Depends(current)):
        earned = await earned_medals(db, user['id'])
        return {'moldura': user.get('moldura'), 'titulo': user.get('titulo'),
                'itens': [{**r, 'desbloqueada': r['medalha'] in earned} for r in REWARDS]}

    @router.put('/auth/me/style')
    async def set_style(data: Style, user=Depends(current)):
        earned = await earned_medals(db, user['id'])
        values = {}
        for field in ('moldura', 'titulo'):
            choice = getattr(data, field)
            if choice is None:
                values[field] = None
                continue
            reward = REWARD_BY_ID.get(choice)
            if not reward or reward['tipo'] != field:
                raise HTTPException(400, 'Recompensa inválida.')
            if reward['medalha'] not in earned:
                raise HTTPException(403, 'Conquiste a medalha para desbloquear esta recompensa.')
            values[field] = choice
        await db.users.update_one({'id': user['id']}, {'$set': values})
        return {**values, 'titulo_nome': REWARD_BY_ID[values['titulo']]['nome'] if values.get('titulo') else None}

    return router
