"""School accounts, notifications, pending work, reports and password recovery."""
import asyncio, csv, hashlib, io, os, secrets, smtplib
from datetime import datetime, timezone, timedelta
from email.message import EmailMessage
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field, EmailStr
from pymongo.errors import DuplicateKeyError
from backend.permissions import scoped_ids, class_query
from backend.activities import CLASSES, is_closed, retry_open, published_query

class TeacherCreate(BaseModel):
    nome: str = Field(min_length=2,max_length=160)
    email: EmailStr
    password: str = Field(min_length=10,max_length=72)
    turmas: list[str] = Field(min_length=1,max_length=20)
class TeacherUpdate(BaseModel):
    turmas: list[str] = Field(min_length=1,max_length=20)
    active: bool = True
class RecoveryRequest(BaseModel):
    email: EmailStr
class RecoveryComplete(BaseModel):
    token: str = Field(min_length=20,max_length=200)
    password: str = Field(min_length=10,max_length=72)
class ReaderPosition(BaseModel):
    page: int = Field(ge=1,le=100000)
    total: int | None = Field(default=None,ge=1,le=100000)

def now():return datetime.now(timezone.utc).isoformat()
def teacher_activity_query(user):
    return {} if user['role']=='admin' else {'turma':{'$in':['TODAS',*user.get('turmas',[])]}}

async def notifications(db,user):
    notices=[]
    if user['role']=='student':
        for material in await db.study_materials.find({'turma':{'$in':['TODAS',user.get('turma')]}},{'_id':0}).sort('created_at',-1).to_list(1000):
            notices.append({'id':'material:'+material['id'],'titulo':'Novo material: '+material['titulo'],'link':'/videos#material-'+material['id'],'data':material['created_at']})
        for post in await db.mural.find({},{'_id':0}).sort('created_at',-1).to_list(50):
            notices.append({'id':'mural:'+post['id'],'titulo':'Novo no mural: '+post.get('titulo','Aviso da escola'),'link':'/dashboard','data':post['created_at']})
        for quiz in await db.quizzes.find({'turma':user.get('turma'),'rascunho':{'$ne':True}},{'_id':0,'id':1,'titulo':1,'criado_em':1,'publicado_em':1}).sort('criado_em',-1).to_list(200):
            notices.append({'id':'quiz:'+quiz['id'],'titulo':'Novo quiz: '+quiz['titulo'],'link':'/quizzes','data':quiz.get('publicado_em') or quiz.get('criado_em') or now()})
        acts=await db.activities.find({'turma':{'$in':['TODAS',user.get('turma')]},**published_query()},{'_id':0}).sort('created_at',-1).to_list(1000)
        subs={x['activity_id']:x for x in await db.activity_submissions.find({'user_id':user['id']},{'_id':0}).to_list(1000)}
        for a in acts:
            notices.append({'id':'activity:'+a['id'],'titulo':'Nova atividade: '+a['titulo'],'link':'/activities/'+a['id'],'data':a.get('publicar_em') or a['created_at']})
            sub=subs.get(a['id'])
            if sub and sub.get('reenvio'):
                notices.append({'id':'retry:'+sub['id']+':'+sub['reenvio']['devolvido_em'],'titulo':'Atividade devolvida para refazer: '+a['titulo'],'link':'/activities/'+a['id'],'data':sub['reenvio']['devolvido_em']})
            if not sub and not is_closed(a) and a.get('prazo'):
                days=(datetime.fromisoformat(a['prazo']).date()-datetime.now(timezone(timedelta(hours=-3))).date()).days
                if 0<=days<=3:notices.append({'id':'deadline:'+a['id']+':'+a['prazo'],'titulo':'Prazo próximo: '+a['titulo'],'link':'/activities/'+a['id'],'data':now()})
            if sub and sub.get('corrigido_em'):notices.append({'id':'grade:'+sub['id']+':'+sub['corrigido_em'],'titulo':'Atividade corrigida: '+a['titulo'],'link':'/activities/'+a['id'],'data':sub['corrigido_em']})
        for n in await db.student_nudges.find({'user_id':user['id']},{'_id':0}).sort('created_at',-1).to_list(30):
            notices.append({'id':'nudge:'+n['id'],'titulo':'Lembrete de '+n['autor_nome'].split(' ')[0]+': '+n['mensagem'],'link':n.get('link') or '/workspace','data':n['created_at']})
        for collection,path,label in [('summaries','/summaries','Resumo'),('text_productions','/text-productions','Produção textual')]:
            for x in await db[collection].find({'user_id':user['id'],'corrigido_em':{'$ne':None}},{'_id':0}).to_list(1000):
                notices.append({'id':collection+':'+x['id']+':'+x['corrigido_em'],'titulo':label+' corrigido: confira seu feedback','link':path,'data':x['corrigido_em']})
    else:
        if user['role']=='admin':
            for r in await db.deletion_requests.find({},{'_id':0}).to_list(500):
                notices.append({'id':'deletion:'+r['id']+':'+r['created_at'],'titulo':'Pedido de exclusão de dados: '+r['nome'],'link':'/admin/classes/'+(r.get('turma') or ''),'data':r['created_at']})
        ids=await scoped_ids(db,user)
        for collection,label,path in [('summaries','Resumo','/admin/summaries'),('text_productions','Produção textual','/admin/text-productions')]:
            for work in await db[collection].find({'user_id':{'$in':ids},'nota':None},{'_id':0}).sort('created_at',-1).to_list(1000):
                notices.append({'id':'pending:'+collection+':'+work['id'],'titulo':label+' para corrigir','link':path,'data':work.get('updated_at') or work.get('created_at') or now()})
        for x in await db.activity_submissions.find({'user_id':{'$in':ids},'nota':None},{'_id':0}).sort('updated_at',-1).to_list(1000):
            if x.get('reenvio'):continue
            a=await db.activities.find_one({'id':x['activity_id']})
            if a and (user['role']=='admin' or a['turma']=='TODAS' or a['turma'] in user.get('turmas',[])):
                notices.append({'id':'submission:'+x['id']+':'+x['updated_at'],'titulo':'Resposta para corrigir: '+x['user_nome'],'link':'/admin/activities/'+x['activity_id'],'data':x['updated_at']})
    read={x['notice_id'] for x in await db.notification_reads.find({'user_id':user['id']},{'notice_id':1}).to_list(10000)}
    for x in notices:x['lida']=x['id'] in read
    return sorted(notices,key=lambda x:x['data'],reverse=True)[:100]

async def report_data(db,user,turma=None):
    students=await db.users.find(class_query(user,turma),{'_id':0,'id':1,'nome':1,'turma':1}).sort('nome',1).to_list(10000)
    rows=[];months={}
    scales={a['id']:a.get('valor_nota') for a in await db.activities.find({},{'_id':0,'id':1,'valor_nota':1}).to_list(10000)}
    for u in students:
        entries=[]
        for collection in ['summaries','text_productions','activity_submissions']:
            entries+=await db[collection].find({'user_id':u['id']},{'_id':0}).to_list(10000)
        def scaled(e):
            # Notas de atividades são convertidas para a escala 0 a 10 conforme o valor da atividade.
            maximo=(scales.get(e.get('activity_id')) or 10) if e.get('activity_id') else 10
            return e['nota']*10/maximo
        grades=[scaled(e) for e in entries if e.get('nota') is not None]
        for e in entries:
            if e.get('nota') is not None:
                month=(e.get('corrigido_em') or e.get('updated_at') or e.get('created_at',''))[:7]
                if month:months.setdefault(month,[]).append(scaled(e))
        assigned=await db.activities.find({'turma':{'$in':['TODAS',u.get('turma')]},**published_query()},{'id':1}).to_list(10000)
        delivered=await db.activity_submissions.count_documents({'user_id':u['id'],'activity_id':{'$in':[a['id'] for a in assigned]}})
        rows.append({**u,'atividades_disponiveis':len(assigned),'participacao':round(100*delivered/len(assigned)) if assigned else None,'leituras_concluidas':await db.reading_progress.count_documents({'user_id':u['id'],'percentage':100}),
            'resumos':await db.summaries.count_documents({'user_id':u['id']}),'producoes':await db.text_productions.count_documents({'user_id':u['id']}),
            'atividades_entregues':await db.activity_submissions.count_documents({'user_id':u['id']}),
            'media':round(sum(grades)/len(grades),2) if grades else None,'avaliacoes':len(grades)})
    return {'alunos':rows,'evolucao':[{'mes':k,'media':round(sum(v)/len(v),2),'avaliacoes':len(v)} for k,v in sorted(months.items())]}

def create_school_router(db,current,admin,staff,hash_password):
    router=APIRouter()
    @router.get('/admin/teachers')
    async def teachers(user=Depends(admin)):
        return await db.users.find({'role':'teacher'},{'_id':0,'id':1,'nome':1,'email':1,'turmas':1,'active':1}).sort('nome',1).to_list(1000)
    @router.post('/admin/teachers',status_code=201)
    async def add_teacher(data:TeacherCreate,user=Depends(admin)):
        if any(c not in CLASSES-{'TODAS'} for c in data.turmas):raise HTTPException(400,'Turma inválida')
        doc={'id':str(uuid4()),'nome':data.nome.strip(),'email':str(data.email).lower(),'password_hash':hash_password(data.password),'role':'teacher','turmas':list(set(data.turmas)),'active':True,'created_at':now()}
        try:await db.users.insert_one(doc)
        except DuplicateKeyError:raise HTTPException(409,'E-mail já cadastrado')
        return {'id':doc['id'],'message':'Conta individual criada'}
    @router.put('/admin/teachers/{teacher_id}')
    async def update_teacher(teacher_id:str,data:TeacherUpdate,user=Depends(admin)):
        if any(c not in CLASSES-{'TODAS'} for c in data.turmas):raise HTTPException(400,'Turma inválida')
        result=await db.users.update_one({'id':teacher_id,'role':'teacher'},{'$set':{'turmas':list(set(data.turmas)),'active':data.active},'$inc':{'token_version':1}})
        if not result.matched_count:raise HTTPException(404,'Professor não encontrado')
        return {'message':'Permissões atualizadas; o professor deve entrar novamente.'}
    @router.get('/notifications')
    async def get_notifications(user=Depends(current)):return await notifications(db,user)
    @router.post('/notifications/read')
    async def read_notice(request:Request,user=Depends(current)):
        body=await request.json();notice_id=body.get('id','')
        if not isinstance(notice_id,str) or len(notice_id)>300:raise HTTPException(400,'Aviso inválido')
        await db.notification_reads.update_one({'user_id':user['id'],'notice_id':notice_id},{'$set':{'read_at':now()}},upsert=True)
        return {'ok':True}
    @router.post('/notifications/read-all')
    async def read_all(user=Depends(current)):
        for notice in await notifications(db,user):
            if not notice['lida']:
                await db.notification_reads.update_one({'user_id':user['id'],'notice_id':notice['id']},{'$set':{'read_at':now()}},upsert=True)
        return {'ok':True}
    @router.get('/workspace')
    async def workspace(user=Depends(current)):
        result={'atividades':[],'correcoes':[]}
        if user['role']=='student':
            acts=await db.activities.find({'turma':{'$in':['TODAS',user.get('turma')]},**published_query()},{'_id':0}).to_list(1000)
            for a in acts:
                submitted=await db.activity_submissions.find_one({'activity_id':a['id'],'user_id':user['id']})
                result['atividades'].append({'id':a['id'],'titulo':a['titulo'],'prazo':(submitted or {}).get('reenvio',{}).get('prazo') if (submitted or {}).get('reenvio') else a.get('prazo'),'estado':'Devolvida' if retry_open(submitted) else 'Prazo encerrado' if submitted and submitted.get('reenvio') else 'Corrigida' if submitted and submitted.get('nota') is not None else 'Entregue' if submitted else 'Prazo encerrado' if is_closed(a) else 'A entregar','link':'/activities/'+a['id']})
        else:
            students=await db.users.find(class_query(user),{'_id':0,'id':1,'nome':1,'turma':1}).to_list(10000)
            acts=await db.activities.find({**teacher_activity_query(user),**published_query()},{'_id':0}).to_list(1000)
            for a in acts:
                members=[u for u in students if a['turma']=='TODAS' or u.get('turma')==a['turma']]
                subs=await db.activity_submissions.find({'activity_id':a['id'],'user_id':{'$in':[u['id'] for u in members]}},{'_id':0}).to_list(10000)
                delivered={x['user_id'] for x in subs}
                result['atividades'].append({'id':a['id'],'titulo':a['titulo'],'prazo':a.get('prazo'),'entregaram':[u['nome'] for u in members if u['id'] in delivered],'faltam':[u['nome'] for u in members if u['id'] not in delivered],'corrigir':sum(x.get('nota') is None and not x.get('reenvio') for x in subs),'link':'/admin/activities/'+a['id']})
            ids=[u['id'] for u in students]
            for collection,label,path in [('summaries','Resumos','/admin/summaries'),('text_productions','Produções textuais','/admin/text-productions')]:
                result['correcoes'].append({'titulo':label,'quantidade':await db[collection].count_documents({'user_id':{'$in':ids},'nota':None}),'link':path})
        return result
    @router.get('/admin/reports')
    async def report(turma:str=None,user=Depends(staff)):return await report_data(db,user,turma)
    @router.get('/admin/reports.csv')
    async def export(turma:str=None,user=Depends(staff)):
        rows=(await report_data(db,user,turma))['alunos'];out=io.StringIO();writer=csv.writer(out,delimiter=';')
        writer.writerow(['Aluno','Turma','Leituras concluídas','Resumos','Produções','Atividades entregues','Média','Avaliações','Participação (%)'])
        def safe(value):
            text=str(value if value is not None else '')
            return "'"+text if text.startswith(('=','+','-','@','\t','\r','\n')) else text
        for r in rows:writer.writerow([safe(r.get(k)) for k in ['nome','turma','leituras_concluidas','resumos','producoes','atividades_entregues','media','avaliacoes','participacao']])
        return Response('\ufeff'+out.getvalue(),media_type='text/csv; charset=utf-8',headers={'Content-Disposition':'attachment; filename="eti-relatorio.csv"'})
    @router.get('/admin/reports.pdf')
    async def export_pdf(turma:str=None,user=Depends(staff)):
        from backend.report_pdf import build_report_pdf
        data=await report_data(db,user,turma)
        label=turma or ('Todas as turmas' if user['role']=='admin' else 'Todas as minhas turmas')
        content=await asyncio.to_thread(build_report_pdf,data,label,user.get('nome','Professor'))
        name='eti-relatorio'+('-'+''.join(c if c.isalnum() else '-' for c in turma.lower()) if turma else '')+'.pdf'
        return Response(content,media_type='application/pdf',headers={'Content-Disposition':f'attachment; filename="{name}"'})
    @router.get('/books/{book_id}/position')
    async def position(book_id:str,user=Depends(current)):
        return await db.reader_positions.find_one({'user_id':user['id'],'book_id':book_id},{'_id':0}) or {'page':1}
    @router.put('/books/{book_id}/position')
    async def save_position(book_id:str,data:ReaderPosition,user=Depends(current)):
        if not await db.books.find_one({'id':book_id}):raise HTTPException(404,'Livro não encontrado')
        previous=await db.reader_positions.find_one({'user_id':user['id'],'book_id':book_id},{'_id':0,'page':1})
        await db.reader_positions.update_one({'user_id':user['id'],'book_id':book_id},{'$set':{'page':data.page,'total':data.total,'updated_at':now()}},upsert=True)
        if user['role']=='student':
            from backend.reading import record_page
            await record_page(db,user['id'],(previous or {}).get('page'),data.page)
        result={'page':data.page}
        if data.total and data.page<=data.total:
            # O progresso acompanha a página mais avançada já lida; voltar páginas não reduz a porcentagem.
            percentage=100 if data.page==data.total else min(99,round(data.page*100/data.total))
            await db.reading_progress.update_one({'user_id':user['id'],'book_id':book_id},{'$max':{'percentage':percentage},'$set':{'updated_at':now()},'$setOnInsert':{'id':str(uuid4())}},upsert=True)
            saved=await db.reading_progress.find_one({'user_id':user['id'],'book_id':book_id},{'_id':0,'percentage':1})
            result['percentage']=saved['percentage'] if saved else percentage
        return result
    async def recovery_link(target):
        token=secrets.token_urlsafe(32)
        await db.password_resets.delete_many({'user_id':target['id']})
        await db.password_resets.insert_one({'user_id':target['id'],'digest':hashlib.sha256(token.encode()).hexdigest(),'expires_at':datetime.now(timezone.utc)+timedelta(minutes=30)})
        return os.environ.get('PUBLIC_APP_URL','http://127.0.0.1:3000').rstrip('/')+'/reset-password?token='+token
    @router.post('/admin/users/{user_id}/recovery')
    async def admin_recovery(user_id:str,user=Depends(admin)):
        target=await db.users.find_one({'id':user_id})
        if not target:raise HTTPException(404,'Conta não encontrada')
        return {'url':await recovery_link(target),'expires_minutes':30}
    @router.get('/auth/recovery-info')
    async def recovery_info():return {'email_enabled':bool(os.environ.get('SMTP_HOST') and os.environ.get('SMTP_FROM'))}
    @router.post('/auth/forgot-password')
    async def forgot(data:RecoveryRequest):
        generic={'message':'Se o e-mail estiver cadastrado, as instruções serão enviadas. Sem e-mail configurado, procure o administrador da escola.'}
        if not os.environ.get('SMTP_HOST') or not os.environ.get('SMTP_FROM'):return generic
        digest=hashlib.sha256(str(data.email).lower().encode()).hexdigest()
        recent=await db.recovery_requests.find_one({'digest':digest,'expires_at':{'$gt':datetime.now(timezone.utc)}})
        if recent:return generic
        await db.recovery_requests.update_one({'digest':digest},{'$set':{'expires_at':datetime.now(timezone.utc)+timedelta(minutes=5)}},upsert=True)
        target=await db.users.find_one({'email':str(data.email).lower(),'active':{'$ne':False}})
        if target:
            link=await recovery_link(target)
            def send():
                msg=EmailMessage();msg['Subject']='Redefinir senha — ETI LEITURA';msg['From']=os.environ['SMTP_FROM'];msg['To']=str(data.email);msg.set_content('Para redefinir sua senha, abra este link em até 30 minutos:\n'+link+'\nSe não solicitou a troca, ignore esta mensagem.')
                with smtplib.SMTP(os.environ['SMTP_HOST'],int(os.environ.get('SMTP_PORT','587')),timeout=20) as smtp:
                    smtp.starttls()
                    if os.environ.get('SMTP_USER'):smtp.login(os.environ['SMTP_USER'],os.environ['SMTP_PASSWORD'])
                    smtp.send_message(msg)
            try:await asyncio.to_thread(send)
            except Exception:pass
        return generic
    @router.post('/auth/reset-password')
    async def reset(data:RecoveryComplete):
        doc=await db.password_resets.find_one_and_delete({'digest':hashlib.sha256(data.token.encode()).hexdigest(),'expires_at':{'$gt':datetime.now(timezone.utc)}})
        if not doc:raise HTTPException(400,'Link inválido, expirado ou já utilizado')
        await db.users.update_one({'id':doc['user_id']},{'$set':{'password_hash':hash_password(data.password)},'$inc':{'token_version':1}})
        return {'message':'Senha atualizada. Entre novamente.'}
    return router
