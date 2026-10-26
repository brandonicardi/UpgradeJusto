# Carga explícita, sin ejecutar contenido .env ni imprimir secretos.
param([switch]$TestDatabase)
$root = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $root '.local/postgresql/runtime.json'
if (-not (Test-Path $runtime)) { throw 'Falta configuración del clúster exclusivo del proyecto.' }
$config = Get-Content -LiteralPath $runtime -Raw | ConvertFrom-Json
if (-not $config.UJ_PROXY_SECRET -or $config.UJ_PROXY_SECRET.Length -lt 64) { throw 'Falta secreto server-only del proxy; ejecutar postgres.ps1 ensure-proxy-key.' }
$env:UJ_PROXY_SECRET = $config.UJ_PROXY_SECRET
$env:UJ_TRUSTED_PROXY_PEERS = '127.0.0.1'
$dev = [Uri]$config.DATABASE_URL
$test = [Uri]$config.TEST_DATABASE_URL
foreach ($target in @($dev,$test)) {
    if ($target.Scheme -ne 'postgresql+psycopg' -or $target.Host -ne '127.0.0.1' -or $target.Port -ne 55433) { throw 'Destino PG no pertenece al clúster exclusivo fijado.' }
    if ($target.Query -or $target.Fragment) { throw 'Destinos del proyecto no admiten query ni fragmentos de conexión.' }
}
if ($dev.AbsolutePath -ne '/upgradejusto_dev' -or $dev.UserInfo.Split(':')[0] -ne 'upgradejusto_dev_app') { throw 'Configuración dev no válida.' }
if ($test.AbsolutePath -ne '/upgradejusto_test' -or $test.UserInfo.Split(':')[0] -ne 'upgradejusto_test_app' -or $config.TEST_DATABASE_URL -eq $config.DATABASE_URL) { throw 'Tests rechazan desarrollo/rol/destino ajenos.' }
if ($TestDatabase) {
    $env:DATABASE_URL = $config.TEST_DATABASE_URL
    $env:TEST_DATABASE_URL = $config.TEST_DATABASE_URL
    $env:UJ_TEST_POSTGRES = '1'
    $env:UJ_ENV = 'test'
} else {
    $env:DATABASE_URL = $config.DATABASE_URL
    $env:TEST_DATABASE_URL = $null
    $env:UJ_TEST_POSTGRES = $null
    $env:UJ_ENV = 'dev'
}
$envFile = Join-Path $root '.env'
if (Test-Path $envFile) {
    foreach ($line in [IO.File]::ReadAllLines($envFile)) {
        # Solo variables de producto enumeradas. No sobrescribir destinos dev/test.
        if ($line -match '^\s*(GROQ_API_KEY|GROQ_MODEL|UJ_TLS_TRUST)\s*=\s*(.*?)\s*$') {
            $value = $Matches[2].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($Matches[1], $value, 'Process')
        }
    }
}
if ($env:UJ_TLS_TRUST -and $env:UJ_TLS_TRUST -notin @('certifi','system')) { throw 'UJ_TLS_TRUST debe ser certifi o system; TLS nunca se desactiva.' }
$rag = Join-Path $root '.local/assistant-rag.json'
$env:UJ_ASSISTANT_RAG_CONFIG = if (Test-Path -LiteralPath $rag) { $rag } else { $null }
$env:UJ_ORIGIN = 'http://127.0.0.1:3000'
$env:UJ_ALLOW_INSECURE_LOOPBACK = '1'
