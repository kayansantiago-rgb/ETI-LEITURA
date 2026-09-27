from unittest.mock import AsyncMock
import asyncio
import httpx
from backend import server

def get(path):
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=server.app),base_url='http://test') as c:
            return await c.get(path)
    return asyncio.run(run())

def test_production_serves_spa_but_not_unknown_api(tmp_path,monkeypatch):
    (tmp_path/'index.html').write_text('<html>ETI LEITURA</html>')
    (tmp_path/'static').mkdir()
    (tmp_path/'static/app.js').write_text('console.log("ETI")')
    monkeypatch.setattr(server,'FRONTEND_BUILD',tmp_path)
    assert get('/admin/activities/any-id').status_code==200
    assert get('/api/does-not-exist').status_code==404
    assert get('/static/missing.js').status_code==404
    assert get('/static/app.js').status_code==200
