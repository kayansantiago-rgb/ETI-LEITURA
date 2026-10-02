"""Histórico completo de um aluno para professores e coordenação."""
from fastapi import APIRouter, Depends, HTTPException

from backend.permissions import ensure_student_scope
from backend.reading import streaks


def create_students_router(db, staff):
    router = APIRouter()

    @router.get('/admin/students/{student_id}/history')
    async def history(student_id: str, user=Depends(staff)):
        await ensure_student_scope(db, user, student_id)
        student = await db.users.find_one({'id': student_id, 'role': 'student'}, {'_id': 0, 'id': 1, 'nome': 1, 'email': 1, 'turma': 1, 'created_at': 1, 'avatar_url': 1})
        if not student:
            raise HTTPException(404, 'Aluno não encontrado.')

        books = {b['id']: b for b in await db.books.find({}, {'_id': 0, 'id': 1, 'titulo': 1, 'autor': 1, 'capa_url': 1}).to_list(5000)}
        activities = {a['id']: a for a in await db.activities.find({}, {'_id': 0, 'id': 1, 'titulo': 1, 'valor_nota': 1, 'turma': 1}).to_list(5000)}
        quizzes = {q['id']: q for q in await db.quizzes.find({}, {'_id': 0, 'id': 1, 'titulo': 1}).to_list(5000)}

        reading = []
        for row in await db.reading_progress.find({'user_id': student_id}, {'_id': 0}).sort('updated_at', -1).to_list(500):
            book = books.get(row['book_id'])
            if book:
                reading.append({'book_id': book['id'], 'titulo': book['titulo'], 'autor': book.get('autor'), 'capa_url': book.get('capa_url'), 'percentual': row.get('percentage', 0), 'atualizado_em': row.get('updated_at')})

        submissions = []
        for row in await db.activity_submissions.find({'user_id': student_id}, {'_id': 0, 'respostas': 0, 'historico': 0}).sort('updated_at', -1).to_list(500):
            activity = activities.get(row['activity_id'], {})
            submissions.append({
                'activity_id': row['activity_id'], 'titulo': activity.get('titulo', 'Atividade removida'),
                'nota': row.get('nota'), 'valor': activity.get('valor_nota') or 10, 'feedback': row.get('feedback'),
                'devolvida': bool(row.get('reenvio')), 'tentativa': row.get('tentativa', 1), 'enviado_em': row.get('updated_at'),
            })

        def texts(rows, title):
            return [{'id': r['id'], 'titulo': title(r), 'nota': r.get('nota'), 'feedback': r.get('feedback'), 'enviado_em': r.get('updated_at') or r.get('created_at')} for r in rows]

        summaries = texts(await db.summaries.find({'user_id': student_id}, {'_id': 0}).sort('updated_at', -1).to_list(500), lambda r: books.get(r.get('book_id'), {}).get('titulo', 'Resumo'))
        productions = texts(await db.text_productions.find({'user_id': student_id}, {'_id': 0}).sort('updated_at', -1).to_list(500), lambda r: r.get('titulo') or 'Produção textual')

        quiz_rows = [{'titulo': quizzes.get(a['quiz_id'], {}).get('titulo', 'Quiz removido'), 'acertos': a.get('acertos', 0), 'total': a.get('total', 0), 'nota': a.get('nota'), 'enviado_em': a.get('enviado_em')}
                     for a in await db.quiz_attempts.find({'user_id': student_id}, {'_id': 0}).to_list(500)]
        certificates = await db.certificates.find({'user_id': student_id}, {'_id': 0, 'book_titulo': 1, 'percentual': 1, 'emitido_em': 1, 'codigo': 1}).sort('emitido_em', -1).to_list(200)

        days = {d['dia']: d.get('paginas', 0) for d in await db.reading_days.find({'user_id': student_id}, {'_id': 0}).to_list(5000)}
        current, best = streaks(days)
        graded = [s['nota'] * 10 / s['valor'] for s in submissions if s['nota'] is not None]
        graded += [t['nota'] for t in summaries + productions if t['nota'] is not None]
        delivered = len(submissions)
        assigned = await db.activities.count_documents({'turma': {'$in': ['TODAS', student.get('turma')]}})

        return {
            'aluno': student,
            'resumo': {
                'media': round(sum(graded) / len(graded), 2) if graded else None,
                'livros_concluidos': sum(1 for r in reading if r['percentual'] >= 100),
                'certificados': len(certificates),
                'paginas_lidas': sum(days.values()),
                'sequencia': current,
                'melhor_sequencia': best,
                'atividades_entregues': delivered,
                'atividades_disponiveis': assigned,
            },
            'leituras': reading,
            'atividades': submissions,
            'resumos': summaries,
            'producoes': productions,
            'quizzes': sorted(quiz_rows, key=lambda q: q['enviado_em'] or '', reverse=True),
            'certificados': certificates,
        }

    return router
