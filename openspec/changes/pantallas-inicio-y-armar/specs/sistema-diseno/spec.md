# Spec Delta

## ADDED Requirements

### Requirement: Inicio organizado por caminos existentes
El sistema SHALL presentar en `/` la promesa principal y los caminos de ayuda, carga manual, lista y armado desde cero con la jerarquía de `PantallaInicio`.

#### Scenario: Elección de camino
- **WHEN** se recorre inicio con teclado
- **THEN** se puede abrir la guía con foco en su contenido, ir a `/pcs`, `/pcs/import` o `/build`, sin crear una PC ni enviar una extracción

#### Scenario: Sin catálogo disponible
- **WHEN** no se puede cargar la pieza real destacada
- **THEN** su zona muestra el estado sin datos y acceso al catálogo, mientras los caminos de entrada siguen disponibles

### Requirement: Criterios del armado manual
El sistema SHALL mostrar los criterios existentes de `/build` como bloque previo a las piezas, distinguiendo objetivo, presupuesto opcional y condición de precio.

#### Scenario: Opciones soportadas
- **WHEN** se elige un objetivo de armado
- **THEN** se conserva la elección entre uso general, juegos y productividad; productividad mantiene el selector de trabajo existente y no aparece una cuarta capacidad de edición audiovisual

#### Scenario: Monto preciso
- **WHEN** se ingresa un presupuesto decimal admitido o se deja vacío
- **THEN** se conserva ese valor sin redondearlo ni sustituirlo por un atajo de la maqueta

### Requirement: Inventario del armado propuesto
El sistema SHALL ordenar las nueve categorías de `/build` en una lista de compras seleccionables con resumen lateral según `PantallaArmar`, identificando la selección como manual y por comprar.

#### Scenario: Armado vacío
- **WHEN** se abre `/build` sin elegir piezas
- **THEN** las nueve categorías muestran su estado sin elegir y no aparece una PC automática, un total de armado confirmado ni compatibilidad evaluada

#### Scenario: Modificar selección
- **WHEN** se agrega o quita una compra
- **THEN** siguen visibles la cantidad explícita, cotización elegida o pendiente y el consentimiento de guardado vuelve a requerirse

### Requirement: Composición adaptable de inicio y armado
El sistema SHALL apilar los bloques de inicio y armado en móvil conservando el acceso a sus controles y ayudas.

#### Scenario: Dos tamaños de pantalla
- **WHEN** se recorren `/` y `/build` a 1440 y 390 píxeles
- **THEN** a 1440 el armado tiene inventario y resumen en columnas y a 390 ambos quedan apilados sin recortar nombres, procedencia de cotizaciones ni confirmación
