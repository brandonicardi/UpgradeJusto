# Tasks

Solo frontend; el API no cambia. Prueba primero.

## 1. Editor
- [x] 1.1 Tarjeta «Compra N» con lista de componentes, «Sacar», orden «Comprar antes/después» y «Sacar compra» (solo con varias compras).
      Prueba: `tests/unit/plan-editor-flow.test.tsx` (editor de compras).
- [x] 1.2 Flujo «+ Sumar un componente»: categoría, catálogo o modelo escrito, cantidad solo en memoria/almacenamiento/ventiladores, reemplazar o sumar.
      Prueba: `tests/unit/plan-editor-flow.test.tsx` (flujo guiado).
- [x] 1.3 Compra vacía: «Todavía está vacía», se descarta al guardar, pista «Sumá un componente para guardar.».
      Prueba: `tests/unit/plan-editor-flow.test.tsx` («al guardar descarta las compras vacías»).
- [x] 1.4 Encabezado de una línea, sin avisos repetidos; «Datos del plan» y «Ponerle nombre o tope» plegados.
      Prueba: `tests/unit/central-decision.test.tsx`, `tests/unit/mi-plan-view.test.ts`.

## 2. Pruebas y pantalla
- [x] 2.1 Pruebas viejas al día; `npm test`, `typecheck` y `lint` en verde.
- [ ] 2.2 Capturas a 1440 y 390 con el flujo abierto, comparadas con el sistema de diseño (revisión de Brandon).
