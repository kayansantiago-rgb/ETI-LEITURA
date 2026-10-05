"""Opt-in device push and restart-safe activity reminders (no browser tab required)."""
import asyncio
import base64
import hashlib
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit
from uuid import UUID, uuid4

import requests
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from pywebpush import webpush, WebPushException
from backend.activities import is_published, published_query

BRASILIA = timezone(timedelta(hours=-3))
logger = logging.getLogger(__name__)


def now():
    return datetime.now(timezone.utc)


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def valid_endpoint(value):
    url = urlsplit(value)
    host = url.hostname or ''
    allowed = host in {'fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'} or host.endswith('.push.services.mozilla.com') or host.endswith('.notify.windows.com')
    if not allowed or url.scheme != 'https' or url.username or url.password or url.port not in (None, 443) or url.fragment or not url.path or any(c.isspace() for c in value):
        raise ValueError('Serviço de notificações não suportado')
    return value


class Endpoint(BaseModel):
    endpoint: str = Field(max_length=2048)
    _endpoint = field_validator('endpoint')(valid_endpoint)


class Keys(BaseModel):
    p256dh: str = Field(min_length=80, max_length=100, pattern=r'^[A-Za-z0-9_=-]+$')
    auth: str = Field(min_length=20, max_length=30, pattern=r'^[A-Za-z0-9_=-]+$')

    @field_validator('p256dh', 'auth')
    @classmethod
    def validate_key(cls, value, info):
        raw = base64.urlsafe_b64decode(value + '=' * (-len(value) % 4))
        if info.field_name == 'auth' and len(raw) != 16:
            raise ValueError('Chave inválida')
        if info.field_name == 'p256dh':
            ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), raw)
        return value


class Subscription(Endpoint):
    keys: Keys
    binding: UUID
    new_activities: bool = True
    deadlines: bool = True


def configuration():
    private = os.getenv('VAPID_PRIVATE_KEY', '')
    public = os.getenv('VAPID_PUBLIC_KEY', '')
    subject = os.getenv('VAPID_SUBJECT', '') or os.getenv('PUBLIC_APP_URL', '')
    enabled = os.getenv('PUSH_ENABLED', 'true').lower() == 'true'
    configured = bool(enabled and private and public and (subject.startswith('mailto:') or subject.startswith('https://')))
    return {'configured': configured, 'public_key': public if configured else None}


async def ensure_indexes(db):
    await db.push_subscriptions.create_index('user_id')
    await db.push_deliveries.create_index('expires_at', expireAfterSeconds=0)


def events_for(activity, submission, subscription, at):
    """One new-activity event, and one reminder on each of the last two days."""
    if not is_published(activity, at):return []
    local = at.astimezone(BRASILIA)
    today = local.date().isoformat()
    retry = (submission or {}).get('reenvio')
    deadline = retry['prazo'] if retry else activity.get('prazo')
    if submission and not retry:
        return []
    if not retry and activity.get('status') != 'aberta':
        return []
    if deadline and deadline < today:
        return []
    events = []
    created = activity.get('publicar_em') or activity.get('created_at', '')
    if subscription.get('new_activities', True) and not submission and subscription['created_at'] <= created and created >= (at-timedelta(days=7)).isoformat():
        events.append({'id':'new:'+activity['id'], 'title':'Nova atividade na ETI LEITURA', 'body':activity['titulo'], 'url':'/activities/'+activity['id'], 'ttl':3600})
    if subscription.get('deadlines', True) and deadline and 8 <= local.hour < 20:
        days = (datetime.fromisoformat(deadline).date()-local.date()).days
        if days in (0, 1):
            until = datetime.fromisoformat(deadline+'T23:59:59').replace(tzinfo=BRASILIA)
            generation = retry.get('devolvido_em', '') if retry else ''
            events.append({'id':f"due:{activity['id']}:{deadline}:{days}:{generation}", 'title':'Sua atividade vence '+('hoje' if days == 0 else 'amanhã'), 'body':activity['titulo']+' · Confira suas pendências.', 'url':'/activities/'+activity['id'], 'ttl':min(3600, max(1,int((until-at).total_seconds())))})
    # Avoid two notifications together when publication coincides with a reminder.
    return events[-1:]


def reminder_hour():
    try:
        return max(12, min(21, int(os.getenv('STREAK_REMINDER_HOUR', '19'))))
    except ValueError:
        return 19


async def streak_event(db, user, at):
    """Às 19h (Brasília), avisa quem tem sequência de leitura e ainda não leu hoje. Um aviso por dia."""
    if user.get('role') != 'student' or user.get('lembrete_leitura') is False:
        return None
    local = at.astimezone(BRASILIA)
    if not reminder_hour() <= local.hour < 23:
        return None
    from backend.reading import streaks
    today = local.date()
    since = (today - timedelta(days=400)).isoformat()
    days = [d['dia'] for d in await db.reading_days.find({'user_id': user['id'], 'dia': {'$gte': since}}, {'_id': 0, 'dia': 1}).to_list(500)]
    if today.isoformat() in days:
        return None
    current, _ = streaks(days)
    if current < 1:
        return None
    # Leva direto ao livro que o aluno está lendo, se houver.
    book = await db.reading_progress.find_one({'user_id': user['id'], 'percentage': {'$lt': 100}}, {'_id': 0, 'book_id': 1}, sort=[('updated_at', -1)])
    end = datetime.combine(today, datetime.max.time()).replace(tzinfo=BRASILIA)
    plural = 'dia' if current == 1 else 'dias'
    return {'id': f'streak:{today.isoformat()}', 'title': f'Sua sequência de {current} {plural} está em risco! 🔥',
            'body': 'Leia algumas páginas antes de dormir para não perder sua sequência.',
            'url': f"/reader/{book['book_id']}" if book else '/library', 'ttl': max(60, int((end - at).total_seconds()))}


def notice_event(notice, staff=False):
    """Converte um aviso do sininho ("Tipo: detalhe") em título e texto da notificação."""
    text = notice.get('titulo') or 'Novo aviso na plataforma'
    title, _, body = text.partition(': ')
    if not body:
        title, body = 'ETI LEITURA', text
    if staff:
        # Nomes de alunos não aparecem na tela de bloqueio do professor.
        body = 'Uma nova entrega está disponível na ETI LEITURA.'
    return {'id': notice['id'], 'title': title[:80], 'body': body[:180], 'url': notice['link'], 'ttl': 24 * 3600}


class NoRedirectSession(requests.Session):
    def request(self, method, url, **kwargs):
        valid_endpoint(url)
        kwargs['allow_redirects'] = False
        return super().request(method, url, **kwargs)


def send_push(subscription, payload, ttl):
    with NoRedirectSession() as session:
        webpush(subscription_info={'endpoint':subscription['endpoint'], 'keys':subscription['keys']},
                data=json.dumps(payload, ensure_ascii=False),
                vapid_private_key=os.environ['VAPID_PRIVATE_KEY'],
                vapid_claims={'sub':os.getenv('VAPID_SUBJECT') or os.environ['PUBLIC_APP_URL']},
                timeout=10, ttl=ttl, requests_session=session)


async def deliver(db, subscription, event, at, sender=send_push):
    identity = digest(subscription['_id']+subscription['binding']+event['id'])
    try:
        await db.push_deliveries.insert_one({'_id':identity, 'status':'pending', 'attempts':0, 'next_at':at,
                                              'expires_at':at+timedelta(days=30)})
    except DuplicateKeyError:
        pass
    lease = str(uuid4())
    claimed = await db.push_deliveries.find_one_and_update(
        {'_id':identity, 'status':{'$ne':'sent'}, 'attempts':{'$lt':5}, 'next_at':{'$lte':at}},
        {'$set':{'next_at':at+timedelta(minutes=5), 'lease':lease}, '$inc':{'attempts':1}}, return_document=ReturnDocument.AFTER)
    if not claimed:
        return False
    # Recheck device ownership after claiming; unsubscribe and account switches win.
    if not await db.push_subscriptions.find_one({'_id':subscription['_id'], 'binding':subscription['binding'], 'user_id':subscription['user_id']}):
        return False
    payload = {'title':event['title'], 'body':event['body'], 'url':event['url'], 'tag':identity,
               'binding':subscription['binding'], 'expires':int((at+timedelta(seconds=event['ttl'])).timestamp()*1000)}
    try:
        await asyncio.to_thread(sender, subscription, payload, event['ttl'])
    except Exception as exc:
        response = getattr(exc, 'response', None)
        code = getattr(response, 'status_code', None) or getattr(exc, 'status_code', None)
        if code in (404, 410):
            await db.push_subscriptions.delete_one({'_id':subscription['_id'], 'binding':subscription['binding']})
        await db.push_deliveries.update_one({'_id':identity,'lease':lease}, {'$set':{'status':'failed', 'next_at':at+timedelta(minutes=min(60,2**claimed['attempts']))}})
        # Never log endpoint tokens, keys, payloads or provider exception bodies.
        logger.warning('Push delivery failed (status=%s)', code or 'network')
        return False
    await db.push_deliveries.update_one({'_id':identity, 'lease':lease}, {'$set':{'status':'sent', 'sent_at':at}})
    return True


async def dispatch(db, at=None, sender=send_push):
    if not configuration()['configured']:
        return 0
    at = at or now()
    sent = 0
    async for subscription in db.push_subscriptions.find({}):
        user = await db.users.find_one({'id':subscription['user_id'], 'active':{'$ne':False}})
        if not user or user.get('token_version',0) != subscription.get('token_version',0):
            await db.push_subscriptions.delete_one({'_id':subscription['_id'], 'binding':subscription['binding']})
            continue
        # Todo aviso novo do sininho também vai para a barra de notificações do aparelho.
        if subscription.get('new_activities', True):
            from backend.school import notifications
            for notice in await notifications(db, user):
                # Atividades e prazos dos alunos seguem as regras de horário de events_for.
                if user['role'] == 'student' and notice['id'].split(':')[0] in ('activity', 'deadline'):
                    continue
                if not notice['lida'] and notice['data'] >= subscription['created_at']:
                    sent += int(await deliver(db, subscription, notice_event(notice, user['role'] != 'student'), at, sender))
        if user['role'] in ('admin', 'teacher'):
            continue
        async for activity in db.activities.find({'turma':{'$in':['TODAS',user.get('turma')]},**published_query(at)}):
            sub = await db.activity_submissions.find_one({'activity_id':activity['id'], 'user_id':user['id']})
            for event in events_for(activity, sub, subscription, at):
                sent += int(await deliver(db, subscription, event, at, sender))
        reminder = await streak_event(db, user, at)
        if reminder:
            sent += int(await deliver(db, subscription, reminder, at, sender))
    return sent


async def push_loop(db):
    while True:
        try:
            await dispatch(db)
        except Exception:
            logger.warning('Push scan unavailable; it will be retried.')
        await asyncio.sleep(60)


def create_push_router(db, current):
    router = APIRouter()

    def student(user):
        if user['role'] not in ('student', 'teacher', 'admin'):
            raise HTTPException(403, 'Perfil sem acesso às notificações')

    @router.get('/push/config')
    async def config(user=Depends(current)):
        student(user)
        result = configuration()
        if user['role'] == 'admin':
            missing = [name for name in ('VAPID_PRIVATE_KEY', 'VAPID_PUBLIC_KEY') if not os.getenv(name, '').strip()]
            subject = os.getenv('VAPID_SUBJECT', '') or os.getenv('PUBLIC_APP_URL', '')
            if not subject.startswith(('https://', 'mailto:')):
                missing.append('PUBLIC_APP_URL ou VAPID_SUBJECT')
            if os.getenv('PUSH_ENABLED', 'true').lower() != 'true':
                missing.append('PUSH_ENABLED=true')
            result['missing'] = missing
        return result

    @router.post('/push/status')
    async def device_status(data:Endpoint, user=Depends(current)):
        student(user)
        row = await db.push_subscriptions.find_one({'_id':digest(data.endpoint), 'user_id':user['id'], 'token_version':user.get('token_version',0)})
        return {'active':bool(row), 'new_activities':row.get('new_activities',True) if row else True, 'deadlines':row.get('deadlines',True) if row else True}

    @router.put('/push/subscription')
    async def subscribe(data:Subscription, user=Depends(current)):
        student(user)
        if not configuration()['configured']:
            raise HTTPException(503, 'As notificações neste aparelho ainda não foram configuradas pela escola')
        identity = digest(data.endpoint)
        previous = await db.push_subscriptions.find_one({'_id':identity})
        if not previous and await db.push_subscriptions.count_documents({'user_id':user['id']}) >= 10:
            raise HTTPException(409, 'Limite de aparelhos atingido. Desative as notificações em um aparelho antigo.')
        same = previous and previous['user_id']==user['id'] and previous['binding']==str(data.binding)
        values = {**data.model_dump(mode='json'), 'user_id':user['id'], 'token_version':user.get('token_version',0),
                  'created_at':previous['created_at'] if same else now().isoformat()}
        await db.push_subscriptions.update_one({'_id':identity}, {'$set':values}, upsert=True)
        return {'active':True}

    @router.delete('/push/subscription', status_code=204)
    async def unsubscribe(data:Endpoint, user=Depends(current)):
        await db.push_subscriptions.delete_one({'_id':digest(data.endpoint), 'user_id':user['id']})

    @router.post('/push/test')
    async def test_notification(data:Endpoint, user=Depends(current)):
        student(user)
        if not configuration()['configured']:raise HTTPException(503,'Notificações ainda não configuradas')
        row = await db.push_subscriptions.find_one({'_id':digest(data.endpoint), 'user_id':user['id']})
        if not row:raise HTTPException(404,'Ative as notificações neste aparelho primeiro')
        at = now()
        event = {'id':'test:'+str(int(at.timestamp())//60), 'title':'ETI LEITURA', 'body':'Pronto! Este aparelho pode receber avisos da plataforma.', 'url':'/notifications', 'ttl':60}
        if not await deliver(db,row,event,at):raise HTTPException(409,'Aguarde um minuto e tente novamente. Confira também a permissão do aparelho.')
        return {'message':'Teste enviado ao serviço de notificações. Confira seu aparelho.'}

    return router
