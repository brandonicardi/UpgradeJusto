# Design

Cambio de presentación en `/` y `/build`. No cambia backend ni el flujo posterior al guardado.

## Bloqueo antes de apply
`lib/purchase-draft.ts` calcula en el navegador `purchaseSubtotal` y `purchaseBudget`, y
`purchase-cost-summary.tsx` muestra subtotal y saldo provisional. Eso choca con la regla de
`frontend/AGENTS.md`: la interfaz no calcula precios. Brandon debe elegir antes de aplicar:

- **A.** Aceptarlo como excepción documentada: suma lo cotizado y se rotula «No es el total del armado».
- **B.** Moverlo al servidor en un cambio separado de backend, previo a este.

Este cambio no toca esa lógica en ningún caso: solo reubica lo que ya se muestra. Las tareas 2.x
quedan frenadas hasta la decisión.

## Decisiones
- **Inicio:** la pregunta de la maqueta lleva al flujo existente. No hay formulario de recomendación
  desconectado ni criterios que viajen a una PC.
- **Pieza destacada:** se conserva el catálogo real. Si falla, la zona muestra su estado sin datos y
  los caminos de entrada siguen disponibles.
- **Objetivos:** uso general, juegos y productividad, con el selector de trabajo actual. La edición
  audiovisual de la maqueta no entra.
- **Presupuesto:** no se usa `BudgetSlider`. Sus montos enteros y atajos no admiten el decimal que
  exige la spec, así que queda el campo actual con el formato de `Field`.
- **Inventario:** las nueve categorías salen de la constante única; `PartCard` solo donde su contrato
  encaje, sin forzar datos que no haya.
- **Consentimiento:** agregar o quitar una compra lo vuelve a pedir, como hoy.

## Composición
Inventario y resumen en dos columnas a 1440 y apilados a 390, sin recortar procedencia de cotizaciones.
