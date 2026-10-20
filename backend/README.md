# Backend local de UpgradeJusto

Base mínima verificada el 2026-10-20. `GET /health` devuelve HTTP 200 y exactamente
`{"status":"ok"}` con Content-Type `application/json`. Solo indica que el proceso
responde: no comprueba motor de compatibilidad, base de datos ni proveedor IA.

## Requisitos y alcance

- Windows/PowerShell, Python administrado por uv **3.12.13**, uv **0.11.16**.
- Entorno existente en `backend/.venv`; pin en `.python-version`.
- No activar el entorno ni instalar globalmente. El proyecto no se distribuye como
  paquete (`tool.uv.package=false`); ejecutar siempre desde `backend/`.
- No requiere variables, `.env`, credenciales, servicios externos ni `.env.example`.
- FastAPI 0.156.3, Pydantic 2.14.1 y Uvicorn 0.54.0; grupo dev: pytest 9.1.1,
  Ruff 0.17.1 y httpx2 2.15.1. Starlette 1.9.0 quedó fijada como transitiva en
  `uv.lock`; su TestClient utiliza httpx2. No se instalaron extras `standard`.

Las dependencias directas se fijan en `pyproject.toml` y las transitivas, artefactos
y hashes en `uv.lock`, generado por uv. No editar el lockfile a mano. El directorio
`upgradejusto/api` es entrada HTTP y `main.py` compone la app. Etapa 28 incorpora
`upgradejusto/compatibility` como dominio parcial independiente de HTTP/BD/LLM/red;
no hay repositorios o servicios de persistencia. No se crearon seis módulos vacíos.

## Instalación desde el lockfile

Desde la raíz del proyecto, abrir PowerShell y ejecutar. uv debe estar en PATH;
si no lo está, asignar a `$uvTask` la ubicación del uv ya instalado, sin reinstalarlo.
Comprobar inmediatamente el código de salida de cada ejecutable: PowerShell no
convierte automáticamente todos sus fallos en excepciones.

```powershell
Set-Location .\backend
$uvTask = (Get-Command uv -ErrorAction Stop).Source
& $uvTask sync --locked --group dev --python 3.12.13 --no-python-downloads
if ($LASTEXITCODE -ne 0) { throw 'Falló uv sync' }
& $uvTask sync --check --locked --group dev --python 3.12.13 --no-python-downloads
if ($LASTEXITCODE -ne 0) { throw 'El entorno no está sincronizado' }
```

Esto utiliza `.venv` y no descarga otro Python. Revisar primero su estado si se
han agregado paquetes manualmente: `sync` realiza sincronización exacta y puede
retirar paquetes ajenos a lo declarado. En esta etapa no se recreó el entorno.
uv avisó que no podía usar hardlinks entre caché y destino y copió archivos;
la instalación terminó correctamente, sin cambiar configuración.

Solo al modificar intencionalmente dependencias, regenerar y revisar el lockfile
antes de sincronizar (no es parte de cada arranque):

```powershell
& $uvTask lock --python 3.12.13 --no-python-downloads
if ($LASTEXITCODE -ne 0) { throw 'Falló uv lock' }
```

## Verificaciones (desde backend/)

```powershell
& .\.venv\Scripts\python.exe -c "from upgradejusto.main import app; print(type(app).__name__)"
if ($LASTEXITCODE -ne 0) { throw 'Falló la importación' }
& .\.venv\Scripts\python.exe -m pytest -q
if ($LASTEXITCODE -ne 0) { throw 'Falló pytest' }
& .\.venv\Scripts\ruff.exe check .
if ($LASTEXITCODE -ne 0) { throw 'Falló Ruff lint' }
& .\.venv\Scripts\ruff.exe format --check .
if ($LASTEXITCODE -ne 0) { throw 'Falló Ruff formato' }
```

Resultado de etapa 27: importación `FastAPI`, un test de salud, lint y formato
aprobados. El test de salud usa TestClient como context manager y comprueba HTTP,
JSON exacto y Content-Type; no fabrica eventos de arranque. En etapa 28 la suite
completa aprobó **66 pruebas**, incluyendo salud y el dominio parcial descrito abajo.

## Arranque local

Desde `backend/`, en una terminal dedicada:

```powershell
& .\.venv\Scripts\python.exe -m uvicorn upgradejusto.main:app --host 127.0.0.1 --port 8000 --loop asyncio --http h11
if ($LASTEXITCODE -ne 0) { throw 'Uvicorn terminó con error o fue interrumpido' }
```

Consultar desde otra terminal PowerShell:

```powershell
$r = Invoke-WebRequest 'http://127.0.0.1:8000/health' -UseBasicParsing -TimeoutSec 5
if ($r.StatusCode -ne 200) { throw 'HTTP inesperado' }
$body = $r.Content | ConvertFrom-Json
$keys = @($body.PSObject.Properties.Name)
if ($keys.Count -ne 1 -or $keys[0] -ne 'status' -or $body.status -cne 'ok') {
    throw 'JSON inesperado'
}
if (($r.Headers['Content-Type'] -split ';')[0] -ne 'application/json') {
    throw 'Content-Type inesperado'
}
```

Detener con Ctrl+C al terminar. Si 8000 está ocupado, usar otro puerto libre en
ambos comandos; nunca terminar procesos ajenos. La verificación automatizada de
esta etapa usó un proceso oculto propio, timeout y limpieza en `finally`, siguiendo
también al hijo Python del lanzador de Windows. Confirmó HTTP real en 127.0.0.1:8000
y terminó ambos procesos; logs solo en `../tmp/`, ignorado por Git.

## Dominio CU05 parcial y demo local (etapa 28)

Desde `backend/`, sin iniciar un servidor:

```powershell
& .\.venv\Scripts\python.exe -m upgradejusto.compatibility.demo
if ($LASTEXITCODE -ne 0) { throw 'Falló la demo de dominio' }
```

Emite un array JSON de tres casos con veredicto, resultados de subregla, evidencia,
condiciones, faltantes, revisiones y cobertura. No guarda ni cambia configuraciones.

- **S08**: PRIME-RTX5070-O12G y CX550 CP-9020277; incompatible por un solo ramal para
  dos entradas independientes del adaptador incluido (F07/F09/F19). No falla por
  ausencia de cable nativo ni por comparar 550/750 W.
- **S10**: TUF-RTX5070-O12G-GAMING 329 mm y Meshify C 315 mm con fans delanteros;
  incompatible por R04.largo, exceso 14 mm (F08/F13).
- **D01-S10-omitted-length**: derivado explícito con largo omitido intencionalmente;
  requiere_verificacion, sin fallos conocidos. No es otra PC real.

Los fixtures son extractos locales versionados de HARDWARE_DEMO, sin consultas web
en runtime. Cada caso conserva diez comprobaciones sin implementar; la otra
subregla queda unknown en S08/S10 y ambas quedan unknown en D01. Ningún ejemplo
declara una PC compatible completa. Las subreglas no aprueban toda R04 o R06.

Entrada pública Python: `evaluate(ResolvedConfiguration(...))` en
`upgradejusto.compatibility.evaluation`, con modelos en `models.py`. Datos ya
resueltos, referencias de evidencia y revisiones obligatorias; mediciones/tipos
estrictos, modelos congelados con tuplas. Errores de entrada son ValidationError/
ValueError separados del veredicto. Unknown/conflict no se convierten en cero o
compatibilidad; evidencia vacía no fundamenta pass/fail.

Inventario interno fijo `cu05-28.1`, 12 comprobaciones R01–R10. El consumidor no
puede elegir reglas ni enviar resultados preaprobados. Solo se implementaron largo
GPU y ruta de adaptador de dos PCIe8 independientes; rutas nativas/otros requisitos
no soportados quedan pendientes. Potencia, EPS/ATX, espacio lateral y demás reglas
siguen pendientes. No hay endpoint CU05, resolución de usuario/pc_id/catálogo,
sustitución ni plan. Rama compatible del agregador probada solo con inventario
sintético interno, nunca habilitada en los ejemplos parciales.

Las verificaciones de etapa 28 usaron pytest completo, Ruff y demo sin servidor
HTTP adicional, y `uv sync --check --locked --group dev --python 3.12.13 --no-python-downloads`.
Detalle del contrato en [CU05](../docs/specs/CU05-compatibilidad.md) y resultados en
la [bitácora28](../docs/ai-log/2026-10-20-etapa28-dominio-compatibilidad.md).

## Límites y mantenimiento

Pruebas ejecutadas en este entorno Windows, no reproducción en otra máquina.
El resto del stack y los diez CU siguen fuera de este incremento, no descartados.
Hardware/CU05 continúan con faltantes; este endpoint no cambia sus veredictos.
Python 3.12.15 está publicado con correcciones de seguridad, pero su disponibilidad
con este uv quedó pendiente. Se conserva 3.12.13 por autorización para desarrollo
local; revisar mantenimiento antes de exposición o despliegue. No usar `0.0.0.0`.
