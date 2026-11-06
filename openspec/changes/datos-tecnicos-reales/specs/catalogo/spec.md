## ADDED Requirements

### Requirement: Hechos de fabricante en piezas de tienda

El sistema SHALL publicar hechos técnicos en piezas de tienda solo si cada hecho tiene URL del fabricante, fecha de consulta y ubicación, y el MPN de la pieza coincide exactamente con el de la fuente.

#### Scenario: Identidad exacta

- **WHEN** el MPN del archivo coincide con el de la pieza publicada
- **THEN** sus hechos se publican con su procedencia en una revisión nueva, y su foto y sus ofertas no cambian

#### Scenario: Identidad distinta

- **WHEN** el MPN difiere, falta o la pieza no existe
- **THEN** la publicación se rechaza completa y no se crea ninguna revisión

#### Scenario: Dato sin publicar

- **WHEN** el fabricante no publica un valor
- **THEN** el atributo queda desconocido; nunca se completa con cero, falso ni un valor derivado

### Requirement: Publicación repetible

El sistema SHALL dejar el catálogo igual si se vuelve a publicar el mismo archivo.

#### Scenario: Segunda corrida

- **WHEN** se publica dos veces el mismo archivo
- **THEN** la segunda corrida informa que no hubo cambios y la revisión activa no cambia

### Requirement: Veredicto real con piezas de tienda

El sistema SHALL llegar a un veredicto `incompatible` con piezas de tienda cuando sus hechos publicados chocan.

#### Scenario: Memoria de otro tipo

- **WHEN** se evalúa una PC con una placa DDR4 y una memoria DDR5 con hechos publicados
- **THEN** el motor responde `incompatible` aunque falten otros datos
