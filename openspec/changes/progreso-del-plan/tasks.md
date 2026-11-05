# Tasks

Backend primero (agente `backend`). La sección 2 es del agente `frontend` y espera a que
`pantallas-conviene-y-plan` esté archivado. Prueba primero.

## 1. Backend
- [x] 1.1 Tabla y migración nueva en `alembic/versions/`, sin editar las viejas.
      Prueba: alembic desde cero y un plan sin marcas devuelve progreso vacío.
- [x] 1.2 Servicio y repositorio: marcar y desmarcar, idempotentes, sin crear revisión.
      Prueba: marcar dos veces deja una marca; la revisión del plan no cambia; precios tampoco.
- [x] 1.3 Rutas `PUT` y `DELETE`, con `ingress`, `proxy_ip`, sesión y CSRF.
      Prueba: plan ajeno igual que inexistente; sin CSRF falla; ruta fuera de la lista falla.
- [x] 1.4 El `GET` del plan incluye el progreso; recalcular conserva las marcas vigentes.
      Prueba: etapa que desaparece al recalcular no deja marca huérfana visible.

Nota de la sección 1 (5/11, orquestador). Las cuatro tareas están en verde con la suite completa
del backend (`7 failed, 1138 passed, 3 skipped, 1 error`; los 7 fallos y el error son previos y
ajenos a este cambio) y `ruff` limpio. El revisor aprobó propiedad, CSRF, listas cerradas de rutas,
migración y ausencia de escrituras sobre la revisión y la PC, y pidió dos correcciones: la lectura
de revisión y progreso en una sola transacción quedó resuelta; la identidad de etapa quedó
parcialmente resuelta.
Queda abierto un punto de diseño, fuera del alcance de estas tareas: una etapa no tiene identidad
estable en el `snapshot`. La implementación usa un hash del contenido semántico
(`name`, `actions`, `materials`) más la ocurrencia y el total de etapas idénticas, de modo que un
recálculo que cambia el conjunto de etapas idénticas **oculta** las marcas del grupo en lugar de
transferirlas. El revisor observa que conservar la marca de una etapa que sigue existiendo exige un
`stage_id` persistente en el snapshot, que cambia el contrato de la revisión y el cálculo, y que
`design.md` hoy resuelve con «se usa su posición». Decisión pendiente del planificador, no del
agente.

## 2. Frontend
- [ ] 2.1 Proxy en `app/api` con la lista exacta y CSRF.
      Prueba: `tests/unit/` del proxy; nunca se envía `user_id`.
- [ ] 2.2 «Ya lo compré» y «Deshacer» en `/tower-plans/[id]`; `PlanSteps` muestra hecha, actual y
      pendiente desde la API. Prueba: `tests/unit/tower-plans.test.tsx`, error visible sin perder la vista.

## 3. Verificación
- [ ] 3.1 `pytest`, `ruff`, `npm test`, `npm run typecheck`, `npm run lint`.
- [ ] 3.2 Recorrido real a 1440 y 390: marcar, recargar, desmarcar, y comprobar que la PC no cambió.
- [ ] 3.3 Revisor: propiedad en el servidor, plan y PC sin modificar, sin jerga.
