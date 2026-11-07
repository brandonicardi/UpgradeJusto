# Tasks

Backend primero, después la pantalla. Prueba primero. Una sola persona escribe en cada carpeta.

## 1. Backend (`plans/`)
- [x] 1.1 `TowerPlanRead` devuelve `spent_ars` y `remaining_ars` calculados al leer, con `Decimal`, sin tocar lo guardado; nulos si falta un precio.
      Prueba: `tests/test_tower38_plan_money.py` y `test_plan_read_derives_spent_and_remaining_without_touching_the_plan` (PostgreSQL).
- [x] 1.2 Corregir el docstring viejo de `api/tower_plans.py`.

## 2. Diseño
- [x] 2.1 `PantallaMiPlan/preview.html` sigue la maqueta aprobada (plan en curso, terminado y vacío) con el asistente flotante; `PlanSteps/README.md` al día.

## 3. Pantalla Mi plan
- [x] 3.1 «Tu próxima compra» con cambio, veredicto, precio con fecha y tienda, «Ya la compré», «Ver en la tienda» (solo con enlace real) y «Elegir otro componente».
      Prueba: `tests/unit/mi-plan.test.tsx` (próxima compra, sin enlace, sin dato de ganancia).
- [x] 3.2 Qué ganás solo con datos de referencia respaldados, rotulado «No son FPS»; plata del servidor (Todo el plan, Ya gastaste, Te falta); «Falta un dato» que explica y lleva a Mi PC.
      Prueba: `mi-plan-view.test.ts` (`gainText`) y `mi-plan.test.tsx` (plata, falta un precio, falta un dato).
- [x] 3.3 «Actualizar precios»: confirma antes, recalcula con las revisiones esperadas, cuenta si subió o bajó y qué dejó de encajar; conflicto explicado sin reintento.
      Prueba: `mi-plan.test.tsx` (recalcular y conflicto) y `mi-plan-view.test.ts` (`comparePlans`).
- [x] 3.4 «¿Cuánto podés apartar?» con `localStorage` en `try/catch`, nada al servidor.
      Prueba: `mi-plan.test.tsx` y `mi-plan-view.test.ts` (meses).
- [x] 3.5 «Actualizar Mi PC» al marcar una compra y al terminar, solo con confirmación y con la revisión esperada de la PC; si la PC cambió, no se ofrece.
      Prueba: `mi-plan.test.tsx` (Ahora no, confirmar, PC cambió, falla).
- [x] 3.6 Vista vacía y terminada según la maqueta; compartir como tarjeta chica; «Borrar este plan».
      Prueba: `mi-plan.test.tsx`, `tower-plan-deactivation.test.tsx`.
- [x] 3.7 Lenguaje común en el editor, la vista del plan y la vista compartida; sin textos en inglés ni códigos.
      Prueba: `mi-plan-view.test.ts` (`plainPlanNote`), `tower-plans.test.tsx`, `tower-shares38.test.tsx`.
- [x] 3.8 Quitar `workspace.tsx` (sin ruta) y su parte del test; reescribir `tower-plans38.spec.ts` para la pantalla real.
      Nota: el e2e quedó escrito pero no se ejecutó (necesita el stack levantado).

## 4. Pendiente de revisión
- [x] 4.1 Comparar la captura real con la maqueta a 1440 y 390.
- [x] 4.2 Correr `tower-plans38.spec.ts` con el stack levantado.
