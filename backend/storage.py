"""Local uploads in development; private S3-compatible storage online."""
import asyncio
import os
from pathlib import Path
from functools import lru_cache
from fastapi import HTTPException
from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse
from starlette.background import BackgroundTask

UPLOAD_ROOT = Path(__file__).resolve().parent / 'uploads'

@lru_cache(maxsize=1)
def s3_client():
    import boto3
    from botocore.config import Config
    for name in ['S3_ENDPOINT_URL','S3_ACCESS_KEY_ID','S3_SECRET_ACCESS_KEY','S3_BUCKET']:
        if not os.environ.get(name):
            raise RuntimeError(f'Configure {name} para o armazenamento online')
    return boto3.client('s3', endpoint_url=os.environ['S3_ENDPOINT_URL'],
        aws_access_key_id=os.environ['S3_ACCESS_KEY_ID'], aws_secret_access_key=os.environ['S3_SECRET_ACCESS_KEY'],
        region_name=os.environ.get('S3_REGION','auto'), config=Config(signature_version='s3v4'))

def validate_content(contents, content_type):
    signatures = {
        'application/pdf': contents.startswith(b'%PDF-'),
        'image/jpeg': contents.startswith(b'\xff\xd8\xff'),
        'image/png': contents.startswith(b'\x89PNG\r\n\x1a\n'),
        'image/gif': contents.startswith((b'GIF87a', b'GIF89a')),
        'image/webp': contents.startswith(b'RIFF') and contents[8:12] == b'WEBP',
    }
    if not signatures.get(content_type, False):
        raise HTTPException(400, 'O conteúdo do arquivo não corresponde ao tipo informado.')

async def save_upload(file_path, contents, content_type):
    validate_content(contents, content_type)
    key = file_path.resolve().relative_to(UPLOAD_ROOT).as_posix()
    if os.environ.get('STORAGE_BACKEND','local') == 's3':
        try:
            await asyncio.to_thread(s3_client().put_object, Bucket=os.environ['S3_BUCKET'], Key=key, Body=contents, ContentType=content_type)
        except Exception as exc:
            raise HTTPException(503, 'Não foi possível armazenar o arquivo. Tente novamente.') from exc
    else:
        await asyncio.to_thread(file_path.write_bytes, contents)

async def upload_response(key, inline=False):
    if not key or '\\' in key or any(part in ('..','.') for part in key.split('/')) or key.startswith('/'):
        raise HTTPException(404, 'Arquivo não encontrado')
    if os.environ.get('STORAGE_BACKEND','local') == 's3':
        from botocore.exceptions import ClientError
        try:
            client=s3_client()
            if inline:
                obj=await asyncio.to_thread(client.get_object,Bucket=os.environ['S3_BUCKET'],Key=key)
                body=obj['Body']
                return StreamingResponse(body.iter_chunks(chunk_size=65536),media_type=obj.get('ContentType','application/octet-stream'),headers={'Content-Length':str(obj['ContentLength']),'X-Content-Type-Options':'nosniff'},background=BackgroundTask(body.close))
            await asyncio.to_thread(client.head_object, Bucket=os.environ['S3_BUCKET'], Key=key)
            url=client.generate_presigned_url('get_object', Params={'Bucket':os.environ['S3_BUCKET'],'Key':key}, ExpiresIn=3600)
            return RedirectResponse(url, headers={'Cache-Control':'private, no-store'})
        except ClientError as exc:
            if str(exc.response.get('Error',{}).get('Code')) in ('404','NoSuchKey','NotFound'):
                raise HTTPException(404, 'Arquivo não encontrado') from exc
            raise HTTPException(503, 'Armazenamento temporariamente indisponível') from exc
    file_path=(UPLOAD_ROOT/key).resolve()
    if not file_path.is_relative_to(UPLOAD_ROOT) or not file_path.is_file():
        raise HTTPException(404, 'Arquivo não encontrado')
    return FileResponse(file_path, headers={'X-Content-Type-Options':'nosniff'})
