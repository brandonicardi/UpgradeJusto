# catalogo Specification

## Purpose

Publicar un catálogo curado de componentes de solo lectura con filtros, ficha,
precios históricos y evidencia de fotos y ofertas.

## Requirements

### Requirement: Listado paginado
El sistema SHALL devolver componentes publicados sin autenticación, con `dataset_version`, `total`, `page` y `page_size`, página entre 1 y 10000 y tamaño entre 1 y 50.

#### Scenario: Consulta por defecto
- **WHEN** se pide `GET /api/catalog/components` sin parámetros
- **THEN** responde 200 con página 1, 12 elementos y el total del catálogo

#### Scenario: Página fuera del conjunto o límites inválidos
- **WHEN** se pide una página posterior al total o valores fuera de rango
- **THEN** responde 200 con `items` vacío y el total intacto, o 422 si el parámetro es inválido

### Requirement: Filtros combinados y categorías cerradas
El sistema SHALL filtrar por categoría y por texto en el nombre con AND antes de paginar, aceptar solo las nueve categorías de torre y devolver `items` vacío con `total: 0` cuando no hay coincidencias.

#### Scenario: Búsqueda por nombre
- **WHEN** se envía `q` con espacios extremos y distinta capitalización
- **THEN** busca como subcadena sin distinguir mayúsculas después de recortar; vacío o solo espacios no filtra

#### Scenario: Categoría válida o desconocida
- **WHEN** se filtra por `cpu`, `motherboard`, `ram`, `gpu`, `psu`, `case`, `storage`, `cooler` o `fan`
- **THEN** devuelve solo esa categoría; una categoría fuera del enum o con otra capitalización responde 422

### Requirement: Orden de presentación
El sistema SHALL ordenar por `id` por defecto y aceptar `sort=retail_first`, que agrupa primero las piezas con foto verificada y precio ARS, luego con precio, luego con foto y al final el resto.

#### Scenario: Orden comercial
- **WHEN** se pide `sort=retail_first`
- **THEN** ordena por esos grupos, desempata por `id` y conserva el orden entre páginas sin alterar precios, fechas, stock ni evidencias

#### Scenario: Orden inválido
- **WHEN** `sort` no es `id` ni `retail_first`
- **THEN** responde 422 y el orden por `id` sigue disponible

### Requirement: Ficha por identificador
El sistema SHALL resolver cualquier componente publicado por su ID, aunque no esté en la primera página, y devolver el mismo objeto que en el listado.

#### Scenario: Detalle existente
- **WHEN** se pide `GET /api/catalog/components/{id}` de un componente publicado
- **THEN** responde 200 con el objeto sin envoltorio adicional

#### Scenario: Detalle inexistente
- **WHEN** el ID no existe
- **THEN** responde 404 con `{"detail": "Component not found"}`

### Requirement: Atributos y fuentes documentadas
El sistema SHALL devolver atributos como texto o null, null para lo desconocido, y fuentes `{id,url}` HTTPS documentadas, sin inferir valores desde nombres comerciales.

#### Scenario: Dato desconocido
- **WHEN** un atributo no está documentado
- **THEN** se devuelve null y no cero, `false` ni un valor deducido

### Requirement: Precios históricos con procedencia
El sistema SHALL devolver precios como `{amount,currency,date,source}` con importe decimal positivo en texto, moneda, fecha ISO y procedencia, presentados como históricos y no como oferta vigente.

#### Scenario: Precio documentado
- **WHEN** el componente tiene precios históricos
- **THEN** cada uno conserva importe, moneda, fecha y fuente sin recalcularse

#### Scenario: Precio desconocido
- **WHEN** no hay precio documentado
- **THEN** `prices` es una lista vacía, nunca un precio cero

### Requirement: Fotos verificadas
El sistema SHALL exponer `image` solo cuando existe evidencia verificada de variante exacta con URL permitida y devolver null en cualquier otro caso.

#### Scenario: Foto publicada
- **WHEN** la publicación tiene evidencia `verified` con `exact_variant: true` y URL
- **THEN** `image` contiene esa URL e `image_evidence` conserva fuente, fecha, derechos y estado

#### Scenario: Evidencia ausente o dudosa
- **WHEN** no hay evidencia, está en cuarentena, no es la variante exacta o la URL no pertenece al host permitido
- **THEN** `image` es null y la web muestra una ilustración de categoría identificada como no fotográfica

### Requirement: Ofertas con frescura y stock
El sistema SHALL devolver ofertas en ARS con condición `cash` o `list`, disponibilidad y estado `fresh`, `stale` o `unavailable`, recalculado al leer con vencimiento de 24 horas.

#### Scenario: Oferta vigente
- **WHEN** el importe existe y la observación está dentro de las 24 horas
- **THEN** la oferta se devuelve `fresh` con su fuente y fecha de vencimiento

#### Scenario: Oferta vencida o sin importe
- **WHEN** pasó el vencimiento o el importe es null
- **THEN** se devuelve `stale` o `unavailable` y no se presenta como precio vigente ni cero

#### Scenario: Stock desconocido
- **WHEN** la disponibilidad no está confirmada
- **THEN** se conserva `unknown` y no se supone disponible

### Requirement: Solo lectura y fallos sin respaldo
El sistema SHALL exponer el catálogo sin escrituras ni autenticación, de forma inmutable por lectura, y responder 503 si la publicación no está disponible, sin usar el dataset en memoria como respaldo.

#### Scenario: Método no permitido
- **WHEN** se intenta POST o DELETE sobre el catálogo
- **THEN** responde 405 y no modifica datos

#### Scenario: Base no disponible
- **WHEN** falta la publicación activa o falla PostgreSQL
- **THEN** responde 503 con `{"detail": "Service unavailable"}`

### Requirement: Interfaz de catálogo
El sistema SHALL ofrecer listado, filtros, paginación, selector de orden y ficha con procedencia, precios históricos y estados vacíos accesibles.

#### Scenario: Navegación
- **WHEN** la persona elige una categoría, un orden o una página
- **THEN** la URL conserva esos parámetros y el resultado corresponde a la API

#### Scenario: Ficha
- **WHEN** se abre el detalle de un componente
- **THEN** muestra fuentes, precios históricos, foto o su ausencia y advertencias de datos contradictorios
