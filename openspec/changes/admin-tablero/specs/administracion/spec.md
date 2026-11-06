## ADDED Requirements

### Requirement: Tablero de administración

El sistema SHALL ofrecer solo a administradores un tablero con la cantidad de piezas del catálogo activo, las que tienen datos faltantes, las que no tienen precio de los últimos 7 días y las tiendas con ofertas publicadas.

#### Scenario: Administrador consulta el tablero

- **WHEN** un administrador abre el tablero
- **THEN** recibe los cuatro valores calculados sobre la revisión activa, sin valores de ejemplo

#### Scenario: Persona sin rol

- **WHEN** una cuenta sin rol de administrador pide el tablero
- **THEN** el servidor responde 403 y no entrega datos

### Requirement: Piezas con datos faltantes

El sistema SHALL listar las piezas sin alguno de los atributos que el motor de compatibilidad usa para su categoría, indicando cuáles faltan y a cuántas PCs guardadas afecta cada una.

#### Scenario: Atributo desconocido

- **WHEN** una pieza tiene sin valor un atributo que el motor usa
- **THEN** aparece en la lista con ese atributo; un valor desconocido nunca se cuenta como cero

#### Scenario: Conteo sin dueños

- **WHEN** se informa a cuántas PCs afecta una pieza
- **THEN** se entrega solo el total de PCs distintas que la usan en cualquier revisión, sin identificar dueños ni PCs

### Requirement: Precios viejos

El sistema SHALL listar las piezas cuyo último precio tiene más de 7 días, con importe, tienda y fecha, de la más vieja a la más nueva.

#### Scenario: Precio vencido

- **WHEN** la oferta más reciente de una pieza tiene más de 7 días
- **THEN** aparece con su importe, su tienda, su fecha y los días transcurridos

### Requirement: Carga de un precio

El sistema SHALL permitir a un administrador publicar un precio de contado en ARS de una pieza con tienda, con importe positivo, fecha y enlace de esa tienda, generando una revisión nueva que solo cambia esa oferta.

#### Scenario: Publicación confirmada

- **WHEN** el administrador completa los datos y confirma
- **THEN** se publica una revisión nueva con ese precio, y conservan su contenido la foto, la oferta de lista de la pieza y el resto del catálogo

#### Scenario: Datos inválidos

- **WHEN** falta un campo, el importe no es positivo, la fecha es futura o tiene más de 30 días, o el enlace no es de la tienda de la pieza
- **THEN** el servidor responde 422 y no publica nada

#### Scenario: Revisión activa cambiada

- **WHEN** la revisión activa ya no es la que vio el administrador
- **THEN** el servidor responde 409 y no publica nada

#### Scenario: Pieza sin tienda

- **WHEN** la pieza no proviene de una tienda
- **THEN** el servidor responde 422 y no publica nada

### Requirement: Registro de precios cargados

El sistema SHALL registrar cada precio publicado a mano con la cuenta administradora, la fecha y hora, la pieza, el importe y la revisión generada.

#### Scenario: Precio publicado

- **WHEN** se publica un precio a mano
- **THEN** el registro se guarda en la misma transacción; si no se puede guardar, no se publica
