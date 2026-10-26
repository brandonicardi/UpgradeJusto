# Security37 — código y pruebas preparados, NO aceptación ni ejecución propia

## Delta P2 de revisión: deadline absoluto sin carrera EOF

Body guard usa deadline monotónico explícito antes y después de CADA receive,
incluido EOF, y antes de llamar downstream. No depende del despacho de callback de
asyncio.timeout. asyncio.wait limita la espera sin aguardar indefinidamente el
desenrollado de una coroutine receive que demora aceptar cancelación. Al vencer:
cancel del receive, callback que consume eventual resultado/error,408 y cero parser.
Cancelación externa también cancela/drena receive; no se crean tareas de limpieza
recursivas ni temporizador para procesamiento/SSE. Contrato sigue5000ms/caps iguales.

Límite runtime explícito: deadline y respuesta necesitan event loop y send ASGI
cooperativos. Python no puede matar una coroutine receive que bloquea el thread o
ignora cancelación para siempre. Si receive demora cancelación, puede quedar SOLO
esa recepción cancelada hasta que el servidor/desconexión la termine; su resultado
se drena, nunca inicia parser ni proveedor. No afirmar cero tareas residuales ante
una implementación ASGI permanentemente no cooperativa: requiere corregir/terminar
ese runtime. Bajo receive ASGI cooperativo no quedan recepciones activas.

Nuevos tests en tests/test_security37_body.py: reloj controlado EOF justo después
del deadline sin callback despachado, precheck evita receive vencido, cancelación
demorada no retrasa408 y error tardío drenado, cancelación externa sin downstream.
Pendiente Build: SOLO body tests y Ruff de body_limits.py/test_security37_body.py;
sin DB ni repetición de PG7/regresiones67 aprobadas. Sin shell/ejecución propia.

## Resultados comunicados por Build; corrección mecánica posterior

TEST: body11PASS exit0; security37 PG7PASS exit0; regresiones afectadas
authsecurity/authPG/assistantPG/cancellation/extraction67PASS exit0. Retención TEST
dry-run applied=false,181sessions/396attempts/0leases, exit0. Primera invocación PG
desde raíz falló4 imports; invocación correcta desde backend exit0, no defecto producto.
Ruff check exit1 (orden imports) y format --check exit1 motivaron exclusivamente
patch de formato/imports. Sin cambio lógico ni nuevos comandos propios. Pendiente
recheck Ruff por Build y revisión de seguridad; estos PASS no son aprobación final37.

Solo backend. Sin shell, instalaciones, cambios de proveedor, llamadas LLM, lecturas
de credenciales, operaciones DEV, commits/push propios. Build realiza setup/migración,
checks TEST y commits locales después de revisión.38 todavía no iniciado.

## Contrato HTTP para frontend/Build

BodyLimits ASGI puro, exterior a middleware FastAPI: cuenta bytes REALES incluso
sin Content-Length, chunks o declaración inferior. Buffer limitado; no request.body
ilimitado. Caps: global262144, /api/auth/*8192,
/api/conversations/*/messages32768, /api/pcs/extract65536 bytes.
Deadline ABSOLUTO5000ms exclusivamente durante recepción.413 oversize,
408 timeout,400 longitud declarada inválida; JSON detail fijo y no-store. Desconexión
o cancelación no invoca parser/servicios. No temporiza procesamiento ni SSE.
No cuota adicional para GET públicos. El transporte/proxy sigue responsable de sus
propios buffers/conexiones: ASGI no puede evitar asignación de un chunk ya recibido.

GET /api/auth/csrf reutiliza sesión válida sin escritura ni cuota de emisión.
Nueva emisión: UPSERT atómico y creación en misma transacción PG, namespace
sha256 csrf-issue:IP obtenido solo por client_ip existente. Default30/15min/IP,
UJ_CSRF_ISSUES_PER_15M1..300. Denegación429 Retry-After conserva contador acotado,
no crea sesión. Credenciales/cookies/CSRF/rotación/propiedad siguen vigentes.

## Presupuesto PG compartido asistente/extracción

Nueva migración ADITIVA `alembic/versions/37_001_provider_budget.py`, parent33_001:
provider_execution_leases(owner FK restrictiva, expiry) e índices de retención.
Ninguna migración histórica modificada. Se requiere migrar antes de servir rutas.

Defaults/env, todos enteros validados:
- UJ_PROVIDER_USER_PER_MINUTE5 (1..60), GLOBAL_PER_MINUTE20 (1..300).
- UJ_PROVIDER_USER_CONCURRENT1 (1..4), GLOBAL_CONCURRENT4 (1..32).
- UJ_PROVIDER_LEASE_SECONDS180 (150..600): superior al turno acotado90s y margen
  de cierre/persistencia, también superior a extracción30s. No modificar esos límites.

Una admisión por NUEVO turno asistente o extracción; no por chunk/MCP/callback ni
UUID repetido. Un turno puede tener varias inferencias dentro del límite existente
de rondas; esto NO es una contabilidad monetaria ni contador externo de tokens.
Identidad servidor, auth antes de admisión. begin asistente conserva lock/UUID antes
de presupuesto; denegación revierte mensajes y contadores.429 con Retry-After antes
de SSE. Extracción recibe el mismo repositorio de presupuesto en composición HTTP.
DB error falla cerrado503, sin invocar proveedor. No fallback memoria en producción.

PG advisory lock fijo370001 ordena global→usuario/counters/leases para todos los
workers. Conversation lock se obtiene antes; release nunca obtiene conversation
lock. Counters comparten auth_attempts en namespaces hash distintos. Contención PG
limitada a3s statement/2s lock. Sin contadores autorizantes del cliente/modelo.
Release idempotente owner+lease en finally, cancel/error incluidos. Si teardown de
runner sigue vivo, conservar lease hasta finally del productor o TTL, sin liberar
prematuramente. Si PG falla al liberar, TTL permanece: no afirmar release exitoso.
Crash/process kill: no renovación silenciosa; leases vencidas dejan de contar y la
retención explícita las elimina más tarde. Todos los nodos deben usar misma PG y
settings compatibles; reloj autoritativo PG. No garantiza cancelación de cómputo ya
aceptado remotamente por un proveedor tras caída del proceso.

## Retención explícita

AuthMaintenance.retain dry-run por defecto; apply explícito. Edad mínima24h,
default24h: sesiones vencidas o revocadas fuera de edad, intentos antiguos y leases
vencidas fuera de edad. No users/PCs/conversaciones/planes, no cascadas ni limpieza
automática al startup. FK inesperada aborta transacción. CLI restringida UJ_ENV=test.
Solo usar wrapper TEST existente; no preparar/leer credenciales manualmente.

## Checks a ejecutar por Build, separados y con exit individual

- Migración head mediante wrapper TEST habitual (conftest ya ejecuta Alembic head).
- pytest focal `tests/test_security37_body.py` (unit ASGI, sin PG/proveedor).
- wrapper PG TEST seleccionando `tests/test_security37_pg.py`.
- Regresiones justificadas: auth/session/CSRF, assistant cancellation/UUID y
  extracción confirm, no suites legacy de hardware de rutina.
- Ruff check/format focal sobre archivos37; no instalar dependencias nuevas.
- Con entorno TEST del wrapper: `.venv/Scripts/python.exe -m upgradejusto.auth.maintenance --dry-run`.
  No --apply DEV ni llamadas reales al proveedor para probar cuota.

PG tests usan cuentas propias; snapshot/restore de contador global solo bajo gate
TEST exclusivo sin runners/servidores concurrentes. Prueba retención aplica dentro
de transacción PG exterior revertida: no borra permanentemente filas ajenas.
Matriz preparada: chunks/noCL/falsaCL, límites y deadline/cancel/disconnect; emisión
IP concurrente/reuso; rates y concurrencia user/global; aislamiento/UUID antes de
consumo; asistente bloquea extracción; release cancel/error; expiry recovery;
DB fail-closed; retención dry-run/aplicación preservando sesión válida y FKs.
No resultados ni códigos propios disponibles. Pendiente ejecución Build, revisión
solo lectura de seguridad y aceptación37 antes de38. No afirmar seguridad cerrada.
