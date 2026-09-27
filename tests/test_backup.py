import json,zipfile
import pytest
from scripts.backup import restore

def test_restore_cannot_target_active_database(tmp_path,monkeypatch):
    monkeypatch.setenv('DB_NAME','eti_leitura')
    with pytest.raises(ValueError,match='NOVO'):
        restore(tmp_path/'missing.zip','eti_leitura',tmp_path/'files')

def test_corrupt_backup_rejected_before_creating_database(tmp_path,monkeypatch):
    monkeypatch.setenv('DB_NAME','eti_leitura')
    archive=tmp_path/'corrupt.zip'
    with zipfile.ZipFile(archive,'w') as z:
        z.writestr('manifest.json',json.dumps({'version':1,'files':{'uploads/test.pdf':'wrong-hash'}}))
        z.writestr('uploads/test.pdf',b'corrupted')
    with pytest.raises(ValueError,match='corrompido'):
        restore(archive,'eti_restore_corrupt',tmp_path/'files')
    assert not (tmp_path/'files').exists()
