# Tasks

Agente `frontend`, salvo la revisión. Leer `README.md` y `preview.html` de cada componente.

## 1. Componentes (prueba primero, `tests/unit/uj-pc-plan.test.tsx`)
- [x] 1.1 `PcSlots`: orden fijo, tres estados, categoría ausente → vacía.
- [x] 1.2 `GoalPicker`: `aria-pressed`, una o varias opciones.
- [x] 1.3 `BudgetSlider`: rango, atajos y campo.
- [x] 1.4 `UpgradeCard`: sobra, falta y «Sumar a mi plan».
- [x] 1.5 `PlanSteps`: tres estados y etapa sin veredicto → «Falta un dato».
- [x] 1.6 Fidelidad a la maqueta (observaciones del revisor): `UpgradeCard` con el botón secundario
      «Ver otras opciones»; `PlanSteps` con línea entre etapas, círculos de 40 px y fondo `pino-suave`
      solo en el cuerpo de la etapa actual; `PcSlots` con ícono de 20 px.
- [x] 1.7 Fidelidad a `componentes.css`: `UpgradeCard` sin borde exterior, separación `space-4`, ancho
      máximo 620 px, cajas de pieza con `space-3`/`space-4` y línea sobre el pie; casilleros de
      `PcSlots` con la altura de su fila.

## 2. Vitrina
- [x] 2.1 Sumar los cinco a `/sistema-diseno` y actualizar capturas a 1440 y 390 px. Un plan con una
      etapa sin precio no muestra total, igual que la API (`total_ars` nulo).

## 3. Verificación
- [x] 3.1 `npm test` (única falla aceptada: `curation.test.ts`), `npm run typecheck`, `npm run lint`.
- [x] 3.2 Sin hexadecimales en `components/uj`; el diff solo toca `components/uj`,
      `app/sistema-diseno` y pruebas.
- [x] 3.3 Revisor: fidelidad a las maquetas y reglas del producto.
