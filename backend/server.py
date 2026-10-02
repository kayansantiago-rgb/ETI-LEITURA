from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from backend.storage import save_upload, upload_response
from backend.permissions import scoped_ids, class_query, ensure_student_scope
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from contextlib import suppress
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directories
UPLOADS_DIR = ROOT_DIR / "uploads" / "avatars"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

MURAL_UPLOADS_DIR = ROOT_DIR / "uploads" / "mural"
MURAL_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

BOOKS_COVERS_DIR = ROOT_DIR / "uploads" / "books" / "covers"
BOOKS_COVERS_DIR.mkdir(parents=True, exist_ok=True)

BOOKS_PDF_DIR = ROOT_DIR / "uploads" / "books" / "pdfs"
BOOKS_PDF_DIR.mkdir(parents=True, exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get('JWT_SECRET')
if not SECRET_KEY or len(SECRET_KEY) < 32:
    raise RuntimeError('Configure JWT_SECRET com pelo menos 32 caracteres no backend/.env')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

security = HTTPBearer()

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ========== MODELS ==========

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    nome: str
    turma: Optional[str] = None
    avatar_url: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    nome: str
    turma: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str = "student"
    turmas: List[str] = Field(default_factory=list)
    created_at: str

class ProfileUpdate(BaseModel):
    nome: Optional[str] = None
    avatar_url: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Book(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    titulo: str
    autor: str
    descricao: str
    capa_url: str
    arquivo_url: Optional[str] = None
    nivel_ensino: str = "AMBOS"
    created_at: str
    progress: Optional[int] = 0
    turmas: List[str] = []
    professor_id: Optional[str] = None
    professor_nome: Optional[str] = None

class BookCreate(BaseModel):
    titulo: str
    autor: str
    descricao: str
    capa_url: str
    arquivo_url: Optional[str] = None
    nivel_ensino: str = "AMBOS"
    turmas: List[str] = []

class BookUpdate(BaseModel):
    titulo: Optional[str] = None
    autor: Optional[str] = None
    descricao: Optional[str] = None
    capa_url: Optional[str] = None
    arquivo_url: Optional[str] = None
    nivel_ensino: Optional[str] = None
    turmas: Optional[List[str]] = None

class Summary(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    book_id: str
    conteudo: str
    created_at: str
    updated_at: str
    book_titulo: Optional[str] = None
    user_nome: Optional[str] = None
    user_turma: Optional[str] = None
    # Campos de correção
    nota: Optional[float] = None
    feedback: Optional[str] = None
    corrigido_por: Optional[str] = None
    corrigido_em: Optional[str] = None

class SummaryCreate(BaseModel):
    book_id: str
    conteudo: str

class SummaryUpdate(BaseModel):
    conteudo: str

class ReadingProgress(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    book_id: str
    percentage: int
    updated_at: str
    book_titulo: Optional[str] = None

class ProgressUpdate(BaseModel):
    percentage: int

class TextProduction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    titulo: str
    conteudo: str
    created_at: str
    updated_at: str
    user_nome: Optional[str] = None
    user_turma: Optional[str] = None
    # Campos de correção
    nota: Optional[float] = None
    feedback: Optional[str] = None
    corrigido_por: Optional[str] = None
    corrigido_em: Optional[str] = None

class TextProductionCreate(BaseModel):
    titulo: str
    conteudo: str

class TextProductionUpdate(BaseModel):
    titulo: Optional[str] = None
    conteudo: Optional[str] = None

class MuralPost(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tipo: str  # "foto" ou "video"
    titulo: str
    url_media: str
    descricao: Optional[str] = None
    created_at: str
    autor_id: Optional[str] = None
    autor_nome: Optional[str] = None

class MuralPostCreate(BaseModel):
    tipo: str
    titulo: str
    url_media: str
    descricao: Optional[str] = None

class CalendarEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    titulo: str
    descricao: Optional[str] = None
    data: str  # formato: YYYY-MM-DD
    cor: Optional[str] = "#10b981"  # cor do evento
    created_at: str

class CalendarEventCreate(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    data: str  # formato: YYYY-MM-DD
    cor: Optional[str] = "#10b981"

class CorrectionCreate(BaseModel):
    nota: float = Field(..., ge=0, le=10)
    feedback: str

# ========== AUTH HELPERS ==========

def get_nivel_ensino_from_turma(turma: str) -> str:
    """Determina o nível de ensino baseado na turma"""
    turmas_fundamental = ["7º ANO", "8º ANO", "9º ANO"]
    turmas_medio = ["1º SÉRIE A", "1º SÉRIE B", "2º SÉRIE", "3º SÉRIE A", "3º SÉRIE B"]

    if turma in turmas_fundamental:
        return "FUNDAMENTAL"
    elif turma in turmas_medio:
        return "MÉDIO"
    return "AMBOS"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")

        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        if not user.get("active", True) or payload.get("ver", 0) != user.get("token_version", 0):
            raise HTTPException(401, "Sessão encerrada. Entre novamente.")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    except Exception:
        raise HTTPException(status_code=401, detail="Não autorizado")

# ========== AUTH ROUTES ==========

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    # Validate turma for students
    if not user_data.turma:
        raise HTTPException(status_code=400, detail="Turma é obrigatória para estudantes")

    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hashed_password,
        "nome": user_data.nome,
        "turma": user_data.turma,
        "avatar_url": user_data.avatar_url,
        "role": "student",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.users.insert_one(user_doc)

    # Create token
    access_token = create_access_token(data={"sub": user_id})

    user_response = User(
        id=user_id,
        email=user_data.email,
        nome=user_data.nome,
        turma=user_data.turma,
        avatar_url=user_data.avatar_url,
        role=user_doc["role"],
        created_at=user_doc["created_at"]
    )

    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not user.get("active", True) or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")

    access_token = create_access_token(data={"sub": user["id"], "ver": user.get("token_version", 0)})

    user_response = User(
        id=user["id"],
        email=user["email"],
        nome=user["nome"],
        turma=user.get("turma"),
        avatar_url=user.get("avatar_url"),
        role=user.get("role", "student"),
        turmas=user.get("turmas", []),
        created_at=user["created_at"]
    )

    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(
        id=current_user["id"],
        email=current_user["email"],
        nome=current_user["nome"],
        turma=current_user.get("turma"),
        avatar_url=current_user.get("avatar_url"),
        role=current_user.get("role", "student"),
        turmas=current_user.get("turmas", []),
        created_at=current_user["created_at"]
    )

@api_router.put("/auth/profile", response_model=User)
async def update_profile(profile_data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    update_fields = {}
    if profile_data.nome:
        update_fields["nome"] = profile_data.nome
    if profile_data.avatar_url is not None:
        update_fields["avatar_url"] = profile_data.avatar_url

    if update_fields:
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": update_fields}
        )

    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    return User(
        id=updated_user["id"],
        email=updated_user["email"],
        nome=updated_user["nome"],
        turma=updated_user.get("turma"),
        avatar_url=updated_user.get("avatar_url"),
        role=updated_user.get("role", "student"),
        turmas=updated_user.get("turmas", []),
        created_at=updated_user["created_at"]
    )

@api_router.post("/auth/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido. Use JPG, PNG, GIF ou WebP.")

    # Validate file size (max 5MB)
    contents = await file.read(50 * 1024 * 1024 + 1)
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Máximo 5MB.")

    # Generate unique filename
    ext = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp'}[file.content_type]
    filename = f"{current_user['id']}_{uuid.uuid4().hex[:8]}.{ext}"
    file_path = UPLOADS_DIR / filename

    # Save file
    await save_upload(file_path, contents, file.content_type)

    # Generate URL (will be served by static files)
    avatar_url = f"/api/uploads/avatars/{filename}"

    # Update user's avatar_url in database
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"avatar_url": avatar_url}}
    )

    return {"avatar_url": avatar_url, "message": "Avatar atualizado com sucesso!"}

# ========== BOOKS ROUTES ==========

ALL_CLASSES = ["7º ANO", "8º ANO", "9º ANO", "1º SÉRIE A", "1º SÉRIE B", "2º SÉRIE", "3º SÉRIE A", "3º SÉRIE B"]


def book_visible_query(user: dict) -> dict:
    """Livros sem turmas definidas são de todos; com turmas, só dessas turmas (e de quem cadastrou)."""
    if user.get("role") == "admin":
        return {}
    open_to_all = [{"turmas": {"$exists": False}}, {"turmas": []}]
    if user.get("role") == "teacher":
        return {"$or": open_to_all + [{"turmas": {"$in": user.get("turmas", [])}}, {"professor_id": user["id"]}]}
    return {"$or": open_to_all + [{"turmas": user.get("turma")}]}


def clean_book_classes(turmas, user: dict) -> list:
    chosen = sorted({t for t in (turmas or []) if t in ALL_CLASSES})
    if user.get("role") == "teacher":
        allowed = set(user.get("turmas", []))
        if not chosen or not set(chosen) <= allowed:
            raise HTTPException(status_code=400, detail="Escolha pelo menos uma das suas turmas para este livro.")
    return chosen


async def editable_book(book_id: str, user: dict) -> dict:
    book = await db.books.find_one({"id": book_id})
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    if user.get("role") != "admin" and book.get("professor_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Só quem cadastrou o livro (ou a coordenação) pode alterá-lo.")
    return book

@api_router.get("/books", response_model=List[Book])
async def get_books(current_user: dict = Depends(get_current_user)):
    # Determine user's nivel_ensino
    user_nivel = get_nivel_ensino_from_turma(current_user.get("turma", ""))

    # Filter books by nivel_ensino
    if user_nivel == "AMBOS":
        # If somehow user has no valid turma, show all books
        query = {}
    else:
        # Show books for user's nivel or books marked as AMBOS
        query = {"nivel_ensino": {"$in": [user_nivel, "AMBOS"]}}
    query = {"$and": [query, book_visible_query(current_user)]}

    books = await db.books.find(query, {"_id": 0}).to_list(1000)

    # Get user's progress for each book
    for book in books:
        progress = await db.reading_progress.find_one(
            {"user_id": current_user["id"], "book_id": book["id"]},
            {"_id": 0}
        )
        book["progress"] = progress["percentage"] if progress else 0

    return books

@api_router.get("/books/{book_id}", response_model=Book)
async def get_book(book_id: str, current_user: dict = Depends(get_current_user)):
    book = await db.books.find_one({"$and": [{"id": book_id}, book_visible_query(current_user)]}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    return book

@api_router.post("/books", response_model=Book)
async def create_book(book_data: BookCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    book_id = str(uuid.uuid4())
    book_doc = {
        "id": book_id,
        "titulo": book_data.titulo,
        "autor": book_data.autor,
        "descricao": book_data.descricao,
        "capa_url": book_data.capa_url,
        "arquivo_url": book_data.arquivo_url,
        "nivel_ensino": book_data.nivel_ensino,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.books.insert_one(book_doc)
    return Book(**book_doc)

# ========== SUMMARIES ROUTES ==========

@api_router.get("/summaries", response_model=List[Summary])
async def get_my_summaries(current_user: dict = Depends(get_current_user)):
    summaries = await db.summaries.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(1000)

    # Enrich with book titles
    for summary in summaries:
        book = await db.books.find_one({"id": summary["book_id"]}, {"_id": 0})
        if book:
            summary["book_titulo"] = book["titulo"]

    return summaries

@api_router.get("/summaries/{summary_id}", response_model=Summary)
async def get_summary(summary_id: str, current_user: dict = Depends(get_current_user)):
    summary = await db.summaries.find_one({"id": summary_id, "user_id": current_user["id"]}, {"_id": 0})
    if not summary:
        raise HTTPException(status_code=404, detail="Resumo não encontrado")

    # Enrich with book title
    book = await db.books.find_one({"id": summary["book_id"]}, {"_id": 0})
    if book:
        summary["book_titulo"] = book["titulo"]

    return summary

@api_router.post("/summaries", response_model=Summary, status_code=status.HTTP_201_CREATED)
async def create_summary(summary_data: SummaryCreate, current_user: dict = Depends(get_current_user)):
    # Verify book exists
    book = await db.books.find_one({"id": summary_data.book_id})
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    summary_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    summary_doc = {
        "id": summary_id,
        "user_id": current_user["id"],
        "book_id": summary_data.book_id,
        "conteudo": summary_data.conteudo,
        "created_at": now,
        "updated_at": now
    }

    await db.summaries.insert_one(summary_doc)

    return Summary(
        **summary_doc,
        book_titulo=book["titulo"],
        user_nome=current_user["nome"]
    )

@api_router.put("/summaries/{summary_id}", response_model=Summary)
async def update_summary(
    summary_id: str,
    summary_data: SummaryUpdate,
    current_user: dict = Depends(get_current_user)
):
    summary = await db.summaries.find_one({"id": summary_id, "user_id": current_user["id"]})
    if not summary:
        raise HTTPException(status_code=404, detail="Resumo não encontrado")

    await db.summaries.update_one(
        {"id": summary_id},
        {"$set": {
            "conteudo": summary_data.conteudo,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    updated_summary = await db.summaries.find_one({"id": summary_id}, {"_id": 0})

    # Enrich with book title
    book = await db.books.find_one({"id": updated_summary["book_id"]}, {"_id": 0})
    if book:
        updated_summary["book_titulo"] = book["titulo"]

    return Summary(**updated_summary)

@api_router.delete("/summaries/{summary_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_summary(summary_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.summaries.delete_one({"id": summary_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resumo não encontrado")
    return None

@api_router.get("/books/{book_id}/summary", response_model=Summary)
async def get_book_summary(book_id: str, current_user: dict = Depends(get_current_user)):
    summary = await db.summaries.find_one(
        {"book_id": book_id, "user_id": current_user["id"]},
        {"_id": 0}
    )

    if summary:
        book = await db.books.find_one({"id": book_id}, {"_id": 0})
        if book:
            summary["book_titulo"] = book["titulo"]
        return Summary(**summary)

    raise HTTPException(status_code=404, detail="Resumo não encontrado")

# ========== STATS ROUTE ==========

@api_router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    # Determine user's nivel_ensino
    user_nivel = get_nivel_ensino_from_turma(current_user.get("turma", ""))

    # Count books available for this user's nivel
    if user_nivel == "AMBOS":
        total_books = await db.books.count_documents({})
    else:
        total_books = await db.books.count_documents({
            "nivel_ensino": {"$in": [user_nivel, "AMBOS"]}
        })

    my_summaries = await db.summaries.count_documents({"user_id": current_user["id"]})

    return {
        "total_books": total_books,
        "my_summaries": my_summaries
    }

# ========== READING PROGRESS ROUTES ==========

@api_router.get("/progress", response_model=List[ReadingProgress])
async def get_my_progress(current_user: dict = Depends(get_current_user)):
    progress_list = await db.reading_progress.find(
        {"user_id": current_user["id"]}, 
        {"_id": 0}
    ).to_list(1000)

    # Enrich with book titles
    for progress in progress_list:
        book = await db.books.find_one({"id": progress["book_id"]}, {"_id": 0})
        if book:
            progress["book_titulo"] = book["titulo"]

    return progress_list

@api_router.get("/books/{book_id}/progress", response_model=ReadingProgress)
async def get_book_progress(book_id: str, current_user: dict = Depends(get_current_user)):
    progress = await db.reading_progress.find_one(
        {"user_id": current_user["id"], "book_id": book_id},
        {"_id": 0}
    )

    if not progress:
        # Return 0% progress if not found
        book = await db.books.find_one({"id": book_id}, {"_id": 0})
        if not book:
            raise HTTPException(status_code=404, detail="Livro não encontrado")

        return ReadingProgress(
            id="",
            user_id=current_user["id"],
            book_id=book_id,
            percentage=0,
            updated_at=datetime.now(timezone.utc).isoformat(),
            book_titulo=book.get("titulo")
        )

    book = await db.books.find_one({"id": book_id}, {"_id": 0})
    if book:
        progress["book_titulo"] = book["titulo"]

    return ReadingProgress(**progress)

@api_router.put("/books/{book_id}/progress", response_model=ReadingProgress)
async def update_book_progress(
    book_id: str,
    progress_data: ProgressUpdate,
    current_user: dict = Depends(get_current_user)
):
    # Validate percentage
    if progress_data.percentage < 0 or progress_data.percentage > 100:
        raise HTTPException(status_code=400, detail="Porcentagem deve estar entre 0 e 100")

    # Check if book exists
    book = await db.books.find_one({"id": book_id})
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    # Check if progress exists
    existing = await db.reading_progress.find_one(
        {"user_id": current_user["id"], "book_id": book_id}
    )

    now = datetime.now(timezone.utc).isoformat()

    if existing:
        # Update existing progress
        await db.reading_progress.update_one(
            {"user_id": current_user["id"], "book_id": book_id},
            {"$set": {
                "percentage": progress_data.percentage,
                "updated_at": now
            }}
        )
        progress_id = existing["id"]
    else:
        # Create new progress
        progress_id = str(uuid.uuid4())
        progress_doc = {
            "id": progress_id,
            "user_id": current_user["id"],
            "book_id": book_id,
            "percentage": progress_data.percentage,
            "updated_at": now
        }
        await db.reading_progress.insert_one(progress_doc)

    return ReadingProgress(
        id=progress_id,
        user_id=current_user["id"],
        book_id=book_id,
        percentage=progress_data.percentage,
        updated_at=now,
        book_titulo=book["titulo"]
    )

# ========== TEXT PRODUCTION ROUTES ==========

@api_router.get("/text-productions", response_model=List[TextProduction])
async def get_my_productions(current_user: dict = Depends(get_current_user)):
    productions = await db.text_productions.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    return productions

@api_router.get("/text-productions/{production_id}", response_model=TextProduction)
async def get_production(production_id: str, current_user: dict = Depends(get_current_user)):
    production = await db.text_productions.find_one(
        {"id": production_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not production:
        raise HTTPException(status_code=404, detail="Produção textual não encontrada")
    return TextProduction(**production)

@api_router.post("/text-productions", response_model=TextProduction, status_code=status.HTTP_201_CREATED)
async def create_production(
    production_data: TextProductionCreate,
    current_user: dict = Depends(get_current_user)
):
    production_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    production_doc = {
        "id": production_id,
        "user_id": current_user["id"],
        "titulo": production_data.titulo,
        "conteudo": production_data.conteudo,
        "created_at": now,
        "updated_at": now
    }

    await db.text_productions.insert_one(production_doc)

    return TextProduction(
        **production_doc,
        user_nome=current_user["nome"]
    )

@api_router.put("/text-productions/{production_id}", response_model=TextProduction)
async def update_production(
    production_id: str,
    production_data: TextProductionUpdate,
    current_user: dict = Depends(get_current_user)
):
    production = await db.text_productions.find_one(
        {"id": production_id, "user_id": current_user["id"]}
    )
    if not production:
        raise HTTPException(status_code=404, detail="Produção textual não encontrada")

    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if production_data.titulo:
        update_fields["titulo"] = production_data.titulo
    if production_data.conteudo:
        update_fields["conteudo"] = production_data.conteudo

    await db.text_productions.update_one(
        {"id": production_id},
        {"$set": update_fields}
    )

    updated_production = await db.text_productions.find_one(
        {"id": production_id},
        {"_id": 0}
    )

    return TextProduction(**updated_production)

@api_router.delete("/text-productions/{production_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_production(production_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.text_productions.delete_one(
        {"id": production_id, "user_id": current_user["id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produção textual não encontrada")
    return None

# ========== ADMIN ROUTES ==========

async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores.")
    return current_user

async def require_staff(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") not in ("admin", "teacher"):
        raise HTTPException(403, "Acesso restrito à equipe escolar")
    return current_user

@api_router.get("/admin/summaries", response_model=List[Summary])
async def get_all_summaries(turma: Optional[str] = None, admin_user: dict = Depends(require_staff)):
    user_ids = await scoped_ids(db, admin_user, turma)
    summaries = await db.summaries.find({"user_id": {"$in": user_ids}}, {"_id": 0}).to_list(1000)

    # Enrich with book titles and user names
    for summary in summaries:
        book = await db.books.find_one({"id": summary["book_id"]}, {"_id": 0})
        user = await db.users.find_one({"id": summary["user_id"]}, {"_id": 0})
        if book:
            summary["book_titulo"] = book["titulo"]
        if user:
            summary["user_nome"] = user["nome"]
            summary["user_turma"] = user.get("turma")

    return summaries

@api_router.get("/admin/summaries/{summary_id}", response_model=Summary)
async def get_summary_as_admin(summary_id: str, admin_user: dict = Depends(require_staff)):
    summary = await db.summaries.find_one({"id": summary_id}, {"_id": 0})
    if not summary:
        raise HTTPException(status_code=404, detail="Resumo não encontrado")
    await ensure_student_scope(db, admin_user, summary["user_id"])

    # Enrich with book title and user name
    book = await db.books.find_one({"id": summary["book_id"]}, {"_id": 0})
    user = await db.users.find_one({"id": summary["user_id"]}, {"_id": 0})
    if book:
        summary["book_titulo"] = book["titulo"]
    if user:
        summary["user_nome"] = user["nome"]
        summary["user_turma"] = user.get("turma")

    return Summary(**summary)

@api_router.put("/admin/summaries/{summary_id}/correction", response_model=Summary)
async def correct_summary(
    summary_id: str,
    correction: CorrectionCreate,
    admin_user: dict = Depends(require_staff)
):
    summary = await db.summaries.find_one({"id": summary_id})
    if not summary:
        raise HTTPException(status_code=404, detail="Resumo não encontrado")
    await ensure_student_scope(db, admin_user, summary["user_id"])

    now = datetime.now(timezone.utc).isoformat()
    await db.summaries.update_one(
        {"id": summary_id},
        {"$set": {
            "nota": correction.nota,
            "feedback": correction.feedback,
            "corrigido_por": admin_user["nome"],
            "corrigido_em": now
        }}
    )

    updated_summary = await db.summaries.find_one({"id": summary_id}, {"_id": 0})

    # Enrich with book title and user name
    book = await db.books.find_one({"id": updated_summary["book_id"]}, {"_id": 0})
    user = await db.users.find_one({"id": updated_summary["user_id"]}, {"_id": 0})
    if book:
        updated_summary["book_titulo"] = book["titulo"]
    if user:
        updated_summary["user_nome"] = user["nome"]
        updated_summary["user_turma"] = user.get("turma")

    return Summary(**updated_summary)

@api_router.delete("/admin/summaries/{summary_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_summary_admin(summary_id: str, admin_user: dict = Depends(require_admin)):
    result = await db.summaries.delete_one({"id": summary_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resumo não encontrado")
    return None

@api_router.get("/admin/stats")
async def get_admin_stats(admin_user: dict = Depends(require_staff)):
    user_ids = await scoped_ids(db, admin_user)
    total_users = len(user_ids)
    total_books = await db.books.count_documents({})
    total_summaries = await db.summaries.count_documents({"user_id": {"$in": user_ids}})

    return {
        "total_users": total_users,
        "total_books": total_books,
        "total_summaries": total_summaries,
        "total_productions": await db.text_productions.count_documents({"user_id": {"$in": user_ids}})
    }

@api_router.post("/admin/books", response_model=Book)
async def create_book_admin(book_data: BookCreate, admin_user: dict = Depends(require_staff)):
    turmas = clean_book_classes(book_data.turmas, admin_user)
    book_id = str(uuid.uuid4())
    book_doc = {
        "id": book_id,
        "titulo": book_data.titulo,
        "autor": book_data.autor,
        "descricao": book_data.descricao,
        "capa_url": book_data.capa_url,
        "arquivo_url": book_data.arquivo_url,
        "nivel_ensino": book_data.nivel_ensino,
        "turmas": turmas,
        "professor_id": admin_user["id"],
        "professor_nome": admin_user.get("nome"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.books.insert_one(book_doc)
    return Book(**book_doc)

@api_router.put("/admin/books/{book_id}", response_model=Book)
async def update_book_admin(book_id: str, book_data: BookUpdate, admin_user: dict = Depends(require_staff)):
    book = await editable_book(book_id, admin_user)

    # Build update dict with only provided fields
    update_fields = {}
    if book_data.titulo is not None:
        update_fields["titulo"] = book_data.titulo
    if book_data.autor is not None:
        update_fields["autor"] = book_data.autor
    if book_data.descricao is not None:
        update_fields["descricao"] = book_data.descricao
    if book_data.capa_url is not None:
        update_fields["capa_url"] = book_data.capa_url
    if book_data.arquivo_url is not None:
        update_fields["arquivo_url"] = book_data.arquivo_url
    if book_data.nivel_ensino is not None:
        if book_data.nivel_ensino not in ["FUNDAMENTAL", "MÉDIO", "AMBOS"]:
            raise HTTPException(status_code=400, detail="Nível de ensino inválido")
        update_fields["nivel_ensino"] = book_data.nivel_ensino
    if book_data.turmas is not None:
        update_fields["turmas"] = clean_book_classes(book_data.turmas, admin_user)

    if update_fields:
        await db.books.update_one({"id": book_id}, {"$set": update_fields})

    updated_book = await db.books.find_one({"id": book_id}, {"_id": 0})
    return Book(**updated_book)

@api_router.delete("/admin/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book_admin(book_id: str, admin_user: dict = Depends(require_staff)):
    await editable_book(book_id, admin_user)
    result = await db.books.delete_one({"id": book_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    # Also delete related summaries and progress
    await db.summaries.delete_many({"book_id": book_id})
    await db.reading_progress.delete_many({"book_id": book_id})
    await db.reader_positions.delete_many({"book_id": book_id})
    # Certificados já emitidos são preservados: guardam título e autor do livro.
    await db.book_quizzes.delete_many({"book_id": book_id})
    await db.book_quiz_attempts.delete_many({"book_id": book_id})

    return None

@api_router.post("/admin/books/upload-cover")
async def upload_book_cover(
    file: UploadFile = File(...),
    admin_user: dict = Depends(require_staff)
):
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido. Use JPG, PNG, GIF ou WebP.")

    # Validate file size (max 5MB)
    contents = await file.read(50 * 1024 * 1024 + 1)
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Máximo 5MB.")

    # Generate unique filename
    ext = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp'}[file.content_type]
    filename = f"cover_{uuid.uuid4().hex[:12]}.{ext}"
    file_path = BOOKS_COVERS_DIR / filename

    # Save file
    await save_upload(file_path, contents, file.content_type)

    # Generate URL
    cover_url = f"/api/uploads/books/covers/{filename}"

    return {"url": cover_url, "message": "Capa enviada com sucesso!"}

@api_router.post("/admin/books/upload-pdf")
async def upload_book_pdf(
    file: UploadFile = File(...),
    admin_user: dict = Depends(require_staff)
):
    # Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são permitidos.")

    # Validate file size (max 50MB)
    contents = await file.read(50 * 1024 * 1024 + 1)
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Máximo 50MB.")

    # Generate unique filename
    filename = f"book_{uuid.uuid4().hex[:12]}.pdf"
    file_path = BOOKS_PDF_DIR / filename

    # Save file
    await save_upload(file_path, contents, file.content_type)

    # Generate URL
    pdf_url = f"/api/uploads/books/pdfs/{filename}"

    return {"url": pdf_url, "message": "PDF enviado com sucesso!"}

@api_router.get("/admin/text-productions", response_model=List[TextProduction])
async def get_all_productions(turma: Optional[str] = None, admin_user: dict = Depends(require_staff)):
    user_ids = await scoped_ids(db, admin_user, turma)
    productions = await db.text_productions.find({"user_id": {"$in": user_ids}}, {"_id": 0}).to_list(1000)

    # Enrich with user names and turma
    for production in productions:
        user = await db.users.find_one({"id": production["user_id"]}, {"_id": 0})
        if user:
            production["user_nome"] = user["nome"]
            production["user_turma"] = user.get("turma")

    return productions

@api_router.get("/admin/text-productions/{production_id}", response_model=TextProduction)
async def get_production_as_admin(production_id: str, admin_user: dict = Depends(require_staff)):
    production = await db.text_productions.find_one({"id": production_id}, {"_id": 0})
    if not production:
        raise HTTPException(status_code=404, detail="Produção textual não encontrada")
    await ensure_student_scope(db, admin_user, production["user_id"])

    # Enrich with user name and turma
    user = await db.users.find_one({"id": production["user_id"]}, {"_id": 0})
    if user:
        production["user_nome"] = user["nome"]
        production["user_turma"] = user.get("turma")

    return TextProduction(**production)

@api_router.put("/admin/text-productions/{production_id}/correction", response_model=TextProduction)
async def correct_production(
    production_id: str,
    correction: CorrectionCreate,
    admin_user: dict = Depends(require_staff)
):
    production = await db.text_productions.find_one({"id": production_id})
    if not production:
        raise HTTPException(status_code=404, detail="Produção textual não encontrada")
    await ensure_student_scope(db, admin_user, production["user_id"])

    now = datetime.now(timezone.utc).isoformat()
    await db.text_productions.update_one(
        {"id": production_id},
        {"$set": {
            "nota": correction.nota,
            "feedback": correction.feedback,
            "corrigido_por": admin_user["nome"],
            "corrigido_em": now
        }}
    )

    updated_production = await db.text_productions.find_one({"id": production_id}, {"_id": 0})

    # Enrich with user name and turma
    user = await db.users.find_one({"id": updated_production["user_id"]}, {"_id": 0})
    if user:
        updated_production["user_nome"] = user["nome"]
        updated_production["user_turma"] = user.get("turma")

    return TextProduction(**updated_production)

@api_router.delete("/admin/text-productions/{production_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_production_admin(production_id: str, admin_user: dict = Depends(require_admin)):
    result = await db.text_productions.delete_one({"id": production_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produção textual não encontrada")
    return None

@api_router.get("/admin/users")
async def get_all_users(turma: Optional[str] = None, admin_user: dict = Depends(require_staff)):
    query = class_query(admin_user, turma)
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(1000)

    # Add statistics for each user
    for user in users:
        user["total_summaries"] = await db.summaries.count_documents({"user_id": user["id"]})
        user["total_productions"] = await db.text_productions.count_documents({"user_id": user["id"]})

    return users

@api_router.delete("/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str, admin_user: dict = Depends(require_admin)):
    # Prevent admin from deleting themselves
    if user_id == admin_user["id"]:
        raise HTTPException(status_code=400, detail="Você não pode excluir sua própria conta")

    # Check if user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Prevent deleting other admins
    if user.get("role") == "admin":
        raise HTTPException(status_code=403, detail="Não é possível excluir outro administrador")

    # Delete user and all related data
    await db.users.delete_one({"id": user_id})
    await db.summaries.delete_many({"user_id": user_id})
    await db.text_productions.delete_many({"user_id": user_id})
    await db.activity_submissions.delete_many({"user_id": user_id})
    await db.reading_progress.delete_many({"user_id": user_id})
    await db.reader_positions.delete_many({"user_id": user_id})
    await db.notification_reads.delete_many({"user_id": user_id})
    await db.password_resets.delete_many({"user_id": user_id})

    return None

# ========== MURAL ROUTES ==========

@api_router.get("/mural", response_model=List[MuralPost])
async def get_mural_posts(current_user: dict = Depends(get_current_user)):
    posts = await db.mural.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return posts

@api_router.post("/admin/mural", response_model=MuralPost, status_code=status.HTTP_201_CREATED)
async def create_mural_post(post_data: MuralPostCreate, admin_user: dict = Depends(require_staff)):
    if post_data.tipo not in ["foto", "video"]:
        raise HTTPException(status_code=400, detail="Tipo deve ser 'foto' ou 'video'")

    post_id = str(uuid.uuid4())
    post_doc = {
        "id": post_id,
        "tipo": post_data.tipo,
        "titulo": post_data.titulo,
        "url_media": post_data.url_media,
        "descricao": post_data.descricao,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "autor_id": admin_user["id"],
        "autor_nome": admin_user.get("nome"),
    }

    await db.mural.insert_one(post_doc)
    return MuralPost(**post_doc)

@api_router.delete("/admin/mural/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mural_post(post_id: str, admin_user: dict = Depends(require_staff)):
    query = {"id": post_id} if admin_user.get("role") == "admin" else {"id": post_id, "autor_id": admin_user["id"]}
    result = await db.mural.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    return None

@api_router.post("/admin/mural/upload")
async def upload_mural_image(
    file: UploadFile = File(...),
    admin_user: dict = Depends(require_staff)
):
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido. Use JPG, PNG, GIF ou WebP.")

    # Validate file size (max 10MB for mural images)
    contents = await file.read(50 * 1024 * 1024 + 1)
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Máximo 10MB.")

    # Generate unique filename
    ext = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp'}[file.content_type]
    filename = f"mural_{uuid.uuid4().hex[:12]}.{ext}"
    file_path = MURAL_UPLOADS_DIR / filename

    # Save file
    await save_upload(file_path, contents, file.content_type)

    # Generate URL (will be served by static files)
    image_url = f"/api/uploads/mural/{filename}"

    return {"url": image_url, "message": "Imagem enviada com sucesso!"}

# ========== CALENDAR ROUTES ==========

@api_router.get("/calendar", response_model=List[CalendarEvent])
async def get_calendar_events(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}

    # Filter by month and year if provided
    if mes and ano:
        # Create date range for the month
        start_date = f"{ano}-{mes:02d}-01"
        if mes == 12:
            end_date = f"{ano + 1}-01-01"
        else:
            end_date = f"{ano}-{mes + 1:02d}-01"
        query["data"] = {"$gte": start_date, "$lt": end_date}

    events = await db.calendar_events.find(query, {"_id": 0}).sort("data", 1).to_list(100)
    return events

@api_router.post("/admin/calendar", response_model=CalendarEvent, status_code=status.HTTP_201_CREATED)
async def create_calendar_event(event_data: CalendarEventCreate, admin_user: dict = Depends(require_admin)):
    # Validate date format
    try:
        datetime.strptime(event_data.data, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Data inválida. Use o formato YYYY-MM-DD")

    event_id = str(uuid.uuid4())
    event_doc = {
        "id": event_id,
        "titulo": event_data.titulo,
        "descricao": event_data.descricao,
        "data": event_data.data,
        "cor": event_data.cor or "#10b981",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.calendar_events.insert_one(event_doc)
    return CalendarEvent(**event_doc)

@api_router.put("/admin/calendar/{event_id}", response_model=CalendarEvent)
async def update_calendar_event(
    event_id: str,
    event_data: CalendarEventCreate,
    admin_user: dict = Depends(require_admin)
):
    event = await db.calendar_events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")

    # Validate date format
    try:
        datetime.strptime(event_data.data, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Data inválida. Use o formato YYYY-MM-DD")

    await db.calendar_events.update_one(
        {"id": event_id},
        {"$set": {
            "titulo": event_data.titulo,
            "descricao": event_data.descricao,
            "data": event_data.data,
            "cor": event_data.cor or "#10b981"
        }}
    )

    updated_event = await db.calendar_events.find_one({"id": event_id}, {"_id": 0})
    return CalendarEvent(**updated_event)

@api_router.delete("/admin/calendar/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_calendar_event(event_id: str, admin_user: dict = Depends(require_admin)):
    result = await db.calendar_events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    return None

from backend.activities import create_activity_router
api_router.include_router(create_activity_router(db, get_current_user, require_staff))

# Include the router in the main app
from backend.school import create_school_router
api_router.include_router(create_school_router(db,get_current_user,require_admin,require_staff,get_password_hash))
from backend.teaching import create_teaching_router
api_router.include_router(create_teaching_router(db,get_current_user,require_staff))
from backend.gradebook import create_gradebook_router
api_router.include_router(create_gradebook_router(db,get_current_user,require_staff))
from backend.push import create_push_router, ensure_indexes as ensure_push_indexes, push_loop
api_router.include_router(create_push_router(db,get_current_user))
from backend.quizzes import create_quiz_router
api_router.include_router(create_quiz_router(db, get_current_user, require_staff))
from backend.book_quiz import create_book_quiz_router, ensure_indexes as ensure_book_quiz_indexes
api_router.include_router(create_book_quiz_router(db, get_current_user, require_staff))
from backend.reading import create_reading_router, ensure_indexes as ensure_reading_indexes
api_router.include_router(create_reading_router(db, get_current_user))
app.include_router(api_router)

# Mount static files for uploads
@app.get("/api/uploads/{key:path}")
async def get_upload(key: str, inline: bool=False):
    return await upload_response(key,inline=inline)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def start_push_worker():
    await ensure_push_indexes(db)
    await ensure_book_quiz_indexes(db)
    await ensure_reading_indexes(db)
    app.state.push_task = asyncio.create_task(push_loop(db))

@app.on_event("shutdown")
async def shutdown_db_client():
    task = getattr(app.state, 'push_task', None)
    if task:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task
    client.close()

@app.get("/api/health")
async def health():
    try:
        await db.command('ping')
    except Exception:
        raise HTTPException(503, 'Banco indisponível')
    return {'status': 'ok'}

# One origin for both the API and the production interface.
FRONTEND_BUILD = Path(os.environ.get('FRONTEND_BUILD_DIR', ROOT_DIR.parent / 'frontend' / 'build')).resolve()
@app.get('/{resource_path:path}')
async def frontend(resource_path: str):
    if resource_path == 'api' or resource_path.startswith('api/'):
        raise HTTPException(404, 'Endpoint não encontrado')
    target = (FRONTEND_BUILD / resource_path).resolve()
    if not target.is_relative_to(FRONTEND_BUILD):
        raise HTTPException(404, 'Arquivo não encontrado')
    if target.is_file():
        return FileResponse(target, headers={'Cache-Control':'no-cache'} if resource_path == 'push-sw.js' else None)
    if resource_path.startswith('static/') or Path(resource_path).suffix:
        raise HTTPException(404, 'Arquivo não encontrado')
    index = FRONTEND_BUILD / 'index.html'
    if not index.is_file():
        raise HTTPException(404, 'Interface ainda não compilada')
    return FileResponse(index, headers={'Cache-Control':'no-cache'})
