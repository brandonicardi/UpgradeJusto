# pcs Specification

## Purpose

Guardar configuraciones de PC por propietario, con revisión optimista, seis categorías
históricas y torres versionadas de nueve categorías.

## Requirements

### Requirement: Propiedad resuelta en el servidor
El sistema SHALL listar, leer, modificar y borrar solo PCs del usuario autenticado, responder 404 cuando la PC no existe o es ajena y rechazar cualquier autoridad enviada por el cliente.

#### Scenario: Acceso a PC ajena
- **WHEN** otra cuenta intenta leer, actualizar o borrar una PC
- **THEN** responde 404 con `{"detail": "PC not found"}` sin revelar existencia ni propietario

#### Scenario: Autoridad inyectada o sin sesión
- **WHEN** el cuerpo incluye `owner_id`, `user_id` o `role`, o falta la sesión autenticada
- **THEN** responde 422 o 401 respectivamente, sin cambiar la propiedad

### Requirement: CRUD con revisión optimista
El sistema SHALL crear PCs con revisión 1 e incrementarla en cada PUT correcto, rechazando revisiones desactualizadas sin escritura parcial.

#### Scenario: Creación y actualización
- **WHEN** se crea una PC válida y luego se actualiza con la revisión vigente
- **THEN** responde 201 con revisión 1 y 200 con la revisión incrementada, reemplazando todos los componentes

#### Scenario: Conflicto de revisión
- **WHEN** la revisión enviada no coincide con la guardada
- **THEN** responde 409 con `{"detail": "PC revision conflict"}` sin cambios parciales

### Requirement: Configuración de seis categorías
El sistema SHALL aceptar hasta un grupo por categoría `cpu`, `motherboard`, `ram`, `gpu`, `psu` y `case`, con cantidades enteras y piezas existentes del catálogo.

#### Scenario: Cantidades válidas
- **WHEN** se envía cantidad 1 para las categorías simples o de 1 a 8 para RAM
- **THEN** guarda el grupo con esa cantidad explícita

#### Scenario: Cantidad o pieza inválida
- **WHEN** la cantidad no es entera o está fuera de rango, la pieza no existe o su categoría no coincide
- **THEN** responde 422 sin guardar la PC

### Requirement: Contexto declarado
El sistema SHALL exigir exactamente `bios_version` y `notes`, ambos texto o null, con límites de 100 y 1000 caracteres y sin aceptar propiedades adicionales.

#### Scenario: Desconocido explícito
- **WHEN** un campo llega en null
- **THEN** se guarda y devuelve null, nunca cero ni cadena vacía

#### Scenario: Texto o propiedad inválida
- **WHEN** un texto excede el límite, contiene NUL o se agrega otra propiedad
- **THEN** responde 422

### Requirement: Listado paginado
El sistema SHALL listar las PCs propias ordenadas de forma estable por `id`, con página entre 1 y 10000 y tamaño entre 1 y 50.

#### Scenario: Página fuera del conjunto
- **WHEN** se pide una página posterior al total
- **THEN** responde 200 con `items` vacío y conserva `total`, `page` y `page_size`

#### Scenario: Parámetros fuera de rango
- **WHEN** `page` o `page_size` están fuera de rango
- **THEN** responde 422

### Requirement: Torre versionada de nueve categorías
El sistema SHALL guardar torres `schema_version: 2` con estado explícito para cada una de las nueve categorías, líneas solo en categorías `present` y UUID de línea asignado por el servidor.

#### Scenario: Estados completos
- **WHEN** se envía `category_status` con exactamente las nueve claves y valores `present`, `unknown` o `absent`
- **THEN** responde 201 y conserva cada estado

#### Scenario: Estado y líneas incoherentes
- **WHEN** una categoría `present` no tiene líneas, `unknown` o `absent` tiene líneas, o faltan claves
- **THEN** responde 422

### Requirement: Límites de líneas y selección
El sistema SHALL admitir hasta 36 líneas, exigir exactamente una identificación por línea, aplicar los topes por categoría y rechazar `line_id` ajenos o de otra categoría.

#### Scenario: Topes por categoría
- **WHEN** se envían más de 4 grupos o 16 módulos de RAM, más de 16 discos, más de 8 grupos o 32 ventilaciones, o más de una línea en una categoría simple
- **THEN** responde 422

#### Scenario: Selección exclusiva
- **WHEN** una línea tiene a la vez `component_id` y `declared_model`, o ninguno, o el modelo declarado excede 200 caracteres
- **THEN** responde 422

### Requirement: Lectura adaptada de PCs históricas
El sistema SHALL leer una PC histórica como torre `origin_schema: 1` con UUID de línea deterministas y categorías faltantes en `unknown`, sin escribir por leer y guardando la torre v2 en el primer PUT explícito.

#### Scenario: Adaptación sin escritura
- **WHEN** se consulta una PC guardada con las seis categorías históricas
- **THEN** responde una torre con las líneas existentes y `unknown` en las faltantes

#### Scenario: API histórica sobre una torre
- **WHEN** se intenta leer, editar o borrar una torre v2 por `/api/pcs/{id}`
- **THEN** responde 409 con `{"detail": "Tower configuration requires tower API"}`

### Requirement: Mutaciones protegidas y fallos seguros
El sistema SHALL exigir CSRF y Origin exacto en POST, PUT y DELETE, validar el UUID de ruta y responder 503 si la base no está disponible.

#### Scenario: CSRF u Origin inválidos
- **WHEN** falta el token CSRF o el Origin no coincide
- **THEN** responde 403 sin modificar la PC

#### Scenario: UUID o catálogo desactualizado
- **WHEN** el identificador de ruta no es un UUID válido o la revisión publicada del catálogo cambió
- **THEN** responde 422 o 409 respectivamente, sin guardar selecciones sobre datos desactualizados

### Requirement: Gestión de PCs en la interfaz
El sistema SHALL ofrecer lista, detalle y editor de torres con estados desconocidos visibles, confirmación de borrado y sin presentar la configuración como compatible.

#### Scenario: Edición de estados y borrado
- **WHEN** la persona marca una categoría como `unknown` o `absent` con líneas cargadas, o elige borrar la PC
- **THEN** la interfaz exige quitar esas líneas en el primer caso y confirma el DELETE antes de enviarlo en el segundo

#### Scenario: Guardado
- **WHEN** se guarda una PC
- **THEN** la interfaz informa que no se evaluó compatibilidad
