#!/usr/bin/env python3
"""
Script to create an admin user
"""
from getpass import getpass
import sys
import os
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(backend_path))

from dotenv import load_dotenv
from pymongo import MongoClient
from passlib.context import CryptContext
import uuid
from datetime import datetime, timezone

# Load environment
load_dotenv(backend_path / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

client = MongoClient(mongo_url)
db = client[db_name]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin():
    email = input("E-mail do administrador: ").strip()
    password = getpass("Senha (mínimo 12 caracteres): ")
    if not email or len(password) < 12:
        raise ValueError("Informe um e-mail e uma senha de pelo menos 12 caracteres")
    nome = "Administrador"
    
    # Check if admin exists
    existing = db.users.find_one({"email": email})
    if existing:
        print(f"⚠ Administrador já existe: {email}")
        return
    
    # Create admin user
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": email,
        "password_hash": pwd_context.hash(password),
        "nome": nome,
        "turma": None,
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    db.users.insert_one(user_doc)
    print(f"✓ Administrador criado com sucesso!")
    print(f"  Email: {email}")
    print(f"  Role: admin")

if __name__ == "__main__":
    create_admin()
    client.close()
