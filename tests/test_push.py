import base64
from datetime import datetime, timezone
import pytest
from pydantic import ValidationError
from backend.push import Endpoint, Keys, configuration, events_for

AT = datetime(2026,9,21,12,0,tzinfo=timezone.utc)  # 09:00 Brasília
ACTIVITY = {'id':'a','titulo':'Leitura','status':'aberta','prazo':'2026-09-22','created_at':'2026-09-21T11:00:00+00:00'}
DEVICE = {'created_at':'2026-09-20T12:00:00+00:00','new_activities':True,'deadlines':True}


@pytest.mark.parametrize('endpoint',[
    'http://fcm.googleapis.com/send/x','https://127.0.0.1/send','https://localhost/send',
    'https://fcm.googleapis.com.evil.test/send','https://fcm.googleapis.com:8443/send',
    'https://user@fcm.googleapis.com/send','https://fcm.googleapis.com/send#fragment',
    'https://evil.test/https://fcm.googleapis.com/send',
])
def test_reject_untrusted_push_destinations(endpoint):
    with pytest.raises(ValidationError):Endpoint(endpoint=endpoint)


@pytest.mark.parametrize('endpoint',[
    'https://fcm.googleapis.com/fcm/send/token',
    'https://updates.push.services.mozilla.com/wpush/v2/token',
    'https://web.push.apple.com/token',
    'https://wns2-db5p.notify.windows.com/w/?token=x',
])
def test_accept_known_push_services(endpoint):
    assert Endpoint(endpoint=endpoint).endpoint==endpoint


def test_prefer_one_deadline_notice_when_new_activity_coincides():
    events=events_for(ACTIVITY,None,DEVICE,AT)
    assert len(events)==1 and events[0]['title'].endswith('amanhã')
    tomorrow=AT.replace(day=22)
    assert events_for(ACTIVITY,None,DEVICE,tomorrow)[0]['title'].endswith('hoje')
    assert events_for(ACTIVITY,None,DEVICE,AT.replace(day=23))==[]


def test_submitted_closed_and_expired_do_not_remind():
    assert events_for(ACTIVITY,{'nota':None},DEVICE,AT)==[]
    assert events_for({**ACTIVITY,'status':'encerrada'},None,DEVICE,AT)==[]
    assert events_for({**ACTIVITY,'prazo':'2026-09-20'},None,DEVICE,AT)==[]


def test_deadline_uses_brasilia_quiet_hours_and_preferences():
    device={**DEVICE,'new_activities':False}
    assert events_for(ACTIVITY,None,device,AT.replace(hour=10))==[] # 07h
    assert events_for(ACTIVITY,None,device,AT.replace(hour=23))==[] # 20h
    assert events_for(ACTIVITY,None,{**device,'deadlines':False},AT)==[]


def test_individual_retry_deadline_overrides_closed_activity():
    sub={'reenvio':{'prazo':'2026-09-21','devolvido_em':'version-1'}}
    event=events_for({**ACTIVITY,'status':'encerrada','prazo':'2000-01-01'},sub,DEVICE,AT)[0]
    assert event['title'].endswith('hoje') and event['id'].endswith('version-1')
    assert events_for(ACTIVITY,{'reenvio':{'prazo':'2026-09-20'}},DEVICE,AT)==[]


def test_no_backfill_of_old_publications_on_opt_in():
    device={**DEVICE,'deadlines':False,'created_at':'2026-09-21T12:00:00+00:00'}
    assert events_for(ACTIVITY,None,device,AT)==[]
    assert len(events_for(ACTIVITY,None,{**DEVICE,'deadlines':False},AT))==1


def test_configuration_requires_contact_and_keys(monkeypatch):
    monkeypatch.setenv('PUSH_ENABLED','true')
    monkeypatch.setenv('VAPID_PRIVATE_KEY','private')
    monkeypatch.setenv('VAPID_PUBLIC_KEY','public')
    monkeypatch.setenv('VAPID_SUBJECT','')
    monkeypatch.setenv('PUBLIC_APP_URL','http://127.0.0.1:3000')
    assert not configuration()['configured']
    monkeypatch.setenv('PUBLIC_APP_URL','https://school.example')
    assert configuration()['configured']
    monkeypatch.setenv('PUSH_ENABLED','false')
    assert not configuration()['configured']


def test_invalid_subscription_keys_rejected():
    with pytest.raises(ValidationError):
        Keys(p256dh=base64.urlsafe_b64encode(b'x'*65).decode(),auth=base64.urlsafe_b64encode(b'x'*16).decode())

@pytest.mark.parametrize('role',['teacher','admin'])
def test_staff_dispatch_only_new_unread_scoped_notices(monkeypatch,role):
    import asyncio
    from types import SimpleNamespace
    from unittest.mock import AsyncMock,Mock
    import backend.push as push
    import backend.school as school
    device={**DEVICE,'user_id':'t','token_version':0,'binding':'binding','_id':'device'}
    async def devices():yield device
    db=SimpleNamespace(push_subscriptions=SimpleNamespace(find=Mock(side_effect=lambda q:devices())),users=SimpleNamespace(find_one=AsyncMock(return_value={'id':'t','role':role})))
    notices=AsyncMock(return_value=[{'id':'new','lida':False,'data':'2026-09-21T11:00:00+00:00','link':'/admin/summaries'},{'id':'old','lida':False,'data':'2020-01-01','link':'/admin/summaries'},{'id':'read','lida':True,'data':'2026-09-21','link':'/admin/summaries'}])
    monkeypatch.setattr(school,'notifications',notices)
    monkeypatch.setattr(push,'configuration',lambda:{'configured':True})
    delivery=AsyncMock(return_value=True);monkeypatch.setattr(push,'deliver',delivery)
    assert asyncio.run(push.dispatch(db,AT))==1
    assert delivery.call_args.args[2]['id']=='new'
    notices.assert_awaited_once_with(db,{'id':'t','role':role})

def test_student_receives_bell_notices_on_device(monkeypatch):
    import asyncio
    from types import SimpleNamespace
    from unittest.mock import AsyncMock,Mock
    import backend.push as push
    import backend.school as school
    device={**DEVICE,'user_id':'s','token_version':0,'binding':'binding','_id':'device'}
    async def devices():yield device
    async def no_activities():
        return
        yield
    user={'id':'s','role':'student','turma':'7º ANO'}
    db=SimpleNamespace(push_subscriptions=SimpleNamespace(find=Mock(side_effect=lambda q:devices())),users=SimpleNamespace(find_one=AsyncMock(return_value=user)),activities=SimpleNamespace(find=Mock(side_effect=lambda q:no_activities())))
    notices=AsyncMock(return_value=[
        {'id':'grade:x:1','titulo':'Atividade corrigida: Leitura','lida':False,'data':'2026-09-21T11:00:00+00:00','link':'/activities/a'},
        {'id':'activity:a','titulo':'Nova atividade: Leitura','lida':False,'data':'2026-09-21T11:00:00+00:00','link':'/activities/a'},
        {'id':'mural:m','titulo':'Novo no mural: Feira','lida':True,'data':'2026-09-21T11:00:00+00:00','link':'/dashboard'}])
    monkeypatch.setattr(school,'notifications',notices)
    monkeypatch.setattr(push,'configuration',lambda:{'configured':True})
    delivery=AsyncMock(return_value=True);monkeypatch.setattr(push,'deliver',delivery)
    assert asyncio.run(push.dispatch(db,AT))==1
    event=delivery.call_args.args[2]
    assert (event['id'],event['title'],event['body'],event['url'])==('grade:x:1','Atividade corrigida','Leitura','/activities/a')


def test_streak_reminder_rules():
    import asyncio
    from datetime import datetime, timedelta, timezone
    from types import SimpleNamespace
    from unittest.mock import AsyncMock
    from backend.push import streak_event, BRASILIA

    class Cursor:
        def __init__(self, rows): self.rows = rows
        async def to_list(self, n): return self.rows

    def make_db(days, book='b1'):
        return SimpleNamespace(
            reading_days=SimpleNamespace(find=lambda *a, **k: Cursor([{'dia': d} for d in days])),
            reading_progress=SimpleNamespace(find_one=AsyncMock(return_value={'book_id': book} if book else None)))

    evening = datetime(2026, 10, 5, 19, 30, tzinfo=BRASILIA).astimezone(timezone.utc)
    today = evening.astimezone(BRASILIA).date()
    day = lambda n: (today - timedelta(days=n)).isoformat()
    student = {'id': 's', 'role': 'student'}
    run = lambda db, user=student, at=evening: asyncio.run(streak_event(db, user, at))

    event = run(make_db([day(1), day(2)]))
    assert event['id'] == f'streak:{today.isoformat()}' and '2 dias' in event['title'] and event['url'] == '/reader/b1'
    assert run(make_db([day(0), day(1)])) is None                      # já leu hoje
    assert run(make_db([day(3)])) is None                              # sem sequência ativa
    assert run(make_db([day(1)]), at=evening - timedelta(hours=3)) is None  # antes das 19h
    assert run(make_db([day(1)]), user={**student, 'lembrete_leitura': False}) is None  # desligou o lembrete
    assert run(make_db([day(1)]), user={'id': 't', 'role': 'teacher'}) is None
    assert run(make_db([day(1)], book=None))['url'] == '/library'

@pytest.mark.parametrize('role',['admin','teacher','student'])
def test_config_diagnostics_only_for_admin(monkeypatch, role):
    import asyncio
    import httpx
    from fastapi import FastAPI
    from backend.push import create_push_router
    for name in ('VAPID_PRIVATE_KEY','VAPID_PUBLIC_KEY','VAPID_SUBJECT','PUBLIC_APP_URL'):
        monkeypatch.delenv(name,raising=False)
    monkeypatch.setenv('PUSH_ENABLED','false')
    async def current():return {'id':'u','role':role}
    app=FastAPI();app.include_router(create_push_router(None,current))
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as client:
            return (await client.get('/push/config')).json()
    result=asyncio.run(run())
    assert result['configured'] is False
    assert ('missing' in result)==(role=='admin')
    if role=='admin':assert set(result['missing'])=={'VAPID_PRIVATE_KEY','VAPID_PUBLIC_KEY','PUBLIC_APP_URL ou VAPID_SUBJECT','PUSH_ENABLED=true'}
