import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
import httpx
import pytest
from fastapi import FastAPI, HTTPException
from backend.teaching import create_teaching_router, video_id, provider_call, Suggestion

@pytest.fixture
def teaching(monkeypatch):
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    user={'id':'teacher','role':'teacher','nome':'Educador','turmas':['7º ANO']}
    def collection():
        c=SimpleNamespace(find_one=AsyncMock(return_value=None),insert_one=AsyncMock(),update_one=AsyncMock(return_value=SimpleNamespace(modified_count=1)),delete_one=AsyncMock(),find=MagicMock())
        c.find.return_value.sort.return_value.to_list=AsyncMock(return_value=[])
        return c
    db=SimpleNamespace(**{n:collection() for n in ['study_materials','ai_usage','users','activity_submissions','activities','summaries','text_productions','books']})
    async def current(): return user
    async def staff():
        if user['role'] not in ('admin','teacher'): raise HTTPException(403)
        return user
    app=FastAPI();app.include_router(create_teaching_router(db,current,staff))
    def request(method,path,**kwargs):
        async def run():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as client: return await client.request(method,path,**kwargs)
        return asyncio.run(run())
    return request,user,db

@pytest.mark.parametrize('url',['https://evil.example/watch?v=abcdefghijk','javascript:alert(1)','https://youtube.com.evil.test/watch?v=abcdefghijk','http://youtu.be/abcdefghijk','https://youtu.be/not-valid'])
def test_reject_arbitrary_video_urls(url):
    with pytest.raises(HTTPException):video_id(url)

def test_valid_video_links():
    assert video_id('https://www.youtube.com/watch?v=abcdefghijk&t=3')=='abcdefghijk'
    assert video_id('https://youtu.be/abcdefghijk')=='abcdefghijk'

def test_student_cannot_publish_or_use_ai(teaching):
    request,user,db=teaching;user['role']='student';user['turma']='8º ANO'
    assert request('GET','/admin/ai/status').status_code==403
    assert request('POST','/admin/ai/generate',json={'tema':'Leitura','disciplina':'Português','turma':'8º ANO'}).status_code==403
    assert request('POST','/admin/materials',json={'titulo':'Teste','disciplina':'História','turma':'8º ANO'}).status_code==403
    request('GET','/materials')
    assert db.study_materials.find.call_args.args[0]=={'turma':{'$in':['TODAS','8º ANO']}}

def test_material_scope_author_and_validation(teaching):
    request,user,db=teaching
    payload={'titulo':'Aula','disciplina':'História','turma':'8º ANO','video_url':'https://youtu.be/abcdefghijk'}
    assert request('POST','/admin/materials',json=payload).status_code==403
    payload['turma']='7º ANO'
    result=request('POST','/admin/materials',json=payload)
    assert result.status_code==201 and result.json()['professor_id']=='teacher'
    db.study_materials.find_one.return_value={**result.json(),'professor_id':'other'}
    assert request('DELETE','/admin/materials/one').status_code==403
    db.study_materials.delete_one.assert_not_called()
    db.study_materials.find_one.return_value=None
    assert request('DELETE','/admin/materials/hidden').status_code==404
    payload['video_url']=''
    assert request('POST','/admin/materials',json=payload).status_code==422

def test_unconfigured_ai_never_calls_provider(teaching,monkeypatch):
    request,_,db=teaching
    provider=MagicMock();monkeypatch.setattr('backend.teaching.provider_call',provider)
    assert request('GET','/admin/ai/status').json()['configured'] is False
    assert request('POST','/admin/ai/generate',json={'tema':'Leitura','disciplina':'Português','turma':'7º ANO'}).status_code==503
    provider.assert_not_called();db.ai_usage.update_one.assert_not_called()

def test_review_does_not_save_grade_or_send_identity(teaching,monkeypatch):
    request,user,db=teaching;monkeypatch.setenv('OPENAI_API_KEY','test-only')
    db.users.find_one.return_value={'id':'student'}
    db.activity_submissions.find_one.return_value={'id':'work','user_id':'student','user_nome':'Private Name','email':'private@example.com','activity_id':'activity','respostas':[{'pergunta_id':'q','resposta':'Minha resposta'}]}
    db.activities.find_one.return_value={'titulo':'Aula','perguntas':[{'id':'q','enunciado':'Pergunta'}]}
    provider=MagicMock(return_value={'nota':8,'feedback':'Revisar argumento','justificativa':'Critério'});monkeypatch.setattr('backend.teaching.provider_call',provider)
    assert request('POST','/admin/ai/review/activity/work',json={}).status_code==200
    payload=provider.call_args.args[0]
    assert 'Private Name' not in str(payload) and 'private@example.com' not in str(payload) and 'student' not in str(payload)
    db.activity_submissions.update_one.assert_not_called()
    db.users.find_one.return_value=None;provider.reset_mock()
    assert request('POST','/admin/ai/review/activity/work',json={}).status_code==404
    provider.assert_not_called()

def test_daily_limit_blocks_before_provider(teaching,monkeypatch):
    request,_,db=teaching;monkeypatch.setenv('OPENAI_API_KEY','test-only')
    db.ai_usage.update_one.return_value=SimpleNamespace(modified_count=0)
    provider=MagicMock();monkeypatch.setattr('backend.teaching.provider_call',provider)
    assert request('POST','/admin/ai/generate',json={'tema':'Leitura','disciplina':'Português','turma':'7º ANO'}).status_code==429
    provider.assert_not_called()

def test_provider_rejects_incomplete_and_invalid_grades(monkeypatch):
    import json
    monkeypatch.setenv('OPENAI_API_KEY','test-only')
    for result in [{'status':'incomplete'}, {'status':'completed','output':[{'content':[{'type':'output_text','text':json.dumps({'nota':99,'feedback':'x','justificativa':'x'})}]}]}]:
        response=MagicMock();response.__enter__.return_value.read.return_value=json.dumps(result)
        monkeypatch.setattr('backend.teaching.urlopen',lambda *a,**kw:response)
        with pytest.raises(HTTPException) as error: provider_call({},Suggestion)
        assert error.value.status_code==502
