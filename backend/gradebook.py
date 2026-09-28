"""Reusable rubrics and a consolidated grade register; source grades remain authoritative."""
from datetime import date, datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
from backend.permissions import class_query, ensure_student_scope

def stamp(): return datetime.now(timezone.utc).isoformat()

class Criterion(BaseModel):
    descricao: str = Field(min_length=1, max_length=300)
    pontos: float = Field(gt=0, le=10)

class Rubric(BaseModel):
    titulo: str = Field(min_length=1, max_length=120)
    criterios: list[Criterion] = Field(min_length=1, max_length=10)
    @model_validator(mode='after')
    def check(self):
        if not self.titulo.strip() or any(not c.descricao.strip() for c in self.criterios): raise ValueError('Preencha título e critérios.')
        if abs(sum(c.pontos for c in self.criterios)-10)>0.001: raise ValueError('Os critérios devem somar 10 pontos.')
        return self

class Grade(BaseModel):
    user_id: str = Field(min_length=1, max_length=100)
    titulo: str = Field(min_length=1, max_length=160)
    disciplina: str = Field(min_length=1, max_length=80)
    data: date
    bimestre: int = Field(ge=1, le=4)
    nota: float = Field(ge=0, le=10)
    peso: float = Field(default=1, gt=0, le=100)
    feedback: str = Field(default='', max_length=10000)
    @model_validator(mode='after')
    def check(self):
        if not self.titulo.strip() or not self.disciplina.strip(): raise ValueError('Preencha título e disciplina.')
        return self

def create_gradebook_router(db, current, staff):
    router=APIRouter()
    def rub_scope(user): return {} if user['role']=='admin' else {'professor_id':user['id']}
    @router.get('/admin/rubrics')
    async def rubrics(user=Depends(staff)):
        return await db.rubrics.find(rub_scope(user),{'_id':0}).sort('titulo',1).to_list(1000)
    @router.post('/admin/rubrics',status_code=201)
    async def create_rubric(data:Rubric,user=Depends(staff)):
        item={**data.model_dump(),'id':str(uuid4()),'professor_id':user['id'],'created_at':stamp()}
        await db.rubrics.insert_one(item.copy());return item
    @router.put('/admin/rubrics/{id}')
    async def edit_rubric(id:str,data:Rubric,user=Depends(staff)):
        result=await db.rubrics.update_one({'id':id,**rub_scope(user)},{'$set':data.model_dump()})
        if not result.matched_count: raise HTTPException(404,'Critérios não encontrados.')
        return {'ok':True}
    @router.delete('/admin/rubrics/{id}',status_code=204)
    async def delete_rubric(id:str,user=Depends(staff)):
        result=await db.rubrics.delete_one({'id':id,**rub_scope(user)})
        if not result.deleted_count: raise HTTPException(404,'Critérios não encontrados.')
    async def student_for(user,id):
        await ensure_student_scope(db,user,id)
        student=await db.users.find_one({'id':id,'role':'student'},{'_id':0,'id':1,'nome':1,'turma':1})
        if not student: raise HTTPException(404,'Aluno não encontrado.')
        return student
    async def values(data,user):
        student=await student_for(user,data.user_id)
        return {**data.model_dump(mode='json'),'user_nome':student['nome'],'turma':student.get('turma'),'updated_at':stamp()}
    @router.post('/admin/grades',status_code=201)
    async def create_grade(data:Grade,user=Depends(staff)):
        item={**await values(data,user),'id':str(uuid4()),'professor_id':user['id'],'professor_nome':user['nome'],'created_at':stamp(),'historico':[]}
        await db.grade_entries.insert_one(item.copy());return {k:v for k,v in item.items() if k!='historico'}
    @router.put('/admin/grades/{id}')
    async def edit_grade(id:str,data:Grade,user=Depends(staff)):
        query={'id':id,**rub_scope(user)}
        old=await db.grade_entries.find_one(query,{'_id':0})
        if not old: raise HTTPException(404,'Lançamento não encontrado.')
        await student_for(user,old['user_id'])
        if data.user_id!=old['user_id']: raise HTTPException(400,'O aluno de um lançamento não pode ser alterado.')
        new=await values(data,user)
        snapshot={k:v for k,v in old.items() if k!='historico'}
        # Optimistic concurrency prevents silently overwriting another correction.
        result=await db.grade_entries.update_one({**query,'updated_at':old['updated_at']},{'$set':new,'$push':{'historico':{'antes':snapshot,'alterado_por':user['nome'],'em':stamp()}}})
        if not result.matched_count: raise HTTPException(409,'Este lançamento mudou. Atualize a página e tente novamente.')
        return {'ok':True}
    @router.get('/admin/grades/{id}/history')
    async def grade_history(id:str,user=Depends(staff)):
        item=await db.grade_entries.find_one({'id':id},{'_id':0})
        if not item: raise HTTPException(404,'Lançamento não encontrado.')
        await student_for(user,item['user_id'])
        return item.get('historico',[])
    @router.get('/gradebook')
    async def gradebook(turma:str=None,user=Depends(current)):
        students=[{'id':user['id'],'nome':user['nome'],'turma':user.get('turma')}] if user['role']=='student' else await db.users.find(class_query(user,turma),{'_id':0,'id':1,'nome':1,'turma':1,'email':1}).sort('nome',1).to_list(10000)
        members={s['id']:s for s in students};query={'user_id':{'$in':list(members)}}
        rows=[]
        for row in await db.grade_entries.find(query,{'_id':0,'historico':0}).to_list(10000):
            rows.append({**row,'origem':'manual','editavel':user['role']=='admin' or (user['role']=='teacher' and row['professor_id']==user['id'])})
        activities={a['id']:a for a in await db.activities.find({},{'_id':0,'id':1,'titulo':1,'disciplina':1,'bimestre':1}).to_list(10000)}
        for collection,label,path in [('activity_submissions','Atividade','/activities/'),('summaries','Resumo','/summaries'),('text_productions','Produção textual','/text-productions')]:
            for row in await db[collection].find({**query,'nota':{'$ne':None}},{'_id':0}).to_list(10000):
                if row.get('nota') is None: continue
                a=activities.get(row.get('activity_id'),{})
                member=members[row['user_id']]
                date_value=(row.get('corrigido_em') or row.get('updated_at') or row.get('created_at',''))[:10]
                link=('/admin/activities/' if user['role']!='student' else path)+row['activity_id'] if collection=='activity_submissions' else ('/admin'+path if user['role']!='student' else path)
                rows.append({'id':collection+':'+row['id'],'user_id':row['user_id'],'user_nome':member['nome'],'turma':member.get('turma'),'titulo':a.get('titulo') or row.get('titulo') or label,'disciplina':a.get('disciplina') or 'Sem disciplina','bimestre':a.get('bimestre'),'data':date_value,'nota':row['nota'],'peso':1,'feedback':row.get('feedback') or '', 'origem':label,'editavel':False,'link':link})
        return {'alunos':students,'notas':sorted(rows,key=lambda r:r.get('data',''),reverse=True)}
    return router
