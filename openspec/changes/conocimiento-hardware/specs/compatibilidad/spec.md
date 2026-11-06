## ADDED Requirements

### Requirement: Identificación de piezas por nombre con fuente

El sistema SHALL identificar una pieza por el nombre publicado (CPU, placa base, memoria, placa de video, fuente o almacenamiento) y completar desde la tabla de conocimiento general solo los datos que el fabricante no informó, citando una fuente por cada dato.

#### Scenario: Procesador reconocido por nombre

- **WHEN** una CPU sin ficha completa se llama «Ryzen 5 5600» y su nombre identifica una generación con zócalo conocido
- **THEN** el zócalo y la generación se completan desde la tabla de plataformas, con una fuente `REF-*` por dato

#### Scenario: Pieza sin nombre reconocible

- **WHEN** una pieza no coincide con ninguna familia de las tablas
- **THEN** no se agrega ningún dato de referencia y los faltantes quedan desconocidos, nunca cero ni compatibles

### Requirement: Prioridad fabricante, referencia y desconocido

El sistema MUST aplicar el orden dato del fabricante, luego dato de referencia y por último desconocido. Un dato de referencia NO SHALL reemplazar un dato del fabricante ni resolver un campo que el fabricante dejó en conflicto.

#### Scenario: Fabricante gana sobre referencia

- **WHEN** la ficha de la pieza informa un zócalo y la tabla de referencia informa otro
- **THEN** el motor usa el dato del fabricante y el campo conflictivo no se completa con la referencia

#### Scenario: Campo vacío completado por referencia

- **WHEN** la ficha no informa la generación y la tabla de referencia sí la informa
- **THEN** el motor usa el dato de referencia y lo marca con su fuente

### Requirement: Nombre ambiguo o contradictorio sin hechos

El sistema SHALL devolver ningún dato de referencia cuando el nombre de la pieza es ambiguo o contradictorio: más de un chipset reconocido, un zócalo declarado distinto del de la tabla, una memoria nombrada que la placa no admite, o un modelo de placa de video de estación de trabajo.

#### Scenario: Placa con dos chipsets nombrados

- **WHEN** el nombre de una placa base menciona dos chipsets distintos
- **THEN** no se completa zócalo ni chipset y el veredicto queda en verificación, no en compatible

#### Scenario: Zócalo declarado distinto

- **WHEN** el nombre de la CPU declara un zócalo que no coincide con la generación identificada
- **THEN** no se completa ningún dato y el resultado no cambia por la referencia

### Requirement: Rotulado de datos de referencia

El sistema MUST rotular toda evaluación que dependa de datos de referencia como «según datos de referencia» y MUST NOT presentarla como verificada con la ficha del modelo exacto.

#### Scenario: Veredicto con referencia

- **WHEN** un veredicto de compatibilidad usa al menos un dato de referencia
- **THEN** la interfaz muestra el rótulo «según datos de referencia» junto al dato y su fuente

#### Scenario: Veredicto sin referencia

- **WHEN** todos los datos provienen del fabricante
- **THEN** el rótulo no aparece

### Requirement: Avisos de lo que varía por modelo

El sistema SHALL mostrar como aviso «Chequeá…» los puntos que varían por modelo exacto (conectores de la placa de video, espacio en el gabinete, lugar para discos, ranuras de memoria) sin que esos avisos bloqueen ni cambien el veredicto por sí mismos. Una incompatibilidad real SHALL dominar sobre cualquier aviso.

#### Scenario: Aviso sin bloqueo

- **WHEN** una PC encaja en todas las comprobaciones y un punto depende del modelo exacto
- **THEN** el veredicto es `compatible` con el aviso «Chequeá…» visible

#### Scenario: Incompatibilidad con aviso

- **WHEN** una comprobación falla y además hay avisos pendientes
- **THEN** el veredicto es `incompatible` y los avisos se muestran como información adicional
