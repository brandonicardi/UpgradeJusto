# Proposal

## Why
Las propuestas y etapas existentes tienen información real, pero su presentación no sigue `PantallaConviene` y `PantallaMiPlan`. Se busca hacer legible esa información sin cambiar el motor ni la planificación.

## What Changes
- Propuesta principal, alternativas y condiciones con `UpgradeCard`, `PartCard`, `Verdict` y precios con procedencia.
- Etapas y resumen lateral en el plan, conservando detalle, edición, historial, recálculo y baja.
- Reusar `PlanSteps` como lectura del orden propuesto, sin convertir los estados del servidor en compras realizadas.
- Fuera de alcance: marcar comprado, actualizar PC desde etapas, sumar a un plan sin revisión, saldo inventado, reordenar por supuesta potencia/precio y nuevas rutas de recomendación. `Lo que te conviene` sigue dentro de `/pcs` y `/build`.

## Capabilities
### New Capabilities
Ninguna.

### Modified Capabilities
- `sistema-diseno`: jerarquía de propuestas y lectura de etapas con resultados existentes.

## Impact
`frontend/app/pcs/tower-recommendations.tsx`, `tower-recommendation-view.tsx`, `components/tower-plan-view.tsx`, presentación de `tower-plan-editor.tsx` y `app/tower-plans/workspace.tsx`.

Regresión: unit `tower-recommendations.test.tsx`, `preview-metadata.test.ts`, `tower-plans.test.tsx`, `tower-plan-deactivation.test.tsx`; e2e `tower-recommendations38.spec.ts`, `tower-plans38.spec.ts`.

Revisión humana debe aceptar que «lista», «bloqueada» y «requiere verificación» no representan progreso de compra. Dependencias: `componentes-pc-y-plan` liberado y `pantallas-pc-y-agregar` terminado antes de tocar `/pcs`. Orquestador con escritor frontend secuencial y revisión independiente. Sin aplicación ni aprobación implícita.
