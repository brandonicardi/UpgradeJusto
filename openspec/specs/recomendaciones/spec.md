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
