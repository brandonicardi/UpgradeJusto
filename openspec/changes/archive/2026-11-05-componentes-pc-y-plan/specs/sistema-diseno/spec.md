# Spec Delta

## ADDED Requirements

### Requirement: Nueve casilleros de la PC
El sistema SHALL mostrar las nueve categorías siempre en el mismo orden, con estado cargada, en
duda o vacía, sin guardar nada por mostrarlas.

#### Scenario: Pieza en duda
- **WHEN** una categoría tiene una pieza con un dato faltante
- **THEN** su casillero dice qué falta, por ejemplo «16 GB · falta la velocidad»

#### Scenario: Categoría ausente
- **WHEN** `PcSlots` no recibe datos de una categoría
- **THEN** la muestra vacía con el enlace «Agregar», nunca la omite

### Requirement: Sugerencia sin cálculos en la interfaz
El sistema SHALL mostrar en `UpgradeCard` el precio, la diferencia con el presupuesto y el
veredicto que recibe por props, sin calcularlos.

#### Scenario: Falta plata
- **WHEN** la diferencia recibida es negativa
- **THEN** dice «Te faltan» con el monto en `tinta`, sin resaltar

#### Scenario: Acción principal
- **WHEN** se muestra una sugerencia
- **THEN** el botón principal dice «Sumar a mi plan», no «Aplicar»

### Requirement: Etapas con veredicto acumulado
El sistema SHALL mostrar en `PlanSteps` el costo y el veredicto que recibe para cada etapa.

#### Scenario: Etapa sin veredicto
- **WHEN** una etapa no trae veredicto
- **THEN** muestra «Falta un dato», nunca «Encaja»

### Requirement: Presupuesto accesible
El sistema SHALL permitir elegir el presupuesto con el control deslizante, los atajos o
escribiendo el monto.

#### Scenario: Monto escrito
- **WHEN** la persona escribe un monto dentro del rango
- **THEN** el control refleja ese valor y avisa el cambio a quien lo usa
