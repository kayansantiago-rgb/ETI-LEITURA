from fastapi import HTTPException

def staff(user):
    return user.get('role') in ('admin','teacher')

def class_query(user, turma=None):
    query={'role':'student'}
    if user.get('role')=='teacher':
        allowed=user.get('turmas',[])
        if turma and turma!='TODAS' and turma not in allowed:
            raise HTTPException(403,'Turma não atribuída a este professor')
        query['turma']=turma if turma and turma!='TODAS' else {'$in':allowed}
    elif turma and turma!='TODAS':
        query['turma']=turma
    return query

async def ensure_student_scope(db,user,student_id):
    if user.get('role')=='teacher':
        student=await db.users.find_one({'id':student_id,'role':'student','turma':{'$in':user.get('turmas',[])}})
        if not student:raise HTTPException(404,'Aluno ou trabalho não encontrado')

async def with_avatars(db, rows, field='user_id'):
    """Acrescenta user_avatar e user_moldura em cada linha (uma única consulta ao banco)."""
    ids = list({r.get(field) for r in rows if r.get(field)})
    if not ids:
        return rows
    people = {u['id']: u for u in await db.users.find({'id': {'$in': ids}}, {'_id': 0, 'id': 1, 'avatar_url': 1, 'moldura': 1}).to_list(len(ids))}
    for r in rows:
        person = people.get(r.get(field), {})
        r['user_avatar'] = person.get('avatar_url')
        r['user_moldura'] = person.get('moldura')
    return rows

async def scoped_ids(db,user,turma=None):
    return [u['id'] for u in await db.users.find(class_query(user,turma),{'id':1,'_id':0}).to_list(10000)]
