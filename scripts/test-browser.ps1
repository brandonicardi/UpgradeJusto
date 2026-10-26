$ErrorActionPreference = 'Stop'
if ($env:UJ_DIAGNOSE_HYDRATION) { throw 'El gate E2E rechaza modo diagnóstico; autenticación no es sustituible.' }
$root = Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot 'local-env.ps1') -TestDatabase
$busy = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in @(3000,8000) })
if ($busy.Count) { throw 'Puertos E2E ocupados; no detener servidores ajenos.' }
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $root '.local/ms-playwright'
$env:NEXT_TELEMETRY_DISABLED = '1'
Push-Location (Join-Path $root 'frontend')
try {
    # E2E validates production hydration; do not reuse a stale dev/production build.
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Build frontend previo a E2E falló.' }
    & node ./node_modules/@playwright/test/cli.js test
    $code = $LASTEXITCODE
    Write-Host "Playwright PostgreSQL exit=$code"
    if ($code -ne 0) { throw 'Recorrido navegador PG falló.' }
} finally {
    Pop-Location
    # El teardown del navegador no debe dejar el clúster local sin respuesta.
    & (Join-Path $PSScriptRoot 'postgres.ps1') verify
    if (-not $?) { throw 'PostgreSQL no supera el postestado E2E; no aceptar el gate.' }
    Write-Host 'PostgreSQL post-E2E exit=0'
}
