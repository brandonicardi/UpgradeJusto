# 38B1 GIS — implementación preparada; gate Build/seguridad pendiente

## Checkpoint de corrección de estilo (resultado atribuido a Build)

Build informó en TEST, sin DEV ni llamadas Google reales:

| Check | Resultado | Exit |
| --- | --- | --- |
| Dependencias LOCK | OK | 0 |
| Dependencias SYNC | OK | 0 |
| Dependencias CHECK | OK | 0 |
| Verificador Google sintético | 21 PASS | 0 |
| Google PG + migración + retail PG, head38_b/38_c | 12 PASS | 0 |
| Regresiones auth/security/authPG/security37PG/body | 52 PASS | 0 |
| Ruff check previo a esta corrección | Separación import local | 1 |
| Ruff format previo a esta corrección | Diez archivos pendientes | 1 |

Build instaló localmente google-auth2.62.0 y transitivas; lock/setup son suyos.
Corrección posterior exclusivamente por PATCH: formato de los diez archivos
señalados, separación uuid4/Pydantic y clave HS256 sintética de al menos32bytes.
Sin cambios de lógica de producto, contratos, migración ni assertions.
No ejecuté shell/runners, instalaciones, PG ni Google; Ruff posterior pendiente
de Build. PG12/regresiones52 no requieren repetición por este delta de estilo.
READY para rerun separado Ruff check/format y revisión independiente de seguridad;
no equivale a gates aprobados ni cierre integral. Si queda estilo residual,
escalar al coordinador con el diff del formatter, sin bucles de corrección.
Login Google humano en navegador sigue pendiente y no lo acredita RSA sintética.

Solo Google38B1. Ownership auth/API Google/main/schema/deps/migración/tests propio;
no retail/catalog/admin ni compatibility/tower_* de otros escritores. No runner,
shell, instalación, lectura de archivos privados, mutación DEV ni llamada Google
propia.38A aceptado y commitcd4f286 informado por Build, no reabierto.

## Dependencias/migración (Build)

Pin añadido pyproject: `google-auth[requests]==2.62.0` (versiones oficiales/C7 ya
verificadas por Build). Nuevo import lazy: app/config/local auth no simulan login si
falta instalación; callback válido sin librería falla503. Build debe lock/sync local,
sin globales ni actualizar proveedores. Tests usan PyJWT/cryptography existentes
confirmados por Build; no claves reales ni archivos de credenciales sintéticos.
Migración ADITIVA `38_b_001_google_identity.py`, parent38_a_001: email/password_hash
nullable juntos explícitamente, profile_email/display_name nuevos, identidades
canonical issuer/sub y tabla intentos nonce. Downgrade rehúsa Google-only/identidades,
no borra cuentas para aparentar reversibilidad. No cambiar histórico38A/37.

## Contrato frontend EXACTO

GET `/api/auth/google/config` →200 `{enabled:bool,client_id:string|null}`.
Solo env público `UJ_GOOGLE_CLIENT_ID`; sin leer archivos/client secret ni tokens.
No modifica UJ_ORIGIN: Build alinea localhost:3000/loopback para demo final. TEST
conserva origen127 de fixtures autorizadas, no acredita orígenes GIS reales.

1. GET `/api/auth/csrf` obtiene cookie anónima y csrf_token (reuso sin emisión37).
2. POST `/api/auth/google/attempts`, cuerpo vacío, Origin/CSRF/cookie actuales →200
   `{attempt_id:UUID,nonce:string,expires_at:ISO}`. Dar nonce a inicialización GIS.
3. Callback JS POST `/api/auth/google` JSON `{attempt_id,credential}` y controles
   anteriores. credential SOLO IDtoken; campos email/user_id/token_type extras422.
4.200 devuelve user y Set-Cookie HttpOnly/SameSite=Lax/path/api rotada12h. Refrescar
   GET csrf antes de próxima mutación: el token CSRF anterior ya NO autoriza.

Local public user sigue EXACTO `{id,email}`. Google-only:
`{id,email:string|null,auth_provider:google,display_name:string|null}`.
email solo perfil verificado/normalizable, puede ser null; nunca clave de enlace.
Frontend debe tratar display_name como texto escapado, no HTML/Markdown confiable.
Mismo email local y Google crea DOS cuentas independientes, no auto-link/fusión.
Google-only tiene columnas email/password_hash null, no contraseña ficticia; ingreso
local conserva Argon2/guardas y rechaza hash ausente. Identidad única canonical
`https://accounts.google.com`/sub; alias oficial accounts.google.com normalizado.

Errores JSON detail sanitizado:401 `Invalid Google ID token`;403 `Forbidden` por
Origin/CSRF/sesión/vinculación incorrecta;409 `Google attempt unavailable` por intento
expirado/usado/cambio clientID;409 `Google identity conflict` ante enlace local no
autorizado;429 `Too many requests` +Retry-After;503 `Google sign-in unavailable` o
`Google verification unavailable`, DB503 `Service unavailable`.413/408/42237 igual.

## Uso único/seguridad/transporte

Intento TTL5min por reloj PG, nonce aleatorio32bytes guardado SOLO SHA256, ligado a
digest de sesión/Origin/client ID. Emisión comparte contador37 `csrf-issue:IP` hash,
30/15min por defecto: anónima+GIS NO tienen presupuestos independientes duplicados.
Solo client_ip servidor confiable. Callback claim PG atómico antes de verificar:
una tentativa realiza máximo una verificación; JWT inválido o certificados503 exige
intento NUEVO (no reintentar credential con mismo attempt).403 previo no quema intento.
completed_at se escribe en la MISMA transacción que identidad + rotación de sesión.
Sesión/expiración se revalidan al reclamar y completar, no se confía en lectura vieja.
Se reconsulta reloj PG DESPUÉS de locks, incluido subject advisory; no aceptar TTL
vencida mientras se esperaba. Exp del IDtoken verificado solo viaja en memoria y
se vuelve a comprobar antes de completar; nunca se persiste el JWT.
Locks sesión→intento→subject advisory(380001,hash32), orden fijo. Claims nunca son
SQL ni owner/model authorization. Sin access/refresh/IDtoken almacenados/loggeados.

Verificador oficial verify_oauth2_token con audience, firma y tiempos, más RS256
obligatorio, issuer/aud/azp, iat/exp enteros, semántica IDtoken/typ, nonce constant-time
y sub acotado. Rechaza jku/x5u/jwk/crit: URL del JWT jamás elige claves.
Certificados SOLO https://www.googleapis.com/oauth2/v1/certs, mapa x509 válido, sin
ramal JWKS que cree transport alternativo. Usa Request oficial con sesión de
transporte fija respaldada por httpx, TLS con política UJ_TLS_TRUST existente,
sin proxies de entorno/redirecciones, status200, ≤1MiB, timeouts2s y deadline
monotónico5s en lectura. Bajo I/O cooperativo, última lectura puede agotar hasta2s
adicionales; cache lock espera≤1s. DNS/event loop/runtime no cooperativos siguen
limitación de plataforma, no garantía física de terminación remota. Nada de120s.
Cache por proceso, max-age/Age respetados con cota1h, no-store/no-cache=0; no refresh
forzado por kid arbitrario. Falla cerrado503 sin bypass TLS ni claves alternativas.

Retención explícita37 añade intentos viejos y referencias a sesiones terminales
viejas ANTES de borrarlas; FK restrictiva, sin cascada de cuentas/conversaciones.
No limpieza automática/startup. No apply DEV ni cambios a PCs/plans/shares/cuotasLLM.

## Pruebas preparadas y selección Build (no ejecutadas aquí)

- `tests/test_google38_verifier.py`: crypto RSA real efímera+google-auth oficial,
  firma alterada/alg/aud/issuer/iat/exp/nonce/access/header/key URL; cache/TLS/fetch
  fijo/timeout/metadatos. Mock solo transporte de certificados PÚBLICOS sintéticos.
- `tests/test_google38_pg.py`: PG/HTTP sesión anónima/local, issuer canónico, no
  auto-link email, perfil nullable/local login, nonce replay/wrong session/Origin/
  CSRF/expiry, quota37 compartida, concurrencia de un intento con crypto real gated,
  rotación/cookie, payload cerrado y DBfail503 antes de verificador. Limpieza solo
  cuentas/filas sintéticas propias antes del teardown de actores.
  Incluye fallo FK/unique inducido DESPUÉS de crypto válida: rollback de identidad,
  usuario y revocación; conserva claim terminal sin autenticar ni escribir cookie.
- `tests/test_google38_migration.py`: esquema auth previo sintético aislado en TEST,
  upgrade conserva credenciales locales y downgrade no elimina Google-only.
- Build lock/sync, Alembic head por wrapper TEST, pytest focales y Ruff separados
  con códigos individuales. Regresiones justificadas CU01/auth/security37 (emisión
  y mantenimiento compartidos); no hardware/frontend/provider suites rutinarias.
  Desde backend: `.venv/Scripts/python.exe -m pytest -q tests/test_google38_verifier.py`;
  wrapper PG TEST selecciona `tests/test_google38_pg.py tests/test_google38_migration.py`.
  Si el head incorpora38_c del escritor retail, coordinar su gate antes de usar
  conftest head; no editar/omitir migraciones ajenas para simular aceptación B1.
- Selecciones desde backend, no root (helpers pytest). Sin callbacks reales Google
  para probar cuota/errores. Sin runner/DB/cache en memoria como prueba PG.

Google navegador REAL continúa pendiente de intervención humana/cuenta; ningún test
de RSA sintética ni botón prueba login Google/orígenes reales. No pedir contraseña/
códigos al modelo. Pendiente gate Build y revisión seguridad independiente B1.
Ofertas/retail/motor avanzan en ownership separado; no se declaran integrados aquí.

## Gate posterior Build/revisión (sin ejecución del autor)

Recheck Ruff check0/format20 archivos0 tras corrección del autor y wrapping mecánico
residual de Build. Test negativo HS256 con clave sintética larga:1 PASS/20 deselected0,
sin aviso de clave corta; no se suma como cobertura independiente a los21 anteriores.
Revisora de seguridad leyó código/pruebas: backend38B1 aceptable LOCALMENTE, sin
defecto bloqueante comprobado. Reservas de cobertura: TTL durante espera del lock de
subject y error de certificados seguido de replay no tienen contraste específico,
aunque el código los contempla. No pentest/Google externo/UI/integral38 aprobado.
