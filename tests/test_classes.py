import asyncio
import httpx
from fastapi import FastAPI

import backend.classes as classes
from backend.activities import CLASSES


class Cursor:
    def __init__(self, rows):
        self.rows = rows

    async def to_list(self, n):
        return [dict(r) for r in self.rows]

    def __aiter__(self):
        async def gen():
            for r in self.rows:
                yield r
        return gen()


def matches(doc, query):
    for key, value in query.items():
        field = doc.get(key)
        if isinstance(field, list):
            if value not in field:
                return False
        elif field != value:
            return False
    return True


class Collection:
    def __init__(self, rows=None):
        self.rows = rows or []

    async def create_index(self, *a, **k):
        pass

    async def count_documents(self, query):
        return sum(matches(r, query) for r in self.rows)

    async def distinct(self, field, query):
        return sorted({r.get(field) for r in self.rows if matches(r, query)} - {None})

    def find(self, query, projection=None):
        return Cursor([r for r in self.rows if matches(r, query)])

    async def insert_one(self, doc):
        self.rows.append(dict(doc))

    async def insert_many(self, docs):
        self.rows.extend(dict(d) for d in docs)

    async def delete_one(self, query):
        self.rows = [r for r in self.rows if not matches(r, query)]

    async def update_one(self, query, update):
        for r in self.rows:
            if matches(r, query):
                r.update(update['$set'])
                return type('R', (), {'matched_count': 1})()
        return type('R', (), {'matched_count': 0})()

    async def update_many(self, query, update):
        for r in self.rows:
            if matches(r, query):
                for key, value in update['$pull'].items():
                    r[key] = [x for x in r.get(key, []) if x != value]

    def aggregate(self, pipeline):
        role = pipeline[0]['$match']['role']
        counts = {}
        for r in self.rows:
            if r.get('role') != role:
                continue
            for turma in (r.get('turmas', []) if role == 'teacher' else [r.get('turma')]):
                counts[turma] = counts.get(turma, 0) + 1
        return Cursor([{'_id': k, 'n': v} for k, v in counts.items()])


class DB:
    def __init__(self):
        self.turmas = Collection()
        self.users = Collection([
            {'id': 's1', 'role': 'student', 'turma': '7º ANO'},
            {'id': 's2', 'role': 'student', 'turma': 'TURMA ANTIGA'},
            {'id': 't1', 'role': 'teacher', 'turmas': ['7º ANO', '9º ANO']},
        ])
        self.books = Collection([{'id': 'b1', 'turmas': ['9º ANO']}])


def app_for(db):
    app = FastAPI()
    app.include_router(classes.create_classes_router(db, lambda: {'id': 'adm', 'role': 'admin'}))
    return app


def call(app, method, path, **kw):
    async def go():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://t') as c:
            return await c.request(method, path, **kw)
    return asyncio.run(go())


def test_seed_keeps_old_classes_and_students_turma():
    db = DB()
    asyncio.run(classes.ensure_classes(db))
    assert '7º ANO' in classes.NAMES and 'TURMA ANTIGA' in classes.NAMES
    assert classes.NAMES.index('9º ANO') < classes.NAMES.index('1º SÉRIE A')   # Fundamental antes do Médio
    assert 'TODAS' in CLASSES and classes.level_of('8º ANO') == 'FUNDAMENTAL'


def test_create_and_delete_class():
    db = DB()
    asyncio.run(classes.ensure_classes(db))
    app = app_for(db)

    r = call(app, 'POST', '/admin/classes', json={'nome': '  1º  série c ', 'nivel': 'MÉDIO'})
    assert r.status_code == 201 and r.json()['value'] == '1º SÉRIE C'
    assert '1º SÉRIE C' in CLASSES and classes.level_of('1º SÉRIE C') == 'MÉDIO'   # vale na hora para o servidor todo
    assert call(app, 'POST', '/admin/classes', json={'nome': '1º Série C'}).status_code == 409
    assert call(app, 'POST', '/admin/classes', json={'nome': 'todas'}).status_code == 422

    listed = {c['value']: c for c in call(app, 'GET', '/admin/classes').json()}
    assert listed['7º ANO']['alunos'] == 1 and listed['9º ANO']['professores'] == 1

    blocked = call(app, 'DELETE', '/admin/classes/7º ANO')
    assert blocked.status_code == 409 and 'Mude os alunos' in blocked.json()['detail']

    assert call(app, 'DELETE', '/admin/classes/9º ANO').status_code == 204
    assert '9º ANO' not in CLASSES
    assert db.users.rows[2]['turmas'] == ['7º ANO'] and db.books.rows[0]['turmas'] == []
    assert call(app, 'DELETE', '/admin/classes/9º ANO').status_code == 404
    assert '9º ANO' not in [c['value'] for c in call(app, 'GET', '/classes').json()]


def test_move_student_then_delete_empty_class():
    db = DB()
    asyncio.run(classes.ensure_classes(db))
    app = app_for(db)
    assert call(app, 'PUT', '/admin/students/s2/turma', json={'turma': 'NÃO EXISTE'}).status_code == 422
    assert call(app, 'PUT', '/admin/students/t1/turma', json={'turma': '8º ANO'}).status_code == 404   # só alunos
    assert call(app, 'PUT', '/admin/students/s2/turma', json={'turma': '8º ANO'}).json() == {'turma': '8º ANO'}
    assert call(app, 'DELETE', '/admin/classes/TURMA ANTIGA').status_code == 204
