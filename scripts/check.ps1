$ErrorActionPreference = 'Stop'
if ($env:UJ_DIAGNOSE_HYDRATION) { throw 'El gate integrado rechaza modo diagnóstico.' }
$root = Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot 'local-env.ps1') -TestDatabase
$python = Join-Path $root 'backend/.venv/Scripts/python.exe'
$ruff = Join-Path $root 'backend/.venv/Scripts/ruff.exe'
$uv = Join-Path $HOME '.local/bin/uv.exe'
$parseErrors = $null
$parseTokens = $null
foreach ($file in (Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.ps1' -File)) {
    [Management.Automation.Language.Parser]::ParseFile($file.FullName, [ref]$parseTokens, [ref]$parseErrors) | Out-Null
    if ($parseErrors.Count) { throw "Sintaxis PowerShell inválida: $($file.Name)" }
}
Write-Host 'PowerShell scripts syntax exit=0'
Push-Location (Join-Path $root 'backend')
try {
    & $python ../scripts/test-setup-guards.py
    $code=$LASTEXITCODE; Write-Host "setup guards exit=$code"; if ($code -ne 0) { throw 'guardas setup fallaron' }
    & $python -m pytest -q
    $code=$LASTEXITCODE; Write-Host "pytest exit=$code"; if ($code -ne 0) { throw 'pytest falló' }
    & $ruff check .
    $code=$LASTEXITCODE; Write-Host "ruff lint exit=$code"; if ($code -ne 0) { throw 'lint backend falló' }
    & $ruff format --check .
    $code=$LASTEXITCODE; Write-Host "ruff format exit=$code"; if ($code -ne 0) { throw 'formato backend falló' }
    Push-Location $root
    try {
        # --config resuelve src respecto del cwd: no mezclar raíz con backend/.
        & $ruff check scripts --config backend/pyproject.toml
        $code=$LASTEXITCODE; Write-Host "scripts lint exit=$code"; if ($code -ne 0) { throw 'lint scripts falló' }
        & $ruff format --check scripts --config backend/pyproject.toml
        $code=$LASTEXITCODE; Write-Host "scripts format exit=$code"; if ($code -ne 0) { throw 'formato scripts falló' }
    } finally { Pop-Location }
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
