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
        return dict(quiz) if all(quiz.get(k)==v for k,v in query.items()) else None
    db=SimpleNamespace(quizzes=SimpleNamespace(find_one=AsyncMock(side_effect=find),insert_one=AsyncMock(),update_one=AsyncMock()),quiz_attempts=SimpleNamespace(find_one=AsyncMock(return_value=None),insert_one=AsyncMock()))
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
