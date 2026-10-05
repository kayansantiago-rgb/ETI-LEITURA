"""Create ETI LEITURA collections and indexes without replacing existing data."""
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING
import os

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / 'backend' / '.env')

def initialize():
    with MongoClient(os.environ['MONGO_URL'], serverSelectionTimeoutMS=10000) as client:
        client.admin.command('ping')
        db = client[os.environ['DB_NAME']]
        collections = ['users', 'books', 'summaries', 'reading_progress', 'text_productions', 'mural', 'calendar_events', 'activities', 'activity_submissions', 'activity_templates', 'feedback_templates', 'study_materials', 'rubrics', 'grade_entries']
        existing = set(db.list_collection_names())
        for name in collections:
            if name not in existing:
                db.create_collection(name)
            db[name].create_index('id', unique=True)
        db.users.create_index('email', unique=True)
        db.users.create_index([('role', ASCENDING), ('turma', ASCENDING)])
        db.books.create_index('nivel_ensino')
        db.summaries.create_index([('user_id', ASCENDING), ('book_id', ASCENDING)], unique=True)
        db.summaries.create_index('book_id')
        db.reading_progress.create_index([('user_id', ASCENDING), ('book_id', ASCENDING)], unique=True)
        db.reading_progress.create_index('book_id')
        db.text_productions.create_index('user_id')
        db.mural.create_index('created_at')
        db.calendar_events.create_index('data')
        db.activities.create_index([('turma', ASCENDING), ('created_at', ASCENDING)])
        db.activity_submissions.create_index([('activity_id', ASCENDING), ('user_id', ASCENDING)], unique=True)
        db.activity_submissions.create_index('user_id')
        db.feedback_templates.create_index('professor_id')
        db.activities.create_index('publicar_em')
        db.activity_templates.create_index([('professor_id', ASCENDING), ('updated_at', ASCENDING)])
        db.push_subscriptions.create_index('user_id')
        db.push_deliveries.create_index('expires_at', expireAfterSeconds=0)
        db.grade_entries.create_index([('user_id', ASCENDING), ('data', ASCENDING)])
        db.rubrics.create_index('professor_id')
        db.study_materials.create_index([('turma', ASCENDING), ('created_at', ASCENDING)])
        if 'ai_usage' not in existing:
            db.create_collection('ai_usage')
        db.reader_positions.create_index([('user_id',1),('book_id',1)],unique=True)
        db.notification_reads.create_index([('user_id',1),('notice_id',1)],unique=True)
        db.password_resets.create_index('digest',unique=True)
        db.password_resets.create_index('expires_at',expireAfterSeconds=0)
        db.recovery_requests.create_index('digest',unique=True)
        db.recovery_requests.create_index('expires_at',expireAfterSeconds=0)
        # Lembretes do professor (um por aluno por dia) e pedidos de exclusão de dados (LGPD).
        db.student_nudges.create_index([('user_id',1),('dia',1)])
        db.deletion_requests.create_index('user_id',unique=True)
        db.certificates.create_index('codigo')
        print(f'Banco {db.name} pronto: {len(db.list_collection_names())} colecoes.')

if __name__ == '__main__':
    initialize()
