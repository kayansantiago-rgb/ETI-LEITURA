import asyncio
from unittest.mock import Mock
import pytest
from fastapi import HTTPException
from backend import storage

@pytest.mark.parametrize('content,mime',[(b'<html>bad</html>','image/png'),(b'<html>bad</html>','application/pdf')])
def test_upload_rejects_mismatched_content(content,mime):
    with pytest.raises(HTTPException) as exc: storage.validate_content(content,mime)
    assert exc.value.status_code==400

def test_local_file_roundtrip(tmp_path,monkeypatch):
    monkeypatch.setattr(storage,'UPLOAD_ROOT',tmp_path)
    monkeypatch.setenv('STORAGE_BACKEND','local')
    file=tmp_path/'test.pdf'
    asyncio.run(storage.save_upload(file,b'%PDF-1.4\n','application/pdf'))
    assert file.read_bytes()==b'%PDF-1.4\n'
    result=asyncio.run(storage.upload_response('test.pdf'))
    assert str(result.path)==str(file)

def test_s3_preserves_stable_key_and_uses_signed_download(tmp_path,monkeypatch):
    monkeypatch.setattr(storage,'UPLOAD_ROOT',tmp_path)
    monkeypatch.setenv('STORAGE_BACKEND','s3');monkeypatch.setenv('S3_BUCKET','test-bucket')
    client=Mock();client.generate_presigned_url.return_value='https://storage.example.com/signed'
    monkeypatch.setattr(storage,'s3_client',lambda:client)
    asyncio.run(storage.save_upload(tmp_path/'test.pdf',b'%PDF-1.4\n','application/pdf'))
    assert not (tmp_path/'test.pdf').exists()
    assert client.put_object.call_args.kwargs['Key']=='test.pdf'
    response=asyncio.run(storage.upload_response('test.pdf'))
    assert response.headers['location']=='https://storage.example.com/signed'

@pytest.mark.parametrize('key',['../secret','.env/../secret','folder\\secret'])
def test_storage_rejects_path_traversal(key):
    with pytest.raises(HTTPException) as exc:asyncio.run(storage.upload_response(key))
    assert exc.value.status_code==404

def test_s3_inline_reader_streams_without_external_redirect(monkeypatch):
    monkeypatch.setenv('STORAGE_BACKEND','s3');monkeypatch.setenv('S3_BUCKET','test-bucket')
    body=Mock();body.iter_chunks.return_value=iter([b'%PDF-',b'1.4'])
    client=Mock();client.get_object.return_value={'Body':body,'ContentType':'application/pdf','ContentLength':8}
    monkeypatch.setattr(storage,'s3_client',lambda:client)
    async def read():
        response=await storage.upload_response('books/pdfs/reader.pdf',inline=True)
        assert 'location' not in response.headers
        assert response.headers['content-type']=='application/pdf'
        content=b''.join([chunk async for chunk in response.body_iterator])
        await response.background()
        return content
    assert asyncio.run(read())==b'%PDF-1.4'
    body.close.assert_called_once()
