$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$commit = 'f37c13f68b57d2c3472b2214fbcff699d6d34876'
$source = Join-Path $root '.tools/pgvector/0.8.7'
$archive = Join-Path $root '.local/evidence/sprint32/pgvector-0.8.7.zip'
$pgroot = Join-Path $root '.tools/postgresql/18.6-5/pgsql'
if (-not (Test-Path (Join-Path $pgroot 'include/server/postgres.h'))) { throw 'Faltan headers del PostgreSQL local fijado.' }
if (Test-Path $source) { throw 'Fuente existente: revisar estado; no sobrescribir ni limpiar indiscriminadamente.' }
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
if (-not (Test-Path $vswhere)) { throw 'Requisito: Visual Studio C++ x64 y Windows SDK; no instalar globalmente desde aquí.' }
$vs = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if ($LASTEXITCODE -ne 0 -or -not $vs) { throw 'No se identificó toolchain C++ utilizable.' }
$vcvars = Join-Path $vs 'VC/Auxiliary/Build/vcvarsall.bat'
if (-not (Test-Path $vcvars)) { throw 'Falta vcvarsall.bat.' }
Invoke-WebRequest "https://github.com/pgvector/pgvector/archive/$commit.zip" -OutFile $archive -UseBasicParsing -TimeoutSec 90
$localHash = (Get-FileHash $archive -Algorithm SHA256).Hash
# Archivo fuente del commit público del tag0.8.7; hash calculado localmente, no firma.
[pscustomobject]@{version='0.8.7';commit=$commit;sha256_local=$localHash;upstream_checksum='not published/verified'} | ConvertTo-Json | Set-Content (Join-Path $root '.local/evidence/sprint32/pgvector-download.json')
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($archive)
try {
    $prefix = "pgvector-$commit/"
    foreach ($entry in $zip.Entries) {
        $path = $entry.FullName.Replace('\','/')
        if (-not $path.StartsWith($prefix) -or $path -match '(^|/)\.\.(/|$)|:') { throw 'Entrada fuente ZIP inesperada.' }
    }
    New-Item -ItemType Directory -Path $source -Force | Out-Null
    foreach ($entry in $zip.Entries) {
        $relative = $entry.FullName.Substring($prefix.Length)
        if (-not $relative) { continue }
        $target = Join-Path $source $relative
        if ($entry.FullName.EndsWith('/')) { New-Item -ItemType Directory -Path $target -Force | Out-Null; continue }
        New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$target,$false)
    }
} finally { $zip.Dispose() }
$batch = Join-Path $root '.local/evidence/sprint32/build-pgvector.cmd'
@"
@echo off
call "$vcvars" x64 -vcvars_ver=14.44
if errorlevel 1 exit /b 1
set "PGROOT=$pgroot"
cd /d "$source"
nmake /F Makefile.win
if errorlevel 1 exit /b 1
nmake /F Makefile.win install
if errorlevel 1 exit /b 1
"@ | Set-Content -LiteralPath $batch -Encoding ASCII
& cmd.exe /d /c $batch
if ($LASTEXITCODE -ne 0) { throw 'Compilación/instalación local pgvector falló; no requiere elevar ni instalar globalmente sin decisión.' }
Write-Host 'pgvector compilado e instalado solo en PostgreSQL del proyecto; falta CREATE EXTENSION y prueba SQL.'
