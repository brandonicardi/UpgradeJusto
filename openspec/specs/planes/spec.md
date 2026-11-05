# planes Specification

## Purpose

Guardar planes de mejora por etapas validadas de forma acumulada, con coste en
pesos y estado conservador, sin aplicar cambios a la PC guardada.

## Requirements

### Requirement: Cálculo acumulado por etapas

El sistema SHALL validar cada etapa sobre la configuración resultante de la etapa anterior y no sobre la PC original, aplicando todas las acciones de esa etapa antes de evaluar.

#### Scenario: Etapa posterior dependiente

- **WHEN** la etapa 2 solo es viable después del cambio de la etapa 1
- **THEN** se evalúa sobre el resultado de la etapa 1, que queda como configuración de partida

#### Scenario: RAM y BIOS

- **WHEN** una etapa sustituye RAM se reemplaza el conjunto completo sin sumar la capacidad retirada, y si cambia la placa sin contexto la BIOS queda desconocida
- **THEN** la configuración resultante no hereda la capacidad ni la BIOS anteriores

### Requirement: Creación de un plan propio

El sistema SHALL crear con `POST /api/plans` un plan de 1 a 12 etapas con nombre de 1 a 100 caracteres, `pc_id` propia, revisión esperada, objetivo, presupuesto ARS y reemplazos cerrados, guardando el snapshot calculado por el servidor.

#### Scenario: Alta exitosa

- **WHEN** el dueño envía un plan válido con la revisión vigente de su PC
- **THEN** responde 201 con revisión 1, snapshot base, configuración y resultado de cada etapa, coste, beneficio y estado

#### Scenario: Payload inválido

- **WHEN** se envían campos extra, más de 12 etapas, categorías repetidas en una etapa o un presupuesto mal formado
- **THEN** responde 422 y no guarda nada

### Requirement: Propiedad, conflicto y lectura congelada

El sistema SHALL resolver la propiedad del plan y de la PC antes de informar conflictos, responder 404 si no existen o son ajenos, y recalcular solo con `PUT /api/plans/{plan_id}` en una transacción que sube la revisión en uno; `GET` y los listados sirven el snapshot guardado.

#### Scenario: Acceso ajeno

- **WHEN** otra cuenta lee, actualiza o elimina un plan ajeno
- **THEN** responde 404 sin revelar su existencia

#### Scenario: Conflicto al actualizar

- **WHEN** `revision` o `expected_pc_revision` no coinciden con las vigentes
- **THEN** responde 409 con el conflicto correspondiente y no modifica el plan

#### Scenario: Catálogo o PC cambiados

- **WHEN** se lee un plan después de cambiar el catálogo, o después de editar o eliminar la PC de origen
- **THEN** devuelve el mismo snapshot y versiones, y la referencia de PC queda nula si fue eliminada

### Requirement: Coste acumulado en ARS

El sistema SHALL sumar el coste de todas las adquisiciones del plan, incluyendo una pieza comprada y sustituida en otra etapa, tratar el presupuesto de cada etapa como techo incremental sin transferir sobrantes y acumular la demanda de stock por prefijo sin reutilizar existencias conocidas insuficientes.

#### Scenario: Total incompleto

- **WHEN** falta el precio de una pieza o el stock conocido no alcanza la cantidad
- **THEN** el total es `null`, se conserva el subtotal conocido y nunca se usa cero ni conversión implícita

#### Scenario: Stock insuficiente entre etapas

- **WHEN** dos etapas requieren más unidades de las que declara una oferta
- **THEN** la oferta no cubre ambas etapas y el faltante queda informado

#### Scenario: Cotización vencida

- **WHEN** una cotización vence antes de confirmar el guardado
- **THEN** responde 409 y no deja el plan como listo

### Requirement: Estado conservador y etapas de preparación

El sistema SHALL calcular `ready`, `blocked` o `requires_verification` en el servidor, permitir guardar planes bloqueados o incompletos como borrador rotulado y etiquetar como preparación la etapa que no mejora el rendimiento por sí misma.

#### Scenario: Plan listo

- **WHEN** todas las etapas son compatibles con cobertura completa, el coste está completo dentro del presupuesto y el beneficio final está respaldado
- **THEN** el estado es `ready`

#### Scenario: Fallo dominante

- **WHEN** una etapa es incompatible, una regla falla o el coste excede el presupuesto
- **THEN** el estado es `blocked` con etiqueta que prohíbe presentarlo como recomendación o permiso de compra

#### Scenario: Evidencia faltante

- **WHEN** no hay fallo pero falta evidencia, precio o beneficio respaldado
- **THEN** el estado es `requires_verification` y se conservan faltantes y advertencias

### Requirement: Planes de torre con revisiones inmutables

El sistema SHALL exponer `/api/tower-plans` con `kind: "tower_plan"` y `schema_version: 2`, crear la revisión 1, leer la vigente o una histórica y agregar una revisión solo con un recálculo explícito.

#### Scenario: Historial

- **WHEN** se consulta `GET /api/tower-plans/{id}/revisions/{revision}`
- **THEN** devuelve el snapshot inmutable de esa revisión aunque existan revisiones posteriores

#### Scenario: Recálculo y baja lógica

- **WHEN** se recalcula con la revisión esperada, o se elimina el plan con `expected_plan_revision` vigente
- **THEN** el recálculo agrega una revisión sin modificar las anteriores y la baja responde 204 conservando el historial

### Requirement: Idempotencia y precondiciones

El sistema SHALL identificar cada operación con `client_request_id` y un hash canónico del cuerpo, y revalidar en el servidor propiedad, revisión del plan, revisión de la PC y publicación de catálogo esperada.

#### Scenario: Reintento idéntico

- **WHEN** se repite una creación o recálculo con la misma clave y el mismo cuerpo
- **THEN** devuelve la revisión guardada con `Idempotency-Replayed: true` sin recalcular

#### Scenario: Clave reutilizada

- **WHEN** la misma clave llega con otro cuerpo, una revisión no coincide o el catálogo activo cambió
- **THEN** responde 409 y no escribe

#### Scenario: Límites de generación

- **WHEN** el cálculo supera el plazo de generación o el snapshot serializado excede 1 MiB
- **THEN** responde 408 o 422 respectivamente, sin dejar una revisión parcial

### Requirement: Progreso de compra por etapa
El sistema SHALL permitir que la persona dueña de un plan marque y desmarque una etapa como comprada, sin crear una revisión del plan, sin recalcular precios ni compatibilidad y sin modificar la PC guardada.

#### Scenario: Marcar una etapa
- **WHEN** la persona marca una etapa de su plan como comprada
- **THEN** la etapa figura como hecha al volver a leer el plan
- **AND** la revisión actual, sus precios y sus veredictos no cambian

#### Scenario: Marcar dos veces
- **WHEN** la persona marca una etapa ya marcada
- **THEN** el sistema conserva una sola marca y responde sin error

#### Scenario: Plan ajeno
- **WHEN** una persona intenta marcar una etapa de un plan que no es suyo
- **THEN** el sistema responde igual que ante un plan inexistente y no guarda nada

### Requirement: Paso actual derivado del progreso
El sistema SHALL mostrar como etapa actual la primera etapa sin marcar, como hechas las marcadas y como pendientes las demás. Un plan sin marcas SHALL verse como antes de existir el progreso.

#### Scenario: Plan sin marcas
- **WHEN** la persona abre un plan sin etapas marcadas
- **THEN** ninguna etapa figura como hecha

#### Scenario: Recalcular conserva las marcas
- **WHEN** la persona recalcula un plan con etapas marcadas que siguen existiendo
- **THEN** esas etapas siguen figurando como hechas
