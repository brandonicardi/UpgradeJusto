# Design

Cambio de presentación en `/pcs` y `/pcs/import`. Se reutilizan los controladores de `lib/towers.ts`
y `lib/tower-extraction.ts`.

## Decisiones
- **`PcSlots` no alcanza solo:** su contrato tiene una pieza por categoría y hoy una categoría puede
  traer varias líneas con cantidad. `tower-inventory.tsx` arma las nueve tarjetas con esa misma
  composición y lista todas las líneas. Si conviene reutilizarlo, se extiende con una prueba propia.
- **Tres estados distintos:** Presente, «No tengo» (declarado) y «No sé». «No sé» nunca se ve como
  ausencia ni como comprobación aprobada. Memoria se expresa en módulos, sin calcular capacidad total.
- **De tarjeta a editor:** hoy las categorías solo tienen `tower-status-${category}` como ancla.
  Completar o Cambiar abre el editor y lleva el foco a ese control. Cancelar y guardar siguen explícitos.
- **Sin atributos de fabricante:** los lugares M.2 editables de la maqueta no tienen contrato de
  escritura, así que no aparecen.
- **Pasos de importación:** estado de presentación derivado de lo que ya existe (texto, propuesta,
  confirmación), sin ruta nueva. Volver conserva el texto pegado.
- **Consentimiento:** corregir una línea desmarca la confirmación y el botón explica el motivo. Una
  extracción sigue siendo una propuesta hasta esa confirmación.
- **Resultado incierto:** se muestra dentro del paso de confirmación, con revisar Mis PCs y otro envío
  como decisión explícita. El botón normal no vuelve a habilitarse ni se muestra éxito.

## Falla conocida
`tests/unit/curation.test.ts` falla hoy porque busca texto literal dentro de `app/pcs/import/proposal.tsx`
(el `onClick` de cancelar). Este cambio reescribe ese archivo, así que la prueba se ve afectada. Las
garantías que protege (cancelar descarta sin enviar, candado y confirmación antes del envío) se
conservan y se prueban por comportamiento. No se borra ni se afloja: reemplazarla requiere el OK de Brandon.

## Orden
Se aplica antes de `pantallas-conviene-y-plan`, porque los dos tocan `/pcs`.

## Composición
Tarjetas y filas en una columna a 390. El foco no queda tapado por paneles laterales.
