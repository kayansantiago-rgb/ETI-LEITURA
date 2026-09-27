"""Exercise templates and retries against a disposable local MongoDB database."""
import asyncio
import sys
from pathlib import Path
from uuid import uuid4
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import httpx
from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from backend.activities import create_activity_router
from backend.gradebook import create_gradebook_router
from backend.school import notifications


async def main():
    client=AsyncIOMotorClient('mongodb://127.0.0.1:27017',serverSelectionTimeoutMS=5000)
    name='eti_check_attempts_'+uuid4().hex
    db=client[name]
    user={'id':'teacher','nome':'Professor de teste','role':'teacher','turmas':['7º ANO']}
    async def current():return user
    async def staff():
        if user['role'] not in ['admin','teacher']:raise HTTPException(403)
        return user
    app=FastAPI()
    app.include_router(create_activity_router(db,current,staff))
    app.include_router(create_gradebook_router(db,current,staff))
    try:
        await db.activity_submissions.create_index([('activity_id',1),('user_id',1)],unique=True)
        await db.users.insert_many([{'id':'student','nome':'Aluno teste','role':'student','turma':'7º ANO'},{'id':'other','nome':'Outro','role':'student','turma':'8º ANO'}])
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as api:
            async def request(method,path,code=200,**kwargs):
                result=await api.request(method,path,**kwargs)
                assert result.status_code==code,(method,path,result.status_code,result.text)
                return result.json() if result.content else None
            payload={'titulo':'Interpretação','turma':'7º ANO','disciplina':'Português','bimestre':1,'perguntas':[{'enunciado':'Explique a ideia principal.','tipo':'texto'},{'enunciado':'Escolha','tipo':'alternativa','alternativas':['A','B']}],'prazo':'2000-01-01'}
            model=await request('POST','/admin/activity-templates',201,json=payload)
            assert 'prazo' not in model and 'turma' not in model
            assert len(await request('GET','/admin/activity-templates'))==1
            user['id']='another-teacher'
            assert await request('GET','/admin/activity-templates')==[]
            await request('PUT','/admin/activity-templates/'+model['id'],404,json=payload)
            await request('DELETE','/admin/activity-templates/'+model['id'],404)
            user['id']='teacher'
            await request('PUT','/admin/activity-templates/'+model['id'],json={**payload,'titulo':'Modelo revisado'})
            activity=await request('POST','/admin/activities',201,json={**model,'turma':'7º ANO','prazo':None})
            assert not set(q['id'] for q in model['perguntas']) & set(q['id'] for q in activity['perguntas'])
            await request('POST','/admin/activities',403,json={**model,'turma':'8º ANO'})
            aid=activity['id'];path=f'/activities/{aid}/response'
            answers={'respostas':[{'pergunta_id':q['id'],'resposta':'Original' if q['tipo']=='texto' else 'A'} for q in activity['perguntas']]}
            user.update(id='student',role='student',turma='7º ANO',nome='Aluno teste')
            await request('GET','/admin/activity-templates',403)
            await request('POST','/admin/activity-templates',403,json=payload)
            first=await request('PUT',path,json=answers)
            await request('PUT',path,409,json=answers)
            response_path=f"/admin/activities/{aid}/responses/{first['id']}"
            await request('POST',response_path+'/return',403,json={'orientacoes':'Rever','prazo':'2099-01-01'})
            user.update(id='teacher',role='teacher',nome='Professor de teste')
            await request('PUT',response_path+'/correction',json={'nota':0,'feedback':'Explique melhor','versao':first['updated_at']})
            await db.activities.update_one({'id':aid},{'$set':{'status':'encerrada','prazo':'2000-01-01'}})
            await request('POST',response_path+'/return',400,json={'orientacoes':'Rever','prazo':'2000-01-01'})
            await request('POST',response_path+'/return',json={'orientacoes':'Inclua exemplos','prazo':'2099-01-01','versao':first['updated_at']})
            await request('PUT',response_path+'/correction',409,json={'nota':5})
            user['turmas']=['8º ANO']
            await request('POST',response_path+'/return',404,json={'orientacoes':'Rever','prazo':'2099-01-01'})
            user.update(id='student',role='student',turma='7º ANO',turmas=['7º ANO'])
            detail=await request('GET','/activities/'+aid)
            assert detail['encerrada'] and detail['pode_reenviar']
            assert any(n['id'].startswith('retry:') for n in await notifications(db,user))
            await db.activity_submissions.update_one({'id':first['id']},{'$set':{'reenvio.prazo':'2000-01-01'}})
            await request('PUT',path,409,json=answers)
            await db.activity_submissions.update_one({'id':first['id']},{'$set':{'reenvio.prazo':'2099-01-01'}})
            answers['respostas'][0]['resposta']='Revisada com exemplos'
            second=await request('PUT',path,json=answers)
            assert second['tentativa']==2 and second['nota'] is None and len(second['historico'])==1
            assert second['historico'][0]['nota']==0 and second['historico'][0]['feedback']=='Explique melhor'
            assert second['historico'][0]['respostas'][0]['resposta']=='Original'
            assert (await request('GET','/gradebook'))['notas']==[]
            await request('PUT',path,409,json=answers)
            user.update(id='other',turma='8º ANO')
            await request('GET','/activities/'+aid,404)
            user.update(id='teacher',role='teacher',turmas=['7º ANO'])
            await request('PUT',response_path+'/correction',409,json={'nota':9,'versao':first['updated_at']})
            await request('PUT',response_path+'/correction',json={'nota':9,'feedback':'Agora sim','versao':second['updated_at']})
            grades=(await request('GET','/gradebook'))['notas']
            assert len(grades)==1 and grades[0]['nota']==9
            await request('DELETE','/admin/activity-templates/'+model['id'],204)
            assert await db.activities.count_documents({'id':aid})==1
            assert (await db.activity_submissions.find_one({'id':first['id']}))['historico'][0]['nota']==0
            print('PASS: model ownership, independent publication, role/class permissions, retry deadlines, immutable previous attempt, stale correction rejection, one grade per activity, notification.')
    finally:
        assert name.startswith('eti_check_attempts_') and len(name)==51
        await client.drop_database(name)
        client.close()


if __name__=='__main__':asyncio.run(main())
