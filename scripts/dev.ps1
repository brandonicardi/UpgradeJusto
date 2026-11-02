param([switch]$SystemTrust)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot 'local-env.ps1')
if ($SystemTrust) { $env:UJ_TLS_TRUST = 'system' }
$python = Join-Path $root 'backend/.venv/Scripts/python.exe'
$node = (Get-Command node.exe -ErrorAction Stop).Source
$next = Join-Path $root 'frontend/node_modules/next/dist/bin/next'
if (-not (Test-Path $python) -or -not (Test-Path $next)) { throw 'Instalar dependencias locales según README antes de iniciar.' }
$busy = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in @(8000, 3000) }
if ($busy) { throw 'Puerto3000 u8000 ocupado; no se detiene ni reutiliza un proceso ajeno.' }
$logs = Join-Path $root '.local/logs'
New-Item -ItemType Directory -Path $logs -Force | Out-Null
$env:NEXT_TELEMETRY_DISABLED = '1'
$env:UJ_ASSISTANT_EXCLUSIVE_STARTUP = '1'
$backend = $null
$frontend = $null
try {
    $backend = Start-Process -FilePath $python -ArgumentList @('-m','uvicorn','upgradejusto.main:app','--host','127.0.0.1','--port','8000','--loop','asyncio','--http','h11','--no-proxy-headers','--no-access-log') -WorkingDirectory (Join-Path $root 'backend') -RedirectStandardOutput (Join-Path $logs 'backend.out.log') -RedirectStandardError (Join-Path $logs 'backend.err.log') -PassThru
    $frontend = Start-Process -FilePath $node -ArgumentList @(('"'+(Join-Path $root 'frontend/server.mjs')+'"'),'--dev') -WorkingDirectory (Join-Path $root 'frontend') -RedirectStandardOutput (Join-Path $logs 'frontend.out.log') -RedirectStandardError (Join-Path $logs 'frontend.err.log') -PassThru
    Write-Host 'Web http://localhost:3000 — API loopback http://127.0.0.1:8000 — Ctrl+C detiene solo estos procesos.'
    while (-not $backend.HasExited -and -not $frontend.HasExited) { Start-Sleep -Seconds 1 }
    throw 'Un servidor terminó. Revisar .local/logs/ sin publicar datos sensibles.'
} finally {
    foreach ($process in @($frontend, $backend)) {
        if ($null -ne $process -and -not $process.HasExited) {
            & taskkill.exe /PID $process.Id /T /F | Out-Null
        }
    }
}
