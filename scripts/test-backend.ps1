$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot 'local-env.ps1') -TestDatabase
Push-Location (Join-Path $root 'backend')
try {
    & ./.venv/Scripts/python.exe -m pytest -q
    $code = $LASTEXITCODE
    Write-Host "Backend PostgreSQL tests exit=$code"
    if ($code -ne 0) { throw 'Tests backend fallaron; no confundir con checks offline.' }
} finally { Pop-Location }
