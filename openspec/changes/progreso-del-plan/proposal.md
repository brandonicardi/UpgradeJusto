# Proposal

## Why

La maqueta de Tu plan muestra etapas «Hecha», pero el servidor no sabe qué compró la persona. Hoy el
plan no sirve para seguir una compra en varios pasos, que es para lo que existe. Brandon pidió un
progreso real, simple y que no moleste al uso normal.

## What Changes

- La persona puede marcar una etapa como comprada y desmarcarla, con un solo botón.
- Tu plan muestra «Hecha» y el paso actual a partir de esas marcas, y cuántas etapas lleva hechas.
- El progreso vive aparte de las revisiones del plan: marcar no crea una revisión, no recalcula
  precios ni compatibilidad y no modifica la PC guardada.
- Un plan sin marcas se ve y funciona igual que hoy. Marcar es opcional.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `planes`: progreso de compra por etapa.

## Impact

- Backend: tabla y migración nuevas, servicio y ruta de `plans`, lista de rutas permitidas.
- Frontend: acción en `/tower-plans/[id]`, proxy en `app/api`, `PlanSteps` ya soporta los estados.
- Sin cambios en el motor de compatibilidad ni en las recomendaciones.
