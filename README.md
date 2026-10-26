# UpgradeJusto

Asistente web para mejorar una PC existente según compatibilidad, objetivo y
presupuesto, sin convertir datos desconocidos en certezas. Compatibilidad decidida
por dominio determinístico; IA interpreta y explica, no inventa veredictos, FPS o precios.

## Entrega visual local — cerrada y revisada26/10

Tema oscuro sobrio y navegación lateral/móvil; «Tu próxima mejora» compone
PC→objetivo/presupuesto→resultado, capacidad16→32GB, importes ARS y detalle accesible.
Catálogo, cuenta, importación, planes/compartidos, asistente y admin siguen el mismo
patrón. Revisión independiente **funcional y visual** aprobada tras observar PNG
reales1440/390 y corregir hallazgos; no se aprobó por tests/CSS solamente.
Tipos/lint/build finales0;94 unitarios y focales posteriores22/4 aprobados (solapados,
no sumar). Recorridos reales de diez CU y preservación de datos registrados en la
[bitácora de entrega](docs/ai-log/2026-10-26-entrega-visual.md)
y [lista para futura revisión Git](docs/ENTREGA_LOCAL_INVENTARIO.md).

Entorno ya preparado: desde la raíz, `./scripts/dev.ps1 -SystemTrust` y abrir
`http://127.0.0.1:3000/pcs`. Usa PostgreSQL/proveedor existentes; puertos3000/8000
libres y sin otro runner. No repetir setup ni bootstrap. Ctrl+C detiene sus procesos.
Recursos locales: seis ilustraciones propias de categoría, no fotos de productos.
Extracción RAM usa cantidades numéricas explícitas (`2x`); palabras no garantizadas.
Sin backend/motor/datasets/proveedor/dependencias modificados, commits/push ni deploy.

## Qué funciona y qué está en desarrollo

CU05/CU06 cerrados localmente respecto del alcance revisado `cu05-basic-stock-1`:
CPU/placa/BIOS, RAM documentada, GPU, selección PSU stock y límites nominales.
Las bases A/B son escenarios de demo, no hardware físico medido. La aplicación
separa expresamente advertencias adicionales: **no certifica compatibilidad física
total, geometría avanzada ni comportamiento térmico/eléctrico exhaustivo**.
Estado de esta continuación: [CONTINUAR](docs/CONTINUAR.md) y sección postcierre de
[SPRINT33](docs/SPRINT33.md). No rige el corte anterior por cuota/50%.

Estado local: diez CU funcionales respecto de sus contratos actuales; CU05/06
exclusivamente en el alcance básico revisado, no en el exhaustivo histórico.

| CU | Estado verificable |
|---|---|
| CU01 cuentas | Verificado B: registro/login/logout/sesiones, CSRF/origen y gateway; PG/HTTPS/browser reales |
| CU02 extracción | Funcional local33: texto/Groq, propuesta editable, confirmación PG y aislamiento; cancelación UI probada aparte |
| CU03 mis PCs | Verificado C: CRUD por propietario, revisión y aislamiento; PG/HTTPS/reinicio y cinco E2E reales |
| CU04 catálogo | Verificado sobre PostgreSQL:14 piezas, seis categorías, filtros/páginas/detalle/fuentes |
| CU05 compatibilidad | Siete checks básicos obligatorios; dos demos compatibles, incompatible nominal, BIOS/socket unknown, evidencia y advertencias visibles; simulación sin guardar |
| CU06 recomendaciones | RAM16→32GB y GPU8→12GB con PSU dependiente; beneficio de capacidad, coste ARS completo, presupuesto insuficiente rechazado y compatibilidad básica exigida |
| CU07 planes | G persistente: etapas acumuladas, borradores explícitos, browser y reinicio real comprobados |
| CU08 asistente | Funcional local: Groq/LangGraph/MCP/RAG, streaming incremental web, citas, historial, aislamiento, cancelación y reinicio comprobados |
| CU09 compartir | H: snapshot público mínimo, revocación PG, browser/reinicio y caída sin caché comprobados |
| CU10 administración | Funcional local33: rol PG, bootstrap local explícito, datos versionados y publicación inmutable; gate web real |

Seguimiento vigente: [SPRINT32](docs/SPRINT32.md), [CONTINUAR](docs/CONTINUAR.md).
Historia: [SPRINT33 — CU02/CU10](docs/SPRINT33.md). La autorización posterior revisó
CU05/06 y sustituyó la detención por cuota. Las verificaciones32 no prueban el33
ni el nuevo alcance: cada bloque conserva su evidencia y revisión independiente.

### Probar CU02/CU10 localmente — bloque aprobado25/10

**Checkpoint:** revisión independiente aprobó el bloque funcional local. Gate real
Groq+PG aprobado: extracción, edición, confirmación, aislamiento y publicación.
Cancelación posterior a propuesta aprobada en otro test de navegador con respuesta
controlada, sin otra llamada LLM. Los fallos405/etiquetas quedaron corregidos.
Este cierre33 no afirmaba diez CU completos ni despliegue validado; ahora continúa
el trabajo autorizado sobre CU05/06, con sus faltantes explícitos.

- Con los servidores locales existentes, iniciar sesión y abrir `/pcs/import`:
  pegar texto, extraer, revisar desconocidos, corregir componentes/cantidad RAM y
  confirmar explícitamente. Extraer o cancelar no guarda una PC.
- `/admin` requiere la cuenta **nueva de prueba** preparada localmente; una cuenta
  normal recibe rechazo servidor. Crear borrador, editar datos y publicar una nueva
  revisión; las revisiones publicadas no se sobrescriben.
- Credenciales únicamente en los archivos locales protegidos `admin-demo-*.json`
  bajo `.local/postgresql/`; no copiarlas a Git ni a variables públicas del frontend.
  No repetir el script de preparación: rechaza sobrescribir cuentas ya preparadas.
- Contrato, límites y comandos focales: [handoff backend](backend/CU02_CU10_HANDOFF.md)
  y [checkpoint web](frontend/CU02_CU10_CHECKPOINT.md). Estado comprobado y fallos:
  [SPRINT33](docs/SPRINT33.md). Estos flujos no completan CU05/06.
Cada bloque requiere spec, implementación, tests/demo y revisión; pantallas o imports
no bastan. Presupuesto ARS solo componentes/dependencias, excluye envío, financiación
y mano de obra: excluido no significa gratuito. Precios del catálogo son históricos,
con fecha/procedencia, no ofertas actuales. Imágenes faltantes muestran placeholder.

### Demo básica y límites vigentes

- A: P01/P03/2×P04/P06/P07/P09; B: P02/P03/2×P05/P06/P08/P10; BIOS P2.30.
  Ambas compatibles en alcance básico, con siete controles y advertencias visibles.
- Sustituir GPU de B por P16 excede el largo nominal: incompatible. BIOS desconocida
  o evidencia socket contradictoria: requiere verificación. Un fallo conocido domina.
- RAM2×P05: ARS766.417,98, recomendada con presupuesto1.000.000; presupuesto
  766.417,97 rechazado. GPU P15 + PSU P08: ARS1.882.130 dentro de2.000.000.
  P15 sola con CX550 se rechaza. Beneficio de capacidad, no FPS inventados.
- Precios históricos con fecha/fuente, no cotización vigente. Cooling instalado,
  cables físicos, storage/frontales y certificación exhaustiva no quedan aprobados.
  La contradicción12V de RM750e sigue visible; no se escogió la cifra favorable.
- Ambos datasets usados efectivamente:11 piezas/16 registros de procedencia más6
  fuentes fabricante, publicación local versionada TEST/DEV e importación idempotente.
  BuildCores CC BY-NC-SA4.0; docyx MIT. USD2025 excluido del cálculo ARS.

[Guía demo](docs/DEMO.md), [fuentes](docs/HARDWARE_DEMO.md) y
[pruebas/capturas antes y después](docs/ai-log/2026-10-25-alcance-basico-datasets.md).
Delta final: cuatro recorridos web y un asistente Groq+PG LIVE aprobados; revisión
independiente aprobó importador y motor, incluido conflicto de socket corregido.
Los ocho CU previos se preservaron sin repetir sus suites por rutina. Sin commits/push.

## Arquitectura y carpetas

Monolito modular: entrada HTTP → servicios → acceso a datos; motor independiente de
HTTP/BD/LLM. Meta de módulos: cuentas, PCs, catálogo, compatibilidad, recomendaciones/
planes y asistente. No se implementan carpetas vacías para aparentar cobertura.

| Carpeta | Función |
|---|---|
| backend/ | FastAPI/Python, dominio, tests y Alembic |
| frontend/ | Next/React/TypeScript/Tailwind y pruebas de navegador |
| scripts/ | Arranque, checks y administración explícita del clúster exclusivo |
| docs/specs/ | Contratos y criterios; resultados enlazados solo cuando se ejecutan |
| docs/ai-log/ | Resúmenes técnicos saneados, sin conversaciones o IDs privados |
| examples/ | Plantillas técnicas no activadas y sin secretos |
| .tools/ | Binarios/fuentes de herramientas locales, ignorados |
| .local/ | Datos/configuración/credenciales/logs/evidencia locales, ignorados |

`backend/upgradejusto/auth/` controla cuentas/sesiones/intentos; `catalog/` mantiene
el contrato público con repositorio PostgreSQL; `persistence/` y `backend/alembic/`
contienen esquema/migraciones. `frontend/server.mjs` es entrada Node local para
obtener IP de socket y firmar contexto del gateway, no un proveedor de IA/MCP.

## Requisitos y preparación local

Windows x64/PowerShell, Python3.12.13 administrado por uv0.11.16,
Node24.14.0/npm11.19.1 comprobados anteriormente. Pins en pyproject/uv.lock y
package.json/package-lock. No actualizar todo el stack ni instalar globalmente.
Si faltan dependencias locales, desde las carpetas correspondientes:

```powershell
# backend/
uv sync --locked --group dev --python 3.12.13 --no-python-downloads
# frontend/
npm ci --no-audit --no-fund
$env:PLAYWRIGHT_BROWSERS_PATH='../.local/ms-playwright'
./node_modules/.bin/playwright.cmd install chromium
```

Comprobar código de cada ejecutable; no continuar si falla. Next genera tipos y
next-env.d.ts ignorados al ejecutar build/dev antes del primer typecheck nuevo.
No desactivar TLS. ESLint9 compatible con peers actuales avisa EOL; mantenimiento
Python/ESLint pendiente antes de exposición, sin actualizar automáticamente.

### PostgreSQL exclusivo (sin servicio Windows)

Binarios18.6-5 Windows x64 enlazados por PostgreSQL.org al proveedor EDB. Instalador
NO utilizado. El script fija URL y SHA256 publicado por EDB (no solo hash local),
valida entradas ZIP y extrae servidor/CLI/headers/librerías a .tools/postgresql/.
No pgAdmin/StackBuilder, PATH global, firewall, registro, Docker o WSL.

```powershell
./scripts/install-postgresql.ps1
./scripts/postgres.ps1 setup
./scripts/postgres.ps1 verify
```

Solo sobre instalación/directorio nuevos; nunca reinitializa ni borra uno existente.
Si existe un clúster inicializado de este proyecto pero falta runtime, inspeccionar
primero binarios/versión/estado y usar `./scripts/postgres.ps1 provision`, no setup.
Provision conserva un manifiesto local de recuperación antes de crear roles/bases;
objetos preexistentes sin manifiesto/propiedad esperada bloquean, no se reutilizan.
Config/datos/logs en .local/postgresql/, ACL restringida al usuario actual/SYSTEM.
SCRAM, loopback127.0.0.1:55433, bases upgradejusto_dev/test y roles separados sin
superusuario ni acceso cruzado. Bootstrap separado del runtime, sin contraseñas en
argumentos o consola. Si falta runtime del sistema, informar y resolver manualmente,
no instalarlo globalmente desde scripts. Setup exitoso no significa CU01 completo.

```powershell
./scripts/postgres.ps1 start
./scripts/postgres.ps1 status
./scripts/postgres.ps1 stop
```

Solo controla este clúster con pg_ctl. No detiene PostgreSQL ajeno.
En la recuperación24/10 hubo un proceso hijo huérfano confirmado y memoria compartida
retenida: se retiró solo ese árbol propio tras fallar pg_ctl, sin borrar datos ni
cambiar mitigaciones Windows. El puerto vigente es55433. Inicio usa log independiente,
memoria32MB y20 conexiones; evita capturar pipes que un daemon puede dejar abiertos.
Para pgvector0.8.7, `scripts/install-pgvector.ps1` usa fuente del commit público
fijado y MSVC x64 existente; descarga/hash local diferenciados de checksum publicado.
Compila/instala únicamente hacia el PG del proyecto. Después requiere
`./scripts/postgres.ps1 enable-vector` y prueba SQL real, no solo DLL presente.
No elevar ni instalar C++/SDK globalmente por cuenta propia si faltan requisitos.

### Configuración de producto

scripts/local-env.ps1 carga explícitamente runtime.json protegido: dev para arranque,
test para checks. Rechaza destinos/roles distintos del clúster y base test dedicada.
El proceso HTTP dev no recibe TEST_DATABASE_URL ni un opt-out implícito de tests PG;
ejecutar pruebas sin su wrapper debe fallar, no dar por verificada una suite omitida.
No usar credenciales bootstrap para HTTP. Migraciones/seed deben ejecutarse antes de
la API PG; instrucciones/resultados en la [bitácora32](docs/ai-log/2026-10-21-sprint32.md).

Copiar solo variables necesarias de `.env.example` a `.env` raíz ignorado, sin
ejecutar contenido ni imprimirlo. GROQ_API_KEY la configura el usuario localmente,
nunca en el chat/Git; credenciales OpenCode no sirven como proveedor del producto.
La carga admite solo variables enumeradas de producto, no destinos de BD arbitrarios.
Modelo de chat probado: `openai/gpt-oss-20b`; disponibilidad no equivale a cuota futura.
Groq chat no se presume servicio de embeddings. Probe reproducible, sin mostrar clave,
headers ni respuestas del proveedor:

```powershell
. ./scripts/local-env.ps1
./backend/.venv/Scripts/python.exe ./scripts/check-groq.py
```

En equipos con inspección TLS y una CA **ya confiada por el sistema**, configurar
explícitamente `UJ_TLS_TRUST=system` en `.env` o usar `--system-trust` en el probe.
Mantiene validación de cadena y hostname; no usar `verify=False`, instalar certificados
ni desactivar antivirus para probar. Default portable: `certifi`. En este entorno,
el diagnóstico confirmó inspección Kaspersky y rechazo19 de certifi; raíces Windows
validaron TLS y el SDK/ChatGroq verificó modelos, streaming y herramienta con exit0.
El 403 anterior de urllib/Cloudflare no probaba clave inválida ni cuota.

Encoder local separado: FastEmbed con ONNX CPU multilingüe, revisión y hashes en
`tools/embeddings-model.json`, archivos ignorados bajo `.local/models/`:

```powershell
./backend/.venv/Scripts/python.exe ./scripts/prepare-embeddings.py
```

Descarga inicial aproximada de252MB; luego solo archivos fijados locales. El probe
comprobó384 dimensiones finitas. Esto no demuestra ingesta/búsqueda pgvector ni CU08.
Corpus público inicial y derechos/localizadores en `tools/public-corpus.json`; fuentes
completas/modelos no se incorporan a Git. No indexar conversaciones/PCs privadas.

### Primera preparación de datos y RAG

Después de preparar PostgreSQL/pgvector y dependencias, ejecutar **cada comando por
separado** y detenerse ante un error. No apuntar los tests a desarrollo:

```powershell
./scripts/migrate.ps1
./scripts/migrate.ps1 -TestDatabase
. ./scripts/local-env.ps1
# En este equipo con inspección TLS: $env:UJ_TLS_TRUST='system'
./backend/.venv/Scripts/python.exe ./scripts/prepare-embeddings.py
./backend/.venv/Scripts/python.exe ./scripts/prepare-rag.py
. ./scripts/local-env.ps1
Push-Location backend
./.venv/Scripts/python.exe -m upgradejusto.assistant.ingest --config $env:UJ_ASSISTANT_RAG_CONFIG
Pop-Location
```

`prepare-rag.py` descarga solo el PDF público fijado si falta, valida hash/páginas,
calibra un conjunto pequeño bilingüe positivo/negativo y genera el manifiesto local.
No es garantía universal de relevancia. Ingesta real idempotente: tres chunks con
vectores384 y citas por página; no crear tablas automáticamente ni cambiar el
corpus por URLs del modelo. Repetir ingesta con helper `-TestDatabase` prepara la
base de pruebas; el gate RAG también comprueba idempotencia allí.

El asistente local admite **un único proceso/worker API por base**. El launcher
controlado recupera pendientes abandonados al arrancar; no iniciar otro servidor
contra la misma base en otro puerto ni marcar recuperación exclusiva manualmente
mientras hay generaciones. Multiworker requiere un lease distribuido antes de
habilitarse; no se ofrece despliegue ni recuperación concurrente segura.

## Abrir y probar

```powershell
./scripts/dev.ps1
```

Web http://127.0.0.1:3000/catalog; API http://127.0.0.1:8000.
Health solo informa proceso, no conexiones/aceptación de CU.
Para la inspección TLS ya diagnosticada de este equipo puede usarse explícitamente
`./scripts/dev.ps1 -SystemTrust`; no necesita volver a configurar la clave.
El helper carga entorno local, rechaza puertos ocupados y detiene solo sus procesos
propios al salir. Clúster se gestiona por separado. No exposición pública.

```powershell
./scripts/check.ps1
```

Backend/PG y tipos/lint/Vitest/build/Playwright relevantes, con códigos individuales.
No mata servidores ajenos para liberar3000/8000; detener manualmente la web propia
antes de E2E. PowerShell5.1 con captura redirigida puede convertir stderr informativo
en NativeCommandError bajo Stop: conservar fallo y completar solo checks restantes.
El wrapper `scripts/test-backend.ps1` carga exclusivamente base test para especialistas.
Entorno efectivo: UJ_ORIGIN exacto http://127.0.0.1:3000, UJ_ENV=dev otest,
UJ_ALLOW_INSECURE_LOOPBACK=1 solo local; pruebas PG obligatorias con UJ_TEST_POSTGRES=1.
Gateway: clave server-only UJ_PROXY_SECRET local protegida, peer de proxy explícito
127.0.0.1 y Uvicorn con --no-proxy-headers. Solo el servidor Node obtiene IP del socket
y firma el contexto; XFF/headers de identidad del navegador nunca autorizan acceso.
`scripts/test-browser.ps1` carga las mismas variables test antes de Playwright.
El gate genera build fresco y usa el custom server de **producción local**, no Next dev:
Next16.4.2 usa un canal WebSocket de datos React en desarrollo que el proxy cerrado
de test rechaza. No se habilita CONNECT/upgrade ni un túnel general para evitarlo.
Cada test conserva IP real propia de socket sin cambiar límites. Ambos wrappers
rechazan el modo diagnóstico; auth siempre ejecuta su recorrido completo.
Prueba adicional de runtime: preparar TLS local con `./scripts/prepare-test-tls.ps1`
(OpenSSL existente, certificado de dos días bajo ACL privada), y ejecutar
`./backend/.venv/Scripts/python.exe scripts/verify-auth-runtime.py` solo sin suites
simultáneas. Usa puertos18001/18002 propios, valida TLS con ese certificado sin
desactivarlo, y reinicia exclusivamente el clúster del proyecto para comprobar sesión
y errores de conexión. No es despliegue HTTPS ni modifica el almacén de certificados.

Evidencia histórica31b/31c:118 pytest,12 Vitest,2 Playwright reales y checks0, no
pruebas actuales de auth/PG. Resultados nuevos por bloque en SPRINT32/bitácora32.

Resultado histórico del bloque32:323 pytest sin skips, incluyendo gate live Groq solicitado
con `UJ_TEST_ASSISTANT_LIVE=1` y trust explícito; no es evidencia del navegador.
El test live está desactivado por defecto para no consumir proveedor silenciosamente:
un skip no prueba CU08. Gate completo real y secuencial, con datos/modelo preparados:

```powershell
$env:UJ_TEST_ASSISTANT_LIVE='1'
# Solo si este entorno requiere raíces confiadas del sistema:
$env:UJ_TLS_TRUST='system'
./scripts/check.ps1
```

Frontend al cierre32:68 unitarias, tipos/lint/build0, nueve E2E normales y un gate LIVE
separado con PGposterior0; revisión independiente incremental aprobada. Para repetir
**solo** el gate web real de IA, explícitamente y consumiendo cuota del proveedor:

```powershell
./scripts/test-assistant-browser.ps1 -SystemTrust
```

Omitir `-SystemTrust` si no corresponde a la confianza TLS del equipo. El wrapper
prepara build fresco, exige clave local, restaura el flag LIVE y comprueba PG después.
Está preparado y validado sintácticamente; el recorrido equivalente subyacente sí
fue ejecutado y aprobado, sin repetir consumo solo por agregar el wrapper.

No ejecutar simultáneamente con otra suite o servidor que use la base test.
Pruebas adicionales de reinicio real (detienen exclusivamente el PG del proyecto):
`verify-auth-runtime.py --plans` y `verify-assistant-runtime.py`, con helper TEST,
sin otra API/suite activa. Ambas aprobadas; no confundir el segundo proof HTTP
con entrega incremental verificada en navegador. Guía corta: [DEMO](docs/DEMO.md).

Estado histórico al cierre33: ocho CU funcionales locales (01/02/03/04/07/08/09/10) y dos flujos
interactivos parciales (05/06). Los positivos globales reales de compatibilidad/
recomendación seguían pendientes: **no diez CU completos en ese cierre**. Evidencia33 en su matriz;
las verificaciones32 anteriores se conservan sin repetición. Preparación del cierre Git:
[lista y privacidad](docs/CIERRE_GIT_SPRINT32.md). Entonces sin staging, commits, push o despliegue.
El cierre básico/visual posterior figura al inicio;37/38 autoriza ahora revisión,
commits locales y continuación del producto integral, no push automático.

Bloque B verificado24/10:171 pytest sin skips,30 Vitest y4 Playwright; tipos/lint/
build/Ruff y lock-sync0. Prueba runtime adicional HTTPS validó cookie Secure/HttpOnly,
no envío por HTTP, caída PG503 saneada, sesión tras reinicio real, logout y expiración.
Revisión Astra cerró hallazgos del gateway; no certifica los bloques futuros.

## Proceso IA y privacidad

[ORQUESTACION](docs/ORQUESTACION.md), [agentes](docs/AGENTES.md),
[handoff saneado](examples/orchestration/handoff.md). Herramientas de desarrollo
no son CU08 y Playwright CLI no es MCP. Ejemplos no activan perfiles/proveedores.
Configuración personal, memoria, secretos y artefactos siguen ignorados.

### Playwright CLI y MCP son verificaciones diferentes

Los E2E usan Playwright CLI existente. La integración opcional **externa** de Microsoft
Playwright MCP tiene versión/lock separados en `tools/browser-mcp/`, sin actualizar el
Playwright del frontend ni usar perfiles/cuentas personales:

```powershell
# Desde tools/browser-mcp/, instalación local opcional:
npm ci --ignore-scripts --no-audit --no-fund
# Desde raíz, con app local encendida y sin suites PG simultáneas:
./backend/.venv/Scripts/python.exe ./scripts/verify-browser-mcp.py
```

Config aislada/headless, service workers bloqueados, único origen permitido
`http://127.0.0.1:3000`, sin secretos, sin extensión ni perfiles persistentes.
La allowlist es defensa adicional, **no sandbox**: limitar las invocaciones a la app.
El script exige invocaciones MCP reales `browser_navigate` y `browser_snapshot`,
comprueba el catálogo público y cierra su navegador. Instalación/help por sí solos
no prueban uso; resultado vigente en la matriz Sprint32. No cambia perfiles OpenCode
ni registra sesiones/URLs privadas en documentos. Context7 y Engram se usaron como
MCP de desarrollo; no son el chatbot del producto. GitHub MCP no estuvo expuesto
en este catálogo de herramientas; no se reclama uso ni publicación para cumplirlo.
Los blobs anteriores conservan rutas locales: sanear HEAD no limpia historial ni
certifica privacidad integral. Sin staging/commit/push en32, publicación requiere
revisión separada de archivos/historial/destino/visibilidad con el usuario.
