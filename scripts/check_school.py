"""Integration checks against the local running app; cleans up only its own records."""
import os, sys, json, subprocess, time
from pathlib import Path
from datetime import datetime,timezone,timedelta
from urllib.parse import urlparse,parse_qs
import httpx
from dotenv import load_dotenv
from pymongo import MongoClient
ROOT=Path(__file__).resolve().parent.parent
load_dotenv(ROOT/'backend'/'.env')

def pdf():
    objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>',b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
    for page in [1,2]:
        stream=f'BT /F1 20 Tf 40 400 Td (ETI LEITURA - Pagina {page}) Tj ET'.encode();objects.append(b'<< /Length '+str(len(stream)).encode()+b' >>\nstream\n'+stream+b'\nendstream')
    out=b'%PDF-1.4\n';offsets=[0]
    for i,obj in enumerate(objects,1):offsets.append(len(out));out+=f'{i} 0 obj\n'.encode()+obj+b'\nendobj\n'
    xref=len(out);out+=f'xref\n0 {len(objects)+1}\n0000000000 65535 f \n'.encode()
    for offset in offsets[1:]:out+=f'{offset:010d} 00000 n \n'.encode()
    return out+f'trailer\n<< /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode()

def main():
    marker='QA-ESCOLA-'+str(time.time_ns());ids=[];activities=[];books=[];files=[]
    client=MongoClient(os.environ['MONGO_URL']);db=client[os.environ['DB_NAME']]
    http=httpx.Client(base_url='http://127.0.0.1:8000/api',timeout=30)
    def call(method,path,auth=None,data=None,expected=200):
        r=http.request(method,path,json=data,headers={'Authorization':'Bearer '+auth['access_token']} if auth else {})
        assert r.status_code==expected,(path,r.status_code,r.text[:500])
        return r.json() if r.content and 'json' in r.headers.get('content-type','') else r.text
    try:
        admin=call('POST','/auth/login',data={'email':'admin@etileitura.com','password':os.environ['ETI_TEST_ADMIN_PASSWORD']})
        teachers=[];students=[]
        for i,turma in enumerate(['7º ANO','8º ANO']):
            email=f'{marker}-teacher{i}@example.com'.lower()
            t=call('POST','/admin/teachers',admin,{'nome':marker+' Professor '+str(i),'email':email,'password':'Professor2026!','turmas':[turma]},201);ids.append(t['id'])
            teachers.append(call('POST','/auth/login',data={'email':email,'password':'Professor2026!'}))
            s=call('POST','/auth/register',data={'nome':('='+marker if i==0 else marker)+' Aluno '+str(i),'email':f'{marker}-student{i}@example.com'.lower(),'password':'AlunoTeste2026!','turma':turma});ids.append(s['user']['id']);students.append(s)
        ta,tb=teachers;sa,sb=students
        assert ta['user']['turmas']==['7º ANO']
        call('GET','/admin/teachers',ta,expected=403);call('GET','/admin/reports',sa,expected=403)
        assert all(u['turma']=='7º ANO' for u in call('GET','/admin/users',ta))
        call('GET','/admin/users?turma=8%C2%BA%20ANO',ta,expected=403)
        upload=http.post('/admin/books/upload-pdf',headers={'Authorization':'Bearer '+ta['access_token']},files={'file':('qa.pdf',pdf(),'application/pdf')});assert upload.status_code==200,upload.text
        url=upload.json()['url'];files.append(url)
        b=call('POST','/admin/books',ta,{'titulo':marker+' Livro','autor':'Equipe ETI','descricao':'Livro de verificação','capa_url':'/book-placeholder.svg','arquivo_url':url,'nivel_ensino':'AMBOS'});books.append(b['id'])
        form={'titulo':marker+' Atividade','turma':'7º ANO','prazo':(datetime.now(timezone.utc)+timedelta(days=2)).date().isoformat(),'book_id':b['id'],'anexos':[{'nome':'Leitura de apoio.pdf','url':url}],'perguntas':[{'enunciado':'Escolha uma alternativa','tipo':'alternativa','alternativas':['Leitura','Escrita']},'Compartilhe sua reflexão']}
        call('POST','/admin/activities',ta,{**form,'turma':'8º ANO'},403)
        a=call('POST','/admin/activities',ta,form,201);activities.append(a['id'])
        a=call('PUT','/admin/activities/'+a['id'],ta,{**form,'descricao':'Leia e responda com atenção.'})
        call('GET','/activities/'+a['id'],tb,expected=404);call('GET','/activities/'+a['id'],sb,expected=404)
        answers={'respostas':[{'pergunta_id':a['perguntas'][0]['id'],'resposta':'Leitura'},{'pergunta_id':a['perguntas'][1]['id'],'resposta':'Reflexão inicial'}]}
        bad={'respostas':[{**answers['respostas'][0],'resposta':'Outra'},answers['respostas'][1]]}
        call('PUT',f'/activities/{a["id"]}/response',sa,bad,400)
        sub=call('PUT',f'/activities/{a["id"]}/response',sa,answers)
        call('PUT','/admin/activities/'+a['id'],ta,form,409)
        correction=f'/admin/activities/{a["id"]}/responses/{sub["id"]}/correction'
        call('PUT',correction,tb,{'nota':8,'feedback':'Teste'},404)
        call('PUT',correction,ta,{'nota':9,'feedback':'Boa reflexão!'} )
        notices=call('GET','/notifications',sa);assert any(n['id'].startswith('grade:') for n in notices)
        rubric=call('POST','/admin/rubrics',ta,{'titulo':marker+' Critérios','criterios':[{'descricao':'Compreensão','pontos':6},{'descricao':'Clareza','pontos':4}]},201)
        assert not any(r['id']==rubric['id'] for r in call('GET','/admin/rubrics',tb))
        call('DELETE','/admin/rubrics/'+rubric['id'],tb,expected=404)
        manual={'user_id':sa['user']['id'],'titulo':marker+' Prova','disciplina':'Português','data':datetime.now().date().isoformat(),'bimestre':3,'nota':0,'peso':2,'feedback':'Avaliação inicial'}
        call('POST','/admin/grades',tb,manual,404)
        call('POST','/admin/grades',sa,manual,403)
        grade=call('POST','/admin/grades',ta,manual,201)
        assert any(g['id']==grade['id'] and g['nota']==0 for g in call('GET','/gradebook',sa)['notas'])
        assert not any(g['id']==grade['id'] for g in call('GET','/gradebook',sb)['notas'])
        call('PUT','/admin/grades/'+grade['id'],tb,{**manual,'nota':8},404)
        call('PUT','/admin/grades/'+grade['id'],ta,{**manual,'nota':8})
        assert call('GET','/admin/grades/'+grade['id']+'/history',ta)[0]['antes']['nota']==0
        bank=call('GET','/gradebook',sa)['notas'];assert len([g for g in bank if g['id']=='activity_submissions:'+sub['id']])==1
        material=call('POST','/admin/materials',ta,{'titulo':marker+' Vídeo','disciplina':'Português','turma':'7º ANO','video_url':'https://youtu.be/abcdefghijk','transcricao':'Transcrição de teste.'},201)
        news=call('GET','/notifications',sa)
        assert any(n['id']=='material:'+material['id'] for n in news)
        assert any(n['id'].startswith('manual-grade:'+grade['id']) for n in news)
        assert not any(n['id']=='material:'+material['id'] for n in call('GET','/notifications',sb))
        call('POST','/notifications/read-all',sa)
        assert all(n['lida'] for n in call('GET','/notifications',sa))
        assert db.grade_entries.find_one({'id':grade['id']})['nota']==8
        notice=notices[0];call('POST','/notifications/read',sa,{'id':notice['id']});assert next(n for n in call('GET','/notifications',sa) if n['id']==notice['id'])['lida']
        report=call('GET','/admin/reports',ta);assert all(x['turma']=='7º ANO' for x in report['alunos'])
        assert next(x for x in report['alunos'] if x['id']==sa['user']['id'])['media']==9
        csv=call('GET','/admin/reports.csv',ta);assert "'="+marker in csv
        workspace=call('GET','/workspace',ta);assert next(x for x in workspace['atividades'] if x['id']==a['id'])['corrigir']==0
        global_a=call('POST','/admin/activities',admin,{'titulo':marker+' Geral','perguntas':['Como foi sua leitura?']},201);activities.append(global_a['id'])
        other=call('PUT',f'/activities/{global_a["id"]}/response',sb,{'respostas':[{'pergunta_id':global_a['perguntas'][0]['id'],'resposta':'Bem'}]})
        assert not call('GET',f'/admin/activities/{global_a["id"]}/responses',ta)
        call('PUT',f'/admin/activities/{global_a["id"]}/responses/{other["id"]}/correction',ta,{'nota':5},404)
        call('PATCH',f'/admin/activities/{global_a["id"]}/status',ta,{'status':'encerrada'},403)
        summary=call('POST','/summaries',sb,{'book_id':b['id'],'conteudo':'Resumo de outra turma'},201)
        production=call('POST','/text-productions',sb,{'titulo':'Produção de teste','conteudo':'Texto de outra turma'},201)
        for kind,item in [('summaries',summary),('text-productions',production)]:
            call('GET',f'/admin/{kind}/{item["id"]}',ta,expected=404)
            call('PUT',f'/admin/{kind}/{item["id"]}/correction',ta,{'nota':5,'feedback':'Teste'},404)
            call('GET',f'/admin/{kind}/{item["id"]}',tb)
        fixture={'admin':admin,'teacher':ta,'student':sa,'activity':a,'book':b,'marker':marker}
        (ROOT/'.local/qa-school.json').write_text(json.dumps(fixture),encoding='utf-8')
        if '--browser' in sys.argv:subprocess.run(['node','scripts/check-school.cjs'],cwd=ROOT,check=True)
        assert db.summaries.count_documents({'user_id':sa['user']['id']})==0
        assert db.text_productions.count_documents({'user_id':sa['user']['id']})==0
        assert db.activity_submissions.find_one({'id':sub['id']})['nota']==9
        recovery=call('POST',f'/admin/users/{sa["user"]["id"]}/recovery',admin)
        token=parse_qs(urlparse(recovery['url']).query)['token'][0]
        call('POST','/auth/reset-password',data={'token':token,'password':'NovaSenha2026!'})
        call('POST','/auth/reset-password',data={'token':token,'password':'NovaSenha2026!'},expected=400)
        call('GET','/auth/me',sa,expected=401)
        call('POST','/auth/login',data={'email':sa['user']['email'],'password':'AlunoTeste2026!'},expected=401)
        call('POST','/auth/login',data={'email':sa['user']['email'],'password':'NovaSenha2026!'})
        recovery=call('POST',f'/admin/users/{sa["user"]["id"]}/recovery',admin);token=parse_qs(urlparse(recovery['url']).query)['token'][0]
        db.password_resets.update_many({'user_id':sa['user']['id']},{'$set':{'expires_at':datetime.now(timezone.utc)-timedelta(minutes=1)}})
        call('POST','/auth/reset-password',data={'token':token,'password':'NovaSenha2026!'},expected=400)
        call('PUT','/admin/teachers/'+ta['user']['id'],admin,{'turmas':['7º ANO'],'active':False})
        call('GET','/auth/me',ta,expected=401)
        print('PASS: teacher isolation, classes, quizzes, editing, attachments, reports, CSV safety, notices, pending work, password reset, expiry and session revocation.')
    finally:
        for collection in ['rubrics','grade_entries','study_materials']:db[collection].delete_many({'professor_id':{'$in':ids}})
        for collection in ['summaries','text_productions','reading_progress','reader_positions','notification_reads','password_resets','activity_submissions']:db[collection].delete_many({'user_id':{'$in':ids}})
        db.activities.delete_many({'id':{'$in':activities}});db.books.delete_many({'id':{'$in':books}});db.users.delete_many({'id':{'$in':ids}})
        for url in files:
            file=(ROOT/'backend'/'uploads'/url.removeprefix('/api/uploads/')).resolve()
            if file.is_relative_to((ROOT/'backend'/'uploads').resolve()):file.unlink(missing_ok=True)
        (ROOT/'.local/qa-school.json').unlink(missing_ok=True)
        http.close();client.close();print('Temporary school records removed.')

if __name__=='__main__':main()
