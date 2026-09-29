import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock
import httpx
import pytest
from fastapi import FastAPI, HTTPException
from pymongo.errors import DuplicateKeyError
from backend.quizzes import create_quiz_router

@pytest.fixture
def quiz_api():
    user={'id':'s','nome':'Aluno','role':'student','turma':'7º ANO'}
    quiz={'id':'q','turma':'7º ANO','professor_id':'t','aberto':True,'perguntas':[{'texto':'Pergunta','opcoes':['A','B'],'correta':1}]}
    async def find(query, projection=None):
        return dict(quiz) if all((quiz.get(k)!=v['$ne'] if isinstance(v,dict) else quiz.get(k)==v) for k,v in query.items()) else None
    db=SimpleNamespace(quizzes=SimpleNamespace(find_one=AsyncMock(side_effect=find),insert_one=AsyncMock(),update_one=AsyncMock(return_value=SimpleNamespace(matched_count=1)),delete_one=AsyncMock(return_value=SimpleNamespace(deleted_count=1))),quiz_attempts=SimpleNamespace(find_one=AsyncMock(return_value=None),insert_one=AsyncMock()),quiz_sessions=SimpleNamespace(find_one=AsyncMock(),insert_one=AsyncMock(),update_one=AsyncMock(return_value=SimpleNamespace(matched_count=1))))
    async def current():return user
    async def staff():
        if user['role'] not in ('teacher','admin'):raise HTTPException(403)
        return user
    app=FastAPI();app.include_router(create_quiz_router(db,current,staff))
    def request(method,path,**kw):
        async def run():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as c:return await c.request(method,path,**kw)
        return asyncio.run(run())
    return request,user,quiz,db

def test_answers_hidden_and_other_class_denied(quiz_api):
    req,user,_,_=quiz_api
    assert 'correta' not in req('GET','/quizzes/q').json()['perguntas'][0]
    user['turma']='8º ANO'
    assert req('GET','/quizzes/q').status_code==404
    assert req('POST','/quizzes/q/answers',json={'respostas':[1]}).status_code==404

def test_server_grading_duplicate_and_closed(quiz_api):
    req,_,quiz,db=quiz_api
    assert req('POST','/quizzes/q/answers',json={'respostas':[1]}).json()['acertos']==1
    assert db.quiz_attempts.insert_one.call_args.args[0]['_id']=='q:s'
    db.quiz_attempts.insert_one.side_effect=DuplicateKeyError('duplicate')
    assert req('POST','/quizzes/q/answers',json={'respostas':[0]}).status_code==409
    quiz['aberto']=False
    assert req('POST','/quizzes/q/answers',json={'respostas':[0]}).status_code==409

@pytest.mark.parametrize('answers',[[],[0,1],[-1],[9]])
def test_invalid_answers(quiz_api,answers):
    req,_,_,db=quiz_api
    assert req('POST','/quizzes/q/answers',json={'respostas':answers}).status_code==422
    db.quiz_attempts.insert_one.assert_not_called()

def test_publish_permissions_and_validation(quiz_api):
    req,user,quiz,db=quiz_api
    payload={'titulo':'Teste','turma':'7º ANO','perguntas':quiz['perguntas']}
    assert req('POST','/quizzes',json=payload).status_code==403
    user.update(role='teacher',id='t',turmas=['8º ANO'])
    assert req('POST','/quizzes',json=payload).status_code==403
    user['turmas']=['7º ANO']
    assert req('POST','/quizzes',json=payload).status_code==201
    payload['perguntas'][0]['correta']=3
    assert req('POST','/quizzes',json=payload).status_code==422


def test_draft_lifecycle(quiz_api):
    req,user,quiz,db=quiz_api
    quiz['rascunho']=True
    assert req('GET','/quizzes/q').status_code==404
    user.update(role='teacher',id='t',turmas=['7º ANO'])
    payload={'titulo':'Editar','turma':'7º ANO','perguntas':quiz['perguntas'],'nota_maxima':20,'segundos':30}
    assert req('PUT','/quizzes/q',json=payload).status_code==200
    assert req('POST','/quizzes/q/publish').status_code==200
    assert req('DELETE','/quizzes/q').status_code==204
    quiz['rascunho']=False
    assert req('PUT','/quizzes/q',json=payload).status_code==409
    assert req('DELETE','/quizzes/q').status_code==409
    user['id']='other-teacher'
    assert req('POST','/quizzes/q/publish').status_code==404


def test_timer_expiry_and_resume(quiz_api):
    from datetime import datetime, timezone, timedelta
    req,user,quiz,db=quiz_api
    quiz.update(segundos=30,nota_maxima=20)
    assert req('POST','/quizzes/q/answers',json={'respostas':[1]}).status_code==409
    first=req('POST','/quizzes/q/start').json()
    session={'_id':'q:s',**first}
    db.quiz_sessions.insert_one.side_effect=DuplicateKeyError('existing')
    db.quiz_sessions.find_one.return_value=session
    assert req('POST','/quizzes/q/start').json()['limite']==first['limite']
    assert req('POST','/quizzes/q/step',json={'indice':0,'resposta':-1}).status_code==409
    session['limite']=(datetime.now(timezone.utc)-timedelta(seconds=1)).isoformat()
    assert req('POST','/quizzes/q/step',json={'indice':0,'resposta':1}).json()['concluido']
    assert db.quiz_attempts.insert_one.call_args.args[0]['acertos']==0
    assert db.quiz_attempts.insert_one.call_args.args[0]['respostas']==[-1]
    session['limite']=(datetime.now(timezone.utc)+timedelta(seconds=30)).isoformat()
    assert req('POST','/quizzes/q/step',json={'indice':0,'resposta':1}).status_code==200
    assert db.quiz_attempts.insert_one.call_args.args[0]['nota']==20
    db.quiz_sessions.update_one.return_value=SimpleNamespace(matched_count=0)
    assert req('POST','/quizzes/q/step',json={'indice':0,'resposta':1}).status_code==409

def test_ranking_access_ties_and_privacy(quiz_api):
    from unittest.mock import Mock
    req,user,quiz,db=quiz_api
    assert req('GET','/quizzes/q/ranking').status_code==403
    db.quiz_attempts.find_one.return_value={'user_id':'s'}
    rows=[{'user_id':'other','nome':'Ana','acertos':1,'total':1,'respostas':[1]}, {'user_id':'s','nome':'Aluno','acertos':1,'total':1}, {'user_id':'third','nome':'Pedro','acertos':0,'total':1}]
    db.quiz_attempts.find=Mock(return_value=SimpleNamespace(to_list=AsyncMock(return_value=rows)))
    result=req('GET','/quizzes/q/ranking').json()
    assert [r['posicao'] for r in result['participantes']]==[1,1,3]
    assert result['participantes'][0]['voce'] is True
    assert all(set(r)=={'nome','posicao','acertos','total','voce'} for r in result['participantes'])
    db.quiz_attempts.find.assert_called_once_with({'quiz_id':'q'},{'_id':0,'user_id':1,'nome':1,'acertos':1,'total':1})
    quiz['aberto']=False
    assert req('GET','/quizzes/q/ranking').json()['encerrado'] is True
    user['turma']='8º ANO'
    assert req('GET','/quizzes/q/ranking').status_code==404
    user.update(role='teacher',id='other-teacher')
    assert req('GET','/quizzes/q/ranking').status_code==404
