# Proposal

## Why
Inicio y armado muestran un banco de trabajo visual distinto de las maquetas. El objetivo acotado es ordenar la entrada y la selección manual con la jerarquía de `PantallaInicio` y `PantallaArmar`.

## What Changes
- Inicio con promesa principal, caminos existentes y guía accesible; conservar catálogo real y su estado sin datos.
- Armado con criterios, nueve categorías, selección manual y resumen lateral; reusar UJ donde el contrato sea compatible.
- Conservar cantidades, condición de precio, consentimiento, comprobación y planificación posteriores al guardado.
- Fuera de alcance: armado automático, nuevos objetivos, traslado de criterios desde inicio a una PC, cálculo nuevo de saldo y cambios backend. La pregunta inicial conduce al flujo existente; no se presenta un formulario de recomendación desconectado.

## Capabilities
### New Capabilities
Ninguna.

### Modified Capabilities
- `sistema-diseno`: entrada y armado manual con composición adaptable y acciones existentes.

## Impact
`frontend/app/page.tsx`, `app/build/page.tsx`, `components/beginner-entry.tsx`, `purchase-builder.tsx` y `purchase-cost-summary.tsx` (presentación). Regresión: `purchase-draft.test.tsx`, `beginner-actions.test.tsx`, `hardware-guide.test.tsx` y recorridos de `tests/evidence/beginner-entry.spec.ts`.

Bloqueo antes de apply: `lib/purchase-draft.ts` ya calcula subtotales locales, en tensión con la regla de precios de servidor. Brandon debe resolver ese contrato en una decisión/cambio separado; este cambio no lo elimina ni lo legitima. También debe aceptar las diferencias funcionales respecto de las maquetas.

Requiere revisión humana, `componentes-pc-y-plan` liberado, escritor frontend secuencial y revisor independiente. No implica aprobación ni implementación.
