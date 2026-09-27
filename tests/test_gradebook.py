import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
import httpx
import pytest
from fastapi import FastAPI, HTTPException
from backend.gradebook import create_gradebook_router

@pytest.fixture
def grade_api():
    user={'id':'teacher','nome':'Professor','role':'teacher','turmas':['7º ANO']}
    def collection():
        c=SimpleNamespace(find=MagicMock(),find_one=AsyncMock(return_value=None),insert_one=AsyncMock(),update_one=AsyncMock(return_value=SimpleNamespace(matched_count=1)),delete_one=AsyncMock(return_value=SimpleNamespace(deleted_count=0)))
        c.find.return_value.to_list=AsyncMock(return_value=[])
        c.find.return_value.sort.return_value.to_list=AsyncMock(return_value=[])
        return c
    class DB(SimpleNamespace):
        def __getitem__(self,key): return getattr(self,key)
    db=DB(**{n:collection() for n in ['users','rubrics','grade_entries','activities','activity_submissions','summaries','text_productions']})
    async def current():return user
    async def staff():
        if user['role'] not in ('admin','teacher'):raise HTTPException(403)
        return user
    app=FastAPI();app.include_router(create_gradebook_router(db,current,staff))
    def request(method,path,**kw):
        async def run():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as c:return await c.request(method,path,**kw)
        return asyncio.run(run())
    return request,user,db

def grade(**kw):return {'user_id':'s','titulo':'Prova','disciplina':'Português','data':'2026-09-18','bimestre':3,'nota':0,'peso':2,**kw}

def test_rubric_totals_and_ownership(grade_api):
    request,_,db=grade_api
    assert request('POST','/admin/rubrics',json={'titulo':'Leitura','criterios':[{'descricao':'Clareza','pontos':5}]}).status_code==422
    assert request('POST','/admin/rubrics',json={'titulo':'Leitura','criterios':[{'descricao':'Clareza','pontos':10}]}).status_code==201
    assert request('DELETE','/admin/rubrics/other').status_code==404
    assert db.rubrics.delete_one.call_args.args[0]=={'id':'other','professor_id':'teacher'}

def test_student_cannot_write_and_only_own_grades(grade_api):
    request,user,db=grade_api;user.update(role='student',id='s',turma='7º ANO')
    assert request('POST','/admin/grades',json=grade()).status_code==403
    assert request('GET','/admin/rubrics').status_code==403
    result=request('GET','/gradebook?turma=8%C2%BA%20ANO')
    assert result.status_code==200
    assert db.grade_entries.find.call_args.args[0]=={'user_id':{'$in':['s']}}

def test_other_class_rejected_and_zero_is_a_grade(grade_api):
    request,_,db=grade_api
    assert request('POST','/admin/grades',json=grade()).status_code==404
    db.grade_entries.insert_one.assert_not_called()
    db.users.find_one.return_value={'id':'s','nome':'Aluno','turma':'7º ANO'}
    result=request('POST','/admin/grades',json=grade())
    assert result.status_code==201 and result.json()['nota']==0
    assert result.json()['professor_id']=='teacher'

@pytest.mark.parametrize('values',[{'nota':11},{'nota':-1},{'peso':0},{'bimestre':5},{'disciplina':' '}])
def test_invalid_grade_rejected(grade_api,values):
    request,_,db=grade_api
    assert request('POST','/admin/grades',json=grade(**values)).status_code==422
    db.grade_entries.insert_one.assert_not_called()

def test_edit_preserves_history_and_student(grade_api):
    request,_,db=grade_api
    old={**grade(),'id':'g','updated_at':'before','historico':[]}
    db.grade_entries.find_one.return_value=old;db.users.find_one.return_value={'id':'s','nome':'Aluno','turma':'7º ANO'}
    assert request('PUT','/admin/grades/g',json=grade(nota=8)).status_code==200
    query,update=db.grade_entries.update_one.call_args.args
    assert query['professor_id']=='teacher' and query['updated_at']=='before'
    assert update['$push']['historico']['antes']['nota']==0
    assert request('PUT','/admin/grades/g',json=grade(user_id='other')).status_code==400

def test_auto_grades_are_read_without_copying(grade_api):
    request,user,db=grade_api;user.update(role='student',id='s',turma='7º ANO')
    db.activity_submissions.find.return_value.to_list.return_value=[{'id':'r','user_id':'s','activity_id':'a','nota':0,'corrigido_em':'2026-09-18T00:00:00Z'}]
    db.activities.find.return_value.to_list.return_value=[{'id':'a','titulo':'Leitura','disciplina':'Português','bimestre':3}]
    result=request('GET','/gradebook').json()
    assert len(result['notas'])==1 and result['notas'][0]['nota']==0
    assert result['notas'][0]['disciplina']=='Português'
    db.grade_entries.insert_one.assert_not_called()
