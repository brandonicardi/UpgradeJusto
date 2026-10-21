$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$python = Join-Path $root 'backend/.venv/Scripts/python.exe'
$ruff = Join-Path $root 'backend/.venv/Scripts/ruff.exe'
$uv = Join-Path $HOME '.local/bin/uv.exe'
Push-Location (Join-Path $root 'backend')
try {
    & $python -m pytest -q
    $code=$LASTEXITCODE; Write-Host "pytest exit=$code"; if ($code -ne 0) { throw 'pytest falló' }
    & $ruff check .
    $code=$LASTEXITCODE; Write-Host "ruff lint exit=$code"; if ($code -ne 0) { throw 'lint backend falló' }
    & $ruff format --check .
    $code=$LASTEXITCODE; Write-Host "ruff format exit=$code"; if ($code -ne 0) { throw 'formato backend falló' }
    & $uv sync --check --locked --group dev --python 3.12.13 --no-python-downloads
    $code=$LASTEXITCODE; Write-Host "uv sync check exit=$code"; if ($code -ne 0) { throw 'lock/sync falló' }
} finally { Pop-Location }
Push-Location (Join-Path $root 'frontend')
try {
    $env:NEXT_TELEMETRY_DISABLED='1'
    $env:PLAYWRIGHT_BROWSERS_PATH=Join-Path $root '.local/ms-playwright'
    foreach ($script in @('typecheck','lint','test','build','test:e2e')) {
        & npm run $script
        $code=$LASTEXITCODE; Write-Host "$script exit=$code"; if ($code -ne 0) { throw "Frontend $script falló" }
    }
} finally { Pop-Location }
