# Spec Delta

## ADDED Requirements

### Requirement: Mi plan guía la próxima compra
La pantalla Mi plan SHALL seguir la maqueta `PantallaMiPlan` en sus tres estados (plan en curso, terminado y vacío): la próxima compra arriba, la plata del plan, todas las compras en lista compacta, y a un costado «¿Cuánto podés apartar?», «Tu PC al terminar» y compartir. A 390 px SHALL apilarse sin desplazamiento horizontal.

#### Scenario: Plan en curso
- **WHEN** la persona abre un plan con compras pendientes
- **THEN** ve primero «Tu próxima compra» y después la plata y la lista

#### Scenario: Sin plan
- **WHEN** la persona no tiene ningún plan
- **THEN** ve cómo funciona en tres pasos y un botón a «Ver qué me conviene»

### Requirement: Mi plan sin jerga
La pantalla Mi plan, el editor del plan, la vista del plan y la vista compartida SHALL decir «compra» en lugar de «etapa» y «componente» en lugar de «pieza», y NO SHALL mostrar textos en inglés, códigos internos ni términos como «revisión», «alcance de la comprobación» o «detalle técnico».

#### Scenario: Límites del plan
- **WHEN** el plan trae límites o faltantes en inglés o como códigos
- **THEN** se muestran traducidos o no se muestran
