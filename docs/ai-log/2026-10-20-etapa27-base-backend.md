# Etapa 27 — base backend local

Fecha local de ejecución: 2026-10-20 (UTC−03:00). Implementa solo el incremento del
plan 26 autorizado: FastAPI/salud, dependencias bloqueadas, pytest/Ruff, documentación
y Git local. No acepta todo el stack ni las políticas/selección de hardware.

## Estado previo y base documental

- Raíz del proyecto comprobada; ningún marcador Git en raíz o sus ascendientes;
  `git rev-parse --show-toplevel` devolvió 128 (sin repo). Rutas saneadas en31c;
  estos son resultados históricos, no una reejecución.
- Pin y ejecución directa confirmaron Python 3.12.13 en `backend/.venv/Scripts/python.exe`;
  uv existente 0.11.16. No se recreó entorno, actualizó pin/intérprete/uv ni instalaron
  paquetes globales. La ruta base del intérprete observada usa el enlace administrado
  `cpython-3.12-windows-x86_64-none`; se conservó la instalación existente.
- Leídos AGENTS, CONTINUAR, ENTORNO y contrato CU05. Antes del primer commit se
  releyeron íntegros sus siete candidatos; enlaces relativos comprobados y revisión
  manual/por patrones de secretos. Rutas locales revisadas: no son credenciales;
  futura publicación requiere revisión específica. No se necesitó saneamiento ni
  se alteró evidencia/aceptación histórica. No se investigó hardware nuevamente.
- `git init -b codex/base-backend`, selección por nombre, `git diff --cached` completo
  (hardware dividido en dos lecturas), `--stat`, `--check` y `git ls-files` revisados.
  Se comprobaron exclusiones de `.env`, `.venv`, opencode.json, .opencode, respaldos
  y tmp. Sin cambios de identidad Git/configuración global.
- Primer commit: `388818d9133171963b57ce9c43d643e35b720762`,
  `docs: registrar base inicial del proyecto`, siete archivos:
  `.gitignore`, `AGENTS.md`, `backend/.python-version`, `docs/HARDWARE_DEMO.md`,
  `docs/specs/CU05-compatibilidad.md`, `docs/CONTINUAR.md` y registro etapa25.
- `.gitignore` preservó reglas previas y añadió configuración personal OpenCode,
  respaldos `.venv-*`/`.venv.*`, cobertura, build/dist y egg-info. No se movió ni
  borró configuración. ENTORNO, AGENTES, MCP y PERMISOS permanecen fuera de Git por
  selección explícita, no por revisión/aceptación automática de todo docs.

## Dependencias y fuentes

Metadatos de las seis versiones exactas recuperados de PyPI con HTTP 200 antes de
instalar; nombres exactos, archivos disponibles, ninguna retirada y requisitos
Python compatibles con 3.12.13. No se ajustaron pins ni se instalaron extras standard.

| Uso | Versión efectiva | Fuente de metadatos consultada |
|---|---|---|
| FastAPI | 0.156.3 | https://pypi.org/pypi/fastapi/0.156.3/json |
| Pydantic | 2.14.1 | https://pypi.org/pypi/pydantic/2.14.1/json |
| Uvicorn | 0.54.0 | https://pypi.org/pypi/uvicorn/0.54.0/json |
| pytest | 9.1.1 | https://pypi.org/pypi/pytest/9.1.1/json |
| Ruff | 0.17.1 | https://pypi.org/pypi/ruff/0.17.1/json |
| httpx2 | 2.15.1 | https://pypi.org/pypi/httpx2/2.15.1/json |
| Starlette (transitiva resuelta) | 1.9.0 | https://pypi.org/pypi/starlette/1.9.0/json |

Starlette se verificó después de resolver y antes de instalar. Su
[TestClient de versión 1.9.0](https://github.com/Kludex/starlette/blob/1.9.0/starlette/testclient.py)
prefiere `httpx2`; la comprobación instalada devolvió `TestClient transport=httpx2`.
FastAPI requiere Starlette>=0.46.0/Pydantic>=2.9.0; Starlette 1.9.0 y httpx2 requieren
Python>=3.11. No se asumió comportamiento de una versión distinta.

Context7 consultado para [respuesta tipada](https://fastapi.tiangolo.com/tutorial/response-model/),
[pruebas](https://fastapi.tiangolo.com/advanced/testing-events/) y
[uv lock/sync](https://docs.astral.sh/uv/concepts/projects/sync/).
Las [release notes](https://fastapi.tiangolo.com/release-notes/#01563-2026-10-20)
ya se habían consultado en el plan26; en esta ejecución también se confirmó
disponibilidad real de FastAPI exacto mediante PyPI y descarga/instalación uv.

uv generó `backend/uv.lock`, 26 entradas resueltas incluyendo proyecto virtual y
httpx2-jsfetch condicional para emscripten; instaló 24 distribuciones en Windows.
Transitivas relevantes: pydantic-core2.50.1, httpcore2 2.15.1, anyio4.15.1,
opentelemetry-api1.45.1 (dependencia base de FastAPI, no proveedor/exportador configurado).
El inventario completo y hashes están en uv.lock. Advertencia no fatal: hardlinks
no disponibles entre caché y destino, fallback a copia; no se cambió configuración.

## Código y archivos

- `backend/pyproject.toml`: proyecto local no distribuible, rango Python
  `>=3.12.13,<3.13`, dependencias exactas/grupo dev, pytest testpaths, Ruff py312
  y reglas E4/E7/E9/F/I.
- `backend/uv.lock`: generado exclusivamente por uv.
- `backend/upgradejusto/__init__.py`, `main.py`, `api/__init__.py`, `api/health.py`:
  composición/router/respuesta Pydantic `status: Literal["ok"]`.
- `backend/tests/test_health.py`: un test, TestClient con context manager,
  HTTP200/JSON exacto/Content-Type. Sin eventos inventados ni test de importación duplicado.
- `backend/README.md`: comandos PowerShell, uso de .venv, loopback y límites.
- `AGENTS.md`, `docs/CONTINUAR.md` y esta bitácora: aceptación acotada y hechos comprobados.
- Logs de verificación únicamente en `tmp/`, ignorado. Sin .env.example innecesario.

## Verificaciones reales

Todos los comandos nativos siguientes se ejecutaron desde `backend/`, secuencialmente,
comprobando `$LASTEXITCODE` inmediatamente y deteniéndose si no era cero. `$uvTask`
apuntó al uv existente; no se dependió de activación de entorno ni solo de
`$ErrorActionPreference`.

| Comando | Código / resultado |
|---|---|
| `& $uvTask lock --python 3.12.13 --no-python-downloads` | 0; 26 entradas resueltas |
| `& $uvTask sync --locked --group dev --python 3.12.13 --no-python-downloads` | 0; 24 distribuciones instaladas |
| `& $uvTask sync --check --locked --group dev --python 3.12.13 --no-python-downloads` | 0; Would make no changes |
| `& .\.venv\Scripts\python.exe -c "from upgradejusto.main import app; print(type(app).__name__)"` | 0; FastAPI |
| `& .\.venv\Scripts\python.exe -m pytest -q` | 0; 1 passed |
| `& .\.venv\Scripts\ruff.exe check .` | 0; All checks passed |
| `& .\.venv\Scripts\ruff.exe format --check .` | 0; 5 files already formatted |
| Consulta `importlib.metadata` y transporte TestClient | 0; versiones de tabla e intérprete confirmados |

SHA256 de uv.lock antes/después de sync/check, idéntico:
`667F8CB5FD211CD8D934BCD63601B2BF29D0ECF8E75A7A85850A3BEE92FFCFCC`.
Esto verifica este entorno, no reproducibilidad en otra máquina.

Después de escribir la documentación se repitieron sync --check, pytest, lint y
formato: todos código 0, lock sin cambios, un test aprobado; la última salida de
formato indicó seis archivos ya formateados. También se comprobó que los cuatro
PIDs observados en los intentos HTTP ya no existían.

### HTTP real y cierre del servidor

Ejecutable absoluto de `.venv`, directorio `backend`, argumentos:
`-m uvicorn upgradejusto.main:app --host 127.0.0.1 --port 8000 --loop asyncio --http h11`.
Start-Process oculto, logs separados en tmp, comprobación de puerto disponible,
espera acotada20 s y peticiones con timeout2 s; limpieza en finally.

Primer intento: el control adicional Get-NetTCPConnection comparó el PID lanzador29988
con el listener, pero Uvicorn informó un hijo30888. La comprobación de propiedad
falló, script código1; no se registra como prueba aprobada. Finally confirmó salida
del lanzador; inspección posterior no observó listener8000. Se corrigió el seguimiento
del proceso Windows, no la aplicación.

Reintento: lanzador22064 y servidor hijo29784. Se verificaron relación padre/hijo,
argumentos y que ambos seguían vivos; **HTTP200, JSON exacto `{"status":"ok"}` y
Content-Type `application/json`** en `http://127.0.0.1:8000/health`.
Script final código0. Finally detuvo solo los procesos propios, esperó su salida y
confirmó `HasExited=True` para ambos. ExitCode−1 por Stop-Process explícito: no se
presenta como apagado graceful ni fallo espontáneo de arranque. No se terminó
ningún proceso ajeno ni se dejó servidor/terminal extra de verificación.
Logs finales: `tmp/etapa27-uvicorn-20261020-193917.stdout.log` y `.stderr.log`.

## Git y límites finales del incremento

Segundo conjunto seleccionado por nombre: AGENTS, CONTINUAR, esta bitácora,
pyproject, uv.lock, README, cuatro fuentes Python y test de salud. Revisión completa
del diff preparado/nuevos archivos, stat/check, enlaces y patrones de secretos antes
de commit. El hash del commit ejecutable se informa en la entrega, no dentro del
mismo commit que lo genera. Los demás documentos locales no se agregan automáticamente.

No se configuraron remotos ni se hizo push/publicación. No se cambiaron permisos,
agentes/MCP, integraciones ni identidad Git. Hardware y CU05 se conservaron intactos;
R05 y envolventes/interferencias siguen abiertos. R10/S06 requiere distinguir
limitaciones físicas/eléctricas de la política propuesta de conservar funciones:
perder un puerto/reset no demuestra imposibilidad de montaje. No se aceptó ni cambió
esa política en este incremento ni se exigen mediciones físicas universales.

Python3.12.15 está publicado, disponibilidad con uv0.11.16 pendiente; mantenimiento
antes de exposición/despliegue. No hay motor, BD, frontend, IA ni módulos vacíos;
el endpoint solo informa respuesta del proceso. Próximo incremento del motor
requiere definición y aceptación separadas. Se conservan diez CU y seis módulos.
