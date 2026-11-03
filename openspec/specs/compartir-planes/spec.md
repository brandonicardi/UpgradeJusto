# compartir-planes Specification

## Purpose

Publicar una revisión congelada de un plan como enlace público de solo lectura,
con una proyección que excluye los datos privados del dueño, y permitir al dueño
listar y revocar sus enlaces.

## Requirements

### Requirement: Publicación de una revisión congelada
El sistema SHALL crear una publicación a partir de la revisión indicada del plan propio y guardar en ella una copia del plan proyectada, sin modificar el plan.

#### Scenario: Publicación exitosa
- **WHEN** el dueño publica con `expected_plan_revision` igual a la revisión vigente y un título válido
- **THEN** responde 201 con `id`, `plan_revision`, `title`, `created_at` y `path` con forma `/shared/<token>`

#### Scenario: Revisión desactualizada
- **WHEN** `expected_plan_revision` no coincide con la revisión del plan
- **THEN** responde 409 y no crea la publicación

### Requirement: Token bearer generado por el servidor
El sistema SHALL generar un token aleatorio de 32 bytes en base64url (43 caracteres) y persistir solo su digest SHA-256; el valor en claro aparece únicamente en la respuesta de creación.

#### Scenario: Digest persistido
- **WHEN** se crea una publicación
- **THEN** la base guarda solo el digest y el listado de enlaces no devuelve token, ruta ni digest

#### Scenario: Autoridad rechazada en el cuerpo
- **WHEN** el cliente envía `owner_id`, `token` o `snapshot` en el cuerpo de publicación
- **THEN** responde 422

### Requirement: Aislamiento por dueño
El sistema SHALL resolver la propiedad del plan en el servidor y responder 404 cuando el plan no existe o pertenece a otra cuenta, tanto para publicar como para listar y revocar.

#### Scenario: Operación sobre plan ajeno
- **WHEN** otra cuenta intenta publicar, listar o revocar enlaces de un plan ajeno, o el dueño revoca un enlace inexistente o de otro plan
- **THEN** responde 404 sin revelar si el plan o el enlace existen

### Requirement: Contenido público por allowlist
El sistema SHALL construir el snapshot público con listas explícitas de campos, de modo que no se publiquen cuenta, email, `owner_id`, `pc_id`, `plan_id` privado, notas libres ni conversación.

#### Scenario: Datos privados en cualquier nivel
- **WHEN** el plan guarda notas privadas o texto libre en campos anidados
- **THEN** la lectura pública no contiene esos valores ni claves privadas

#### Scenario: Citas o precios no verificables
- **WHEN** una cita o un precio no coincide con el catálogo publicado
- **THEN** se omite y el total queda como desconocido con el faltante declarado

### Requirement: Estado técnico sin mejora ficticia
El sistema SHALL conservar el veredicto, la cobertura, las reglas, los faltantes y las advertencias de la revisión publicada, sin convertir un borrador bloqueado o desconocido en compatible ni afirmar mejoras sin evidencia.

#### Scenario: Borrador bloqueado
- **WHEN** se publica una revisión en estado `blocked` o sin beneficio respaldado
- **THEN** la lectura pública muestra el estado real y las advertencias, sin afirmar una mejora

### Requirement: Lectura pública anónima
El sistema SHALL permitir leer un enlace activo sin sesión ni CSRF, devolviendo el snapshot congelado con la fecha de publicación y la revisión.

#### Scenario: Visitante anónimo
- **WHEN** un visitante sin sesión lee un token activo
- **THEN** responde 200 con el contenido publicado

#### Scenario: Respuestas sin caché ni indexación
- **WHEN** se sirve un enlace o un error público
- **THEN** incluye `Cache-Control: no-store`, `Referrer-Policy: no-referrer` y `X-Robots-Tag: noindex, nofollow`

#### Scenario: Método no permitido
- **WHEN** se usa un método distinto de GET sobre la ruta pública
- **THEN** responde 405 y no modifica datos

### Requirement: Página pública de solo lectura
El sistema SHALL servir la página del enlace como HTML de solo lectura, sin acciones mutantes ni recursos de terceros y sin incluir el token en el título.

#### Scenario: Apertura del enlace en el navegador
- **WHEN** un visitante abre `/shared/{token}`
- **THEN** ve el contenido congelado, las advertencias y ningún control para editar, publicar o revocar

### Requirement: Contenido congelado
El sistema SHALL servir siempre el snapshot guardado en la publicación, sin recalcular compatibilidad, precios ni contenido desde el plan actual.

#### Scenario: Edición posterior del plan
- **WHEN** el plan se edita o recalcula después de publicar
- **THEN** la lectura del enlace devuelve el mismo contenido que al publicar

#### Scenario: Nueva revisión publicada
- **WHEN** se publica otra revisión del mismo plan
- **THEN** se crea un enlace con token distinto y la publicación anterior no cambia

### Requirement: Revocación
El sistema SHALL revocar un enlace del dueño de forma atómica e idempotente y denegar las lecturas posteriores.

#### Scenario: Revocación exitosa
- **WHEN** el dueño revoca un enlace activo, incluso si repite la operación
- **THEN** responde 204 y la siguiente lectura pública responde 404

#### Scenario: Plan eliminado
- **WHEN** se elimina el plan que originó la publicación
- **THEN** sus enlaces dejan de ser legibles y responden 404

### Requirement: Errores públicos indistinguibles
El sistema SHALL responder 404 con el mismo cuerpo para token inválido, inexistente, revocado o de plan eliminado, y 503 sin servir contenido cacheado si la base no está disponible.

#### Scenario: Token inválido o revocado
- **WHEN** el token no tiene el formato esperado o ya fue revocado
- **THEN** responde 404 con el cuerpo `{"detail": "Shared plan not found"}`

#### Scenario: Base no disponible
- **WHEN** la base falla durante una lectura pública
- **THEN** responde 503 y no devuelve un snapshot cacheado

### Requirement: Límites de publicación y lectura de torre
El sistema SHALL exigir confirmación explícita y título controlado al publicar planes de torre, limitar a 100 las publicaciones por plan y a 60 las lecturas públicas por minuto e IP.

#### Scenario: Confirmación o título inválidos
- **WHEN** falta `public_projection_confirmed: true` o el título no es uno de los dos admitidos
- **THEN** responde 422

#### Scenario: Límite de publicaciones
- **WHEN** el plan alcanza 100 publicaciones
- **THEN** responde 409 y no crea otra

#### Scenario: Límite de lecturas
- **WHEN** una IP supera 60 lecturas públicas en un minuto
- **THEN** responde 429 con `Retry-After`
