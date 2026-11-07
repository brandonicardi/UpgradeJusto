# Proposal

## Why

Mi plan funciona, pero habla como un panel técnico: «etapas», «piezas», «revisión», avisos en inglés
y códigos internos. Una persona común necesita cuatro respuestas a primera vista: qué compro ahora,
cuánto sale y dónde, qué gano y cuánto me falta. El diseño aprobado (`PantallaMiPlan`) ya las ordena.

## What Changes

- Arriba de todo, «Tu próxima compra»: el componente, de qué a qué cambia, si encaja, el precio con
  fecha y tienda, y los botones para marcarla como comprada o verla en la tienda.
- La plata viene del servidor: todo el plan, lo ya gastado y lo que falta, en pesos. La interfaz no suma.
- «Actualizar precios» recalcula el plan con los precios de hoy y avisa antes de guardar si subió, bajó
  o si algo dejó de encajar.
- «¿Cuánto podés apartar?» estima los meses con lo que falta; queda solo en el navegador.
- Al terminar o marcar una compra se ofrece «Actualizar Mi PC», solo si la persona lo confirma.
- Lenguaje común en toda la pantalla y en el editor, la vista del plan y la vista compartida: «compra»
  en lugar de «etapa», «componente» en lugar de «pieza», sin textos en inglés ni códigos.
- Se quita `workspace.tsx`, que no está en ninguna ruta.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `planes`: la lectura del plan devuelve lo gastado y lo que falta; la pantalla guía la próxima compra,
  actualiza precios y ofrece actualizar Mi PC.
- `sistema-diseno`: la pantalla Mi plan sigue la maqueta en sus tres estados y habla sin jerga.

## Impact

- Backend: `plans/tower_models.py`, `tower_progress.py`, `tower_repository.py`; sin migración.
- Frontend: `app/tower-plans/`, `lib/mi-plan-view.ts`, `lib/tower-plans.ts` y componentes del plan.
- Docs: `PantallaMiPlan/preview.html` y `PlanSteps/README.md`.
