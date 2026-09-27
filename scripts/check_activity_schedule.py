"""Scheduling visibility and private comments against an isolated local database."""
import asyncio
import sys
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timedelta, timezone
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import httpx
from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from backend.activities import create_activity_router, is_published, published_query
from backend.school import create_school_router, report_data
from backend.push import events_for

async def main():
    client=AsyncIOMotorClient('mongodb://127.0.0.1:27017',serverSelectionTimeoutMS=5000)
    name='eti_check_schedule_'+uuid4().hex
    db=client[name]
    user={'id':'teacher','nome':'Professora teste','role':'teacher','turmas':['7º ANO']}
    async def current():return user
    async def staff():
        if user['role'] not in ['admin','teacher']:raise HTTPException(403)
        return user
    app=FastAPI()
    app.include_router(create_activity_router(db,current,staff))
    app.include_router(create_school_router(db,current,staff,staff,lambda value:value))
    try:
        await db.users.insert_one({'id':'student','nome':'Aluno teste','role':'student','turma':'7º ANO'})
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as api:
            async def req(method,path,code=200,**kw):
                result=await api.request(method,path,**kw)
                assert result.status_code==code,(method,path,result.status_code,result.text)
                return result.json() if result.content else None
            base={'titulo':'Leitura programada','turma':'7º ANO','perguntas':['O que aprendeu?'],'publicar_em':'2099-01-02T08:30:00-03:00','prazo':'2099-01-04'}
            for publication in ['2000-01-01T12:00:00Z','2099-01-02T08:30:00']:
                await req('POST','/admin/activities',400,json={**base,'publicar_em':publication})
            await req('POST','/admin/activities',400,json={**base,'prazo':'2099-01-01'})
            scheduled=await req('POST','/admin/activities',201,json=base)
            aid=scheduled['id'];detail='/activities/'+aid
            assert scheduled['publicar_em']=='2099-01-02T11:30:00+00:00'
            assert (await req('GET',detail))['agendada']
            assert len(await req('GET','/activities'))==1
            assert (await req('GET','/workspace'))['atividades']==[]
            assert (await report_data(db,user))['alunos'][0]['atividades_disponiveis']==0
            model=await req('POST','/admin/activity-templates',201,json=base)
            assert 'publicar_em' not in model
            comment=await req('POST','/admin/feedback-templates',201,json={'texto':'  Use exemplos do texto.  '})
            assert comment['texto']=='Use exemplos do texto.'
            assert len(await req('GET','/admin/feedback-templates'))==1
            user['id']='teacher-2'
            assert await req('GET','/admin/feedback-templates')==[]
            await req('DELETE','/admin/feedback-templates/'+comment['id'],404)
            await req('PUT','/admin/activities/'+aid,403,json=base)
            user.update(id='student',role='student',turma='7º ANO')
            await req('GET','/admin/feedback-templates',403)
            await req('POST','/admin/feedback-templates',403,json={'texto':'teste'})
            await req('DELETE','/admin/feedback-templates/'+comment['id'],403)
            assert await req('GET','/activities')==[]
            assert await req('GET','/notifications')==[]
            assert (await req('GET','/workspace'))['atividades']==[]
            await req('GET',detail,404)
            await req('PUT',detail+'/response',404,json={'respostas':[{'pergunta_id':scheduled['perguntas'][0]['id'],'resposta':'Texto'}]})
            at=datetime.fromisoformat(scheduled['publicar_em'])
            before=at-timedelta(microseconds=1)
            assert not is_published(scheduled,before) and is_published(scheduled,at)
            assert await db.activities.count_documents(published_query(before))==0
            assert await db.activities.count_documents(published_query(at))==1
            subscription={'created_at':(at-timedelta(days=1)).isoformat(),'new_activities':True,'deadlines':False}
            assert events_for(scheduled,None,subscription,before)==[]
            assert events_for(scheduled,None,subscription,at)[0]['id']=='new:'+aid
            # An early publication becomes visible immediately and uses its actual release time.
            user.update(id='teacher',role='teacher')
            released=await req('PUT','/admin/activities/'+aid,json={**base,'publicar_em':None})
            assert released['publicar_em'] and is_published(released)
            await req('PUT','/admin/activities/'+aid,409,json=base)
            user.update(id='student',role='student')
            assert len(await req('GET','/activities'))==1
            assert not (await req('GET',detail))['agendada']
            assert len((await req('GET','/workspace'))['atividades'])==1
            notices=await req('GET','/notifications')
            assert notices[0]['data']==released['publicar_em']
            await req('PUT',detail+'/response',json={'respostas':[{'pergunta_id':released['perguntas'][0]['id'],'resposta':'Minha interpretação'}]})
            user.update(id='teacher',role='teacher')
            await req('DELETE','/admin/feedback-templates/'+comment['id'],204)
            assert await req('GET','/admin/feedback-templates')==[]
            # Legacy immediate publications without the new field remain visible.
            await db.activities.insert_one({**released,'id':'legacy'})
            await db.activities.update_one({'id':'legacy'},{'$unset':{'publicar_em':''}})
            assert await db.activities.count_documents(published_query())==2
        print('PASS: timezone/deadline validation, scheduled visibility across list/detail/submission/workspace/reports/notices/push, exact release boundary, early publication, legacy activities and private reusable comments.')
    finally:
        await client.drop_database(name)
        client.close()

if __name__=='__main__':asyncio.run(main())
