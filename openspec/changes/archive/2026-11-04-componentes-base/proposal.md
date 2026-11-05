# Proposal

## Why

Los tokens y las fuentes ya están en el frontend, pero ninguna pantalla los usa. Antes de
rediseñar pantallas hacen falta las piezas que se repiten en todas: si cada pantalla armara
sus propios botones, veredictos y precios, el diseño se iría despegando de
`docs/sistema-diseno/` y las reglas del producto quedarían repartidas.

## What Changes

- Agregar `lucide-react` (íconos del sistema de diseño).
- Crear en `frontend/components/uj/` siete componentes, fieles a su `README.md` y `preview.html`:
  - `Button`: principal, secundario y quieto; variante chica; deshabilitado con motivo.
  - `Field`: etiqueta, ayuda y error; versión de texto largo.
  - `Notice`: tonos encaja, revisar, no e info, con el `role` que corresponde.
  - `Verdict`: recibe el estado del motor y muestra color + ícono + palabra.
  - `PriceTag`: monto con moneda, condición, fecha y tienda.
  - `PartCard`: categoría, beneficio, modelo, foto o ícono, precio y veredicto.
  - `ChatBubble`: burbujas de persona y asistente, sugerencias y cuadro para escribir.
- Crear la página `/sistema-diseno` (solo fuera de producción) que muestra los siete
  componentes con datos de ejemplo, para compararlos contra las maquetas.
- **Sin cambios en las pantallas actuales:** nadie usa todavía estos componentes.
- Fuera de alcance: `PcSlots`, `GoalPicker`, `BudgetSlider`, `UpgradeCard`, `PlanSteps` (van en
  `componentes-pc-y-plan`), la navegación y cualquier pantalla existente.

## Reglas del producto que estos componentes hacen cumplir

- `Verdict` no decide nada: traduce `compatible` → «Encaja», `requiere_verificacion` → «Falta un
  dato», `incompatible` → «No encaja». Un estado desconocido se muestra como «Falta un dato»,
  nunca como «Encaja».
- `PriceTag` no muestra un monto sin moneda, fecha y tienda: muestra «Sin precio». Nunca `$ 0`.
- `PartCard` nunca usa una foto genérica que parezca la pieza: sin foto real, va el ícono de
  categoría. El texto de beneficio llega desde quien la usa; no inventa rendimiento ni FPS.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `sistema-diseno`: componentes base compartidos y sus reglas de presentación.

## Impact

- Nuevos: `frontend/components/uj/*`, `frontend/app/sistema-diseno/page.tsx`,
  `frontend/tests/unit/uj-*.test.tsx`.
- Modificados: `frontend/package.json` y `package-lock.json` (`lucide-react`).
- Sin cambios en backend, API ni pantallas actuales.

## Cambios siguientes

Sin cambios respecto de la lista de `tokens-y-fuentes`: `componentes-pc-y-plan`,
`layout-y-navegacion`, pantallas de a una o dos y `asistente-flotante` al final.
