$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$version = '18.6-5'
$name = "postgresql-$version-windows-x64-binaries.zip"
$url = "https://get.enterprisedb.com/postgresql/$name"
$expected = 'E2246BA91D22345BC3D017586C09EDE52D9DF180B1EEB480F050445F1CAD84E2'
$archive = Join-Path $root ".local/evidence/sprint32/$name"
$destination = Join-Path $root ".tools/postgresql/$version"
if (Test-Path $destination) { throw 'Instalación existente: comprobar versión; no sobrescribir.' }
if (-not (Test-Path $archive)) {
    New-Item -ItemType Directory -Path (Split-Path $archive -Parent) -Force | Out-Null
    Invoke-WebRequest $url -OutFile $archive -UseBasicParsing -TimeoutSec 600
}
if ((Get-FileHash $archive -Algorithm SHA256).Hash -ne $expected) { throw 'SHA256 no coincide con checksum EDB fijado; no extraer.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($archive)
try {
    foreach ($entry in $zip.Entries) {
        $path = $entry.FullName.Replace('\','/')
        if ($path.StartsWith('/') -or $path -match '(^|/)\.\.(/|$)|:') { throw 'Entrada ZIP insegura.' }
        if (-not $path.StartsWith('pgsql/')) { throw 'Prefijo ZIP inesperado.' }
    }
    New-Item -ItemType Directory -Path $destination | Out-Null
    foreach ($entry in $zip.Entries) {
        $path = $entry.FullName.Replace('\','/')
        # Servidor/CLI, desarrollo y extensiones; no pgAdmin/StackBuilder.
        if ($path -notmatch '^pgsql/(bin|lib|share|include)/') { continue }
        $target = [IO.Path]::GetFullPath((Join-Path $destination $path))
        if (-not $target.StartsWith(([IO.Path]::GetFullPath($destination) + [IO.Path]::DirectorySeparatorChar), [StringComparison]::OrdinalIgnoreCase)) { throw 'Destino fuera de instalación.' }
        if ($path.EndsWith('/')) { New-Item -ItemType Directory -Path $target -Force | Out-Null; continue }
        New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $false)
    }
} finally { $zip.Dispose() }
& (Join-Path $destination 'pgsql/bin/postgres.exe') --version
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL no ejecutable: comprobar runtime requerido, sin instalar globalmente.' }
Write-Host 'Binarios locales verificados con SHA256 publicado por EDB. Sin servicio/PATH global.'
