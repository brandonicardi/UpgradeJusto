# UpgradeJusto — frontend local

## Entrega visual vigente — 26/10/2026

Gate central `/pcs` aprobado visualmente por revisión independiente sobre capturas reales 1440/390, comunicado por coordinación: referencia `2026-10-26T02-11-36-331Z-055bde79`. Sus checks informados corresponden a ese gate, no a los cambios posteriores.

Entrega completa aprobada funcional y visualmente por revisión independiente: catálogo/detalle, cuenta, editor/importación, planes/compartidos, chat, admin y estados generales. Build ejecutó tipos/lint/build finales0,94 unitarios y focales posteriores22/4 aprobados (solapados). Recorridos reales cubren los diez CU; capturas1440/390 inspeccionadas, hallazgos P1/P2 corregidos. `/` conserva su redirección al catálogo. Fuente: [bitácora de entrega](../docs/ai-log/2026-10-26-entrega-visual.md), no pruebas ejecutadas por este documento.

Pruebas: scripts exactos `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`; Playwright local con configuración explícita y runner exclusivo de Build. Evidencia final: `playwright.design.config.ts visual-final.spec.ts --grep @visual-core`; opt-ins separados `@visual-curation` (extracción real y credenciales del admin de prueba sólo en runner) y `@visual-live` (un turno natural propio). Los tests fallan sin su configuración real, no sustituyen proveedor ni saltan silenciosamente. Directorios timestamp/UUID nuevos bajo `.local/evidence/visual-delivery-v1/final/`; referencias aprobadas no se regeneran. Comandos detallados en `DESIGN-CHECKPOINT.md`.

Los diez casos de uso funcionan localmente respecto de sus contratos actuales; CU05/CU06 se limitan a `cu05-basic-stock-1`, no certificación física total. UI consume APIs reales, no persiste tokens localmente, preserva confirmaciones, propiedad, precios históricos y faltantes. Recursos gráficos: diagramas locales de categoría, no fotos de productos. Detalles en `ASSETS.md` y `DESIGN-CHECKPOINT.md`.

Lo que sigue es cronología histórica, no estado visual vigente:

## Estado vigente Sprint32 — cierre integrado local (2026-10-24)

Revisor independiente FINAL cerró el delta integrado sin bloqueantes, con checks
comprobados. Ejecuciones siguientes pertenecen a **Build**, no a este escritor:
- Frontend final: typecheck0, lint0, Vitest68, build0.
- E2E normal:9/9,20.4s, exit0 y PGpost0. **NO incluye LIVE ni consume proveedor
  por rutina.** No fallback ni mocks como resultado final.
- Web LIVE separado:1/1,11.3s (15.8s total), exit0/PGpost0. Verificó incremento
  real (delta en chunk anterior a done), Groq+MCP+RAG/citas, historial tras reload,
  UUID repetido409, aislamiento A/B, segundo turno cancelado con interrupted
  persistido y borrado confirmado.
- Backend final informado:323 pruebas sin skips, exit0/Ruff0. Cancelación temprana
  corregida tras reproducción real por backend mediante cleanup protegido del
  pending propio;18 pruebas focales exit0 antes del recorrido final.
- Privacidad Next dev: logging:false; proof real con token fixture inválido404,
  marcador ausente en logs API/web, exit0/PGpost0. Sin capacidad real en el proof.

Cronología preservada abajo: primer LIVE falló en el harness al releer body por
CDP («No data found») después de mostrar texto real; eso NO demostró defecto del
producto ni causa interna CDP. Se retiró esa relectura y se observó el mismo stream
con contadores saneados. Siguiente LIVE superó positivos y localizó pending tras
cancelación; backend reprodujo/corrigió la carrera antes del LIVE final aprobado.

Entorno/gates locales: un worker y BD de prueba; no equivalen a despliegue, carga
multiworker ni portabilidad. CU05 global y CU06 positivo global siguen incompletos;
borradores/faltantes no se convierten en recomendaciones ni compatibilidad completa.
Historial anterior conserva atribuciones, intentos fallidos y checkpoints superados.

LIVE es gate opt-in separado, con helper TEST de Build cargando en el MISMO proceso
el entorno real servidor (proveedor/trust/MCP/RAG; sin claves en web):
`node ./node_modules/@playwright/test/cli.js test --config=playwright.live.config.ts tests/live/assistant.spec.ts`
Requiere UJ_TEST_ASSISTANT_LIVE=1 explícito, retirado en finally, build fresco y
PGverify posterior. Sin flag falla, no salta ni sustituye auth. No activarlo como
verificación rutinaria; `npm run test:e2e` sigue siendo el gate normal9/9.

Catálogo readonly contra API real. `/` redirige a `/catalog`; filtros GET combinados
antes de paginar; `/catalog/[id]` muestra atributos y referencias. Sin evaluación de
compatibilidad, fotos ni dataset de respaldo en cliente.
Next consulta en servidor CATALOG_API_URL (default http://127.0.0.1:8000), sin
credenciales; conserva importes string, moneda, fecha y procedencia histórica.

Desde frontend/, scripts individuales existentes: `npm run typecheck`, `npm run lint`,
`npm run test`, `npm run build`, `npm run test:e2e`. Preparación en [README raíz](../README.md).
Next genera next-env.d.ts y tipos locales (ignorados) al ejecutar build/dev; en un
checkout nuevo generar esos archivos antes del primer typecheck.

Playwright inicia ambos procesos con reuseExistingServer:false; requiere3000/8000
libres, backend preparado y Chromium existente.31c hizo portable la ruta por defecto
a ../.local/ms-playwright; admite PLAYWRIGHT_BROWSERS_PATH explícito. Resultados y
reporte van a ../.local/playwright-results y ../.local/playwright-report.
No intercepta ni simula HTTP. No detener una web ajena para correr tests.

**Requisito E2E vigente:** ejecutar `npm run build` fresco antes del navegador;
Playwright arranca `npm run start` → `node server.mjs` en producción local, NO dev.
Build garantiza este orden en su wrapper; frontend no modifica scripts raíz.
Conservar entorno TEST/PG y secretos server-only configurados por Build. No usar
`next start` directamente: saltaría el custom server que toma la IP del socket.
No arrancar start manualmente antes de Playwright: reuseExistingServer sigue false.
UJ_DIAGNOSE_HYDRATION debe estar ausente en gates funcionales; Build rechaza esa
variable en sus wrappers. Auth SIEMPRE ejecuta auth, sin rama diagnóstica. El helper
anónimo se conserva solo como código histórico fuera de testDir, sin invocación
desde tests/config. Los comandos opt-in documentados más abajo son históricos y
ya no activan ningún modo diagnóstico del test auth.

## Evidencia histórica31b (2026-10-20)

Tipos/lint/build y12 Vitest/2 Playwright contra API real terminaron0, corroborados
por Build. Primer E2E falló por ruta Windows y segundo por localizadores ambiguos;
corregidos con revisión focalizada y recorrido posterior aprobado. A quedó cerrado,
no sigue pendiente de corroboración. No se ejecutaron tests PG/auth desde frontend.
Detalle: [bitácora31b](../docs/ai-log/2026-10-20-sprint31b-web.md).
Verificación actual31c: [bitácora31c](../docs/ai-log/2026-10-21-etapa31c-privacidad-commits.md).

## Checkpoint Sprint32 B — CU01 (2026-10-21, sin verificar)

Contrato previo: docs/specs/CU01-cuentas.md vigente32 y CU04. `/account` implementa
registro sin login automático, login, consulta de sesión al cargar y logout servidor.
Formularios etiquetados, carga/error anunciados, password fuera de estado/storage;
sin autorización cliente ni mocks de ejecución. `/api/auth/[action]` limita acciones
y métodos, conserva Origin/Cookie/CSRF, reenvía Set-Cookie sin reescribir Path=/api,
Cache-Control:no-store y Retry-After; filtra errores sensibles. CATALOG_API_URL existente.
Build debe configurar origen backend exactamente http://127.0.0.1:3000 para estos
servidores locales: NO eliminar Origin para evitar403. Login vuelve a consultar csrf
y cada POST adquiere token vigente; no reintentos automáticos.

Bloqueos: shell denegado en `git status --short` (sin código de proceso); lecturas
de directorios app/, lib/, tests/ denegadas, archivos literales pertinentes legibles.
No se ejecutaron typecheck/lint/Vitest/build/Playwright ni se afirmó conexión PG.
Backend informado por coordinador aún sin runtime PostgreSQL útil al iniciar turno.
Parche inicial rechazado por encabezado faltante; corregido una sola vez.
Tests añadidos: mensajes unitarios aislados y recorrido navegador contra backend real;
E2E auth desactiva trace/screenshots/video para evitar artefactos con credenciales.
El recorrido crea una cuenta aleatoria de prueba y no la elimina (no hay API delete B).

Retomar este mismo hijo cuando Build confirme PG/migración/seed y ejecución shell:
desde frontend/ ejecutar individualmente `npm run typecheck`, `npm run lint`,
`npm run test`, `npm run build`, `npm run test:e2e`, conservando códigos exactos.
Playwright ya configura ambos webServer reales y cache .local/ms-playwright;
no se modificó configuración reservada a Build. Verificar CSRF/Origin/cookies reales,
errores403/409/422/429+Retry-After/503 y CU04 sobre PG. Auth/aislamiento y revisión
independiente pendientes: B no aceptado, C/D bloqueados hasta gates del coordinador.

## Checkpoint Sprint32 B — 2026-10-24 (inspección, sin ejecución)

Build informó recuperación de PostgreSQL18 en 127.0.0.1:55432; runtime dev/test aún
pendiente. Esto NO verifica conexión de la aplicación, migraciones, seed ni auth.
No se ejecutaron shell, servidores ni suites en esta reanudación; sin códigos de salida.

E2E auth usa navegador/origen http://127.0.0.1:3000 y proxy /api/auth exclusivamente:
comprueba403 sin CSRF, registro201 sin autenticar, login200, sesión tras recarga y
logout204 seguido de401. Comprueba Origin legítimo sin inspeccionar cookies/password.
Espera fin del refresh CSRF posterior al login antes de recargar, sin sleeps, mocks,
identidad cliente ni bypass. Trace/screenshots/video siguen desactivados para auth.
La contraseña se asigna al input no controlado sin fill(value), evitando incluir su
valor en el log de esa acción si falla. Un parche adicional se rechazó por contexto
README inexistente; se corrigió el contexto una sola vez, sin ejecutar pruebas.
Cada ejecución crea solo su cuenta aleatoria; no borra datos ajenos ni inventa delete.

Lista: etiqueta «Datos curados del catálogo», sin mostrar identificador técnico.
Detalle: versión exacta obtenida de dataset_version mediante GET público de lista
page_size=1 (el contrato de componente no incluye versión); consulta fallida muestra
versión desconocida y conserva evidencia disponible. Sin cambiar contrato ni datos.
E2E catálogo incorpora ambas comprobaciones. README inspeccionado sin identificadores
privados de sesión/llamada/sincronización; no se consultaron memorias locales.

Configuración Playwright inspeccionada, no modificada (setup reservado a Build):
baseURL3000, backend8000, ambos webServer locales, cache ../.local/ms-playwright,
sin reutilizar servidores. No declara variables auth en webServer: Build debe cargar
PGtest y exportar entorno antes de ejecutar. Valores acordados: UJ_ORIGIN=http://127.0.0.1:3000,
UJ_ENV=test para pruebas (development solo dev), UJ_ALLOW_INSECURE_LOOPBACK=1 y
UJ_TEST_POSTGRES=1 únicamente en pruebas. No se leyeron scripts raíz ni secretos.
La comprobación de disponibilidad existente consulta catálogo, no prueba readiness auth.

Próximo paso del mismo hijo, solo tras confirmación Build de runtime y autorización:
desde frontend/ ejecutar por separado `npm run typecheck`, `npm run lint`,
`npm run test`, `npm run build`, `npm run test:e2e`; registrar códigos y evidencia real.
Siguen pendientes escenarios negativos completos, cookies/rotación/revocación servidor,
regresión CU04 sobre PG y revisión independiente. No cerrar B ni avanzar C/D por esta
inspección o por evidencia histórica31b; Astra solo después de código y evidencia real.

## Evidencia Sprint32 B — 2026-10-24, navegador PostgreSQL real

Supera los bloqueos de runtime anteriores: Build informó PG en loopback55433,
roles/bases dev-test separados, y backend informó144 passed sin skips y Ruff0 antes
de este turno. Esa evidencia pertenece a Build/backend; frontend no ejecutó su suite.
No hubo suite backend concurrente con navegador, ni lectura de runtime/secretos.
Valores vigentes informados: UJ_ENV=dev/test (no development), origen3000 y excepción
HTTP loopback explícita. UJ_TEST_POSTGRES=1 solo pruebas. Los detalles55432 anteriores
son checkpoint histórico, no configuración actual.

Excepción puntual autorizada: solo se cambió package.json test:e2e a
`powershell -NoProfile -File ../scripts/test-browser.ps1`. Sin tocar deps, lockfile,
scripts raíz ni setup. El wrapper de Build carga PGtest dentro del mismo proceso;
no se supone herencia entre llamadas shell ni se salta el wrapper.

Comandos individuales desde frontend/, ejecutados secuencialmente:

| Comando | Código | Resultado |
| --- | --- | --- |
| `npm run typecheck` | 0 | Correcto; repetido0 tras corrección E2E |
| `npm run lint` | 0 | Correcto; repetido0 tras corrección E2E |
| `npm run test` | 0 | 2 archivos,20 pruebas unitarias; no integración |
| `npm run build` | 0 | Next16.4.2 compiló catálogo, detalle, cuenta y proxy |
| `npm run test:e2e` inicial | 1 | 2 catálogo aprobadas,1 auth fallida |
| `npm run test:e2e` tras corrección | 0 | 3 aprobadas,1 worker,9.9s; wrapper PG exit=0 |

Fallo conservado: selector global getByRole('alert') esperaba0 y encontró1 después
del login. Se diagnosticó selección demasiado amplia: errores de cuenta pertenecen
al main; anuncios de framework pueden existir fuera. Lectura puntual del archivo
interno app-router-announcer.js denegada, por lo que no se atribuye como causa
comprobada el nodo concreto. Una sola corrección a main.getByRole('alert'); rerun
aprobado sin cambiar producto, CSRF, Origin ni backend. Los errores reales de cuenta
continúan dentro de main y siguen sujetos a la misma aserción.

Evidencia navegador actual:403 sin CSRF; registro201 no autentica; login200; Origin
exacto3000 en POST; refresh CSRF finalizado antes de recarga; sesión200 tras login,
sesión restaurada tras recarga; logout204 y sesión401. No mocks, bypass ni identidad
cliente. Catálogo real: filtros/paginación/evidencia/desconocidos/vacíos/errores,
etiqueta legible en lista y versión técnica exacta de API visible en detalle.
Auth mantiene trace/video/screenshots apagados y no imprime cookies/password.
Las dos ejecuciones crean sus propias cuentas aleatorias; no se inventó endpoint
delete ni se borraron datos compartidos. No se consultaron artefactos sensibles.

Límites:401 tras logout no prueba por sí solo revocación al reutilizar una cookie
antigua; no se inspeccionó rotación de credencial ni sus flags. HTTP local NO verifica
cookie Secure en HTTPS.409/422/429+Retry-After/503 tienen mensajes unitarios, no
recorridos navegador negativos completos. Reinicio del backend con sesión autenticada,
expiración real, negativos PG/aislamiento y revisión independiente siguen como gates.
No declarar B cerrado ni habilitar C/D. Solicitar al coordinador nueva revisión Astra
del delta B, aislamiento, proxy y setup pertinente; este hijo no delega ni modifica
scripts de Build. Próxima reanudación: resolver hallazgos concretos con evidencia,
sin reintentos cíclicos ni extrapolar el catálogo31b.

## Corrección IP gateway — 2026-10-24, integración bloqueada

Contrato previo leído: addendum IP proxy CU01. Guía oficial local consultada ANTES
del entrypoint: next/dist/docs/01-app/02-guides/custom-server.md (prepare,
getRequestHandler, Node HTTP, scripts y limitación con standalone).
`server.mjs` usa servidor HTTP Node nativo, Next prepare/handler y puerto3000.
dev/start ahora invocan ese entrypoint siempre; sin fallback a next dev/start.
El wrapper test:e2e de Build permanece intacto, sin dependencias/lock nuevos.

`lib/gateway.ts` valida exclusivamente remoteAddress del socket, normaliza IPv6 y
IPv4-mapped, elimina XFF/Forwarded/todo X-UJ-* entrante de headers y rawHeaders,
y establece X-UJ-Socket-IP interno. Proxy auth en runtime Node firma canon exacto
timestamp/METHOD/ruta/IP con HMAC-SHA256 hexadecimal minúsculo. Solo accede al secreto
en servidor; no envía secreto ni header socket al backend/navegador. Ausencia de
secreto/IP válida devuelve503 genérico; query inesperada403. Origin, CSRF y cookies
Path=/api no se reescriben. UJ_PROXY_SECRET se carga por Build; no se leyó runtime.

Comandos individuales secuenciales de esta corrección, desde frontend/:

| Comando | Código | Evidencia |
| --- | --- | --- |
| `npm run typecheck` | 0 | Repetido0 después de mejora diagnóstica E2E |
| `npm run lint` | 0 | Repetido0 después de mejora diagnóstica E2E |
| `npm run test` | 0 | 30 pruebas/3 archivos; gateway con fixture sintética explícita |
| `npm run build` | 0 | Compilación Next correcta |
| `npm run test:e2e` | 1 | 2 catálogo aprobadas; auth y gateway fallidos |

Fallo real conservado: gateway GET /csrf recibió403, esperaba200, usando socket
loopback independiente y headers falsos. Las llamadas pudieron abrir sockets;
NO se verificó separación de contadores porque la prueba se detuvo antes del login.
Auth agotó30s esperando POST register: el flujo CSRF previo impidió enviarlo. Se
añadió preflight navegador GET csrf que comprueba solo status200 para diagnosticar
el rechazo real y no ocultarlo como espera de POST. Sin rerun E2E cíclico: pendiente
confirmación de entorno por Build antes de repetir. No modificar expectativas a403
como resultado final, ni omitir firma/CSRF/Origin. Catálogo aprobado ahora no prueba
auth gateway y no reemplaza el gate pendiente.

Defecto concreto de setup remitido a Build: comando Uvicorn en
frontend/playwright.config.ts aún NO incluye --no-proxy-headers. Setup reservado:
no fue editado. Build debe corregirlo donde corresponda y confirmar secreto compartido
y UJ_TRUSTED_PROXY_PEERS explícitos en ambos procesos.403 puede provenir de rechazo
de validación backend, pero su causa exacta no quedó comprobada; no se inspeccionaron
secretos ni artefactos de auth. No se fabricó secreto runtime para hacer pasar E2E.
Node emitió advertencia MODULE_TYPELESS_PACKAGE_JSON al cargar gateway.ts desde mjs;
no fue fallo de arranque, y no se amplió permiso sobre manifest para silenciarla.

Pruebas nuevas: unitarias normalización/scrubbing/canon/fail-closed, claramente
aisladas; E2E gateway con Node HTTP real y dos IP source loopback aleatorias, spoofing
entrante,21 emails distintos para agotar20/IP y verificar otra IP aún401. Sin cuentas
nuevas en esa prueba (logins inexistentes), sin borrar datos ajenos. Artefactos auth
y gateway desactivados; errores de socket genéricos, sin imprimir cookie/password.
No hubo suite backend PG concurrente.171 passed/0 skips/Ruff0 es evidencia backend
informada, no ejecución de este hijo. TLS y sesión tras reinicio de clúster siguen
a cargo de Build. B no cerrado. Tras entorno corregido, mismo hijo repite wrapper
una vez y coordinador pide a Astra EXISTENTE revisar solo delta corregido/evidencia.

## Gateway real verificado — 2026-10-24, revisión independiente pendiente

Build informó resolución del403 histórico: UJ_TRUSTED_PROXY_PEERS=127.0.0.1 cargado
junto con secreto protegido compartido en Node/backend. No se leyeron runtime,
secretos ni evidencias privadas; el diagnóstico de configuración se atribuye a Build.
Autorización puntual aplicada exclusivamente al comando Uvicorn de
frontend/playwright.config.ts: añadido --no-proxy-headers para conservar peer ASGI
real. Node custom server, wrapper test-browser.ps1, origen3000, backend8000,
PGtest55433 y cache .local/ms-playwright permanecen sin otros cambios de setup.

Ejecución propia, secuencial, sin suite PG backend concurrente:

| Comando desde frontend/ | Código | Resultado nuevo |
| --- | --- | --- |
| `npm run test:e2e` | 0 | 4 recorridos aprobados,1 worker,11.3s; wrapper PostgreSQL exit=0 |
| `npm run typecheck` | 0 | Correcto con configuración final |
| `npm run lint` | 0 | Sin hallazgos |

Los4 recorridos prueban auth real registro/login/sesión/logout y controles CSRF,
gateway real con headers falsos descartados y contadores de dos sockets separados,
y2 regresiones de catálogo (incluidas etiqueta legible y versión exacta en detalle).
Gateway: primeras20 solicitudes login de una IP reciben401, la21 recibe429; otra
IP de socket recibe401 pese a mismos headers falsos. IP source gateway aleatorias
127.x.y.2/.3, distintas de navegador127.0.0.1 y proof Build127.0.0.2. Emails aleatorios
por intento y sesión CSRF propia: no usa credenciales ni fixtures de cuentas ajenas,
no elimina datos compartidos ni inventa endpoint delete. Auth crea su propia cuenta
aleatoria. No se cambiaron límites, expectativas, firma, Origin ni CSRF para pasar.
Artefactos auth/gateway siguen desactivados. Advertencia Node sobre tipo de módulo
persiste, no fatal; no se amplió este delta para silenciarla.

El403 y timeout anteriores quedan preservados arriba como evidencia histórica, ahora
superados por este recorrido real tras configuración corregida. No hubo nuevo fallo
ni rerun cíclico en esta invocación; no se repitieron Vitest/build rutinariamente.

Evidencia adicional informada por Build, NO ejecutada ni leída por este hijo:
verify-auth-runtime.py exit0 con HTTPS real/certificado local validado sin desactivar
TLS ni instalar en Windows store; Secure+HttpOnly+Path=/api y no envío cookie Secure
por HTTP; caída PG con catálogo503 JSON sin secretos; sesión autenticada conservada
tras pg_ctl stop/start real, logout401 y expiración HTTPS; fixture propio limpiado.
Build también informó uv sync0 y Ruff scripts0. Estos resultados no se atribuyen
al navegador HTTP de frontend ni a pruebas unitarias de flags.

Siguiente gate: Astra EXISTENTE revisa solo delta corregido y evidencia nueva mediante
coordinador. Este hijo no delega. B no se autocierra; no autoriza C/D ni proveedor IA.

## Checkpoint Sprint32 C — CU03, 2026-10-24 (NO aceptado)

Contrato CU03-pcs.md leído completo antes de implementar. Cambios solo frontend/:
lib/pcs.ts (tipos/formulario/null/errores/CSRF), lib/pcs-proxy.ts, lib/gateway.ts
(allowlist PCS raíz/UUID), app/api/pcs/route.ts y app/api/pcs/[id]/route.ts,
app/pcs/page.tsx y pcs.tsx (lista/detalle/editor), navegación layout.tsx,
tests/unit/pcs.test.ts y tests/e2e/pcs.spec.ts. Sin manifests/deps/lock/scripts raíz,
backend ni infraestructura. Sin extracción, compatibilidad, planes ni CU02/10/D.

UI propuesta implementada: listado paginado del propietario resuelto por servidor,
detalle seleccionable/editor en /pcs, catálogo real (hasta50 referencias, cobertura
de vista explícita), cantidades RAM sin default, módulos idénticos, BIOS/notas como
declaración con vacío=null. PUT envía reemplazo completo y revisión leída;409 deja
formulario sin guardar y ofrece descartar/recargar. Borrado requiere formulario de
confirmación con checkbox obligatorio. Ninguna PC se presenta como compatible.
Catálogo caído se muestra explícitamente y deshabilita guardar, sin dataset fallback.

Gateway permite solo /api/pcs y UUID, métodos según raíz/detalle; lista query validada
solo page/page_size, sin duplicados. Queries en mutación/detalle422; firma ruta sin
query usando socket/IP/HMAC B. Conserva Origin/CSRF/cookies y no-store; no acepta
owner para autorizar. Payload HTTP se remite al backend, que debe rechazar extras;
errores de proxy son genéricos. Sin modificar flujo auth/custom server de B.

Comandos individuales secuenciales propios, desde frontend/:

| Comando | Código | Resultado |
| --- | --- | --- |
| `npm run typecheck` | 0 | También repetido0 tras corrección del arnés |
| `npm run lint` | 0 | También repetido0 tras corrección del arnés |
| `npm run test` | 0 | 34 unitarias/4 archivos; no integración PCs |
| `npm run build` | 0 | Compila /pcs y proxies PCS |
| `npm run test:e2e` inicial | 1 | 4 regresiones B/CU04 aprobadas, CU03 timeout120s |
| `npm run test:e2e` rerun único | 1 | 4 regresiones aprobadas, CU03 falla en15.9s; total26.7s |

Fallo inicial ocultado por browserContext.close al expirar prueba. Una corrección
diagnóstica del arnés acotó acciones a15s, agregó timeout de fetch PC y preservó
error principal durante limpieza. El único rerun aisló fallo concreto:
getByLabel('Memoria RAM', exact:true).selectOption no encuentra selector en editor.
Etiquetas de categoría envuelven select/opciones: propuesta focal para coordinador
es label htmlFor + select id explícitos para separar el texto de etiqueta de las
opciones. NO se aplicó una segunda corrección ni se hizo otro ciclo E2E; escalado.
No se leyeron snapshots, runtime, secretos ni artefactos privados para diagnosticar.

Estado real C navegador: ambos usuarios propios se registraron/loguearon, cargaron
listas vacías y catálogo real; llegó al editor, NO a crear PC. Por tanto no afirmar
CRUD/PUT409/aislamiento/owner inyectado/borrado/contexto persistido comprobados.
El test contiene esas aserciones posteriores, aún NO ejecutadas satisfactoriamente:
dos contextos, manipulación GET/PUT/DELETE ID ajeno404 sin mutación, owner extra422,
revisión409, reemplazo RAM vacío, null y borrado confirmado. No mocks ni CSRF bypass.
Artefactos auth/PCS/gateway desactivados. Fixtures solo cuentas/sesiones propias con
emails aleatorios; no endpoint admin/delete de cuenta inventado. No se creó ninguna
PC antes del fallo; cleanup solo intenta la PC propia si llegó a obtener su id.
No se borró ni reutilizó fixture ajeno ni se ejecutó suite backend PG concurrente.

La suite PG194 passed/0 skips/Ruff0 es evidencia backend informada por coordinador,
no ejecución propia. Gate reinicio REAL de PC corresponde a Build conforme spec;
reload de página no lo sustituye. DEV requiere migración por Build; no se verificó.
Node mantiene advertencia de tipo de módulo no fatal, sin cambios de manifest.

Próximo paso: coordinador autoriza retomar MISMO hijo con corrección focal etiquetas
de categorías y rerun afectado mediante wrapper existente (sin saltar entorno).
Después obtener evidencia real restante y reinicio Build; Astra EXISTENTE revisa
solo delta C/aislamiento. C no cerrado, D bloqueado. No reauditar B ni extrapolar sus
regresiones aprobadas como aceptación de C.

## CU03 — corrección focal autorizada, 2026-10-24 (runtime E2E bloqueado)

Archivos de este turno: app/pcs/pcs.tsx, tests/unit/pcs.test.ts y este README.
Etiquetas de categoría ahora usan htmlFor y select id únicos pc-component-<categoría>;
texto exacto «Memoria RAM» y selector E2E original permanecen intactos. No se
silenciaron aserciones, cambiaron defaults RAM ni alteraron Origin/CSRF/gateway.

Revisión de queries vacías: el proxy frontend ya preserva claves vacías mediante
URLSearchParams.keys(), rechaza claves desconocidas/duplicadas y valores page o
page_size vacíos. No fue necesario cambiar producción. Prueba unitaria focal nueva
ejercita18 rechazos422 del proxy antes de firmar/contactar backend: lista con claves
desconocidas incluso sin '=' o con valor vacío, paginación vacía, y queries prohibidas
en POST raíz o GET/PUT/DELETE detalle; respuestas privadas no-store. Sin fixtures de
secreto, fallback de autenticación ni dependencia nueva. Corrección keep_blank_values
del backend y195 passed/0 skips son evidencia informada, no ejecución de este hijo.

Comandos individuales secuenciales propios, frontend/:

| Comando | Código | Resultado |
| --- | --- | --- |
| `npm run typecheck` | 0 | Tipos correctos |
| `npm run lint` | 0 | Sin hallazgos |
| `npm run test` | 0 | 35 pruebas/4 archivos, incluida matriz de18 queries |
| `npm run build` | 0 | Compilación correcta del delta UI |
| `npm run test:e2e` | 1 | Timeout60000ms de config.webServer ANTES de ejecutar tests |

Fallo nuevo real: wrapper autorizado arrancó Uvicorn (startup completo, puerto8000),
pero no obtuvo disponibilidad aceptada de la URL de catálogo usada por webServer
backend dentro de60s. No hubo reporte de tests ejecutados ni prueba browser CU03.
No se infiere PG caído, migración faltante ni causa HTTP exacta a partir del timeout.
No hubo rerun cíclico, sustitución por health, cambio de timeout ni lectura de
runtime/secretos/.local/artefactos privados. Escalado a Build: confirmar PGtest55433,
catálogo accesible y entorno del wrapper en mismo proceso antes de retomar mismo hijo.
No se ejecutó suite backend PG concurrente ni se consumieron fixtures browser en
este intento (no empezó ningún test). Fallos previos de label quedan documentados;
la corrección compilada aún requiere corroboración de navegador real.

Próximo paso: Build restablece/diagnostica disponibilidad de catálogo PGtest; mismo
hijo repite wrapper y completa A CRUD/409/null y A/B aislamiento/manipulación HTTP.
Build debe ejecutar migraciones dev/test no destructivas y proof
verify-auth-runtime.py --pc con PC propia, RAM/cantidades/contexto null/revisión
conservados tras reinicio REAL, sesión, B404 y borrado/cleanup exclusivo. Ese proof
NO se afirma ejecutado; reload no lo reemplaza. Astra EXISTENTE revisa solo las dos
correcciones y evidencia C después. C no cerrado, D no autorizado por este turno.

## CU03 — recorrido real completado, 2026-10-24

Única ejecución autorizada en esta reanudación, desde frontend/:
`npm run test:e2e` → wrapper existente test-browser.ps1 → exit0.
Resultado real:5 recorridos aprobados,1 worker,13.4s; Playwright PostgreSQL exit=0.
No hubo fallo nuevo, corrección de código ni rerun; no se repitieron tipos, lint,
Vitest, build o suite backend. No hubo otra suite PG concurrente.

CU03 completó en navegador real creación/lectura/edición, revisión incrementada y
conflicto409, RAM explícita2→3, BIOS/notas parcialmente null, reemplazo total que
elimina RAM, recarga conservando datos, borrado con confirmación y404 posterior.
Dos contextos de usuarios propios: B lista vacía, GET/PUT/DELETE sobre PC de A404,
POST con owner_id inyectado422 y lectura de A sin alteraciones. Select exacto
«Memoria RAM» funcionó tras la corrección htmlFor/id, sin cambiar la aserción.
También aprobaron4 regresiones necesarias de auth/gateway/catálogo. Sin mocks,
CSRF bypass ni controles de compatibilidad inventados. PC incompleta explícita.
El fixture PC propio se borró; no se usaron/borraron cuentas ajenas ni endpoint
admin inventado. Artefactos sensibles de auth/PCS/gateway permanecieron apagados.
La advertencia Node sobre tipo de módulo persistió, no fatal; no se tocó manifest.

Los fallos históricos de etiqueta y readiness se conservan arriba. Build informó
observaciones worker0xC000013A/console y postmaster fast shutdown en el incidente;
este hijo no deduce causa adicional. El timeout anterior NO reapareció en esta
ejecución. El wrapper no imprimió comprobación de liveness PG posterior a la suite:
no se ejecutó shell general ni se leyó configuración privada para obtenerla.
Se notificó a Build que compruebe inmediatamente el postestado del clúster; no se
afirma PG vivo después del retorno solo porque las solicitudes previas aprobaron.

Evidencia nueva atribuida exclusivamente a Build, no ejecutada ni leída aquí:
migraciones dev/test y seed exit0; verify-auth-runtime.py --pc exit0 sobre HTTPS
real, PC con RAM2/revisión2/BIOSnull, aislamiento B y conservación exacta de PC,
grupos/nulls/revisión/sesión tras stop/start REAL del mismo clúster; B404 después,
A DELETE204 seguido de404, limpieza solo fixtures propios. También informó503 PG
sanitizado, Secure/HttpOnly/no envío HTTP/logout/expiración0, recuperación PG/SCRAM
dev-test y cruce rechazado después del proof/cleanup; Ruff backend check0/format0.
No se consultaron .local, pruebas privadas, secretos ni identificadores de fixtures.

Gate siguiente: confirmación de liveness por Build y decisión del coordinador con
revisión Astra EXISTENTE solo sobre observación útil/delta C y nueva evidencia.
No reauditar B ni autocerrar C desde frontend. Sin avance D ni cambios raíz/Git.

## Sprint32 D — CU05 parcial R01/web, 2026-10-24

Contrato previo: CU05-compatibilidad.md sección9 leída antes de código, junto con
DTO28 documental pertinente. Lecturas exactas backend/upgradejusto/api/compatibility.py
y backend/upgradejusto/compatibility/http_models.py denegadas por herramienta;
no se reintentaron ni se generalizó el rechazo a otros archivos. La UI conserva
estructura de hechos/evidencia/cobertura mediante render recursivo de valores del
servidor sin suponer campos internos, comparar BIOS o decidir compatibilidad.

Archivos: lib/compatibility.ts y compatibility-proxy.ts; lib/gateway.ts;
app/api/pcs/[id]/compatibility/evaluate/route.ts y simulate/route.ts;
app/pcs/compatibility.tsx y pcs.tsx; tests/unit/compatibility.test.ts,
tests/e2e/compatibility.spec.ts y pcs.spec.ts; este README. Sin deps/lock/manifests,
scripts raíz, backend, secretos, memoria o cambios Git. Solo delta frontend D.

Desde detalle de PC propia, evaluar revisión visible o simular categoría completa:
referencias reales, cantidades RAM explícitas, hasta8 módulos y referencias únicas.
RAM retira conjunto completo. Nueva motherboard envía BIOS declarada o null sin
heredar anterior, aun referencia idéntica. Simulación/evaluación no guardan cambios.
Vista muestra alcance parcial R01 + subreglas previas, CU05 no completo, veredicto
servidor, reglas/estados/hechos/fuentes/condiciones/faltantes, cobertura completa
informada, versiones exactas y configuración evaluada no guardada. No badges de
compatibilidad global por pass R01 ni afirmaciones de POST físicamente imposible.
Evidencia histórica no se reconsulta. PC revision de salida permanece string.

Gateway extiende allowlist solo UUID/compatibility/evaluate|simulate POST; no query,
catchall, flags de aprobación ni autorización cliente. Proxy conserva Origin3000,
CSRF y cookie Path=/api; usa firma socket/HMAC B y no-store. Errores privados seguros
401/403/404/409/422/503, sin eco de payload ni fallback. Evaluar disponible aun sin
catálogo UI; simulación deshabilitada si referencias no disponibles. No se modifica
el motor, políticas de potencia ni pendientes R02–R10 para obtener compatible.

Comandos individuales secuenciales propios, frontend/ (backend PGsuite ya terminado):

| Comando | Código | Resultado |
| --- | --- | --- |
| `npm run typecheck` | 0 | Repetido0 después de corrección de estados accesibles |
| `npm run lint` | 0 | Repetido0 después de corrección |
| `npm run test` | 0 | 40 pruebas/5 archivos; unitarias D sin motor/mocks finales |
| `npm run build` | 0 | Repetido0 tras corrección; dos rutas POST nuevas compiladas |
| `npm run test:e2e` inicial | 1 | D aprobado,5 aprobadas/1 CU03 fallida; PG post-E2E0 |
| `npm run test:e2e` único rerun | 0 | 6 aprobadas,1 worker,18.6s; PG post-E2E0 |

Fallo inicial real: nuevo role=status de D coexistía con estado PCs durante borrado;
aserción CU03 global encontró2 elementos, no un fallo HTTP/aislamiento. Una corrección
diagnosticada añadió nombres accesibles Estado de PCs/Estado de compatibilidad y
acotó selector de CU03 al primero, conservando texto esperado PC eliminada del
servidor. Rerun único aprobado, sin silenciar aserciones ni alterar lógica servidor.
Wrapper real ejecutó regresiones necesarias por delta compartido; no suite PG
backend concurrente. Node mantiene advertencia no fatal sobre tipo de módulo.

Evidencia D navegador/API real (ambas ejecuciones): PC propia P01/P03/P04x2 obtenida
de catálogo real, R01 BIOS P2.30 pass/global requiere_verificacion; P1.20 fail/global
incompatible; null y P2.31 unknown/global requiere_verificacion. Cobertura pendiente
R10 visible, fuentes enlazadas y faltantes visibles; reglas cu05-32d.1 y pc_revision
string exacta. Simulación motherboard P03 sin BIOS declarada resulta null/unknown,
con P2.30 pass; CPU P02 pass con misma placa y BIOS documentada. RAM candidata P05x2
elimina todo P04 sin sumar módulos. GET de PC fuente idéntico tras evaluaciones,
simulaciones y errores, revisión incluida. Dos contextos propios A/B: ambas acciones
ajenas404 con CSRF válido; revisión obsoleta409 en ambas acciones; sin mutación.
Solo PC propia borrada al finalizar; cuentas/sesiones propias sin endpoint admin
inventado. Artefactos auth/D/C/gateway apagados, sin imprimir credenciales/cookies.

Postestado confirmado por wrapper en ambos intentos: PostgreSQL post-E2E exit=0,
conexiones dev/test separadas, roles no superusuarios y acceso cruzado rechazado.
No se leyó .local ni proof privado.234 passed/0 skips/Ruff0 es evidencia backend
informada por coordinador, no ejecución atribuida a frontend.

Límites/gate: pruebas frontend no sustituyen dominio/negativos PG exhaustivos ni
aceptación global CU05. Este D nunca cierra R02–R10 ni E/potencia/geometría/cooler.
Próximo paso: coordinador con Astra EXISTENTE revisa solo delta D y riesgos con
esta evidencia, no reauditoría B/C ni motor completo. No autocierre D/CU05 ni features E.

## Fixture repetible integrado D — 2026-10-24 (NO aceptado)

Contrato CU01 sección Fixture E2E leído antes de código. Build informó integrado
check.ps1 exit1 con3 browser aprobadas/3 fallidas por429 en registro/login; contador
real de127.0.0.1 superaba20 dentro de15min. Esa ejecución es de Build, no propia.
No se borraron contadores, esperó ventana como arreglo ni cambiaron límites/auth.

Cambios exclusivamente tests frontend/: tests/support/socket-proxy.ts,
tests/e2e/fixtures.ts, auth.spec.ts, pcs.spec.ts, compatibility.spec.ts,
tests/unit/socket-proxy.test.ts y README. Producto/socket/HMAC no modificado;
gateway.spec conserva sus IPs y prueba20→429/segunda IP independiente.

Fixture HTTP escucha127.0.0.1 puerto efímero, upstream fijo127.0.0.1:3000 con
localAddress aleatoria propia por test. Valida URL absoluta/authority/Host exactos;
rechaza destinos, protocolos, puertos, credenciales y fragments ajenos, CONNECT
y upgrades. No redirección automática upstream, secreto, XFF para identidad o
fallback directo. Preserva Origin/Host/cookies de aplicación. Elimina hop-by-hop
y proxy-authorization, hace streaming y cierra servidor/agente/sockets propios.
Contexto auth y C/D A/B configuran explícitamente proxy y bypass <-loopback>, sin
suponer herencia. Teardown comprueba conexiones reales y socket.localAddress igual
a fuente asignada, sin imprimirla. Referencias de catálogo C/D se consultan desde
Node con URL pública fija8000, fuera de contextos y sin acceso arbitrario por proxy;
todas las acciones browser de auth/PCs/D permanecen en proxy3000.

Documentación: coordinación aportó referencias oficiales Playwright network/params
y Node HTTP localAddress antes de código. Context7 no disponible aquí. Lecturas
puntuales de node_modules/playwright/package.json, playwright-core/types/types.d.ts,
playwright-core/lib/server/chromium/chromium.js, @playwright/test/package.json,
@playwright/test/index.d.ts y @types/node/http.d.ts fueron denegadas. También fue
denegado `node node_modules/@playwright/test/cli.js --version`, sin código de proceso.
No se reintentaron esas operaciones por otra vía ni se afirma versión instalada
comprobada. La API de proxy sí compiló contra tipos locales y fue ejecutada en
Chromium; esto no equivale a lectura de guías/versión local. Queda esa corroboración
documental puntual para coordinación con permisos disponibles, sin instalar.

Checks propios individuales y secuenciales desde frontend/:

| Comando | Código | Resultado |
| --- | --- | --- |
| `npm run typecheck` | 0 | API fixture resuelve contra tipos instalados |
| `npm run lint` inicial | 1 | 6 errores: callback Playwright use confundido con hook React |
| `npm run lint` tras corrección | 0 | Callback renombrado provide; sin desactivar reglas |
| `npm run test` | 0 | 42 pruebas/6 archivos; destinos/CONNECT/upgrade rechazados y cierre idempotente |
| `npm run build` | 0 | Producto compila sin cambios de auth |
| `npm run test:e2e` primer intento | 1 | 3 aprobadas/3 fallidas; PG post-E2E0 |
| `npm run test:e2e` segundo consecutivo | NO ejecutado | Primer intento falló; evitar ciclos sin diagnóstico |

Fallo nuevo, distinto de429 observado en integrado Build: auth permaneció con
Crear cuenta disabled hasta30s; D no encontró botón de PC tras crear fixture por
API; C no mostró listado vacío tras autenticar. Gateway y2 catálogo aprobados.
No hubo429 reportado ni error de verificación de sockets en teardown. API de setup
C/D alcanzó registro201/login200/CSRF200; no afirmar por ello hidratación UI correcta.
Síntomas son compatibles con problema de arranque/hidratación Next dev; rechazo de
upgrade del proxy es un punto a investigar, NO causa comprobada. No se abrieron
túneles arbitrarios, modificó producto/arranque ni silenciaron aserciones para pasar.
Sin lectura de snapshots/.local/secretos. Una corrección diagnosticada de lint y
rerun afectado; tras nuevo fallo se escaló, sin más ciclos E2E ni espera de15min.

Wrapper confirmó PostgreSQL post-E2E exit=0: conexiones dev/test separadas,
no superusuarios y acceso cruzado rechazado. No suite PG backend concurrente.
Fixture PC D propia limpiada mediante API; C falló antes de crear PC. Cuentas de
prueba propias sin endpoint admin inventado. Artefactos auth/C/D desactivados.

Próximo paso: mismo hijo tras diagnóstico/autorización focal del coordinador para
compatibilidad fixture/Next dev, sin abrir SSRF/túnel libre. Si hace falta interfaz
de wrapper/arranque, pedir a Build sin editar raíz. Luego obtener DOS wrappers
consecutivos6/6 y PGpost0 sin eliminar contadores/elevar límites/esperar ventana.
Astra EXISTENTE revisará solo delta fixture/límite de confianza y evidencia nueva.
Integrado D sigue NO aceptado; D funcional previo no se invalida ni se presenta
este intento como éxito. Sin E/F, staging, commit, push, delegación ni memoria.

## Checkpoint diagnóstico focal auth — 2026-10-24 (ejecución denegada)

Sesión nueva, sin recuperar sesiones/memorias. Leídos AGENTS raíz/frontend,
CU01 addendum Fixture E2E y contrato HTTP/UI D pertinente de CU05 sección9.
Antes de editar se consultaron guías locales Next `local-development.md` y
`allowedDevOrigins.md`: dev compila bajo demanda y restringe assets/endpoints
dev por origen. Estas guías NO demuestran la causa del fallo existente.

Único cambio de test: `tests/e2e/auth.spec.ts` registra diagnóstico acotado a80
eventos: pageerror clasificado (hydration/hmr/javascript-syntax/other), estados
HTTP/fallos de assets JS de Next y creación/error de websocket HMR. Solo emite
categorías, códigos y estado DOM agregado al finalizar; no mensajes crudos,
URLs/rutas dinámicas, consolas del navegador, cookies, headers ni cuerpos auth.
No cambia fixture, aserciones, proxy, producto, límites, Origin ni CSRF. No abre
upgrades/túneles y no atribuye el bloqueo a HMR por mera coincidencia.

Intentos shell rechazados por herramienta, SIN proceso ni código de salida:
- Inspección inicial combinada de estado Git/rutas pertinentes.
- Desde frontend/: `. ../scripts/local-env.ps1 -TestDatabase; node ./node_modules/@playwright/test/cli.js test tests/e2e/auth.spec.ts`.

No hubo reproducción efectiva, servidores iniciados ni suite PG/backend/browser.
No se ejecutaron tipos/lint/Vitest/build ni verify PostgreSQL en este turno.
La instrumentación queda SIN verificar; la causa sigue NO demostrada. No se
aplicó corrección funcional especulativa ni se intentó eludir el rechazo shell.
Los42 unitarios/checks y3/6 previos siguen siendo evidencia histórica, no actual.

Checkpoint para coordinación/Build: habilitar ejecución del comando focal ya
autorizado y confirmar postestado PG mediante `postgres.ps1 verify`. Luego
diagnosticar evidencia saneada, aplicar una única corrección demostrada y checks
focales; solo después DOS wrappers completos consecutivos6/6 y PG verify exit0
tras cada uno. No se ejecutó ninguno de esos gates. Lease exclusivo de suites
PG/browser devuelto al coordinador al finalizar este turno; integrado D pendiente.

## Diagnóstico anticipado para focal de Build — 2026-10-24

Build informó focal real: timeout global30s sin logs finally/call-log y PGverify
posterior0. Es evidencia atribuida a Build; aún no demuestra causa ni fase exacta.
Build conserva lease de ejecución; frontend solo escribe y NO ejecuta otra suite.

Delta listo en `tests/e2e/auth.spec.ts` y `tests/e2e/fixtures.ts`:
- Marcas inmediatas inicio/fin de creación proxy/contexto y entrada al cuerpo auth.
- Stages inmediatos para goto/reload, evaluate, fill y click/respuesta; fallos
  clasificados timeout/context-closed/network/other sin mensaje original ni argumentos.
- Navegación8s y acciones6s; evaluate de fetch con AbortSignal3s y deadline externo4s.
  Otros stages limitados9s. No aumento del timeout general30s, reintentos ni sleeps.
- Contadores JS/HTTP/HMR y eventos DOMContentLoaded/load emitidos al ocurrir,
  acotados80 eventos; estado DOM agregado tras goto mediante evaluate acotado.
  Finalmente solo imprime el agregado ya disponible, sin round-trip que pueda colgar.

`page.goto` y reload conservan espera default load: observar DOMContentLoaded sin
load puede localizar el bloqueo, pero no prueba aún canal persistente ni permite
cambiar waitUntil como arreglo. HMR y errores de hidratación se clasifican separados;
sin URLs, cookies, cuerpos auth, contraseñas ni captura indiscriminada de console.
Sin cambios al proxy de transporte, seguridad, controles o expectativas funcionales.

No se ejecutaron comandos/checks aquí; tipado/lint del delta pendientes de Build,
igual que focal real y su PGverify posterior. Tras causa demostrada, una corrección
focal y gates acordados; siguen pendientes DOS completos consecutivos6/6+PGverify0.

## Discriminante transporte/runtime — listo para Build, 2026-10-24

Build informó focal exit1/PGpost0: proxy/contexto y goto load completados,17 JS200,
DOMContentLoaded/load, documento complete,22 scripts/3 botones disabled, csrf200 y
negativo403; click Crear cuenta timeout6s. Sin pageerror/requestfailed/websocket.
Descarta bloqueo en goto; NO demuestra ejecución de JS ni causa HMR/hidratación.

Inspección nueva: server.mjs conserva Next handler/prepare y socket real; proxy usa
Node request/pipe sin descompresión explícita, filtra hop-by-hop y rechaza upgrades;
unitarias actuales cubren destinos/cierre, no fidelidad de bytes. Account arranca
busy=true: solo su useEffect GET session, al terminar, libera controles (también
con401/error). Un GET csrf manual200 no demuestra ejecución de ese efecto.
Guía local Next Server and Client Components consultada antes del delta: HTML
prerenderizado es no interactivo; cargar JS y ejecutar hidratación son fases distintas.
No se encontró defecto causal demostrado que justifique alterar producto/proxy.

Nuevo helper `tests/support/hydration-diagnostic.ts`, activado SOLO al ejecutar el
auth focal con UJ_DIAGNOSE_HYDRATION=1. NO agrega séptimo test ni cambia gates6/6.
Modo diagnóstico anuncia explícitamente que NO prueba aceptación auth: omite todo
registro/login/mutación y compara /account mediante proxy con contexto directo
nuevo/anónimo. Observa GET session automático (no lo dispara por evaluate), estados,
errores JS clasificados, señal DOM de React attached y colas runtime Next/Turbopack.
Para JS públicos /_next/static/ compara bytes descomprimidos que recibe Playwright,
SHA256, tipo/encoding/prefijo clasificados; emite índices, nunca rutas/URLs/contenido.
No añade eval de bundles, túneles ni fallback al transporte de pruebas funcionales.
Límites temporales siguen acotados, sin ampliar30s. Directo solo control diagnóstico.

Build: desde frontend ejecutar `npm run typecheck` y `npm run lint`; después SOLO
el focal, en proceso TEST preparado por su helper autorizado, con
`$env:UJ_DIAGNOSE_HYDRATION='1'` y
`node ./node_modules/@playwright/test/cli.js test tests/e2e/auth.spec.ts`.
Quitar variable en finally antes de cualquier gate funcional y hacer PGverify
posterior por el flujo de Build. Un pase en este modo NO cuenta como auth/6/6.
No se ejecutaron comandos aquí; helper/tipos/lint/runtime aún sin corroborar.

Interpretación: bytes distintos localizan divergencia de assets (todavía revisar
semántica/cache antes de culpar transporte); bytes iguales+directo habilitado y
proxy no, junto con sesión automática/React runtime, separan entrega de ejecución.
Ambos bloqueados remiten a arranque/runtime compartido, no prueban culpa del proxy.
GET session automático ausente vs presente/pending distingue efecto no iniciado de
carga de cuenta pendiente. Sin esos resultados no se aplica fix especulativo.

## Discriminante bootstrap/políticas/HMR — 2026-10-24 (sin ejecución propia)

Build informó tipos0/lint0 y diagnóstico exit1/PGpost0: directo habilita/React attached
y GET sesión automático2/401; proxy no habilita, sin React attached ni GET sesión.
Los17 JS coinciden en bytes/SHA256/MIME/decodificación; ambos load complete y
__next_f presente, TURBOPACK ausente, sin pageerror. Assets intactos no prueban que
el bootstrap o su dependencia hayan ejecutado; ausencia de WebSocket page no
descarta intento en worker/CONNECT rechazado antes del handshake.

Lecturas internas denegadas: hot-reloader-app.js, websocket.js, app-next-dev.js,
app-bootstrap.js, app-index.js y webpack.js. No se reintentaron por otra vía;
no se afirma conocer el flujo exacto del bootstrap16.4.2 instalado. Guías locales
custom-server/allowedDevOrigins sí consultadas: opciones dev y hostname/origen.
`browser.newContext` recibe igual baseURL en control y fixture; único argumento
distinto observado es proxy/bypass. Ambos son contextos manuales nuevos del MISMO
browser y test; no se ha corroborado aquí qué defaults inyecta internamente la
versión instalada de Playwright. No hay diferencia declarada de javaScriptEnabled/
CSP/storageState/serviceworker entre ellos en código actual; todavía no se atribuye
causalidad a defaults ni se afirma que el arnés los descarte necesariamente.

Delta diagnóstico, sin habilitar transporte nuevo:
- Helper compara digest de CSP/CSP-report-only de documento (no valores), atributos
  booleanos de scripts, serviceworker controller y señales bootstrap: colas Flight/
  webpack, longitudes, push nativo vs reemplazado y presencia runtime Next.
- console solo clasifica patrones públicos CSP/origen dev/WebSocket/HMR/hidratación,
  máximo30 coincidencias por página, nunca texto/args. Cuenta workers/WebSockets.
- Fixture cuenta CONNECT a authority exacta aplicación vs otros y upgrades HMR vs
  otros. TODOS siguen405, no CONNECT/upgrade/túnel abierto. Unit existente amplía
  rechazo HMR exacto y aserciones de contadores, sin alterar gateway/IP fuente.

Para Build, mismo focal anónimo ya acordado con UJ_DIAGNOSE_HYDRATION=1 (retirarla
en finally), sin suite completa. Previos individuales: `npm run typecheck`,
`npm run lint`, `node ./node_modules/vitest/vitest.mjs run tests/unit/socket-proxy.test.ts`.
Después focal auth y PGverify por helper TEST de Build. No comandos ejecutados por
este escritor ni códigos propios nuevos. No fix funcional justificable aún.
Si CONNECT aumenta, eso demuestra solicitud de túnel rechazada, NO por sí solo
que sea HMR ni que bloquee bootstrap. Si CSP diverge, revisar política exacta por
canal seguro; no reducirla. Señales de ejecución/console deberán guiar una sola
corrección; todavía no autoriza producción E2E ni upgrade como supuesto arreglo.

## Corrección autorizada: producción local E2E — 2026-10-24 (por verificar)

Coordinación/Build aportó nueva evidencia: proxy5 CONNECT aplicación rechazados y
5 fallos WS; directo1 WS conectado, hidratación activa. JS17 iguales y CSPnull ambos.
Build pudo leer runtime Next16.4.2 (NO lectura propia de este escritor): app-index.js
150–187 crea debugChannel/createDebugChannel(undefined), hydrate241 espera
initialServerResponse; dev/debug-channel.js55–102 usa TransformStream/self.__next_r;
dev/hot-reloader/app/web-socket.js63 conecta /_next/hmr?id=… y parseBinaryMessage
216–226 entrega REACT_DEBUG_CHUNK. El canal dev transporta datos React, no solo
notificaciones de recarga. Esto explica entrega JS íntegra sin completar hidratación
cuando el fixture cerrado rechaza CONNECT. Corroboración de la corrección pendiente.

Contrato autorizado en este turno: E2E contra build+custom server producción local,
sin abrir túneles ni alterar producto. Guía local Next testing/playwright.md146–152
consultada antes de editar recomienda build+start para probar código de producción.

Delta frontend:
- playwright.config.ts cambia SOLO comando frontend a npm run start; requisito de
  build fresco documentado, backend real y ambos webServer/cache/rutas intactos.
- Auth normal sin stages/console/listeners/estado DOM ni wrappers diagnósticos;
  mantiene aserciones, navegación load default, límites6s/8s y fetch abort3s.
- Fixture sin logs de creación normales. Helper comparador anónimo conserva opt-in,
  límites y salida saneada. CONNECT/upgrade siguen405 y fuente de socket verificada.
- Unitaria estática playwright-config.test.ts protege start→node server.mjs, no dev,
  no reutilización, --no-proxy-headers y cache del proyecto. No arranca servidores
  ni sustituye comprobación browser real; tampoco certifica frescura del build.

Sin shell/checks propios en este turno; no declarar éxito ni cerrar integrado D.
Build conserva lease: tipos/lint/unitarias pertinentes, npm run build fresco,
focal auth NORMAL (sin UJ_DIAGNOSE_HYDRATION) con helper TEST y PGverify posterior.
Si confirma corrección, DOS recorridos completos consecutivos6/6 con PGverify0
tras cada uno, sin suites backend concurrentes, contadores borrados ni cambios de
límites. Build garantiza orden/build fresco en wrapper; raíz no editada aquí.
Las prohibiciones de producción E2E del checkpoint anterior eran estado previo a
este contrato explícito; no se borra evidencia histórica ni se cambia dev del producto.

## Hallazgo independiente corregido — gate auth incondicional, 2026-10-24

Revisor señaló bloqueo medio: la variable UJ_DIAGNOSE_HYDRATION podía sustituir el
recorrido auth por comparación anónima y producir un pase sin comprobar auth.
Corregido exclusivamente frontend: auth.spec.ts ya NO lee variables, importa helper
ni retorna anticipadamente. Siempre ejecuta registro/login/recarga/logout y CSRF.
Helper queda en tests/support fuera de testDir normal, sin entrypoint/config de
diagnóstico ni invocación desde gate. Se conserva para evidencia histórica, no uso
operativo; instrucciones opt-in anteriores están obsoletas. Build posee rechazo
de variable en wrapper/check raíz: este escritor no modifica ni verifica esos archivos.

Unit adicional en playwright-config.test.ts protege testDir/config sin diagnóstico,
ausencia de variables/import/invocación/return en auth y presencia de mutaciones y
sesión401. Guardia estática, no reemplaza aceptación funcional ni revisión del gate.

Evidencia comunicada por Build ANTES de este delta, no ejecución propia: build0,
auth producción1/1; DOS suites6/6 consecutivas14.6s/12.4s y PGpost0 ambas. Build
confirmó variable retirada en finally ANTES de esas ejecuciones;43 unit/tipos/lint0
previos. No atribuir esos checks al nuevo delta ni invalidar evidencia ejecutada
sin variable. No se repitieron suites ni shell desde frontend.

Delta listo para revisor y comprobaciones focales que coordine Build: auth.spec.ts,
tests/support/hydration-diagnostic.ts, tests/unit/playwright-config.test.ts y README.
Nuevo total unitario aún no ejecutado. Cierre del hallazgo/integrado corresponde al
coordinador con revisión independiente; este checkpoint no lo declara aceptado.

## Sprint32 F — CU06 frontend preparado, 2026-10-24 (sin verificar)

Coordinador informó D aceptado tras revisión independiente: DOS6/6 PGpost0,
44unit/tipos/lint0. Backend F informó pytest256 sin skips/Rufflint0; formato menor
pendiente. Son resultados comunicados, NO ejecuciones propias ni checks del delta F.
Este turno implementa SOLO frontend F; no G/H, deps/manifests, raíz ni docs globales.

Contrato previo leído: docs/specs/CU06-recomendaciones.md completo. Lecturas exactas
backend/api/recommendations.py y recommendations/ (directorio), http_models.py y
service.py denegadas; no se reintentaron por otra vía ni se presume corroboración
del contrato efectivo. Build/coordinador deben contrastar DTO/API real antes de
aceptación. Guías Next locales Server and Client Components y route.md consultadas
antes de editar: estado cliente, params Promise y handler Node API.

UI desde PC propia: objetivo general/gaming/productivity, presupuesto decimal ARS
como string,1–20 alternativas/claves únicas,1–6 sustituciones/categorías únicas y
dependencias explícitas, RAM completa1–8 módulos con cantidades sin inferir,
BIOS nueva declarada/null sin heredar. Selección del catálogo real acotado visible;
sin fallback si cae. Toda combinación se envía junta, nunca se evalúa cliente.
Preview no guarda recomendaciones ni muta PC. Resultados se limpian al editar;
revisión visible y409 pide recargar detalle. No botones de aplicar/guardar preview.

Resultados: status/veredicto/beneficio exactos del servidor, unknown/rejected sin
etiqueta recommended; costes históricos decimales sin cálculos cliente, totalnull
desconocido≠0/subtotal, presupuesto null visible, líneas/cantidades/moneda/fecha/
fuente, gastos excluidos visibles (envío/financiación/mano de obra), faltantes,
reglas/evidencia/cobertura/versiones y configuración conjunta evaluada. CU06 EN
CURSO explícito: no hay positivo global E ni beneficio/precio inventado. No cierre.

Archivos nuevos: lib/recommendations.ts, lib/recommendations-proxy.ts,
app/api/pcs/[id]/recommendations/preview/route.ts, app/pcs/recommendations.tsx,
tests/unit/recommendations.test.ts y tests/e2e/recommendations.spec.ts.
Modificados: lib/gateway.ts (SOLO UUID/POST recommendations/preview exacto),
app/pcs/pcs.tsx (panel) y compatibility.tsx (exporta EvidenceValue existente), README.
Proxy conserva HMAC path exacto/socket IP, Origin/Cookie/CSRF, no-store; sin query,
redirect ni autorización cliente. Falla cerrada y errores genéricos. Sin tokens en
storage ni capturas auth. No cambios a CONNECT405 ni arranque producción E2E de D.

Unitarias preparadas: presupuesto sintaxis/exactitud sin float, null≠0, conjuntos y
dependencias/BIOSnull, límites/claves/categorías, HMAC/métodos/rutas y proxy failclosed.
E2E PG real preparado: dos contextos propios por fixture socket, preview UI unknown,
presupuesto insuficiente, dependencia placa/BIOS incompatible, líneas trazadas al
catálogo real, PC idéntica tras previews/errores, B404/revisión409/extra422/query422/
CSRF403 y cleanup SOLO PC propia. Caso coste null API condicional a referencia real
sin ARS en catálogo (si no existe NO atribuir ese caso como ejecutado); unitario
siempre protege presentación null. No escenario recommended fabricado ni mock final.

SIN shell ni códigos propios: ningún check ejecutado. Build mantiene lease y debe
ejecutar scripts existentes desde frontend: npm run typecheck, npm run lint,
npm run test, npm run build fresco, focal real recommendations.spec.ts con helper
TEST y PGverify posterior; regresiones necesarias via npm run test:e2e cuando
backend estable/sin suite PG concurrente. Ahora hay7 recorridos normales previstos,
no confundir antiguo gate6/6 de D con aceptación F. El browser requiere start de
producción y cache configurados, sin variable diagnóstica. Fallo diagnosticado se
corrige una vez y se escala, sin ciclos. Checkpoint listo para Build/coordinador;
aceptación frontend/API efectiva, checks reales y revisión independiente pendientes.

## F corregido / G preparado — 2026-10-24 (sin ejecución propia)

Build comunicó F tipos0/lint0/Vitest50/build0; focal REAL recommendations exit1 y
PGpost0. Fallo conservado: esperaba total_ars conocido para CPU, pero instalación
requiere pasta térmica no resuelta: backend devuelve totalnull deliberadamente.
Corrección diagnosticada SOLO test: exige totalnull/within_budgetnull y faltantes,
subtotal conocido positivo y líneas trazables al catálogo real con fecha/fuente.
Caso presupuesto insuficiente cambia a referencia RAM/GPU distinta con ARS real
obtenida de API (importe documentado >1ARS); exige total completo y presupuestofalse.
Sin referencia apropiada falla con diagnóstico explícito, no inventa precio ni cero.
Producto/proxy F intactos. F sigue CU06 EN CURSO sin escenario recomendado global.

G contrato previo leído completo: docs/specs/CU07-planes.md. Lectura backend/README
denegada, no reintentada ni afirmada corroboración efectiva de DTO. Build informó G
17passed0+85regresiones0/Rufflint0 tras reparar serialización; formato test menor
pendiente. Esa evidencia pertenece a backend/Build y NO verifica este delta frontend.
Guía Next local route.md (métodos/params Promise) leída antes de código.

Frontend G preparado:
- /plans listado paginado propio, creación y detalle histórico sin reevaluación al
  leer; snapshots base/resultados/evidencia/costes por etapa y acumulados/versiones.
- Editor ordenado1–12 etapas con categorías/dependencias explícitas por etapa,
  cantidades RAM completas y BIOS nueva/null. Cada etapa desde resultado anterior,
  cálculo exclusivamente backend. Adquisiciones repetidas no se descuentan.
- Carga explícita de revisión PC actual; PUT reemplaza y recalcula TODO snapshot
  solo tras checkbox de confirmación, reiniciado al editar/cargar PC. Borrado exige
  confirmación separada.409 conserva formulario/ofrece descartar+recargar snapshot.
- Estado PC cambiada/eliminada/no disponible explícito; snapshot no hereda cambios.
  PC no se muta al crear/recalcular/borrar plan. Borradores blocked/unknown visibles,
  no claims ready/compatible/compra segura. Costesnull, gastos excluidos, fuentes y
  faltantes preservados, sin suma cliente ni beneficio inventado. H/share NO añadido.

Archivos G nuevos: lib/plans.ts, lib/plans-proxy.ts, app/api/plans/route.ts y
[id]/route.ts, app/plans/page.tsx, plans.tsx, replacements.tsx,
tests/unit/plans.test.ts y tests/e2e/plans.spec.ts. Modificados gateway.ts (rutas y
métodos plans cerrados), layout.tsx (navegación), recommendations.spec.ts (fix F), README.
Gateway raíz plans SOLO GET/POST, UUID SOLO GET/PUT/DELETE; query SOLO paginación de
lista, sin duplicados/claves desconocidas/vacíos. HMAC ruta sin query/socket real,
CSRF/Origin/cookies/no-store y errores seguros;409 solo detalles conocidos plan/PC.

Unit G preparados: entradas/orden/límites/nombres/repetición sin mutar PC, reconstruir
solo entrada snapshot, allowlist/métodos/queries failclosed y conflictos. E2E real G
preparado con socketfixture A/B: guardar dos etapas RAM acumuladas, reload/GET intacto,
B lista vacía/GET/PUT/DELETE404, extra422/revisión409, PC editada sin cambiar snapshot,
recálculo confirmado/revisión+1/PCintacta, PC eliminada preservando plan y borrado UI.
Cleanup SOLO fixtures propios; trace/screenshots/video auth apagados. No mocks finales.

No shell/checks ejecutados por este escritor. Build conserva ejecución exclusiva:
npm run typecheck, npm run lint, npm run test y npm run build fresco; focal F reparado
y G con helper TEST/backend estable y PGverify posterior; regresión completa si
corresponde al gate coordinado (ahora8 recorridos previstos). No suites backend PG
concurrentes ni reintentos cíclicos; un fallo diagnosticado, una corrección y escalado.
Pendientes: corroboración DTO efectivo G, checks/runtime/revisión independientes y
reinicio REAL de snapshots PG por Build. G frontend no aceptado; H sin implementar.
Sin shell/deps/manifests/raíz/backend/docs globales ni staging/commit/push/memoria.

## Corrección G y H preparado — 2026-10-24 (backend H aún sin handoff)

Build informó G tipos0/lint0 y Vitest exit1:1fallida/54aprobadas. Fallo histórico
aislado en pcs.test.ts: esperaba GET /api/plans prohibido antes de autorizar G.
Corregido SOLO expectativa: raíz exacta GET ahora permitida; admin/query/traversal/
barra final siguen prohibidos. No amplió allowlist por ese fallo. No hubo rerun propio.

H: docs/specs/CU09-compartir.md leído COMPLETO antes de código. Guías Next locales
generate-metadata.md y headers.md consultadas: metadatos server y headers tempranos.
No shell ni pruebas API mientras backend H no entrega handoff estable. Este delta
es preparación conforme contrato congelado; DTO/proyección efectiva por corroborar.

UI de publicación en detalle /plans: título público, revisión explícita, checkbox
que confirma componentes/BIOS técnica/evaluación/costes y aviso de datos públicos.
POST publica snapshot, nunca plan mutable. Solo respuesta201 validada permite enlace
relativo /shared/token43 en memoria React; sin storage/logs/NextLink/precarga. Ocultar,
revocar o desmontar vista borra estado local; listado conserva SOLO metadatos, no
recupera enlace. Revocación exige confirmación, advierte copias previas/no cancelación
de respuestas iniciadas y no promete vencimiento. Publicar unknown no lo hace ready.

Página pública implementada como Route Handler HTML /shared/[token], sin layout
privado, JS, formularios, links ni recursos terceros. Consume SOLO GET fijo de
proyección pública servidor; no fetch a URL recibida en respuesta. Título genérico,
noindex/nofollow/noarchive y no-referrer en meta+headers; private/no-store/no-cache/
max-age0/must-revalidate, Pragma/Expires, CSP default-src none y force-dynamic.
Allowlist superior de contenido público y omisión defensiva de claves privadas
anidadas; backend sigue responsable de redacción completa de valores/contexto.
Cada GET consulta backend/PG, también tras revocación;404 indistinto y503 sin copia
cacheada. Métodos noGET (incluidos HEAD/OPTIONS)405 explícitos. Sin lectura de PC.

Rutas privadas: /api/plans/UUID/shares GET/POST y /UUID DELETE, sin queries; sesión/
CSRF/Origin/HMAC/socket y no-store conservados. Público /api/shared-plans/token43
SOLO GET, regex base64url exacta, sin Cookie/Authorization/CSRF/Origin/Referer hacia
backend, con firma gateway server-only. No sesión exigida para lectura pública.
Token no se imprime en errores ni se envía a terceros. CONNECT405 intacto.
Playwright launcher backend añade --no-access-log conservando --no-proxy-headers.
Root logging/dev/proofs queda bajo Build; no se modificó Node customserver.

Archivos: lib/shares.ts, shares-proxy.ts, shared-html.ts; app/plans/shares.tsx y
integración plans.tsx; API shares raíz/detalle, API shared-plans y HTML shared/token;
gateway.ts, playwright.config.ts, unit pcs/config, nuevos unit shares y E2E shares;
README. Sin dependencias/manifests/root/backend ni docs globales.

Pruebas preparadas, NO ejecutadas: unit título/path/regex/métodos/query/failclosed,
HTML escaping/privacidad/no acciones/no recursos, cookies omitidas/artifacts off.
E2E H desde comienzo sin trace/screenshots/video: A publica con confirmación; B
no lista/publica/revoca; anónimo lee/cacheheaders/proyección sin IDs/notas/cuenta,
snapshot estable al recalcular plan, token no sirve como autorización privada,
revocación→API+HTML404 sin caché,204 idempotente y reload no recupera token. URLs
bearer no se pasan a goto/reload/expect de URL ni se imprimen; errores públicos
saneados. Se limpian SOLO PC/plan propios (el plan elimina sus publicaciones).

Build, comandos desde frontend (solo Build ejecuta): `npm run typecheck`,
`npm run lint`, `npm run test`, `npm run build`. Esperar HANDOFF backend H antes
de HTTP/browser. Después, dentro del proceso TEST preparado por Build:
`node ./node_modules/@playwright/test/cli.js test tests/e2e/recommendations.spec.ts tests/e2e/plans.spec.ts tests/e2e/shares.spec.ts`
y PostgreSQL verify posterior0; regresión `npm run test:e2e` por gate coordinado
(9 recorridos previstos), sin suite PG concurrente. No variable diagnóstica.
No códigos nuevos propios. G/H frontend NO aceptados: pendientes checks reales,
proyección DTO efectiva, revocación/reinicioPG por Build y revisión crítica de
capacidad bearer/caché/redacción. Un fallo diagnosticado, una corrección y escalado.

## F auditado / I frontend listo para checks — 2026-10-24

Evidencia recibida de Build, NO ejecución propia: FGH tipos0/lint0/Vitest60/build0;
focal3 E2E exit1/PGpost0, G/H pasaron y F falló esperando precioARS de P03 ausente.
Proof raíz --plans REALHTTPS/PGstop-start0 conserva snapshots/null/precios y revocación.
Revisión independiente integrada aún pendiente. I informado estable: H+I23pass0,
RAGreal2pass0 (ingesta idempotente3chunks384CPU), MCPcontractreal2pass0 y
LIVEGroq/MCP/RAG/cita/history1pass0; SDK outputs reparado por backend a dict[str,Any]
+structured_output=True. Nada de ello constituye verificación de este nuevo web I.

F: segunda suposición de precio removida SOLO en test. Se revisaron TODAS las
aserciones de coste: helper contrasta cada adquisición con preciosARS del catálogo
HTTP real, selección fecha más reciente/menor importe/source lex, líneas solo si
hay precio y subtotal exacto suma líneas×cantidades usando enteros de centavos.
P03 sinARS exige ausencia de línea, faltante con referencia y totalnull; no precio
inventado. CPU conserva totalnull por dependencia térmica; presupuesto insuficiente
usa referencia RAM/GPU real ya consultada. Caso API sinprecio valida igualmente
faltantes. Estados/BIOS/PCintacta/seguridad permanecen; producto F sin modificar.
No rerun ciego ni shell propio: corrección autorizada pendiente de Build.

I contrato previo: CU08-asistente.md completo leído, guías Next route.md streaming
y APIs Web/ReadableStream consultadas ANTES código. backend/upgradejusto/api/assistant.py
denegado por herramienta, sin reintento; corroboración envelope/DTO efectivo pendiente
de Build. Sin dependencias nuevas, servicios falsos ni configuración proveedor en web.

Web /chat: crear/listar/abrir/eliminar conversaciones privadas según endpoints
congelados (sin inventar PUT/renombrado), listas e historial paginados por secuencia,
completed/pending/failed/interrupted explícitos y texto parcial. POST mensajes con
UUID client_request_id y CSRF/cookie same-origin; deltas visibles como texto, citas
validadas y renderizadas SOLO como texto, sin HTML/Markdown/href/fetch. Rechaza
protocolos/credenciales/hosts privados/rutas API/shared en citas; servidor sigue
responsable de resolver fuente pública curada. tool_status solo name/status acotados,
sin argumentos, outputs internos ni razonamiento. Historial no se indexa como corpus.

AbortController cancela turno; recupera GET historial sin reenvío.409 informa conflicto/
UUID existente y bloquea envío hasta redacción explícita de turno nuevo; ninguna
facturación/reintento automático. EOF sin done/error/aborto no son éxito. Un done
completed aún exige corroborar mensaje en historial servidor; si falla persistencia,
texto provisional marcado y recuperación disponible. Cuota/timeout/credenciales son
bloqueo operativo: no cambia proveedor, trust ni clave. Token/claves fuera de web y
storage; no NEXT_PUBLIC ni lectura de secretos.

Gateway I SOLO raíz conversations GET/POST, UUID GET/DELETE y UUID/messages GET/POST;
paginación acotada SOLO GET lista/mensajes, no query en metadata/mutación. HMAC ruta
exacta/socket, CSRF/Origin/cookies/no-store conservados. Proxy SSE devuelve body
upstream directamente, sin text()/json() de respuesta, no-transform y
X-Accel-Buffering:no; señal cliente+timeout105s se propaga. Backend conserva sus90s.
Request JSON se remite sin autorización cliente ni selección de tools/proveedor.

Archivos I nuevos: lib/assistant.ts, assistant-proxy.ts; app/chat/page.tsx y chat.tsx;
app/api/conversations raíz/[id]/messages routes; tests/unit/assistant.test.ts;
playwright.live.config.ts y tests/live/assistant.spec.ts. Modificados gateway.ts,
layout.tsx, test F y README. No raíz/backend/perfiles/memoria/staging/commit/deps.

Checks preparados, NINGUNO ejecutado aquí: unit SSE fragmentos/CRLF/multidata/UTF8,
EOF/error/aborto, límites, citas/UUID409, gateway/query, proxy primerchunk antes de
cierre/cancelación y separación LIVE. Fakes solo unitarios aislados, NO entrega final.
LIVE separado de testDir normal: configuración exige UJ_TEST_ASSISTANT_LIVE=1 o
falla, no skip ni sustitución auth. Trace/screenshot/video off desde config/test;
sin logging de cuerpos/cookies/capabilities y sin fill(value) para mensajes.
LIVE preparado usa proveedor real dos turnos explícitos: Groq→MCP→RAG→cita/deltas,
historial/reload, A/B404, UUID repetido409 sin regenerar y cancelación persistida
interrupted/failed. Cuota/servicio/cita ausente falla y registra bloqueo, no fake pass.
Cleanup solo conversación propia; si backend aún genera409 no se fuerza borrado ni
se oculta fallo principal. Reinicio REAL de mensajes queda a Build, no lo prueba reload.

Build mantiene lease/ejecución. Desde frontend: npm run typecheck, npm run lint,
npm run test, npm run build fresco. Focal F reparado con helper TEST, luego PGverify.
Para gate I separado, con helper TEST que ya carga entorno real Groq/trust/RAG/MCP:
definir UJ_TEST_ASSISTANT_LIVE=1 SOLO en ese proceso y ejecutar
`node ./node_modules/@playwright/test/cli.js test --config=playwright.live.config.ts tests/live/assistant.spec.ts`,
retirar variable en finally y PGverify posterior. No modificar cache de navegadores
por comando: hereda config .local/ms-playwright. Suite normal sigue9 recorridos y
NO incluye LIVE; un9/9 no certifica I. No repetir PG suites/6/6 sin gate Build.
Pendientes: DTO/envelope efectivo, checks reales del delta, positivos web LIVE y
cancelación/negativos operativos/reinicio, revisión independiente. I no aceptado.

## Gate LIVE: evidencia de incremento real — 2026-10-24 (sin ejecutar)

Build informó tipos0/lint0/Vitest67/build0 y focal F corregido1/1 exit0/PGpost0.
Contrato I efectivo confirmado por coordinación; supera la advertencia anterior de
DTO pendiente, no acredita todavía primera web LIVE. Ningún check propio nuevo.

Solo tests/live/assistant.spec.ts añade tap fetch via page.addInitScript. Filtra
POST same-origin conversations/UUID/messages con200 SSE; una llamada fetch real,
un TransformStream síncrono, sin tee, pausas, splitting, cola personalizada ni
backpressure artificial. Encola el MISMO chunk y conserva status/headers para UI.
Reconocedor byte a byte solo observa framing event: delta/done y línea vacía;
ignora valores data, no decodifica/retiene texto/JSON. Única observación exportada:
contadores numéricos responses/reads/deltaEvents/doneEvents y posiciones de lectura.
No guarda/imprime headers, payloads, textos, URLs, IDs ni tiempos.

Gate exige exactamente una respuesta observada, más de un chunk, delta completo en
lectura ANTERIOR a primer done y un solo done. Un blob con todos los eventos en la
misma lectura falla aunque la UI muestre texto y response.body permita parsear SSE.
Mantiene además UI incremental visible, tools/citas/historial y cancelación previa.
La espera de observación done solo sincroniza el test; no demora stream/proveedor.
Sin cambio producto/proxy/proveedor, llamadas duplicadas ni simulación. Build mantiene
lease y ejecutará checks/web LIVE; este patch todavía no se afirma aprobado.

## LIVE: retirar relectura CDP, mismo stream — 2026-10-24 (sin ejecutar)

Build informó primera web LIVE real exit1/PGpost0 a6s: texto incremental visible
aprobó, luego response.body() falló CDP Network.getResponseBody «No data found».
Esto NO demuestra fallo del producto, navegación ni causa interna CDP. No se hizo
otra llamada al proveedor, no retry ni suite completa desde este escritor.

Único delta funcional del test: elimina response.body()/SSEParser de la evidencia
LIVE. Tap existente valida JSON+shape por frame transitoriamente (máximo131072,
descarta frame al terminar), exportando SOLO contadores numéricos start/delta/
delta no vacío/tool_status/citation/done/error/invalid y terminalCompleted. No archiva
payload/textos/headers/URLs/IDs; misma respuesta/mismos chunks passthrough a UI, sin
tee, demoras, replay ni fetch adicional. Buffers locales limitados son únicamente
framing del frame corriente, no historial ni copia de respuesta completa.

expect.poll espera done/error/invalid con límite ya acotado; exige shapes válidos,
sin error, completed y cita/tool/start presentes. Conserva más de un chunk y delta
NO VACÍO completo en lectura anterior al done. Cita además pasa citationText en
historial persistido y su URL debe verse en UI como texto (aserción booleana, no
imprime body/URL). request.postDataJSON sigue SOLO local para UUID409. Sin cambios
de producto/seguridad/proveedor ni de timeout general. Build ejecutará SOLO LIVE
con su lease, no full suites. Checks de este delta aún no ejecutados aquí.
