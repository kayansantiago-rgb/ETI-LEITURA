"""MongoDB integration and encrypted push transport test, without external messages."""
import asyncio
import base64
from datetime import datetime,timedelta,timezone
from pathlib import Path
import os,sys
from uuid import uuid4
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from fastapi import FastAPI
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from requests import Response
from pywebpush import WebPushException
from backend.push import create_push_router,ensure_indexes,dispatch,digest,deliver,send_push


async def main():
    client=AsyncIOMotorClient('mongodb://127.0.0.1:27017',serverSelectionTimeoutMS=5000)
    name='eti_check_push_'+uuid4().hex;db=client[name]
    user={'id':'student','role':'student','nome':'Aluno de teste','turma':'7º ANO'}
    async def current():return user
    key=ec.generate_private_key(ec.SECP256R1())
    encode=lambda data:base64.urlsafe_b64encode(data).decode().rstrip('=')
    public=encode(key.public_key().public_bytes(serialization.Encoding.X962,serialization.PublicFormat.UncompressedPoint))
    private=encode(key.private_bytes(serialization.Encoding.DER,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
    env={'VAPID_PUBLIC_KEY':public,'VAPID_PRIVATE_KEY':private,'VAPID_SUBJECT':'https://school.example','PUSH_ENABLED':'true'}
    app=FastAPI();app.include_router(create_push_router(db,current))
    payload={'endpoint':'https://fcm.googleapis.com/fcm/send/test','keys':{'p256dh':public,'auth':encode(os.urandom(16))},'binding':str(uuid4()),'new_activities':True,'deadlines':True}
    sent=[]
    def sender(sub,data,ttl):sent.append(data)
    try:
        await ensure_indexes(db)
        await db.users.insert_one(dict(user))
        with patch.dict(os.environ,env):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as api:
                async def request(method,path,code=200,**kwargs):
                    r=await api.request(method,path,**kwargs);assert r.status_code==code,(path,r.status_code,r.text)
                    return r.json() if r.content else None
                user['role']='teacher'
                await request('PUT','/push/subscription',403,json=payload)
                user['role']='student'
                await request('PUT','/push/subscription',json=payload)
                assert (await request('POST','/push/status',json={'endpoint':payload['endpoint']}))['active']
                user['id']='other'
                assert not (await request('POST','/push/status',json={'endpoint':payload['endpoint']}))['active']
                await request('DELETE','/push/subscription',204,json={'endpoint':payload['endpoint']})
                assert await db.push_subscriptions.count_documents({})==1
                user['id']='student'
                at=datetime(2026,9,21,12,0,tzinfo=timezone.utc)
                await db.push_subscriptions.update_one({}, {'$set':{'created_at':(at-timedelta(days=1)).isoformat()}})
                activity={'id':'a','titulo':'Leitura','status':'aberta','turma':'7º ANO','prazo':None,'created_at':at.isoformat()}
                await db.activities.insert_many([activity,{**activity,'id':'other-class','turma':'8º ANO'}])
                await asyncio.gather(dispatch(db,at,sender),dispatch(db,at,sender))
                assert len(sent)==1
                await dispatch(db,at+timedelta(minutes=10),sender)
                assert len(sent)==1,'Must not repeat on restart/rescan'
                await db.activities.update_one({'id':'a'},{'$set':{'prazo':'2026-09-22'}})
                await dispatch(db,at,sender);assert len(sent)==2 and sent[-1]['title'].endswith('amanhã')
                await db.activity_submissions.insert_one({'activity_id':'a','user_id':'student','nota':None})
                await dispatch(db,at+timedelta(days=1),sender);assert len(sent)==2
                await db.activity_submissions.update_one({}, {'$set':{'reenvio':{'prazo':'2026-09-22','devolvido_em':'retry'}}})
                await dispatch(db,at+timedelta(days=1),sender);assert len(sent)==3 and sent[-1]['title'].endswith('hoje')
                subscription=await db.push_subscriptions.find_one({})
                event={'id':'transport','title':'Teste','body':'Teste','url':'/notifications','ttl':60}
                response=Response();response.status_code=201
                with patch('backend.push.NoRedirectSession.request',return_value=response) as transport:
                    send_push(subscription,{'title':'Teste'},60)
                    assert transport.call_count==1
                    assert transport.call_args.kwargs['data']!=b'{"title":"Teste"}'
                    assert 'authorization' in {k.lower() for k in transport.call_args.kwargs['headers']}
                failure=Response();failure.status_code=503
                def fails(*args):raise WebPushException('unavailable',response=failure)
                assert not await deliver(db,subscription,event,at,fails)
                assert not await deliver(db,subscription,event,at+timedelta(seconds=30),sender)
                assert await deliver(db,subscription,event,at+timedelta(minutes=3),sender)
                expired=Response();expired.status_code=410
                def gone(*args):raise WebPushException('expired',response=expired)
                assert not await deliver(db,subscription,{**event,'id':'gone'},at,gone)
                assert await db.push_subscriptions.count_documents({})==0
                await request('PUT','/push/subscription',json=payload)
                await db.users.update_one({'id':'student'},{'$set':{'token_version':1}})
                await dispatch(db,at,sender)
                assert await db.push_subscriptions.count_documents({})==0
                print('PASS: consent endpoints, ownership, class scope, deduplication across workers, pending-only reminders, retry deadlines, encryption/signing, backoff, expired subscriptions and credential revocation. No external messages.')
    finally:
        assert name.startswith('eti_check_push_') and len(name)==47
        await client.drop_database(name);client.close()


if __name__=='__main__':asyncio.run(main())
