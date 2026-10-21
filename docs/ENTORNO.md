# Entorno de desarrollo

## Alcance
Este registro histórico cubre el intérprete Python administrado por uv y el entorno
virtual. Desde27 existen dependencias y lockfile;31b agregó frontend y preparación
PG. Estado actual en [CONTINUAR](CONTINUAR.md) y comandos en [README](../README.md).

## Versiones y ubicaciones
- uv: `0.11.16`, ejecutable local; resolverlo desde PATH o ubicación explícita propia.
- Python: `3.12.13`.
- Intérprete administrado por uv: resolver con `uv python find 3.12.13`.
- Entorno del backend: `backend/.venv`.
- Pin del entorno: `backend/.python-version`.

## Origen y selección
`uv python list 3.12` mostró `cpython-3.12.13-windows-x86_64-none` como la descarga CPython estándar disponible para Windows x86_64; no se eligió una variante prerelease ni free-threaded.

La versión `3.12.13` está publicada en Python.org: <https://www.python.org/downloads/release/python-31213/>. uv descarga el binario administrado desde python-build-standalone mediante:

<https://releases.astral.sh/github/python-build-standalone/releases/download/20260510/cpython-3.12.13%2B20260510-x86_64-pc-windows-msvc-install_only_stripped.tar.gz>

## Instalación comprobada

```powershell
$uv = (Get-Command uv -ErrorAction Stop).Source
& $uv python install --no-bin --no-registry 3.12.13
```

## Recreación del entorno

Con `backend/.venv` ausente y Python `3.12.13` ya instalado por uv:

```powershell
$uv = (Get-Command uv -ErrorAction Stop).Source
$version = (Get-Content .\backend\.python-version -Raw).Trim()
$python = (& $uv python find $version).Trim()
& $uv venv .\backend\.venv --python $python --no-python-downloads --no-project
```

El comando no activa el entorno, no instala paquetes y no usa `--seed` ni `--system-site-packages`.

## Verificación

```powershell
& .\backend\.venv\Scripts\python.exe -c "import platform, sys; print(platform.python_version()); print(sys.executable); print(sys.prefix); print(sys.base_prefix)"
```

La comprobación realizada devolvió `3.12.13`, ubicó `sys.executable` dentro de `backend/.venv` y mostró `sys.prefix` distinto de `sys.base_prefix`.
