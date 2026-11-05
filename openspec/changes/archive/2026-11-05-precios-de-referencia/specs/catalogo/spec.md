# Spec Delta

## ADDED Requirements

### Requirement: Renovación acotada de precios de referencia
El sistema SHALL renovar los precios de referencia solo mediante lectores explícitos y acotados de tiendas aprobadas, conservando la fecha real de cada observación y sin descartar el lote anterior si una lectura falla.

#### Scenario: Una tienda no responde
- **WHEN** falla la lectura de una tienda
- **THEN** el lote anterior de esa tienda se conserva con su fecha original

#### Scenario: Reimportar un lote
- **WHEN** se importa un lote ya importado
- **THEN** no se agregan ofertas duplicadas

### Requirement: Validez de un precio de referencia
El sistema SHALL considerar vigente un precio de referencia durante 30 días desde su observación. Un precio vencido SHALL tratarse como desconocido, nunca como cero.

#### Scenario: Precio dentro de la validez
- **WHEN** una oferta se observó hace 29 días
- **THEN** cuenta para el costo y se muestra con su fecha real

#### Scenario: Precio vencido
- **WHEN** una oferta se observó hace 31 días
- **THEN** el costo queda desconocido y la pantalla muestra «Sin precio»

### Requirement: Precio de referencia con su fuente
El sistema SHALL mostrar un precio de referencia solo con moneda, fecha y tienda. Si falta alguno de esos datos, SHALL mostrar «Sin precio».

#### Scenario: Oferta sin fecha
- **WHEN** una oferta no tiene fecha de observación
- **THEN** la pantalla muestra «Sin precio»

## MODIFIED Requirements

### Requirement: Ofertas con frescura y stock
El sistema SHALL devolver ofertas en ARS con condición `cash` o `list`, disponibilidad y estado `fresh`, `stale` o `unavailable`, recalculado al leer con vencimiento de 30 días.

#### Scenario: Oferta vigente
- **WHEN** el importe existe y la observación está dentro de los 30 días
- **THEN** la oferta se devuelve `fresh` con su fuente y fecha de vencimiento

#### Scenario: Oferta vencida o sin importe
- **WHEN** pasó el vencimiento o el importe es null
- **THEN** se devuelve `stale` o `unavailable` y no se presenta como precio vigente ni cero

#### Scenario: Stock desconocido
- **WHEN** la disponibilidad no está confirmada
- **THEN** se conserva `unknown` y no se supone disponible
