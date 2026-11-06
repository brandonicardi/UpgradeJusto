# recomendaciones Specification

## Purpose

Recomendar sustituciones de componentes para una PC propia según objetivo y
presupuesto en pesos, con beneficio respaldado, coste incremental y faltantes,
sin modificar la PC.

## Requirements

### Requirement: Previsualización efímera de alternativas

El sistema SHALL calcular la recomendación en una operación de solo lectura sobre la PC propia y el catálogo publicado, aceptando entre 1 y 20 alternativas con `key` única de 1 a 40 caracteres alfanuméricos y 1 a 6 categorías distintas; RAM admite hasta 8 módulos y el resto una pieza de cantidad 1.

#### Scenario: Vista previa exitosa

- **WHEN** el dueño pide `POST /api/pcs/{pc_id}/recommendations/preview` con revisión vigente, objetivo y presupuesto válidos
- **THEN** responde 200 con `pc_id`, `pc_revision`, `objective`, `budget_ars`, `currency: "ARS"`, `items` y `limitations`, sin guardar nada

#### Scenario: PC ajena o revisión desactualizada

- **WHEN** la PC no existe, es ajena o `expected_pc_revision` no coincide
- **THEN** responde 404 o 409 y no evalúa alternativas

#### Scenario: Payload inválido

- **WHEN** se repite `key` o categoría, se envían campos extra o autoridad del cliente, o el presupuesto no es un decimal positivo de hasta dos decimales
- **THEN** responde 422 y el servidor resuelve dueño, catálogo y precios

### Requirement: Evaluación de la combinación completa

El sistema SHALL aplicar todos los reemplazos de una alternativa antes de evaluar la configuración resultante y devolver veredicto, cobertura, reglas, faltantes y configuración evaluada.

#### Scenario: Reemplazo conjunto

- **WHEN** una alternativa cambia RAM y placa madre a la vez
- **THEN** la evaluación corresponde a la combinación final, no a cada cambio aislado

#### Scenario: RAM y BIOS

- **WHEN** se sustituye RAM se retira el conjunto anterior completo sin sumar su capacidad, y si se cambia la placa sin declarar BIOS esta queda desconocida
- **THEN** la configuración evaluada refleja el conjunto nuevo y no hereda datos de la anterior

### Requirement: Modos automático y manual

El sistema SHALL ofrecer `POST /api/towers/{pc_id}/recommendations/preview` con modo `automatic` o `manual_comparison`; el automático recorre el catálogo de la categoría del objetivo y agrega dependencias cotizadas explícitas, y el manual evalúa las alternativas enviadas.

#### Scenario: Búsqueda automática

- **WHEN** se pide modo `automatic` para general, gaming o productivity
- **THEN** evalúa candidatos de RAM, GPU o CPU respectivamente y hasta dos ofertas más baratas por categoría de dependencia, con tope de 128 evaluaciones

#### Scenario: Modo y alternativas incompatibles

- **WHEN** `automatic` recibe alternativas, `manual_comparison` no las recibe o se envía `workload` con un objetivo distinto de `productivity`
- **THEN** responde 422

### Requirement: Beneficio respaldado por objetivo

El sistema SHALL declarar `supported` solo con evidencia curada aplicable: capacidad de RAM en `general`, índice relativo de GPU en `gaming` y referencia de CPU con `workload: "blender-cpu"` en `productivity`.

#### Scenario: Sin evidencia aplicable

- **WHEN** no hay referencia curada para el modelo o falta el workload requerido
- **THEN** el beneficio queda `unknown` y el faltante se informa, sin estimar FPS ni rendimiento

#### Scenario: Sin cambio real

- **WHEN** la configuración resultante es idéntica a la original
- **THEN** el beneficio es `not_an_improvement`

### Requirement: Coste incremental en ARS

El sistema SHALL sumar con `Decimal` solo las piezas y cantidades que se adquieren, usando cotizaciones frescas, en stock, de la condición pedida y vigentes por hasta 24 horas; una misma cotización debe cubrir la demanda acumulada de esa pieza.

#### Scenario: Precio faltante

- **WHEN** una pieza no tiene cotización ARS válida o el stock conocido no alcanza la demanda
- **THEN** `total_ars` es `null`, se conserva el subtotal conocido y se listan los faltantes, nunca cero

#### Scenario: Presupuesto y exclusiones

- **WHEN** se calcula el coste
- **THEN** `within_budget` compara contra el presupuesto y el resultado declara que excluye envío, financiación y mano de obra

### Requirement: Dependencias y materiales

El sistema SHALL tratar cada acción adicional y cada material como dependencia explícita, y exigir confirmación explícita de la pasta térmica o un paquete nuevo documentado que la incluya.

#### Scenario: Material sin confirmar

- **WHEN** el remonte requiere pasta térmica y no hay confirmación ni inclusión documentada
- **THEN** la dependencia queda `missing`, el total se anula y no se inventa un precio

#### Scenario: Disponibilidad declarada

- **WHEN** se confirma pasta térmica disponible en la etapa
- **THEN** la dependencia queda `available_confirmed` y no se acredita disponibilidad para etapas posteriores

### Requirement: Clasificación de resultados

El sistema SHALL clasificar cada ítem como `recommended`, `requires_verification` o `rejected`.

#### Scenario: Recomendado

- **WHEN** la evaluación es compatible con todas las reglas requeridas en verde, hay beneficio respaldado, coste completo dentro del presupuesto y dependencias resueltas
- **THEN** el ítem es `recommended`

#### Scenario: Rechazado

- **WHEN** hay incompatibilidad, una regla falla, el subtotal conocido excede el presupuesto o no hay mejora demostrada
- **THEN** el ítem es `rejected` conservando todos los faltantes

#### Scenario: Resto

- **WHEN** falta evidencia, cobertura, precio o beneficio
- **THEN** el ítem es `requires_verification`

### Requirement: Orden y alcance declarado

El sistema SHALL ordenar por estado, luego por total conocido ascendente con desconocidos al final y `key` lexicográfica, y declarar las limitaciones y faltantes del cálculo acotado.

#### Scenario: Búsqueda acotada

- **WHEN** la búsqueda automática alcanza el tope de evaluaciones
- **THEN** la respuesta lo informa como faltante y limitación, sin presentarse como óptimo exhaustivo

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
