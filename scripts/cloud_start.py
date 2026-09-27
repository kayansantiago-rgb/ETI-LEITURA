"""Cloud entry point; never uses ephemeral storage for uploaded files."""
import os
import sys
from pathlib import Path
from datetime import datetime, timezone
from uuid import uuid4
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts.init_database import initialize
from pymongo import MongoClient
from passlib.context import CryptContext

if os.environ.get('STORAGE_BACKEND') != 's3':
    raise RuntimeError('A hospedagem gratuita exige STORAGE_BACKEND=s3 para preservar arquivos.')
from backend.storage import s3_client
s3_client().head_bucket(Bucket=os.environ['S3_BUCKET'])
initialize()
# Optional one-time bootstrap. An existing account is never promoted or reset.
email, password = os.environ.get('INITIAL_ADMIN_EMAIL'), os.environ.get('INITIAL_ADMIN_PASSWORD')
if email and password:
    if len(password) < 12:
        raise RuntimeError('Use uma senha inicial de pelo menos 12 caracteres.')
    with MongoClient(os.environ['MONGO_URL']) as client:
        users=client[os.environ['DB_NAME']].users
        if not users.find_one({'email':email}):
            users.insert_one({'id':str(uuid4()),'email':email,'nome':'Administrador ETI','role':'admin','turma':None,
                'avatar_url':None,'password_hash':CryptContext(schemes=['bcrypt']).hash(password),'created_at':datetime.now(timezone.utc).isoformat()})
os.execvp('uvicorn',['uvicorn','backend.server:app','--host','0.0.0.0','--port',os.environ.get('PORT','10000')])
