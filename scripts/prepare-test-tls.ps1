param([string]$OpenSslPath)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (-not $OpenSslPath) {
    $command = Get-Command openssl -ErrorAction SilentlyContinue
    if ($command) { $OpenSslPath = $command.Source }
    else { $OpenSslPath = Join-Path $env:ProgramFiles 'Git/usr/bin/openssl.exe' }
}
if (-not (Test-Path -LiteralPath $OpenSslPath)) { throw 'Se necesita OpenSSL existente; no se instala globalmente.' }
$privateRoot = Join-Path $root '.local/postgresql'
if (-not (Test-Path (Join-Path $privateRoot 'runtime.json'))) { throw 'Preparar primero clúster/configuración privada.' }
$base = Join-Path $privateRoot 'tls-proof'
$cert = Join-Path $base 'cert.pem'
$key = Join-Path $base 'key.pem'
if (Test-Path $base) {
    if (-not (Test-Path $cert) -or -not (Test-Path $key)) { throw 'Artefacto TLS parcial existente; no sobrescribir.' }
    & $OpenSslPath x509 -in $cert -noout -checkend 0
    if ($LASTEXITCODE -ne 0) { throw 'Certificado de prueba vencido; requiere renovación explícita, no sobrescribir originales.' }
    Write-Host 'Certificado privado existente aún válido; sin cambios.'
    return
}
New-Item -ItemType Directory -Path $base | Out-Null
& $OpenSslPath req -x509 -newkey rsa:2048 -noenc -sha256 -days 2 -subj '/CN=127.0.0.1' -addext 'subjectAltName=IP:127.0.0.1,DNS:localhost' -keyout $key -out $cert
if ($LASTEXITCODE -ne 0) { throw 'Generación TLS local falló.' }
Write-Host 'TLS de prueba creado: sin almacén Windows, sin desactivar validación y sin publicar claves.'
