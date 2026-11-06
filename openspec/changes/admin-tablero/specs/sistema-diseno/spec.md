## MODIFIED Requirements

### Requirement: Curación con presentación de datos existentes
El sistema SHALL presentar `/admin` con el tablero, las listas y el formulario de `PantallaAdmin`, y debajo el listado y editor de borrador, conservando las cuatro colecciones y las confirmaciones actuales.

#### Scenario: Borrador y publicación
- **WHEN** se elige un borrador y se guarda una fila
- **THEN** se distingue Guardado en borrador de Publicado y sigue disponible la publicación explícita de la versión completa

#### Scenario: Datos del tablero
- **WHEN** se abre administración
- **THEN** las métricas, las PCs afectadas y los precios viejos salen de la API; si el pedido falla se informa el error y no se muestran números

#### Scenario: Publicar precio
- **WHEN** el administrador completa «Cargar un precio»
- **THEN** ve un resumen y publica solo después de confirmar
