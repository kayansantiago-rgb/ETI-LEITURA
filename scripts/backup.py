"""Portable database/files backup and verified restore into a NEW database.

Run while the application is stopped or read-only for a consistent snapshot.
Never includes environment files, JWT keys or S3 credentials.
"""
import argparse, hashlib, json, os, sys, zipfile
from datetime import datetime, timezone
from pathlib import Path
from bson import json_util
from dotenv import load_dotenv
from pymongo import MongoClient
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT))
load_dotenv(ROOT/'backend'/'.env')

def digest(data):return hashlib.sha256(data).hexdigest()

def backup(destination, include_files=True):
    destination=Path(destination);destination.parent.mkdir(parents=True,exist_ok=True)
    manifest={'version':1,'created_at':datetime.now(timezone.utc).isoformat(),'database':os.environ['DB_NAME'],'files':{},'collections':{}}
    with MongoClient(os.environ['MONGO_URL']) as client, zipfile.ZipFile(destination,'x',zipfile.ZIP_DEFLATED) as archive:
        db=client[os.environ['DB_NAME']]
        def add(name,data):
            archive.writestr(name,data);manifest['files'][name]=digest(data)
        for name in sorted(db.list_collection_names()):
            if name.startswith('system.'):continue
            docs=list(db[name].find({}));indexes=list(db[name].list_indexes())
            add('database/'+name+'.json',json_util.dumps({'documents':docs,'indexes':indexes}).encode('utf-8'))
            manifest['collections'][name]=len(docs)
        if not include_files:
            manifest['sem_arquivos']=True
        elif os.environ.get('STORAGE_BACKEND','local')=='s3':
            from backend.storage import s3_client
            s3=s3_client();bucket=os.environ['S3_BUCKET']
            for page in s3.get_paginator('list_objects_v2').paginate(Bucket=bucket):
                for obj in page.get('Contents',[]):
                    key=obj['Key']
                    if key.endswith('/'):continue
                    with s3.get_object(Bucket=bucket,Key=key)['Body'] as body:add('uploads/'+key,body.read())
        else:
            uploads=ROOT/'backend'/'uploads'
            for file in sorted(uploads.rglob('*')):
                if file.is_file():add('uploads/'+file.relative_to(uploads).as_posix(),file.read_bytes())
        archive.writestr('manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2))
    print(f'Backup criado: {destination}. {sum(manifest["collections"].values())} documentos; {len(manifest["files"])} arquivos verificados por SHA-256.')
    return manifest

def restore(source,database,uploads):
    if database==os.environ['DB_NAME'] or not database.startswith('eti_restore_'):
        raise ValueError('Use um banco NOVO com prefixo eti_restore_; o banco em uso nunca é sobrescrito.')
    target=Path(uploads).resolve()
    if target.exists() and any(target.iterdir()):raise ValueError('Escolha uma pasta vazia para restaurar os arquivos.')
    with zipfile.ZipFile(source) as archive:
        manifest=json.loads(archive.read('manifest.json'))
        if manifest.get('version')!=1:raise ValueError('Formato de backup incompatível')
        if set(archive.namelist())!=set(manifest['files'])|{'manifest.json'}:raise ValueError('Conteúdo inesperado no backup')
        payload={}
        for name,expected in manifest['files'].items():
            if '\\' in name or name.startswith('/') or any(p in ('..','.') for p in name.split('/')):raise ValueError('Caminho inválido no backup')
            raw=archive.read(name)
            if digest(raw)!=expected:raise ValueError('Arquivo corrompido: '+name)
            if name.startswith('uploads/') and not (target/name[8:]).resolve().is_relative_to(target):raise ValueError('Caminho de arquivo inválido')
            payload[name]=raw
        with MongoClient(os.environ['MONGO_URL']) as client:
            if database in client.list_database_names():raise ValueError('Banco de destino já existe; escolha outro nome.')
            db=client[database]
            for name,raw in payload.items():
                if name.startswith('database/'):
                    collection=name[9:-5];data=json_util.loads(raw);db.create_collection(collection)
                    if data['documents']:db[collection].insert_many(data['documents'])
                    for index in data['indexes']:
                        if index['name']=='_id_':continue
                        options={k:v for k,v in index.items() if k not in ('key','v','ns')}
                        db[collection].create_index(list(index['key'].items()),**options)
                    if db[collection].count_documents({})!=manifest['collections'][collection]:raise ValueError('Contagem divergente: '+collection)
                elif name.startswith('uploads/'):
                    file=target/name[8:];file.parent.mkdir(parents=True,exist_ok=True);file.write_bytes(raw)
                    if digest(file.read_bytes())!=manifest['files'][name]:raise ValueError('Falha ao verificar arquivo restaurado')
    print(f'Restauração verificada no banco {database}; arquivos em {target}. O banco original foi preservado.')
    return manifest

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);sub=parser.add_subparsers(dest='command',required=True)
    create=sub.add_parser('create');create.add_argument('--output',required=True);create.add_argument('--sem-arquivos',action='store_true',help='Copia só o banco (sem PDFs e imagens)')
    recover=sub.add_parser('restore');recover.add_argument('archive');recover.add_argument('--database',required=True);recover.add_argument('--uploads',required=True)
    args=parser.parse_args()
    if args.command=='create':backup(args.output,include_files=not args.sem_arquivos)
    else:restore(args.archive,args.database,args.uploads)
