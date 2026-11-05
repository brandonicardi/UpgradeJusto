# Design

## Dónde guardar el progreso

Las revisiones del plan son fotos inmutables (`tower_tables.py`, columna `snapshot`). Guardar el
progreso ahí crearía una revisión por cada tilde y mezclaría «qué compré» con «qué me conviene». Va en
una tabla propia, ligada al plan y a la identidad estable de la etapa dentro de la revisión actual.

Clave `(plan_id, stage_key)`, con `completed_at`. Si la etapa no tiene identidad estable en el
`snapshot`, se usa su posición y se documenta en el código. Al recalcular, las marcas de etapas que
siguen existiendo se conservan; las que ya no existen se ignoran al leer y no se inventan.

## Rutas

`PUT` y `DELETE /api/tower-plans/{id}/stages/{stage_key}/progress`. Las dos son idempotentes: marcar
dos veces deja una sola marca. Hay que sumarlas a `ingress` en `api/tower_plans.py`, a `proxy_ip` y a
la lista exacta del proxy de `frontend/app/api`. El `GET` del plan suma el progreso a su respuesta.

## Propiedad

El dueño sale de la sesión. Un plan ajeno responde igual que uno inexistente. Las mutaciones llevan
CSRF como el resto de `tower-plans`.

## Estado en pantalla

La primera etapa sin marcar es la actual; las marcadas son «Hecha»; el resto, pendientes. Una etapa
bloqueada o por verificar no se marca sola ni cambia su veredicto. Texto del botón: «Ya lo compré» y,
marcada, «Deshacer». Sin jerga.

Marcar no agrega la pieza a la PC guardada (regla 4 de `AGENTS.md`). Ofrecerlo queda fuera de alcance.
