"""Activity authorization and validation tests; no external database."""
import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock
import httpx
import pytest
from fastapi import FastAPI, HTTPException
from backend.activities import create_activity_router

@pytest.fixture
def activity_api():
    activity={'id':'activity-1','titulo':'Leitura','descricao':'','turma':'7º ANO','prazo':None,'status':'aberta','perguntas':[{'id':'q1','enunciado':'O que você aprendeu?'}]}
    user={'id':'student-1','nome':'Aluno','turma':'7º ANO','role':'student'}
    db=SimpleNamespace(activities=SimpleNamespace(find_one=AsyncMock(return_value=activity),insert_one=AsyncMock()),
        activity_submissions=SimpleNamespace(update_one=AsyncMock(return_value=SimpleNamespace(matched_count=1)),insert_one=AsyncMock(),find_one=AsyncMock(return_value=None)))
    async def current(): return user
    async def admin():
        if user['role']!='admin': raise HTTPException(403,'Acesso negado')
        return user
    app=FastAPI();app.include_router(create_activity_router(db,current,admin),prefix='/api')
    def request(method,path,**kwargs):
        async def run():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as client:
                return await client.request(method,path,**kwargs)
        return asyncio.run(run())
    return request,user,activity,db

def test_student_cannot_publish(activity_api):
    request,*_=activity_api
    assert request('POST','/api/admin/activities',json={'titulo':'Teste','perguntas':['Pergunta']}).status_code==403

def test_other_class_cannot_view_or_answer(activity_api):
    request,user,_,db=activity_api;user['turma']='8º ANO'
    assert request('GET','/api/activities/activity-1').status_code==404
    assert request('PUT','/api/activities/activity-1/response',json={'respostas':[{'pergunta_id':'q1','resposta':'Texto'}]}).status_code==404
    db.activity_submissions.update_one.assert_not_called()

@pytest.mark.parametrize('change',[{'status':'encerrada'},{'prazo':'2000-01-01'}])
def test_closed_or_expired_rejects_answers(activity_api,change):
    request,_,activity,db=activity_api;activity.update(change)
    assert request('PUT','/api/activities/activity-1/response',json={'respostas':[{'pergunta_id':'q1','resposta':'Texto'}]}).status_code==409
    db.activity_submissions.update_one.assert_not_called()

@pytest.mark.parametrize('answers',[[{'pergunta_id':'wrong','resposta':'Texto'}],[{'pergunta_id':'q1','resposta':'   '}],[{'pergunta_id':'q1','resposta':'A'},{'pergunta_id':'q1','resposta':'B'}]])
def test_incomplete_or_duplicate_answers_rejected(activity_api,answers):
    request,_,_,db=activity_api
    assert request('PUT','/api/activities/activity-1/response',json={'respostas':answers}).status_code==400
    db.activity_submissions.update_one.assert_not_called()

def test_answer_is_scoped_to_logged_student(activity_api):
    request,_,_,db=activity_api
    response=request('PUT','/api/activities/activity-1/response',json={'user_id':'someone-else','respostas':[{'pergunta_id':'q1','resposta':'Minha resposta'}]})
    assert response.status_code==200
    row=db.activity_submissions.insert_one.call_args.args[0]
    assert row['user_id']=='student-1' and row['activity_id']=='activity-1'
    assert row['nota'] is None and row['tentativa']==1 and row['historico']==[]


def test_resubmission_requires_teacher_permission(activity_api):
    request,_,_,db=activity_api
    db.activity_submissions.find_one.return_value={'id':'response-1','nota':0}
    assert request('PUT','/api/activities/activity-1/response',json={'respostas':[{'pergunta_id':'q1','resposta':'Outra'}]}).status_code==409
    db.activity_submissions.update_one.assert_not_called()


def test_retry_preserves_zero_grade_and_previous_answers(activity_api):
    request,_,_,db=activity_api
    previous={'id':'response-1','nota':0,'feedback':'Refaça','updated_at':'version-1','respostas':[{'pergunta_id':'q1','resposta':'Original'}],'reenvio':{'prazo':'2099-01-01'},'historico':[]}
    db.activity_submissions.find_one.return_value=previous
    assert request('PUT','/api/activities/activity-1/response',json={'respostas':[{'pergunta_id':'q1','resposta':'Revisada'}]}).status_code==200
    query,update=db.activity_submissions.update_one.call_args.args
    assert query['updated_at']=='version-1'
    assert update['$push']['historico']['nota']==0
    assert update['$push']['historico']['respostas'][0]['resposta']=='Original'
    assert 'historico' not in update['$push']['historico']
    assert update['$set']['tentativa']==2 and update['$set']['nota'] is None


def test_concurrent_retry_is_rejected(activity_api):
    request,_,_,db=activity_api
    db.activity_submissions.find_one.return_value={'id':'r','updated_at':'v','reenvio':{'prazo':'2099-01-01'}}
    db.activity_submissions.update_one.return_value=SimpleNamespace(matched_count=0)
    assert request('PUT','/api/activities/activity-1/response',json={'respostas':[{'pergunta_id':'q1','resposta':'Outra'}]}).status_code==409


def test_student_cannot_read_classmates_answers(activity_api):
    request,*_=activity_api
    assert request('GET','/api/admin/activities/activity-1/responses').status_code==403

def test_blank_question_and_unknown_class_rejected(activity_api):
    request,user,_,db=activity_api;user['role']='admin'
    for data in [{'titulo':'Teste','perguntas':[' ']},{'titulo':'Teste','perguntas':['Pergunta'],'turma':'inexistente'}]:
        assert request('POST','/api/admin/activities',json=data).status_code==400
    db.activities.insert_one.assert_not_called()
