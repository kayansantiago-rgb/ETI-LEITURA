"""Remove only records explicitly created by check-learning.cjs."""
import json, os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
root=Path(__file__).resolve().parent.parent
manifest=root/'.local/qa-learning.json'
if not manifest.exists(): raise SystemExit(0)
data=json.loads(manifest.read_text(encoding='utf-8'))
marker=data.get('marker','')
if not marker.startswith('VERIFICAÇÃO ETI '): raise RuntimeError('Marcador de teste inválido')
load_dotenv(root/'backend/.env')
with MongoClient(os.environ['MONGO_URL']) as client:
    db=client[os.environ['DB_NAME']]
    if data.get('activity_id') and db.activities.find_one({'id':data['activity_id'],'titulo':marker}):
        db.activity_submissions.delete_many({'activity_id':data['activity_id']})
        db.activities.delete_one({'id':data['activity_id'],'titulo':marker})
    if data.get('book_id'):
        book=db.books.find_one({'id':data['book_id'],'titulo':marker})
        if book:
            pdf=book.get('arquivo_url','')
            if pdf.startswith('/api/uploads/books/pdfs/'):
                file=(root/'backend/uploads'/pdf.removeprefix('/api/uploads/')).resolve()
                if file.is_relative_to((root/'backend/uploads/books/pdfs').resolve()):file.unlink(missing_ok=True)
            db.books.delete_one({'id':data['book_id'],'titulo':marker})
    if data.get('student_id'):
        db.users.delete_one({'id':data['student_id'],'nome':marker})
manifest.unlink()
print('Registros temporários do teste removidos.')
