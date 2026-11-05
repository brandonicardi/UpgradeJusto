# Spec Delta

## ADDED Requirements

### Requirement: Jerarquía de propuestas conservando su orden
El sistema SHALL presentar la primera propuesta recibida como tarjeta principal y las siguientes como alternativas, siguiendo `PantallaConviene` y conservando el orden y estado del servidor.

#### Scenario: Primera propuesta no recomendada
- **WHEN** la primera propuesta está descartada, bloqueada o requiere verificación
- **THEN** la tarjeta destaca ese estado y sus faltantes, sin titularla «lo que más te conviene» como si estuviera recomendada

#### Scenario: Más alternativas
- **WHEN** se pide Mostrar 6 más
- **THEN** aparecen las siguientes propuestas en el orden original, conservando sus cotizaciones y sin volver a cotizar las ya visibles

### Requirement: Resumen de decisión con evidencia accesible
El sistema SHALL mostrar cambio, beneficio informado, coste y estado de comprobación antes de sus detalles desplegables.

#### Scenario: Coste incompleto o presupuesto excedido
- **WHEN** el resultado informa total desconocido o presupuesto insuficiente
- **THEN** ese estado se ve junto a la acción de preparar plan y permanecen accesibles las dependencias, precios originales, fuentes y faltantes

### Requirement: Preparación de plan identificada como borrador
El sistema SHALL identificar la acción de una propuesta como preparación de un borrador revisable, conservando un guardado posterior separado.

#### Scenario: Preparar una propuesta
- **WHEN** se activa Preparar plan en una propuesta
- **THEN** aparece el editor con sus acciones y condiciones, sin indicar que la pieza ya fue agregada a un plan guardado

### Requirement: Etapas como cambios propuestos
El sistema SHALL presentar el plan según `PantallaMiPlan` con etapas ordenadas y resumen de costes informados, distinguiendo estado de evaluación y orden de lectura.

#### Scenario: Plan listo o bloqueado
- **WHEN** se abre un plan con etapas listas, bloqueadas o por verificar
- **THEN** cada etapa conserva ese estado; ninguna muestra «Hecha», «Comprada» ni progreso de gasto realizado a partir de esos estados

#### Scenario: Lectura histórica
- **WHEN** se consulta una versión anterior del plan
- **THEN** se identifica como histórica y se conservan sus cotizaciones, con acceso al detalle y a volver a la versión actual

### Requirement: Plan y alternativas adaptables
El sistema SHALL apilar tarjetas y resumen de plan en móvil conservando el detalle de cada etapa.

#### Scenario: Comparación a dos anchos
- **WHEN** se recorre una propuesta y `/tower-plans/[id]` a 1440 y 390 píxeles
- **THEN** a 1440 se distinguen área principal y resumen lateral, y a 390 quedan apilados sin desborde; abrir una etapa no oculta sus fuentes ni sus acciones de edición disponibles
