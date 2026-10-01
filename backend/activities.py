"""Atividades por turma, respostas individuais e correção do professor."""
from datetime import date, datetime, timezone, timedelta
from typing import Optional, Literal
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError
from backend.permissions import staff, scoped_ids

class Question(BaseModel):
    enunciado: str = Field(min_length=1,max_length=3000)
    tipo: Literal['texto','alternativa'] = 'texto'
    alternativas: list[str] = Field(default_factory=list,max_length=6)

class Attachment(BaseModel):
    nome: str = Field(min_length=1,max_length=200)
    url: str = Field(pattern=r'^/api/uploads/[a-zA-Z0-9_./-]+$',max_length=500)

class ActivityCreate(BaseModel):
    publicar_em: Optional[datetime] = None
    disciplina: str = Field(default='', max_length=80)
    valor_nota: Optional[float] = Field(default=10.0, ge=0, le=100)
    bimestre: Optional[int] = Field(default=None, ge=1, le=4)
    titulo: str = Field(min_length=1, max_length=160)
    descricao: str = Field(default='', max_length=10000)
    turma: str = 'TODAS'
    prazo: Optional[date] = None
    perguntas: list[str | Question] = Field(min_length=1, max_length=20)
    book_id: Optional[str] = None
    anexos: list[Attachment] = Field(default_factory=list,max_length=5)

class Answer(BaseModel):
    pergunta_id: str
    resposta: str = Field(min_length=1, max_length=10000)

class SubmissionCreate(BaseModel):
    respostas: list[Answer] = Field(min_length=1, max_length=20)

class ActivityStatus(BaseModel):
    status: Literal['aberta', 'encerrada']

class ActivityGrade(BaseModel):
    versao: Optional[str] = None
    nota: float = Field(ge=0, le=10)
    feedback: str = Field(default='', max_length=10000)

class ReturnAttempt(BaseModel):
    orientacoes: str = Field(min_length=1, max_length=10000)
    prazo: date
    versao: Optional[str] = None

def retry_open(submission):
    today = datetime.now(timezone(timedelta(hours=-3))).date().isoformat()
    return bool(submission and submission.get('reenvio') and submission['reenvio']['prazo'] >= today)

def revision_query(row):
    return {'id': row['id'], 'updated_at': row.get('updated_at'), 'corrigido_em': row.get('corrigido_em'), 'reenvio': row.get('reenvio')}

CLASSES = {'TODAS', '7º ANO', '8º ANO', '9º ANO', '1º SÉRIE A', '1º SÉRIE B', '2º SÉRIE', '3º SÉRIE A', '3º SÉRIE B'}

def published_query(at=None):
    return {'$or':[{'publicar_em':None},{'publicar_em':{'$lte':(at or datetime.now(timezone.utc)).isoformat()}}]}


def is_published(activity,at=None):
    return not activity.get('publicar_em') or datetime.fromisoformat(activity['publicar_em']) <= (at or datetime.now(timezone.utc))


class FeedbackTemplate(BaseModel):
    texto: str = Field(min_length=1,max_length=2000)


def is_closed(activity):
    today = datetime.now(timezone(timedelta(hours=-3))).date().isoformat()
    return activity['status'] == 'encerrada' or bool(activity.get('prazo') and activity['prazo'] < today)

def create_activity_router(db, get_current_user, require_admin):
    router = APIRouter()

    async def visible(activity_id, user):
        activity = await db.activities.find_one({'id': activity_id}, {'_id': 0})
        allowed = ['TODAS', *user.get('turmas', [])] if user['role']=='teacher' else ['TODAS', user.get('turma')]
        if not activity or (user['role'] != 'admin' and activity['turma'] not in allowed):
            raise HTTPException(404, 'Atividade não encontrada')
        if user['role']=='student' and not is_published(activity):raise HTTPException(404,'Atividade não encontrada')
        return activity

    async def build(data,user,template=False,existing=None):
        if not data.titulo.strip():raise HTTPException(400,'Preencha o título')
        if data.turma not in CLASSES:raise HTTPException(400,'Turma inválida')
        if not template and user['role']=='teacher' and data.turma not in user.get('turmas',[]):raise HTTPException(403,'Escolha uma das suas turmas')
        if not template and data.prazo and data.prazo < datetime.now(timezone(timedelta(hours=-3))).date():raise HTTPException(400,'O prazo não pode estar no passado')
        if data.book_id and not await db.books.find_one({'id':data.book_id}):raise HTTPException(400,'Livro não encontrado')
        publication = None
        if data.publicar_em and not template:
            if data.publicar_em.tzinfo is None:raise HTTPException(400,'Informe o fuso horário da publicação')
            publication=data.publicar_em.astimezone(timezone.utc).isoformat()
            unchanged=existing and existing.get('publicar_em')==publication
            if not unchanged and data.publicar_em<=datetime.now(timezone.utc):raise HTTPException(400,'Escolha uma data e hora futuras para agendar')
            if existing and is_published(existing) and not unchanged:raise HTTPException(409,'Uma atividade já publicada não pode voltar ao agendamento')
            if data.prazo and data.publicar_em.astimezone(timezone(timedelta(hours=-3))).date()>data.prazo:raise HTTPException(400,'A publicação deve acontecer até o dia do prazo de entrega')
        elif existing and existing.get('publicar_em'):
            publication=existing['publicar_em'] if is_published(existing) else datetime.now(timezone.utc).isoformat()
        questions=[]
        for source in data.perguntas:
            q={'enunciado':source.strip(),'tipo':'texto','alternativas':[]} if isinstance(source,str) else source.model_dump()
            q['enunciado']=q['enunciado'].strip()
            if not q['enunciado'] or len(q['enunciado'])>3000:raise HTTPException(400,'Preencha todas as perguntas')
            choices=[x.strip() for x in q['alternativas']]
            if q['tipo']=='alternativa' and (len(choices)<2 or any(not x or len(x)>500 for x in choices) or len(set(choices))!=len(choices)):raise HTTPException(400,'Informe de 2 a 6 alternativas diferentes, até 500 caracteres cada')
            questions.append({**q,'alternativas':choices if q['tipo']=='alternativa' else [],'id':str(uuid4())})
        return {'publicar_em':publication,'disciplina':data.disciplina.strip(),'valor_nota':data.valor_nota if data.valor_nota is not None else 10.0,'bimestre':data.bimestre,'titulo':data.titulo.strip(),'descricao':data.descricao.strip(),'turma':data.turma,'prazo':data.prazo.isoformat() if data.prazo else None,'perguntas':questions,'book_id':data.book_id,'anexos':[a.model_dump() for a in data.anexos]}

    def can_manage(activity,user):
        if user['role']=='teacher' and activity.get('professor_id')!=user['id']:raise HTTPException(403,'Somente o autor ou administrador pode alterar esta atividade')

    async def response_query(activity_id,user):
        q={'activity_id':activity_id}
        if user['role']=='teacher':q['user_id']={'$in':await scoped_ids(db,user)}
        return q

    @router.get('/admin/feedback-templates')
    async def feedback_templates(user=Depends(require_admin)):
        return await db.feedback_templates.find({'professor_id':user['id']},{'_id':0}).sort('created_at',-1).to_list(100)

    @router.post('/admin/feedback-templates',status_code=201)
    async def create_feedback_template(data:FeedbackTemplate,user=Depends(require_admin)):
        if not data.texto.strip():raise HTTPException(400,'Escreva um comentário')
        if await db.feedback_templates.count_documents({'professor_id':user['id']})>=100:raise HTTPException(409,'Você pode salvar até 100 comentários')
        item={'id':str(uuid4()),'professor_id':user['id'],'texto':data.texto.strip(),'created_at':datetime.now(timezone.utc).isoformat()}
        await db.feedback_templates.insert_one(dict(item))
        return item

    @router.delete('/admin/feedback-templates/{template_id}',status_code=204)
    async def delete_feedback_template(template_id:str,user=Depends(require_admin)):
        result=await db.feedback_templates.delete_one({'id':template_id,'professor_id':user['id']})
        if not result.deleted_count:raise HTTPException(404,'Comentário não encontrado')

    @router.get('/admin/activity-templates')
    async def templates(user=Depends(require_admin)):
        return await db.activity_templates.find({'professor_id':user['id']}, {'_id':0}).sort('updated_at',-1).to_list(1000)

    @router.post('/admin/activity-templates', status_code=201)
    async def save_template(data:ActivityCreate,user=Depends(require_admin)):
        values=await build(data,user,template=True)
        for key in ['turma','prazo','publicar_em']: values.pop(key,None)
        values.update(id=str(uuid4()),professor_id=user['id'],updated_at=datetime.now(timezone.utc).isoformat())
        await db.activity_templates.insert_one(dict(values))
        return values

    @router.put('/admin/activity-templates/{template_id}')
    async def edit_template(template_id:str,data:ActivityCreate,user=Depends(require_admin)):
        query={'id':template_id,'professor_id':user['id']}
        if not await db.activity_templates.find_one(query):raise HTTPException(404,'Modelo não encontrado')
        values=await build(data,user,template=True)
        for key in ['turma','prazo','publicar_em']: values.pop(key,None)
        values['updated_at']=datetime.now(timezone.utc).isoformat()
        await db.activity_templates.update_one(query,{'$set':values})
        return await db.activity_templates.find_one(query,{'_id':0})

    @router.delete('/admin/activity-templates/{template_id}', status_code=204)
    async def delete_template(template_id:str,user=Depends(require_admin)):
        result=await db.activity_templates.delete_one({'id':template_id,'professor_id':user['id']})
        if not result.deleted_count:raise HTTPException(404,'Modelo não encontrado')

    @router.put('/admin/activities/{activity_id}')
    async def edit_activity(activity_id:str,data:ActivityCreate,user=Depends(require_admin)):
        a=await visible(activity_id,user);can_manage(a,user)
        if await db.activity_submissions.count_documents({'activity_id':activity_id}):raise HTTPException(409,'Atividade com respostas não pode ser editada')
        values=await build(data,user,existing=a)
        await db.activities.update_one({'id':activity_id},{'$set':values})
        return {**a,**values}

    @router.post('/admin/activities', status_code=201)
    async def create_activity(data: ActivityCreate, user=Depends(require_admin)):
        activity = await build(data,user)
        activity.update({'id':str(uuid4()),'status':'aberta','professor_id':user['id'],'professor_nome':user['nome'],'created_at':datetime.now(timezone.utc).isoformat()})
        await db.activities.insert_one(dict(activity))
        return activity

    @router.get('/activities')
    async def list_activities(user=Depends(get_current_user)):
        query = {} if user['role']=='admin' else {'turma':{'$in':['TODAS',*user.get('turmas',[])] if user['role']=='teacher' else ['TODAS',user.get('turma')]}}
        if user['role']=='student':query.update(published_query())
        activities = await db.activities.find(query, {'_id': 0}).sort('created_at', -1).to_list(1000)
        for activity in activities:
            activity['agendada'] = not is_published(activity)
            activity['encerrada'] = is_closed(activity)
            if staff(user):
                scope=await response_query(activity['id'],user)
                activity['entregas'] = await db.activity_submissions.count_documents(scope)
                activity['corrigidas'] = await db.activity_submissions.count_documents({**scope, 'nota': {'$ne': None}, 'reenvio':None})
                activity['devolvidas'] = await db.activity_submissions.count_documents({**scope, 'reenvio': {'$ne':None}})
            else:
                activity['minha_resposta'] = await db.activity_submissions.find_one({'activity_id': activity['id'], 'user_id': user['id']}, {'_id': 0})
                activity['pode_reenviar'] = retry_open(activity['minha_resposta'])
        return activities

    @router.get('/activities/{activity_id}')
    async def get_activity(activity_id: str, user=Depends(get_current_user)):
        activity = await visible(activity_id, user)
        activity['agendada'] = not is_published(activity)
        activity['encerrada'] = is_closed(activity)
        activity['minha_resposta'] = await db.activity_submissions.find_one({'activity_id': activity_id, 'user_id': user['id']}, {'_id': 0})
        activity['pode_reenviar'] = retry_open(activity['minha_resposta'])
        return activity

    @router.put('/activities/{activity_id}/response')
    async def submit_response(activity_id: str, data: SubmissionCreate, user=Depends(get_current_user)):
        activity = await visible(activity_id, user)
        if user['role'] != 'student':
            raise HTTPException(403, 'Apenas alunos podem responder atividades')
        query = {'activity_id': activity_id, 'user_id': user['id']}
        previous = await db.activity_submissions.find_one(query, {'_id':0})
        if previous and not retry_open(previous):
            raise HTTPException(409, 'A resposta já foi entregue. Uma nova tentativa precisa ser liberada pelo professor e estar dentro do prazo.')
        if not previous and is_closed(activity):
            raise HTTPException(409, 'O prazo terminou ou a atividade foi encerrada')
        expected = {q['id'] for q in activity['perguntas']}
        received = {a.pergunta_id for a in data.respostas}
        if expected != received or len(data.respostas) != len(expected) or any(not a.resposta.strip() for a in data.respostas):
            raise HTTPException(400, 'Responda todas as perguntas da atividade')
        for q in activity['perguntas']:
            if q.get('tipo')=='alternativa' and next(a.resposta.strip() for a in data.respostas if a.pergunta_id==q['id']) not in q['alternativas']:raise HTTPException(400,'Escolha uma alternativa válida')
        now = datetime.now(timezone.utc).isoformat()
        values = {
            'user_nome': user['nome'], 'user_turma': user.get('turma'),
            'respostas': [{'pergunta_id': a.pergunta_id, 'resposta': a.resposta.strip()} for a in data.respostas],
            'updated_at': now, 'nota': None, 'feedback': None, 'corrigido_por': None, 'corrigido_em': None,
            'tentativa': (previous.get('tentativa',1)+1) if previous else 1, 'reenvio':None,
        }
        if previous:
            snapshot={key:value for key,value in previous.items() if key not in ['_id','historico']}
            snapshot['tentativa']=previous.get('tentativa',1)
            result=await db.activity_submissions.update_one(revision_query(previous),{'$set':values,'$push':{'historico':snapshot}})
            if not result.matched_count:raise HTTPException(409,'A entrega mudou. Atualize a página antes de tentar novamente.')
        else:
            try:
                await db.activity_submissions.insert_one({**query,**values,'id':str(uuid4()),'created_at':now,'historico':[]})
            except DuplicateKeyError:
                raise HTTPException(409,'A resposta já foi recebida. Atualize a página.')
        return await db.activity_submissions.find_one(query, {'_id': 0})

    @router.get('/admin/activities/{activity_id}/responses')
    async def list_responses(activity_id: str, user=Depends(require_admin)):
        await visible(activity_id, user)
        return await db.activity_submissions.find(await response_query(activity_id,user), {'_id': 0}).sort('updated_at', -1).to_list(1000)

    @router.put('/admin/activities/{activity_id}/responses/{response_id}/correction')
    async def grade_response(activity_id: str, response_id: str, data: ActivityGrade, user=Depends(require_admin)):
        await visible(activity_id,user)
        query = {**await response_query(activity_id,user), 'id': response_id}
        previous=await db.activity_submissions.find_one(query,{'_id':0})
        if not previous:raise HTTPException(404,'Resposta não encontrada')
        if previous.get('reenvio'):raise HTTPException(409,'A atividade foi devolvida. Aguarde a nova entrega para corrigir.')
        if data.versao and data.versao != previous.get('updated_at'):raise HTTPException(409,'Há uma nova entrega. Atualize a página antes de corrigir.')
        result = await db.activity_submissions.update_one({**query,**revision_query(previous)}, {'$set': {
            'nota': data.nota, 'feedback': data.feedback.strip(), 'corrigido_por': user['nome'],
            'corrigido_em': datetime.now(timezone.utc).isoformat(),
        }})
        if not result.matched_count:
            raise HTTPException(409, 'A entrega mudou. Atualize a página antes de corrigir.')
        return await db.activity_submissions.find_one(query, {'_id': 0})

    @router.post('/admin/activities/{activity_id}/responses/{response_id}/return')
    async def return_response(activity_id:str,response_id:str,data:ReturnAttempt,user=Depends(require_admin)):
        await visible(activity_id,user)
        query={**await response_query(activity_id,user),'id':response_id}
        previous=await db.activity_submissions.find_one(query,{'_id':0})
        if not previous:raise HTTPException(404,'Resposta não encontrada')
        if data.versao and data.versao!=previous.get('updated_at'):raise HTTPException(409,'Há uma nova entrega. Atualize a página.')
        if previous.get('reenvio') and retry_open(previous):raise HTTPException(409,'Uma nova tentativa já está liberada.')
        if not data.orientacoes.strip():raise HTTPException(400,'Escreva as orientações para o aluno')
        if data.prazo < datetime.now(timezone(timedelta(hours=-3))).date():raise HTTPException(400,'Escolha um prazo a partir de hoje')
        result=await db.activity_submissions.update_one({**query,**revision_query(previous)},{'$set':{'reenvio':{'orientacoes':data.orientacoes.strip(),'prazo':data.prazo.isoformat(),'professor_nome':user['nome'],'devolvido_em':datetime.now(timezone.utc).isoformat()}}})
        if not result.matched_count:raise HTTPException(409,'A entrega mudou. Atualize a página.')
        return await db.activity_submissions.find_one(query,{'_id':0})

    @router.patch('/admin/activities/{activity_id}/status')
    async def change_status(activity_id: str, data: ActivityStatus, user=Depends(require_admin)):
        activity = await visible(activity_id, user)
        can_manage(activity,user)
        if data.status == 'aberta' and activity.get('prazo') and activity['prazo'] < datetime.now(timezone(timedelta(hours=-3))).date().isoformat():
            raise HTTPException(409, 'O prazo desta atividade já terminou')
        await db.activities.update_one({'id': activity_id}, {'$set': {'status': data.status}})
        return {'status': data.status}

    @router.delete('/admin/activities/{activity_id}', status_code=204)
    async def delete_activity(activity_id: str, user=Depends(require_admin)):
        activity = await visible(activity_id, user)
        can_manage(activity, user)
        await db.activity_submissions.delete_many({'activity_id': activity_id})
        await db.activities.delete_one({'id': activity_id})

    return router
