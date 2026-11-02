# CU01 — contrato Sprint32 B

> Vigencia documental 27/10/2026: esta spec reúne requisitos y contratos por versión. Una frase fechada como «antes de implementar», «pendiente» o un resultado Sprint32/38 describe ese incremento; no acredita ni niega el estado de la entrega actual. Estado y aceptación únicos: [CONTINUAR](../CONTINUAR.md) y [matriz](../ENTREGA38_VISUAL.md). Desarrollo detenido; esta consolidación no autoriza ejecutar órdenes históricas.

## Delta autorizado38 — antes de implementar

GIS mantiene login local; identidad externa única issuer/sub, sin unión automática
por email. Google-only admite email/hash locales null, no contraseña ficticia.
Intento PG de cinco minutos, nonce de un uso ligado a sesión/Origin, CSRF y cuotas37;
verificar firma/algoritmo/issuer/audience/iat/exp/semántica IDtoken y nonce; rotar
sesión atómicamente y no guardar/loggear JWT. Rutas config/attempts/google y errores
según [contrato38 §6](CU03-pcs.md#origen-backend-integral38-contract-md). Migración aditiva38_b_001.
Aceptación: token incorrecto/replay/nonce/Origin/cuenta homónima/rotación y fallo de
certificados; login real Google requiere usuario, mocks no lo prueban. Localhost
loopback consistente. Es alcance autorizado, **no implementación ni prueba aprobada**.
Contratos/resultados históricos inferiores se conservan para sus versiones.

## Contrato vigente32 (2026-10-21, previo a delegación)

Estado24/10: B/CU01 y CU04 PG verificados por coordinación: PG171/cero skips,
browser4, TLS/reinicio sesión/caídaPG reales atribuidos a Build y revisión Astra
incremental sin bloqueantes. Preparación condicional siguiente conserva el gate
original, ya superado. Evidencia/atribución/límites en bitácora32; sin despliegue.

Sprint32 autoriza implementar CU01. Mientras Build prepara PostgreSQL local,
solo preparar backend/migraciones/tests; no declarar autenticación operativa.
El bloqueo y preparación31b conservados abajo son historia, no alcance vigente.

### Identidad y contraseñas

- Email: string ASCII de máximo254 caracteres tras quitar espacios ASCII extremos;
  una sola arroba, local1..64 con letras/dígitos y `. _ + -`, sin puntos iniciales,
  finales o consecutivos; dominio con al menos dos etiquetas DNS de1..63,
  letras/dígitos/guion, sin guion extremo. Sin direcciones citadas ni Unicode en B.
  Normalizar a minúsculas ambos lados como identidad del producto; no quitar puntos,
  sufijos `+`, ni aplicar equivalencias de proveedores. Índice UNIQUE en PostgreSQL;
  resolver también colisiones concurrentes. Esta política no verifica titularidad.
- Password:12..128 caracteres Unicode, máximo512 bytes UTF-8, sin trim,
  normalización, truncado ni reglas de composición. Rechazar NUL. Nunca registrar
  password, hash, cookies o tokens. Usuario público exclusivamente `{id,email}`.
- Argon2id mediante `argon2-cffi==25.1.0`, pin solicitado a Build, no instalado
  por coordinador/especialista. Perfil explícito RFC9106_LOW_MEMORY: versión19,
  memoria65536KiB, tiempo3, paralelismo4, salt16bytes y hash32bytes. Salt aleatorio
  por hash; verificar con biblioteca y rehash tras login correcto si corresponde.
  Usuario inexistente usa hash señuelo para evitar una salida rápida obvia.
  Build verifica compatibilidad Python3.12/Windows y fija transitivas en lock;
  no agregar otra dependencia de validación de email ni actualizar stack.

### Sesión, cookies, CSRF y límites

- Token opaco generado por CSPRNG con32bytes de entropía; PostgreSQL conserva solo
  SHA-256 del token de sesión, usuario nullable para preautenticación, creación,
  vencimiento absoluto y revocación. Ningún user_id/rol enviado por cliente/modelo
  otorga permisos. No JWT ni sesión de autenticación en localStorage.
- Sesión anónima para CSRF:30min. Sesión autenticada:12h absolutas sin renovación
  deslizante; revocación efectiva en cada petición. Login rota token y revoca el
  anterior; logout revoca en servidor, expira cookie y no afecta otras sesiones.
- Cookie `uj_session`, HttpOnly, SameSite=Lax, Path=/api, sin Domain; Secure en
  HTTPS. Secure=false exclusivamente en modo dev/test HTTP loopback explícito;
  no inferir modo inseguro de headers del cliente. Producción no arranca con esa
  excepción. Frontend usa proxy same-origin; no CORS wildcard/credenciales abiertas.
- `GET /api/auth/csrf`:200 `{csrf_token}`; crea sesión anónima si no existe sesión
  válida. Token CSRF aleatorio independiente32bytes asociado a sesión en servidor,
  estable durante esa sesión; puede almacenarse claro como synchronizer token,
  nunca como credencial de autenticación. Respuestas auth usan Cache-Control:no-store.
- Todos los POST auth requieren cookie, `X-CSRF-Token` y Origin igual al origen
  configurado exacto (scheme/host/port). Ausente, null o distinto:403. Comparación
  CSRF constante. GET csrf rechaza Origin ajeno si está presente; sin Origin se
  admite para navegación/cliente same-origin. No mutaciones por GET.
- Login/register: máximo5 intentos por email normalizado y20 por IP en ventana
  de15min; contar también éxito/usuario inexistente. Contadores compartidos PG,
  actualización atómica; no confiar X-Forwarded-For sin proxy configurado por Build.
  Antes del hash, máximo2 operaciones Argon2 simultáneas por proceso; saturación
  devuelve429 con Retry-After. Contador agotado:429 y Retry-After restante.
  Fallo PG:503, no bypass ni fallback. La ventana limita intentos, no bloquea cuentas
  permanentemente. No guardar IP/email de pruebas en Git ni payloads en logs.

### API congelada para frontend B

- `GET /api/auth/csrf`: contrato anterior; frontend obtiene token antes de POST.
- `POST /api/auth/register` JSON `{email,password}`:201 `{id,email}`; no inicia
  sesión autenticada.409 `{detail:"Email already registered"}`;422 validación.
  La enumeración por409 es decisión explícita acotada al registro, no al login.
- `POST /api/auth/login` mismo JSON:200 `{id,email}` y cookie rotada;401
  `{detail:"Invalid credentials"}` igual para usuario inexistente/password erróneo.
  Tras éxito frontend obtiene nuevamente `/csrf` antes de otra mutación.
- `GET /api/auth/session`:200 `{id,email}`;401 `{detail:"Not authenticated"}`
  para sesión ausente, anónima, vencida o revocada.
- `POST /api/auth/logout`:204 sin cuerpo para sesión válida CSRF (incluso anónima),
  revocación y cookie expirada. Sesión inexistente sin CSRF válido:403.
- Errores comunes:403 `{detail:"Forbidden"}`,429 `{detail:"Too many requests"}`,
  503 `{detail:"Service unavailable"}`;422 usa validación FastAPI sin eco de password
  ni otros valores sensibles. JSON desconocido user_id/role se rechaza422.
  Nunca enviar detalles de conexión/SQL/excepciones al navegador.
- CU04 conserva íntegro su contrato HTTP público y dataset `sprint31b-a-v1`;
  B migra lectura a PostgreSQL sin fallback silencioso al dataset en memoria.
  Fallo de conexión se informa503; no devolver datos simulando persistencia.

### Aceptación B y límites de verificación

Build instala PG/dependencias y configura secretos localmente; backend modifica
solo backend/, frontend solo frontend/ después de contrato/setup. No SQLite ni
memoria como resultado final. Pruebas unitarias no equivalen a integración.
Gate: migraciones y seed real dos veces sin pérdidas; reinicio conservando catálogo,
cuentas/sesiones; registro concurrente/email normalizado; hashes distintos y no
texto claro; login/rotación/logout/vencimiento/revocación; CSRF/Origin/cookies,
rate-limit compartido/concurrente; errores sin secretos; HTTP real y browser real;
regresión CU04 en PG y revisión independiente de auth/aislamiento sin hallazgos.
Persistir comandos/códigos/resultados reales, también fallos y pendientes.
Auth/aislamiento fallidos bloquean B/C/D. No autorización CU02/CU10 ni cierre de
otro CU por endpoints. Recuperación de contraseña/verificación email quedan fuera
de B y deben advertirse; sin publicación/despliegue autorizado.

Fuente de hash consultada mediante Context7: `/hynek/argon2-cffi`, CHANGELOG
25.1.0 (2025-06-03) y perfil API RFC_9106_LOW_MEMORY. El catálogo documental no
prueba instalación, compatibilidad efectiva ni disponibilidad de wheels locales.

## Addendum B — IP de proxy confiable (contrato previo a corrección24/10)

Objetivo: preservar20 intentos/IP/15min por cliente real sin confiar XFF arbitrario.
Sin nuevas dependencias. Frontend usa servidor Node HTTP nativo y Next prepare/
handler, según guías oficiales; no cambia identidad/autorización ni Origin/CSRF.

- El servidor frontend toma exclusivamente req.socket.remoteAddress; elimina
  headers entrantes X-Forwarded-For, Forwarded y todos los headers propios de
  gateway antes de establecer X-UJ-Socket-IP con la IP del socket. No derivar IP
  de request.headers. Validar IP literal y normalizar IPv4-mapped IPv6 a IPv4.
  Ningún secreto va en páginas, bundles, NEXT_PUBLIC, logs ni documentación.
- Route proxy auth toma exclusivamente ese header interno sobrescrito por el
  custom server y firma con UJ_PROXY_SECRET server-only, generado/cargado por Build
  desde runtime protegido. No fallback a next dev/start sin custom server cuando
  este contrato está habilitado. Ausencia de secreto/IP válida:503 genérico.
- Headers hacia backend: X-UJ-Client-IP (IP normalizada), X-UJ-Proxy-Timestamp
  (segundos Unix, decimal), X-UJ-Proxy-Signature (hex minúsculo HMAC-SHA256).
  Mensaje UTF-8 canónico, sin newline final: timestamp + newline + método HTTP
  uppercase + newline + ruta backend exacta sin query + newline + IP normalizada.
  Solo auth de B; rechazar queries inesperadas en proxy para evitar ambigüedad.
- Backend acepta esa IP solo si peer de transporte pertenece a
  UJ_TRUSTED_PROXY_PEERS explícito (lista de IP literales, loopback únicamente en
  B), secreto presente, firma constante válida y timestamp dentro de ±30 segundos.
  Nunca confiar XFF/Forwarded ni user_id/rol. Un conjunto de headers de gateway
  incompleto/inválido/no confiable devuelve403 genérico, no adopta IP declarada.
  Sin headers de gateway usa IP real del peer, como clientes directos existentes;
  no suprimir Origin legítimo ni omitir controles CSRF, cookie o rate-limit.
- Build configura secreto aleatorio mínimo32bytes y peers de transporte frontend
  explícitos; mismo secreto en ambos procesos, jamás enviado al navegador. No
  cambiar20/IP ni5/email, ni aceptar puertos/IP arbitrarios desde headers.
  Ventana HMAC acotada no es un mecanismo general anti-replay: el canal es loopback
  local B y cada petición sigue consumiendo los límites. Sin promesa de despliegue.
- Tests: dos IPs de sockets independientes tienen contadores distintos al pasar
  por gateway real; headers falsos cliente se descartan/sobrescriben; firmas malas,
  peer no confiable, timestamp vencido y método/ruta/IP alterados no eluden límite.
  Unitarias/TestClient para falsificaciones no sustituyen recorrido API/browser real.
  Config HTTPS/cookie Secure positiva/negativa no equivale a TLS real; reinicio de
  sesión autenticada y HTTPS local quedan a cargo de Build para completar el gate.

## Fixture E2E — aislamiento repetible por socket (contrato previo24/10)

IntegradoD actual FALLÓ por contador real compartido127.0.0.1:20/IP/15min. No
borrar contadores ajenos, esperar ventana como arreglo, subir límites ni desactivar
auth. Producto Node sigue derivandoIP de socket y firmandoHMAC; nunca XFF/header de
test ni secreto enviado al browser. Contrato de fixture, no cambio de API producto.

Proxy HTTP exclusivo de tests, sin dependencia nueva: escucha127.0.0.1 puerto
automático y reenvía SOLO a http://127.0.0.1:3000 usando http.request localAddress
127.x.y.z aleatoria propia por test/corrida. Rechazar CONNECT, otros destinos,
credenciales/puertos/hosts/protocolos y upgrades no necesarios; no proxy abierto.
No redexterna ni redirección de destino upstream arbitrario. No transformar Origin
legítimo/Host de aplicación ni inventar identidad; backend ve socket Node real.
Teardown cierra servidor/conexiones/agente propios, también en error, sin matar
PIDs ajenos. Fixture separada de gateway.spec que conserva susIPpropias y prueba
20→429/segundaIPindependiente. Todos contextos browser del test A/B deben pasar
por proxy asignado; no suponer herencia sin verificar. Falla de bind/proxy es fallo
de fixture, no fallback directo ni testsaltado. Sin publicación de IPs/secretos.

Docs consultadas antes de código: Context7 /microsoft/playwright network.md y
params.md (proxy por contexto); chromium implementación shouldProxyLoopback/
<-loopback> (no atribuir versión instalada sin comprobar). Node HTTP oficial
https://nodejs.org/api/http.html HTTP20024/10 localAddress/agent por conexión.
Especialista confirma API según versión instalada y fixture teardown, sin instalar.

Aceptación: tipos/lint/unitarias/build y DOS npm run test:e2e consecutivos 6/6cada
uno, sin suitePG concurrente ni esperar15min/borrarcontadores; wrapper PGpost0 en
ambos. Verificar rechazo destinos ajenos/cleanup y socketfuente real, no solo tests
positivos. Mismo Astra revisa SOLOdeltafixture/límiteconfianza+evidencia. Integrado
D no aceptado hasta reparación; Dfuncional previo conservado sin fingir integrado.

### Actualización de fixture24/10 — veredicto independiente pendiente

Build informa diagnóstico real:17JS anónimos con SHA idénticos, acceso directo
React true/sesión401 frente a proxy React false,5CONNECT app rechazados yWSfail.
Runtime Next16.4.2 app-index/debug-channel/web-socket demuestra REACT_DEBUG_CHUNK
por WSdev; no era solo hipótesis HMR ni prueba de fallo auth. Corrección frontend:
E2E `npm run start` en producción; Build scripts/test-browser.ps1 hace build fresco
antes del CLI. Mantener gateway custom/HMAC y socketIP; no autoriza next start
desnudo como fallback ni abrir CONNECT/upgrades: ambos405 intactos.

Evidencia atribuida a Build: auth focal producción1/1 exit0/PGpost0; dos E2E completos
consecutivos6/6 en14.6s y12.4s, cada wrapper exit0/PGpost0; tipos/lint0 y43Vitest.
Revisor independiente NUEVO leyendo delta, veredicto pendiente. Satisface evidencia
de dos corridas, NO aceptación integrada todavía. Backend quieto hasta gate; no
repetir suites por rutina ni borrar contadores/bajar controles. Fallos previos son
historia conservada en bitácora, no resultado actual. Coordinadora no ejecutó checks.

### Cierre independiente gateD24/10

Build informa veredicto independiente favorable: auth SIEMPRE normal; wrappers
rechazan variable diagnóstica, guarda negativaPASSexit0;44unit/tipos/lint0. Dos6/6
previos sinvariable/PGpost0 acreditados SIN repetición. Gate integradoD VERIFICADO,
no sigue pendiente el veredicto anterior. Conserva alcance parcial CU05; F puede
avanzar, no cierra CU05 global. Evidencia recibida, no comandos de coordinadora.

## Historia Sprint31b (conservada)

Estado: bloqueado. PostgreSQL utilizable no identificado por Build. Solo se autoriza
preparación de código/config de persistencia; no autenticación operativa ni UI login.
No sustituir PostgreSQL por SQLite/memoria. Paquetes instalados no prueban conexión.

## Preparación autorizada

SQLAlchemy con URL exclusivamente `postgresql+psycopg`, engine lazy sin conexión
al importar; Alembic en backend/alembic, migración inicial del catálogo y seed
idempotente sin borrar datos existentes. Reutilizar el contrato CU04 y su dataset
versionado. No cambiar archivos raíz escritos por Build ni leer credenciales.
No cambiar aún el repositorio readonly de A por una conexión sin verificar.

## Contrato de identidad para implementar al desbloquear

- `POST /api/auth/register`: email/password; 201 usuario público `{id,email}`;
  422 entrada inválida, 409 email ocupado. No devolver hashes ni secretos.
- `POST /api/auth/login`: email/password; 200 usuario público, cookie de sesión;
  401 genérico para credenciales inválidas. Sin user_id cliente como autorización.
- `GET /api/auth/session`: 200 usuario público con sesión válida; 401 sin ella.
- `POST /api/auth/logout`: 204, revocar sesión en servidor y expirar cookie.
- Sesiones opacas revocables almacenadas con expiración; guardar digest del token,
  no token claro. Password hashing robusto con dependencia/política por acordar
  antes de instalar. No inventar implementación segura por tener estos endpoints.
- Cookie HttpOnly, SameSite y path restringidos según flujo; Secure para HTTPS;
  excepción local HTTP explícita únicamente en desarrollo. Validación de Origin
  y protección CSRF para mutaciones; política exacta/token y tiempos pendientes
  de fijar antes de implementar y probar. No CORS abierto ni secretos en frontend.

## Gate de aceptación pendiente

PostgreSQL local autorizado utilizable; migración/seed real dos veces sin pérdidas;
persistencia tras reinicio; registro/login/logout y revocación; cookies/CSRF/origen;
pruebas HTTP negativas y aislamiento. Fallos de auth/aislamiento bloquean B/C/D.
Revisión crítica justificada cuando exista implementación de esos controles.
Preparación del catálogo no satisface CU01. C CU03 y D CU05 no se implementan ahora;
R01 sigue pendiente de D, sin ampliar motor28.
