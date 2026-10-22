"""Copia todos os arquivos (PDFs, capas, avatares, mural) de um bucket S3 para outro.

Uso na migração Railway -> Cloudflare R2. As credenciais ficam em .local/migracao.env
(ignorado pelo Git) e nunca são exibidas:

    ORIGEM_S3_ENDPOINT_URL=...      DESTINO_S3_ENDPOINT_URL=https://<conta>.r2.cloudflarestorage.com
    ORIGEM_S3_BUCKET=...            DESTINO_S3_BUCKET=eti-leitura-arquivos
    ORIGEM_S3_ACCESS_KEY_ID=...     DESTINO_S3_ACCESS_KEY_ID=...
    ORIGEM_S3_SECRET_ACCESS_KEY=... DESTINO_S3_SECRET_ACCESS_KEY=...
    ORIGEM_S3_REGION=auto           DESTINO_S3_REGION=auto

Exemplos:
    .venv/Scripts/python.exe scripts/copy_bucket.py --testar      # só confere o acesso e conta os arquivos
    .venv/Scripts/python.exe scripts/copy_bucket.py               # copia (pula o que já foi copiado)
    .venv/Scripts/python.exe scripts/copy_bucket.py --origem-pasta C:/livros-originais
        # sem acesso ao bucket antigo: envia uma pasta com books/pdfs, books/covers, avatars, mural
"""
import argparse
import mimetypes
import sys
from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / '.local' / 'migracao.env'
FIELDS = ['ENDPOINT_URL', 'BUCKET', 'ACCESS_KEY_ID', 'SECRET_ACCESS_KEY']


def settings(prefix, values):
    missing = [f'{prefix}_S3_{name}' for name in FIELDS if not values.get(f'{prefix}_S3_{name}')]
    if missing:
        raise SystemExit(f'Preencha em {CONFIG}: ' + ', '.join(missing))
    client = boto3.client('s3', endpoint_url=values[f'{prefix}_S3_ENDPOINT_URL'],
                          aws_access_key_id=values[f'{prefix}_S3_ACCESS_KEY_ID'],
                          aws_secret_access_key=values[f'{prefix}_S3_SECRET_ACCESS_KEY'],
                          region_name=values.get(f'{prefix}_S3_REGION') or 'auto',
                          config=Config(signature_version='s3v4', retries={'max_attempts': 5}))
    return client, values[f'{prefix}_S3_BUCKET']


def check(client, bucket, label):
    try:
        client.head_bucket(Bucket=bucket)
    except ClientError as exc:
        code = exc.response.get('Error', {}).get('Code')
        raise SystemExit(f'Sem acesso ao bucket {label} ({code}). Confira endpoint, nome e chaves.')


def bucket_objects(client, bucket):
    for page in client.get_paginator('list_objects_v2').paginate(Bucket=bucket):
        for item in page.get('Contents', []):
            yield item['Key'], item['Size']


def folder_objects(folder):
    for path in sorted(folder.rglob('*')):
        if path.is_file():
            yield path.relative_to(folder).as_posix(), path.stat().st_size


def existing_size(client, bucket, key):
    try:
        return client.head_object(Bucket=bucket, Key=key)['ContentLength']
    except ClientError:
        return None


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--testar', action='store_true', help='só confere o acesso e conta os arquivos')
    parser.add_argument('--origem-pasta', type=Path, help='envia uma pasta local em vez do bucket antigo')
    args = parser.parse_args()

    values = dotenv_values(CONFIG) if CONFIG.exists() else {}
    target, target_bucket = settings('DESTINO', values)
    check(target, target_bucket, 'de destino')

    if args.origem_pasta:
        folder = args.origem_pasta.resolve()
        if not folder.is_dir():
            raise SystemExit(f'Pasta não encontrada: {folder}')
        items = list(folder_objects(folder))
    else:
        source, source_bucket = settings('ORIGEM', values)
        check(source, source_bucket, 'de origem')
        items = list(bucket_objects(source, source_bucket))

    total = sum(size for _, size in items)
    print(f'{len(items)} arquivos encontrados ({total / 1_048_576:.1f} MB).')
    if args.testar:
        print('Acesso aos dois lados confirmado. Rode sem --testar para copiar.')
        return

    copied = skipped = 0
    failures = []
    for index, (key, size) in enumerate(items, 1):
        if existing_size(target, target_bucket, key) == size:
            skipped += 1
            continue
        try:
            if args.origem_pasta:
                data = (folder / key).read_bytes()
                content_type = mimetypes.guess_type(key)[0] or 'application/octet-stream'
            else:
                obj = source.get_object(Bucket=source_bucket, Key=key)
                data = obj['Body'].read()
                content_type = obj.get('ContentType') or mimetypes.guess_type(key)[0] or 'application/octet-stream'
            target.put_object(Bucket=target_bucket, Key=key, Body=data, ContentType=content_type)
            if existing_size(target, target_bucket, key) != len(data):
                raise RuntimeError('tamanho diferente após o envio')
            copied += 1
            print(f'[{index}/{len(items)}] {key}')
        except Exception as exc:  # segue com os demais e lista no fim
            failures.append(f'{key}: {exc}')

    print(f'\nCopiados: {copied}  Já existiam: {skipped}  Falhas: {len(failures)}')
    for line in failures:
        print('  - ' + line)
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
