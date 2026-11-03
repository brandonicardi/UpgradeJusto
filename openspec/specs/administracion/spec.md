# administracion Specification

## Purpose

Permitir que una cuenta administradora cure el catálogo en borradores privados y
publique revisiones inmutables de componentes, precios, fuentes y soporte de CPU,
sin afectar snapshots ya guardados.

## Requirements

### Requirement: Autoridad de administrador resuelta en el servidor

El sistema SHALL exigir sesión válida y el rol `admin` leído de PostgreSQL en cada operación, sin aceptar rol ni identidad del cuerpo, la query o el modelo.

#### Scenario: Sin sesión, sin rol o rol inyectado

- **WHEN** se llama cualquier ruta de `/api/admin` sin sesión, con una cuenta sin rol admin o enviando `role: "admin"` o `user_id` en el cuerpo
- **THEN** responde 401 o 403 y esos valores no otorgan permisos

### Requirement: Borrador editable y publicado inmutable

El sistema SHALL crear con `POST /api/admin/revisions` un borrador que copia las filas de la revisión activa, y permitir listar, crear, editar y eliminar filas solo en revisiones `draft`.

#### Scenario: Creación exitosa

- **WHEN** el admin envía `base_version` igual a la revisión activa
- **THEN** responde 201 con `id`, `base_version` y `status: "draft"`

#### Scenario: Base obsoleta o revisión publicada

- **WHEN** `base_version` no es la activa, o se intenta editar, eliminar o republicar una revisión publicada
- **THEN** responde 409 y conserva la revisión; una fila o revisión inexistente responde 404

### Requirement: Colecciones cerradas y paginación

El sistema SHALL admitir solo las colecciones `components`, `prices`, `sources` y `cpu_support` bajo `/api/admin/revisions/{id}/{collection}`, y rechazar con 422 cualquier otra colección o un `limit`/`offset` fuera de rango; los listados devuelven `{items, total, limit, offset}` con `limit` de 1 a 100 (por defecto 25) y `offset` mayor o igual a cero.

#### Scenario: Listado paginado

- **WHEN** el admin consulta una colección con parámetros válidos
- **THEN** devuelve las filas de esa revisión, el total y los parámetros aplicados

### Requirement: Validación estricta de datos curados

El sistema SHALL validar cada fila con un DTO cerrado antes de guardarla y rechazar con 422 los campos extra o inválidos.

#### Scenario: Precio ARS

- **WHEN** se carga un precio
- **THEN** exige moneda `ARS`, importe decimal no negativo de hasta 12 dígitos enteros y 2 decimales, fecha y fuente; un precio desconocido no se representa como cero

#### Scenario: Fuente documentada

- **WHEN** se carga una fuente
- **THEN** exige URL HTTP(S) pública sin credenciales, fecha de consulta y localizador

#### Scenario: Componente

- **WHEN** se carga un componente
- **THEN** exige categoría válida, nombre de 1 a 200 caracteres, entre 1 y 30 fuentes públicas y solo atributos admitidos para su categoría; `installed_bios` se rechaza porque pertenece a la PC declarada

### Requirement: Soporte exacto de CPU

El sistema SHALL validar el soporte de CPU por par exacto CPU–placa, con modelo y revisión aplicable documentados y cada evidencia vinculada a una fuente de la revisión.

#### Scenario: Evidencia incompleta o par duplicado

- **WHEN** falta una observación documentada, la revisión no coincide, una evidencia no referencia una fuente cargada o se repite el mismo par
- **THEN** la publicación se rechaza con 422

### Requirement: Publicación atómica

El sistema SHALL publicar con `POST /api/admin/revisions/{id}/publish` y `expected_active_version` en una sola transacción que materializa todas las filas, crea el dataset y mueve el puntero activo.

#### Scenario: Publicación exitosa

- **WHEN** el borrador deriva de la revisión activa y todas las referencias son válidas
- **THEN** responde 200 con `dataset_version` y `status: "published"`

#### Scenario: Conflicto de puntero

- **WHEN** cambió la revisión activa o la base del borrador
- **THEN** responde 409 y conserva la revisión activa anterior

#### Scenario: Fallo de validación

- **WHEN** una referencia interna o un dato es inválido al publicar
- **THEN** responde 422 y no deja una publicación parcial

### Requirement: Snapshots previos intactos

El sistema SHALL servir el catálogo público desde la revisión recién publicada y conservar sin cambios los planes, enlaces y evaluaciones ya guardados con sus versiones anteriores.

#### Scenario: Lecturas posteriores

- **WHEN** se consulta el catálogo después de publicar, o se lee un plan o enlace creado antes
- **THEN** el catálogo usa la misma revisión activa y los snapshots previos mantienen sus versiones

### Requirement: Continuidad de evidencia retail

El sistema SHALL conservar la evidencia técnica de una pieza al publicar solo si mantiene identificador, categoría y nombre, todas las fuentes anteriores siguen presentes y las fuentes nuevas provienen del sobre técnico.

#### Scenario: Pieza sin cambios o identidad modificada

- **WHEN** se agrega una fuente técnica conservando las anteriores, o se quitan fuentes, se renombra la pieza o cambia su categoría
- **THEN** la evidencia se copia en el primer caso y no se reasigna ni reconcilia por parecido en el segundo

### Requirement: Designación local de administrador

El sistema SHALL otorgar el rol admin solo mediante el comando local explícito, con email de cuenta de prueba del proyecto y confirmación, sobre la base PostgreSQL de desarrollo o prueba.

#### Scenario: Designación válida

- **WHEN** se ejecuta el bootstrap con un email `@example.test` existente, la confirmación y el destino PostgreSQL de desarrollo o prueba exacto
- **THEN** agrega el rol admin a esa cuenta

#### Scenario: Destino o cuenta insegura

- **WHEN** falta la confirmación, el email no es del proyecto o el destino no es la base local esperada
- **THEN** se rechaza sin conectar ni otorgar el rol

### Requirement: Panel de administración

El sistema SHALL ofrecer un panel que lista las revisiones con estado y cuál está activa, permite editar las cuatro colecciones de un borrador y exige confirmación explícita antes de publicar.

#### Scenario: Edición y publicación desde el panel

- **WHEN** el admin guarda una fila de un borrador y luego confirma la publicación
- **THEN** el panel muestra la nueva revisión publicada y el error correspondiente si la operación falla
