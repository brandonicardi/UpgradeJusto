# Proposal

## Why

Las pantallas de Tu PC, Armar, Lo que te conviene y Tu plan necesitan cinco piezas propias que
todavía no existen. Sin ellas, cada pantalla tendría que resolverlas por su cuenta.

## What Changes

- Crear en `frontend/components/uj/`, fieles a su `README.md` y `preview.html`:
  - `PcSlots`: nueve casilleros en orden fijo (cargada, en duda, vacía).
  - `GoalPicker`: opciones grandes con `aria-pressed`.
  - `BudgetSlider`: monto grande, pista, atajos y campo para escribir el monto.
  - `UpgradeCard`: pieza actual y nueva, motivos, precio, diferencia y veredicto.
  - `PlanSteps`: etapas hecha, actual y pendiente, con costo y veredicto.
- Sumarlos a la vitrina `/sistema-diseno`.
- Sin cambios en pantallas existentes ni en la API.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `sistema-diseno`: componentes de PC y plan.

## Impact

- Nuevos: `frontend/components/uj/{pc-slots,goal-picker,budget-slider,upgrade-card,plan-steps}.tsx`
  y `frontend/tests/unit/uj-pc-plan.test.tsx`.
- Modificados: `frontend/components/uj/index.ts`, `frontend/app/sistema-diseno/page.tsx`.
