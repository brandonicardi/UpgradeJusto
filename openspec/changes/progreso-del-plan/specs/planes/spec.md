# Spec Delta

## ADDED Requirements

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
