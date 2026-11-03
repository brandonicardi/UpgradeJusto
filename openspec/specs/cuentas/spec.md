# cuentas Specification

## Purpose

Permitir cuentas con email y contraseña o con Google, mantener sesiones revocables
y proteger las mutaciones con CSRF, Origin y límites de intentos.

## Requirements

### Requirement: Registro local
El sistema SHALL validar un email ASCII normalizado a minúsculas y una contraseña de 12 a 128 caracteres, crear la cuenta y devolver solo el usuario público sin iniciar sesión.

#### Scenario: Registro válido
- **WHEN** se envía un email y una contraseña que cumplen la política
- **THEN** responde 201 con `{id,email}` y sin cookie de sesión autenticada

#### Scenario: Email ocupado o entrada inválida
- **WHEN** el email ya existe, la contraseña es inválida o el cuerpo incluye `user_id` o `role`
- **THEN** responde 409 para el email ocupado y 422 para el resto, sin repetir la contraseña

### Requirement: Login local
El sistema SHALL verificar la contraseña contra el hash guardado, rotar la sesión y entregar una cookie autenticada.

#### Scenario: Credenciales válidas
- **WHEN** email y contraseña coinciden
- **THEN** responde 200 con `{id,email}`, Set-Cookie `uj_session` y revoca el token anterior

#### Scenario: Credenciales inválidas
- **WHEN** la cuenta no existe, no tiene contraseña local o la contraseña es incorrecta
- **THEN** responde 401 con `{"detail": "Invalid credentials"}` sin distinguir el caso

### Requirement: Sesión, cookie y cierre
El sistema SHALL conservar solo el digest del token, emitir `uj_session` HttpOnly, SameSite=Lax y Path=/api con Secure fuera del loopback explícito, y revocar en el servidor al cerrar.

#### Scenario: Sesión vigente o inválida
- **WHEN** se consulta `GET /api/auth/session` con una cookie válida, anónima, vencida o revocada
- **THEN** responde 200 con el usuario público solo si está autenticada, y 401 en los demás casos

#### Scenario: Logout
- **WHEN** se cierra una sesión válida, incluso anónima, con CSRF y Origin correctos
- **THEN** responde 204, revoca esa sesión y expira la cookie sin afectar otras sesiones

### Requirement: CSRF y validación de Origin
El sistema SHALL entregar un token CSRF ligado a la sesión, mantenerlo estable y exigir cookie, `X-CSRF-Token` y un Origin exacto en todo POST de autenticación.

#### Scenario: Token u origen inválido
- **WHEN** falta el token, no coincide o el Origin es nulo o distinto del configurado
- **THEN** responde 403 con `{"detail": "Forbidden"}`

#### Scenario: Emisión del token
- **WHEN** se pide `GET /api/auth/csrf` sin sesión válida y con Origin propio o ausente
- **THEN** crea una sesión anónima y devuelve el token; un Origin ajeno responde 403

### Requirement: Límites de intentos
El sistema SHALL contar 5 intentos por email y 20 por IP cada 15 minutos en almacenamiento compartido, y limitar a 2 los hashes simultáneos por proceso.

#### Scenario: Límite o saturación
- **WHEN** se supera el límite por email o IP, o llega un tercer hash concurrente
- **THEN** responde 429 con `{"detail": "Too many requests"}` y `Retry-After`

#### Scenario: Fallo de la base
- **WHEN** PostgreSQL falla durante el conteo o la sesión
- **THEN** responde 503 genérico, sin omitir el límite ni usar un contador en memoria

### Requirement: IP de cliente firmada
El sistema SHALL usar la IP del socket o la IP declarada por un proxy loopback confiable con firma HMAC y timestamp acotado, y descartar headers falsificados.

#### Scenario: Firma válida
- **WHEN** el gateway loopback configurado firma método, ruta, IP y timestamp
- **THEN** el límite por IP usa esa IP normalizada

#### Scenario: Firma o peer inválidos
- **WHEN** los headers están incompletos, el peer no es confiable, la firma falla o el timestamp venció
- **THEN** responde 403 y no adopta la IP declarada

### Requirement: Inicio de sesión con Google
El sistema SHALL exponer si Google está habilitado y emitir intentos de un solo uso, con nonce ligado a la sesión y al Origin y vencimiento a 5 minutos.

#### Scenario: Configuración pública
- **WHEN** se consulta `GET /api/auth/google/config`
- **THEN** responde `{enabled,client_id}` sin secretos y con `enabled=false` si no hay client ID

#### Scenario: Emisión de intento
- **WHEN** una sesión anónima con CSRF pide `POST /api/auth/google/attempts`
- **THEN** devuelve `attempt_id`, `nonce` y `expires_at`, guarda solo el hash del nonce y aplica la cuota por IP

### Requirement: Verificación del ID token
El sistema SHALL verificar firma, algoritmo, issuer, audience, `iat`/`exp`, tipo de token y nonce antes de crear la identidad y rotar la sesión de forma atómica.

#### Scenario: Token válido
- **WHEN** el credential es un ID token válido con el nonce del intento
- **THEN** responde 200 con el usuario público, cookie rotada e intento consumido

#### Scenario: Token inválido, repetido o verificador caído
- **WHEN** la firma, el emisor, la audiencia, el tiempo o el nonce no son válidos, el intento se repite o no hay certificados
- **THEN** responde 401, 409 o 503 según el caso, sin crear ni modificar la cuenta

### Requirement: Identidad externa sin auto-vinculación
El sistema SHALL identificar las cuentas de Google por `(issuer,sub)`, reutilizar esa identidad en cada login y no vincular cuentas por email; una cuenta solo-Google conserva email local y contraseña nulos.

#### Scenario: Mismo email que una cuenta local
- **WHEN** un ID token trae un email ya registrado localmente
- **THEN** crea una cuenta Google separada y el login local sigue funcionando

#### Scenario: Identidad externa ya vinculada o en conflicto
- **WHEN** el mismo `(issuer,sub)` vuelve a iniciar sesión, o apunta a una cuenta con email o contraseña local
- **THEN** reutiliza la cuenta en el primer caso y responde 409 sin fusionar en el segundo

### Requirement: Permisos y errores seguros
El sistema SHALL resolver el usuario y el rol desde la sesión y la base, nunca desde el cuerpo o la query, y responder errores sanitizados con `Cache-Control: no-store`.

#### Scenario: Ruta de administración sin rol
- **WHEN** una cuenta sin rol administrador llama a `/api/admin/...`
- **THEN** responde 403 con `{"detail": "Administrator required"}`

#### Scenario: Fallo interno
- **WHEN** falta configuración, falla la base o se agota un límite
- **THEN** responde 503, 422 o 429 con un `detail` genérico, sin SQL, cookies ni tokens
