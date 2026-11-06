## ADDED Requirements

### Requirement: Orden por valor dentro de cada estado

El sistema SHALL ordenar las alternativas por estado (recomendada, a verificar, descartada) y, dentro de cada estado, por valor: la ganancia del objetivo ponderada por la parte del presupuesto que usa el coste incremental.

#### Scenario: Dos alternativas recomendadas

- **WHEN** dos alternativas recomendadas tienen la misma ganancia y una cuesta menos
- **THEN** la más barata aparece primero porque usa menos presupuesto

#### Scenario: Estados separados

- **WHEN** una alternativa a verificar tiene más valor que una recomendada
- **THEN** la recomendada aparece antes que la alternativa a verificar

### Requirement: Sin precio vigente no se propone

El modo automático MUST NOT proponer una alternativa cuyo precio vigente no exista. Un precio desconocido no SHALL tratarse como cero ni como dentro del presupuesto.

#### Scenario: Pieza sin cotización

- **WHEN** una alternativa no tiene precio vigente en el catálogo
- **THEN** no aparece entre las propuestas automáticas y el resultado no se completa con un precio estimado

#### Scenario: Ninguna alternativa con precio

- **WHEN** ninguna alternativa tiene precio vigente
- **THEN** la respuesta indica que no hay propuestas con precio y no inventa montos

### Requirement: Mejora más cercana cuando nada entra

El sistema SHALL mostrar, cuando ninguna alternativa entra en el presupuesto, la mejora real más cercana, indicando que supera el presupuesto y cuánto. Lo que encaja con la PC pero cuesta un poco más se muestra antes que lo que no encaja.

#### Scenario: Presupuesto insuficiente

- **WHEN** ninguna mejora entra en el presupuesto pero una compatible lo supera poco
- **THEN** esa mejora se muestra como la más cercana, con su coste incremental y sin cambiar el presupuesto pedido

### Requirement: Primera PC validada por el motor

El sistema SHALL proponer una primera PC completa a partir de un objetivo y un presupuesto, validarla con el motor de compatibilidad antes de mostrarla y entregarla como borrador editable que no se guarda hasta que la persona lo confirme.

#### Scenario: Propuesta de primera PC

- **WHEN** la persona pide `GET /api/catalog/components/first-build` con objetivo y presupuesto válidos
- **THEN** la respuesta incluye piezas con precio vigente y el resultado del motor, y no se guarda ninguna PC

#### Scenario: Armado sin piezas suficientes

- **WHEN** el catálogo no tiene piezas con precio para completar el armado
- **THEN** la propuesta lo declara como faltante y no completa la lista con piezas inventadas

### Requirement: Elección local solo entre propuestas verificadas

Cuando `UJ_LOCAL_ADVISOR=1` está activo, el sistema MAY pedir al modelo local que elija una propuesta de la lista ya verificada. El modelo MUST NOT ver a la persona, agregar opciones ni emitir compatibilidad. Una clave fuera de la lista, un número no entregado, un timeout o un modelo apagado SHALL dejar el orden determinístico.

#### Scenario: Clave fuera de la lista

- **WHEN** el modelo responde una clave que no está en la lista
- **THEN** se mantiene el orden determinístico y no se usa la respuesta del modelo

#### Scenario: Modelo apagado

- **WHEN** el servidor local en 127.0.0.1:8081 no responde dentro del tiempo límite
- **THEN** la recomendación se entrega igual con el orden determinístico
