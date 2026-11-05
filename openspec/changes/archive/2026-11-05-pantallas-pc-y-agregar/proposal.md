# Proposal

## Why
La gestión de PCs y la revisión de listas necesitan la jerarquía de `PantallaMiPC` y `PantallaAgregarPC` sin perder estados de inventario ni controles de confirmación.

## What Changes
- Presentar selector de PCs y nueve categorías con `PcSlots`, edición existente y ayudas contextuales.
- Componer la importación en pasos visibles: pegar, revisar y confirmar; mantener corrección de líneas y evidencia.
- Conservar estados vacío, carga, error, conflicto y guardado incierto, además de navegación histórica.
- Fuera de alcance: editar atributos técnicos del catálogo desde una PC, autodetectar hardware, importar archivos, inventar progreso de completitud o modificar recomendaciones/planes. Las ranuras M.2 editables de la maqueta no tienen contrato de escritura en este flujo.

## Capabilities
### New Capabilities
Ninguna.

### Modified Capabilities
- `sistema-diseno`: lectura de nueve categorías y pasos accesibles de revisión de una lista.

## Impact
`frontend/app/pcs/pcs.tsx`, `components/tower-inventory.tsx`, `app/pcs/import/proposal.tsx`, `components/editable-tower-proposal.tsx` y `tower-extraction-evidence.tsx`; reutilizar controladores de `lib/towers.ts` y `lib/tower-extraction.ts`.

Pruebas: `towers38.test.ts`, `tower-extraction.test.tsx`, `tower-extraction-proxy.test.ts`, `tower-simulation-state.test.ts`, e2e `towers38.spec.ts` y `tower-extraction38.spec.ts`.

Depende de revisión humana y de `componentes-pc-y-plan` liberado. Orquestador → escritor frontend único → revisor independiente; aplicar antes de `pantallas-conviene-y-plan` para evitar doble escritura en `/pcs`. No se aplican cambios en esta propuesta.
