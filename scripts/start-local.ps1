$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root
$python = Join-Path $root '.venv/Scripts/python.exe'
function Test-LocalPort([int]$Port) {
    $socket = [Net.Sockets.TcpClient]::new()
    try { $socket.Connect('127.0.0.1', $Port); return $true } catch { return $false } finally { $socket.Dispose() }
}
New-Item -ItemType Directory -Force (Join-Path $root '.local/data'),(Join-Path $root '.local/logs') | Out-Null
if (-not (Test-LocalPort 27017)) {
    $mongo = Join-Path $root '.local/mongodb/mongod.exe'
    if (-not (Test-Path -LiteralPath $mongo)) { throw 'MongoDB local nao encontrado em .local/mongodb.' }
    Start-Process -FilePath $mongo -WindowStyle Hidden -ArgumentList @('--dbpath',('"'+(Join-Path $root '.local/data')+'"'),'--logpath',('"'+(Join-Path $root '.local/logs/mongodb.log')+'"'),'--logappend','--bind_ip','127.0.0.1','--port','27017')
}
& $python scripts/init_database.py
if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel inicializar o banco.' }
if (-not (Test-LocalPort 8000)) {
    Start-Process -FilePath $python -WorkingDirectory $root -WindowStyle Hidden -ArgumentList @('-m','uvicorn','backend.server:app','--host','127.0.0.1','--port','8000') -RedirectStandardOutput (Join-Path $root '.local/logs/api.log') -RedirectStandardError (Join-Path $root '.local/logs/api-error.log')
}
if (-not (Test-LocalPort 3000)) {
    $env:BROWSER='none'
    $env:HOST='127.0.0.1'
    $node=(Get-Command node.exe -ErrorAction Stop).Source
    Start-Process -FilePath $node -WorkingDirectory (Join-Path $root 'frontend') -WindowStyle Hidden -ArgumentList @('node_modules/@craco/craco/dist/bin/craco.js','start') -RedirectStandardOutput (Join-Path $root '.local/logs/frontend.log') -RedirectStandardError (Join-Path $root '.local/logs/frontend-error.log')
}
Write-Host 'ETI LEITURA iniciando em http://127.0.0.1:3000. Aguarde a compilacao da interface.'
