param(
    [ValidateSet('Start', 'Stop')][string]$Action = 'Start',
    [switch]$SystemTrust,
    [ValidateSet('groq', 'ollama')][string]$ChatProvider = 'groq',
    [ValidatePattern('^[a-z0-9][a-z0-9._-]*:[a-z0-9][a-z0-9._-]*$')][string]$OllamaModel = 'qwen3:4b',
    [string]$ManifestPath
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$previewRoot = Join-Path $root '.local/logs/preview38'

function Stop-Owned($record) {
    $process = Get-Process -Id $record.id -ErrorAction SilentlyContinue
    if ($null -eq $process) { return }
    $actual = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $record.id)
    if ($null -eq $actual -or
        $process.StartTime.ToUniversalTime().ToString('o') -ne $record.started_utc -or
        $actual.ExecutablePath -ne $record.executable -or
        $actual.CommandLine -ne $record.command_line) {
        throw 'Owned process identity changed; refusing to stop it.'
    }
    Stop-Process -Id $process.Id -ErrorAction Stop
}

if ($Action -eq 'Stop') {
    if (-not $ManifestPath) { throw 'Specify the exact manifest returned by Start.' }
    $resolved = (Resolve-Path -LiteralPath $ManifestPath).Path
    $allowed = [IO.Path]::GetFullPath($previewRoot) + [IO.Path]::DirectorySeparatorChar
    if (-not $resolved.StartsWith($allowed, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Manifest must belong to this repository preview38 directory.'
    }
    $manifest = Get-Content -LiteralPath $resolved -Raw | ConvertFrom-Json
    if ($manifest.kind -ne 'upgradejusto-preview38-test' -or $manifest.repository -ne $root) {
        throw 'Unexpected preview manifest.'
    }
    $failed = $false
    foreach ($record in @($manifest.processes)) {
        try { Stop-Owned $record } catch { $failed = $true }
    }
    if ($failed) { throw 'One preview process identity/stop failed; other owned stops were attempted.' }
    Write-Output 'Preview TEST processes stopped; PostgreSQL and data were not changed.'
    exit 0
}

if ($ManifestPath) { throw 'Start creates a new manifest; do not supply a destination.' }
. (Join-Path $PSScriptRoot 'local-env.ps1') -TestDatabase -PublicOrigin 'http://localhost:3000'
if ($env:UJ_ENV -ne 'test' -or -not $env:DATABASE_URL -or $env:DATABASE_URL -ne $env:TEST_DATABASE_URL) {
    throw 'Preview requires the matched TEST database.'
}
$python = Join-Path $root 'backend/.venv/Scripts/python.exe'
$web = Join-Path $root 'frontend/server.mjs'
$node = (Get-Command node.exe -ErrorAction Stop).Source
if (-not (Test-Path $python) -or -not (Test-Path (Join-Path $root 'frontend/.next/BUILD_ID'))) {
    throw 'Existing backend environment and a verified frontend production build are required.'
}
if (Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in @(3000, 8000) }) {
    throw 'Port3000 or8000 occupied; no process was stopped or reused.'
}
if ($SystemTrust) { $env:UJ_TLS_TRUST = 'system' }
foreach ($variable in @('UJ_TEST_SHARE_ERROR_PROBE', 'UJ_TEST_SHARE_ERROR_BEFORE_TOKEN', 'UJ_TEST_SHARE_ERROR_AFTER_TOKEN', 'UJ_TEST_SHARE_SERVER_CONTROL')) {
    Remove-Item -LiteralPath ('Env:' + $variable) -ErrorAction SilentlyContinue
}
$env:UJ_CHAT_PROVIDER = $ChatProvider
$env:UJ_OLLAMA_MODEL = $OllamaModel
$env:UJ_ASSISTANT_EXCLUSIVE_STARTUP = '0'
$env:NEXT_TELEMETRY_DISABLED = '1'
$directory = Join-Path $previewRoot ((Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ') + '-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $directory -ErrorAction Stop | Out-Null
$records = @()
try {
    # Normal application; TEST selects existing local data, not a probe composition.
    $api = Start-Process -FilePath $python -WorkingDirectory (Join-Path $root 'backend') -ArgumentList @('-m', 'uvicorn', 'upgradejusto.main:app', '--host', '127.0.0.1', '--port', '8000', '--loop', 'asyncio', '--http', 'h11', '--no-proxy-headers', '--no-access-log') -RedirectStandardOutput (Join-Path $directory 'api.out.log') -RedirectStandardError (Join-Path $directory 'api.err.log') -PassThru
    foreach ($entry in @(@{ process = $api; name = 'api' })) {
        $actual = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $entry.process.Id)
        $records += @{ id = $entry.process.Id; name = $entry.name; started_utc = $entry.process.StartTime.ToUniversalTime().ToString('o'); executable = $actual.ExecutablePath; command_line = $actual.CommandLine }
    }
    $frontend = Start-Process -FilePath $node -WorkingDirectory (Join-Path $root 'frontend') -ArgumentList @(('"' + $web + '"')) -RedirectStandardOutput (Join-Path $directory 'web.out.log') -RedirectStandardError (Join-Path $directory 'web.err.log') -PassThru
    $actual = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $frontend.Id)
    $records += @{ id = $frontend.Id; name = 'web'; started_utc = $frontend.StartTime.ToUniversalTime().ToString('o'); executable = $actual.ExecutablePath; command_line = $actual.CommandLine }
    $target = Join-Path $directory 'owned-processes.json'
    @{ kind = 'upgradejusto-preview38-test'; repository = $root; processes = $records; url = 'http://localhost:3000'; environment = 'TEST'; application = 'upgradejusto.main:app'; chat_provider = $ChatProvider; ollama_model = $OllamaModel; chat_acceptance = 'blocked_no_success_claim' } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $target -Encoding utf8
    $ready = $false
    $healthStatus = $null
    $pageStatus = $null
    $readinessStage = 'api'
    $readinessError = 'none'
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if ($api.HasExited -or $frontend.HasExited) { throw 'A preview process exited during startup.' }
        try {
            $readinessStage = 'api'
            $health = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 2
            $healthStatus = [int]$health.StatusCode
            $readinessStage = 'web'
            $page = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/catalog' -TimeoutSec 2
            $pageStatus = [int]$page.StatusCode
            if ($health.StatusCode -eq 200 -and $page.StatusCode -eq 200) { $ready = $true; break }
        } catch {
            $kind = $_.Exception.GetType().Name
            $readinessError = if ($kind -in @('WebException', 'HttpResponseException', 'InvalidOperationException', 'NotSupportedException')) { $kind } else { 'other' }
            Start-Sleep -Milliseconds 250
        }
    }
    if (-not $ready) { throw ('Preview HTTP readiness failed: stage=' + $readinessStage + '; api_status=' + $healthStatus + '; web_status=' + $pageStatus + '; error_enum=' + $readinessError) }
    Write-Output 'TEST preview: http://localhost:3000 — not an integral acceptance or deployment.'
    Write-Output ('Owned process manifest: ' + $target)
    Write-Output 'Stop uses identity-checked process termination, not a claim of graceful Next DEV shutdown.'
} catch {
    foreach ($record in $records) {
        try { Stop-Owned $record } catch { Write-Warning 'Owned preview cleanup incomplete; verify the saved manifest.' }
    }
    throw
}
