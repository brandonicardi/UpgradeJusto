# PlanSteps

Lista vertical de compras que muestra qué ya hiciste, en qué paso estás y qué viene.

**Qué aporta quien lo usa:** compras ordenadas con nombre simple, costo, estado (hecha, actual, pendiente) y el veredicto de la PC acumulada hasta ese paso.

- Hecha: círculo `pino` con tilde. Actual: círculo `lima` y cuerpo sobre `pino-suave`. Pendiente: círculo `papel-hundido`.
- Cada compra se valida sobre el resultado de las anteriores; el veredicto que se muestra es el de la PC con todos los cambios hasta ahí.
- El costo de cada compra siempre a la vista; el total, arriba de la lista con `PriceTag`.
- La pantalla «Mi plan» (`PantallaMiPlan`) usa su propia lista compacta, con «Tu próxima compra» arriba; `PlanSteps` queda para la vista detallada del plan guardado.
