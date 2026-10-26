# Explicit live-provider gate: may consume Groq quota. No automatic retries.
param([switch]$SystemTrust)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot 'local-env.ps1') -TestDatabase
if (-not $env:GROQ_API_KEY) { throw 'Falta GROQ_API_KEY local; no iniciar LIVE ni sustituir proveedor.' }
$busy = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in @(3000,8000) })
if ($busy.Count) { throw 'Puertos LIVE ocupados; no detener servidores ajenos.' }
$previousLive = $env:UJ_TEST_ASSISTANT_LIVE
$previousTrust = $env:UJ_TLS_TRUST
$env:UJ_TEST_ASSISTANT_LIVE = '1'
if ($SystemTrust) { $env:UJ_TLS_TRUST = 'system' }
$env:NEXT_TELEMETRY_DISABLED = '1'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $root '.local/ms-playwright'
Push-Location (Join-Path $root 'frontend')
try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Build previo a LIVE falló.' }
    & node ./node_modules/@playwright/test/cli.js test --config=playwright.live.config.ts tests/live/assistant.spec.ts
    $code = $LASTEXITCODE
    Write-Host "Playwright LIVE exit=$code"
    if ($code -ne 0) { throw 'Gate LIVE falló; no reintentar ni declarar éxito simulado.' }
} finally {
    Pop-Location
    $env:UJ_TEST_ASSISTANT_LIVE = $previousLive
    $env:UJ_TLS_TRUST = $previousTrust
    & (Join-Path $PSScriptRoot 'postgres.ps1') verify
    if (-not $?) { throw 'PostgreSQL no supera postestado LIVE.' }
    Write-Host 'PostgreSQL post-LIVE exit=0'
}
