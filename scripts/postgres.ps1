param([ValidateSet('setup','provision','start','stop','status','verify','enable-vector','verify-vector','ensure-proxy-key')][string]$Action = 'status')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
& (Join-Path $root 'backend/.venv/Scripts/python.exe') (Join-Path $PSScriptRoot 'postgres_admin.py') $Action
if ($LASTEXITCODE -ne 0) { throw "PostgreSQL local: $Action falló; diagnóstico saneado arriba." }
