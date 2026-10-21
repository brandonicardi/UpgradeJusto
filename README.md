# UpgradeJusto — desarrollo local

Sprint31b: catálogo web/API real primero; cuentas/PCs/evaluación web requieren
PostgreSQL exclusivo. Estado verificable y límites: [SPRINT31B](docs/SPRINT31B.md).
No se presenta motor parcial ni pantallas como los diez CU terminados.

| CU | Implementado / verificado en31b | Pendiente |
|---|---|---|
| CU04 | Catálogo real de14 piezas/seis categorías, filtros/páginas/detalle/fuentes/desconocidos; API y navegador comprobados | Fotos sin permiso/fuente quedan como placeholder, precios son históricos |
| CU01 | Solo preparación PostgreSQL/Alembic/seed con checks estáticos/unitarios | Servidor PG dev+test, migración/seed/reinicio reales, registro/login/logout y seguridad |
| CU03 | No implementado | Depende de CU01/PG y pruebas de propiedad A/B |
| CU05 web/R01 | No implementado; motor previo conservado | Integración por propietario y reglaR01 dentro de D; motor sigue parcial |

Verificación histórica31b: backend **118 tests**, Ruff lint/formato y sync/lock; frontend
tipos/lint/build, **12 Vitest** y **2 Playwright** contra API real, códigos0
corroborados por metadatos. Helper dev probado con HTTP200 web/API y procesos propios
detenidos. Detalle/correcciones/códigos en la [bitácora31b](docs/ai-log/2026-10-20-sprint31b-web.md).

## Requisitos y preparación

- Windows/PowerShell; Node24.14.0/npm11.19.1 comprobados. Dependencias exactas y
  package-lock en frontend; Next16/React/TS/Tailwind, ESLint/Vitest/Playwright.
- Backend Python3.12.13/uv existente, pins/lock en backend. No reinstalar globalmente.
  Se añadieron SQLAlchemy2.1.5/Alembic1.20.0/psycopg3.3.6 para preparar persistencia.
- No se identificó servidor PostgreSQL/Docker utilizable en esta máquina al iniciar.
  No hay sustitución SQLite. Migraciones/seed preparados no equivalen a pruebas PG.

Desde raíz, solo si faltan dependencias locales:

```powershell
Push-Location backend
& "$HOME/.local/bin/uv.exe" sync --locked --group dev --python 3.12.13 --no-python-downloads
if ($LASTEXITCODE -ne 0) { throw 'Falló sync backend' }
Pop-Location
Push-Location frontend
npm ci --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'Falló npm ci' }
$env:PLAYWRIGHT_BROWSERS_PATH='../.local/ms-playwright'
& ./node_modules/.bin/playwright.cmd install chromium
if ($LASTEXITCODE -ne 0) { throw 'Falló Chromium local' }
Pop-Location
```

No desactivar TLS para descargar navegadores: durante setup hubo reintentos por
certificado de cadena, la descarga finalmente terminó0 sin deshabilitar validación.
ESLint9.39.5 admite peers de plugins actuales Next; avisa fin de soporte. ESLint10
produjo conflicto real de peers, no se usó --force. Mantenimiento de lint pendiente.
Npm11 dejó scripts de instalación de dependencias sin aprobación automática; no
se aprobó ejecución arbitraria. Los checks de compilación/lint acreditan lo probado.

## Abrir la web

```powershell
./scripts/dev.ps1
```

Web `http://127.0.0.1:3000`, backend `http://127.0.0.1:8000` (`/health` solo proceso).
El script rechaza puertos ocupados, escribe logs ignorados en `.local/logs/` y al
salir detiene únicamente los procesos/descendientes que inició. Sin exposición pública.
La ruta de catálogo y el contrato se fijan en [CU04](docs/specs/CU04-catalogo.md).

## Verificar

```powershell
./scripts/check.ps1
```

Comandos individuales y códigos en checkpoints31b. Ejecuta backend, tipos/lint,
Vitest, build y Playwright con API real; no prueba PostgreSQL si este no existe.
Los resultados nuevos31c se distinguen de31b en la
[bitácora31c](docs/ai-log/2026-10-21-etapa31c-privacidad-commits.md).
En checkout nuevo Next genera next-env.d.ts/tipos al hacer build/dev, antes del primer
typecheck. Las dependencias/navegador deben estar preparados; no se instalan en31c.
En PowerShell5.1, redirigir toda la salida del script puede convertir stderr
informativo de un ejecutable en NativeCommandError bajo Stop. Ejecutar normalmente;
si se interrumpe, conservar el fallo y completar solo checks restantes con sus códigos.

## Persistencia y seguridad

`.env.example` contiene solo variables sin secretos; `.env` local permanece ignorado.
CU04 funciona con URL local por defecto, sin credenciales ni variables obligatorias.
Para cambiarla en Next usar `CATALOG_API_URL` en `frontend/.env.local` (ignorado);
no `BACKEND_URL`. El helper actual no carga automáticamente un `.env` raíz.
DATABASE_URL/TEST_DATABASE_URL deben configurar bases PostgreSQL distintas y
exclusivas cuando exista servidor autorizado. No reutilizar ni borrar bases ajenas.
No imprimir URL con contraseña, tokens/cookies, hashes o contraseñas. Sin servidor,
no declarar registro/login/logout, aislamiento ni reinicio persistente verificados.
No CU02/06/07/08/09/10, nube, nuevos MCP o proveedor IA en este sprint.

## Configuración de desarrollo y privacidad

Copiar manualmente solo variables necesarias de `.env.example` a configuración
local ignorada, nunca credenciales reales al repositorio. No se activa ningún ejemplo.
[Handoff saneado](examples/orchestration/handoff.md) para conservar contratos técnicos;
no es perfil ejecutable ni copia de configuración personal. No se distribuyen agentes
o MCP completos; su configuración real sigue local. Política: [ORQUESTACION](docs/ORQUESTACION.md).

31c elimina rutas de equipo e IDs de runtime de los documentos actuales y conserva
avances localmente. **Los blobs anteriores siguen conteniendo rutas locales**:
sanear HEAD no limpia historial ni constituye auditoría integral. No publicar sin
resolver esa revisión y acordar commits/archivos/destino/visibilidad. Sin push ni32.
