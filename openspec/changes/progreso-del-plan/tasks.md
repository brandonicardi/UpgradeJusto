# Tasks

Backend primero (agente `backend`). La sección 2 es del agente `frontend` y espera a que
`pantallas-conviene-y-plan` esté archivado. Prueba primero.

## 1. Backend
- [ ] 1.1 Tabla y migración nueva en `alembic/versions/`, sin editar las viejas.
      Prueba: alembic desde cero y un plan sin marcas devuelve progreso vacío.
- [ ] 1.2 Servicio y repositorio: marcar y desmarcar, idempotentes, sin crear revisión.
      Prueba: marcar dos veces deja una marca; la revisión del plan no cambia; precios tampoco.
- [ ] 1.3 Rutas `PUT` y `DELETE`, con `ingress`, `proxy_ip`, sesión y CSRF.
      Prueba: plan ajeno igual que inexistente; sin CSRF falla; ruta fuera de la lista falla.
- [ ] 1.4 El `GET` del plan incluye el progreso; recalcular conserva las marcas vigentes.
      Prueba: etapa que desaparece al recalcular no deja marca huérfana visible.

## 2. Frontend
- [ ] 2.1 Proxy en `app/api` con la lista exacta y CSRF.
      Prueba: `tests/unit/` del proxy; nunca se envía `user_id`.
- [ ] 2.2 «Ya lo compré» y «Deshacer» en `/tower-plans/[id]`; `PlanSteps` muestra hecha, actual y
      pendiente desde la API. Prueba: `tests/unit/tower-plans.test.tsx`, error visible sin perder la vista.

## 3. Verificación
- [ ] 3.1 `pytest`, `ruff`, `npm test`, `npm run typecheck`, `npm run lint`.
- [ ] 3.2 Recorrido real a 1440 y 390: marcar, recargar, desmarcar, y comprobar que la PC no cambió.
- [ ] 3.3 Revisor: propiedad en el servidor, plan y PC sin modificar, sin jerga.
