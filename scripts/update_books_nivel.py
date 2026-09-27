#!/usr/bin/env python3
"""
Script to update existing books with nivel_ensino field
"""
import sys
import os
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(backend_path))

from dotenv import load_dotenv
from pymongo import MongoClient

# Load environment
load_dotenv(backend_path / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

client = MongoClient(mongo_url)
db = client[db_name]

def update_books():
    # Update all existing books to have nivel_ensino = "AMBOS" if not set
    result = db.books.update_many(
        {"nivel_ensino": {"$exists": False}},
        {"$set": {"nivel_ensino": "AMBOS"}}
    )
    
    print(f"✓ {result.modified_count} livros atualizados com nivel_ensino='AMBOS'")
    
    # Show all books with their nivel
    books = list(db.books.find({}, {"_id": 0, "titulo": 1, "nivel_ensino": 1}))
    print("\nLivros no sistema:")
    for book in books:
        print(f"  - {book['titulo']}: {book.get('nivel_ensino', 'SEM NÍVEL')}")

if __name__ == "__main__":
    update_books()
    client.close()
