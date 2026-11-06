## ADDED Requirements

### Requirement: Catálogo con PC elegida y solo mejoras

El sistema SHALL permitir consultar el catálogo con una PC elegida y un modo estricto que devuelva únicamente piezas que encajen al reemplazar su categoría y que sean una mejora con evidencia publicada para el objetivo relevante. La propiedad de la PC SHALL resolverse en el servidor. Sin PC, la consulta general del catálogo SHALL seguir disponible.

#### Scenario: Pieza que no encaja
- **WHEN** una pieza candidata hace que el motor determinístico devuelva `incompatible` al reemplazar su categoría
- **THEN** no aparece en el modo estricto y no se etiqueta como «Encaja»

#### Scenario: Dato desconocido
- **WHEN** el motor devuelve `requiere_verificacion` por falta de un dato
- **THEN** la pieza no se presenta como «Encaja» ni como mejora; se explica qué falta y no se mezcla con las incompatibles

#### Scenario: Misma pieza o equivalente
- **WHEN** la candidata es la misma pieza instalada o una alternativa sin evidencia publicada de mejora
- **THEN** no aparece como mejora aunque el reemplazo sea técnicamente compatible

#### Scenario: Mejora con evidencia
- **WHEN** existe evidencia publicada y curada de mejora para el objetivo relevante
- **THEN** la pieza puede aparecer como mejora, sin inventar FPS, ranking ni rendimiento garantizado

#### Scenario: Espacio físico no evaluado
- **WHEN** el espacio físico de la GPU o del gabinete no se evaluó por falta de medidas
- **THEN** se muestra «Chequeá que entre en tu gabinete» y no se usa ese silencio como prueba de encaje

#### Scenario: Cambio de PC o sin PC
- **WHEN** la persona cambia de PC o quita la selección
- **THEN** se descartan las respuestas de la PC anterior y la consulta general sigue funcionando sin filtro estricto
