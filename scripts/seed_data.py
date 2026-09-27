#!/usr/bin/env python3
"""
Seed script to populate the database with sample books
"""
import sys
import os
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(backend_path))

from dotenv import load_dotenv
from pymongo import MongoClient
import uuid
from datetime import datetime, timezone

# Load environment
load_dotenv(backend_path / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

client = MongoClient(mongo_url)
db = client[db_name]

# Sample books data
books = [
    {
        "id": str(uuid.uuid4()),
        "titulo": "Dom Casmurro",
        "autor": "Machado de Assis",
        "descricao": "Romance narrado em primeira pessoa por Bento Santiago, que relembra sua juventude e seu casamento com Capitu. A narrativa explora temas como ciúme, traição e memória.",
        "capa_url": "https://images.unsplash.com/photo-1603289847962-9da9640785e3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHw0fHxtaW5pbWFsaXN0JTIwYm9vayUyMGNvdmVyfGVufDB8fHx8MTc3MjY3MDc4NHww&ixlib=rb-4.1.0&q=85",
        "arquivo_url": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "titulo": "O Cortiço",
        "autor": "Aluísio Azevedo",
        "descricao": "Romance naturalista que retrata a vida em uma habitação coletiva no Rio de Janeiro do século XIX, explorando temas sociais e a influência do ambiente sobre os personagens.",
        "capa_url": "https://images.unsplash.com/photo-1769490315625-6e669d53e698?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwyfHxtaW5pbWFsaXN0JTIwYm9vayUyMGNvdmVyfGVufDB8fHx8MTc3MjY3MDc4NHww&ixlib=rb-4.1.0&q=85",
        "arquivo_url": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "titulo": "Memórias Póstumas de Brás Cubas",
        "autor": "Machado de Assis",
        "descricao": "Narrado por um defunto autor, o romance revoluciona a literatura brasileira com seu estilo inovador e crítica social mordaz, explorando a vaidade humana e a hipocrisia da sociedade.",
        "capa_url": "https://images.unsplash.com/photo-1603289847182-ea07398a1522?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwYm9vayUyMGNvdmVyfGVufDB8fHx8MTc3MjY3MDc4NHww&ixlib=rb-4.1.0&q=85",
        "arquivo_url": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "titulo": "A Moreninha",
        "autor": "Joaquim Manuel de Macedo",
        "descricao": "Considerado o primeiro romance urbano brasileiro, conta a história de amor entre Augusto e Carolina, a Moreninha, em um enredo leve e romântico.",
        "capa_url": "https://images.unsplash.com/photo-1603289847962-9da9640785e3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHw0fHxtaW5pbWFsaXN0JTIwYm9vayUyMGNvdmVyfGVufDB8fHx8MTc3MjY3MDc4NHww&ixlib=rb-4.1.0&q=85",
        "arquivo_url": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "titulo": "Capitães da Areia",
        "autor": "Jorge Amado",
        "descricao": "Romance que retrata a vida de um grupo de meninos de rua em Salvador, liderados por Pedro Bala, abordando temas como desigualdade social e injustiça.",
        "capa_url": "https://images.unsplash.com/photo-1769490315625-6e669d53e698?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwyfHxtaW5pbWFsaXN0JTIwYm9vayUyMGNvdmVyfGVufDB8fHx8MTc3MjY3MDc4NHww&ixlib=rb-4.1.0&q=85",
        "arquivo_url": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "titulo": "Iracema",
        "autor": "José de Alencar",
        "descricao": "Lenda do Ceará que narra o amor entre a índia Iracema e o colonizador português Martim, simbolizando o encontro e o conflito entre as culturas indígena e europeia.",
        "capa_url": "https://images.unsplash.com/photo-1603289847182-ea07398a1522?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwYm9vayUyMGNvdmVyfGVufDB8fHx8MTc3MjY3MDc4NHww&ixlib=rb-4.1.0&q=85",
        "arquivo_url": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
]

def seed_books():
    # Clear existing books
    db.books.delete_many({})
    
    # Insert new books
    db.books.insert_many(books)
    print(f"✓ {len(books)} livros inseridos com sucesso!")
    
    # List books
    print("\nLivros na base de dados:")
    for book in books:
        print(f"  - {book['titulo']} por {book['autor']}")

if __name__ == "__main__":
    seed_books()
    client.close()
