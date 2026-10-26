param([switch]$TestDatabase)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot 'local-env.ps1') -TestDatabase:$TestDatabase
Push-Location (Join-Path $root 'backend')
try {
    & ./.venv/Scripts/python.exe -m alembic -c alembic.ini upgrade head
    $code = $LASTEXITCODE
    Write-Host "Alembic project migration exit=$code"
    if ($code -ne 0) { throw 'Migración falló; no continuar con seed.' }
    & ./.venv/Scripts/python.exe -m upgradejusto.persistence.seed
    $code = $LASTEXITCODE
    Write-Host "Catalog seed exit=$code"
    if ($code -ne 0) { throw 'Seed falló; no sobrescribir divergencias.' }
} finally { Pop-Location }
