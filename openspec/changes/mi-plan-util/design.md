# Design

## Plata desde el servidor
`TowerPlanRead` suma dos campos derivados al leer, igual que `progress`: `spent_ars` (compras marcadas)
y `remaining_ars` (las demás), con `Decimal` sobre el `cost.total_ars` de cada etapa del snapshot
congelado. Si falta el precio de una etapa de ese lado, el campo es `null`: desconocido no es cero. No
se guarda nada nuevo ni se toca la revisión. La interfaz solo formatea.

## Actualizar precios
Usa `POST /api/tower-plans/{id}/recalculate` con las acciones del plan actual, la revisión esperada del
plan, la revisión de la PC y la versión del catálogo. El resultado no se aplica solo: se compara con el
plan abierto (total más alto o más bajo, veredictos que cambian) y la persona confirma «Guardar los
precios nuevos» o descarta. Si el servidor responde 409 (la PC, el catálogo o el plan cambiaron), se
dice en palabras simples y se vuelve a cargar todo; nunca se reintenta solo. El recálculo crea una
revisión nueva del plan, por contrato, pero no modifica la PC.

## Actualizar Mi PC
Al marcar una compra y en la vista terminada se ofrece actualizar Mi PC. Solo con confirmación explícita
se arma la PC resultante a partir de `evaluated_configuration` de la compra marcada (que el servidor ya
calculó) y se guarda con `PUT /api/towers/{id}` y la revisión esperada de la PC. Sin confirmación no
se escribe nada. Si la revisión cambió, se avisa y no se pisa. Después del cambio, «Actualizar
precios» toma la PC nueva y el plan sigue siendo legible; si el plan ya no coincide con la PC, se dice.

## Ganancia
Solo se muestra lo que el snapshot respalda (`stage.benefit` con estado apoyado), con «Según datos de
referencia. No son FPS.». Sin dato real, no se muestra nada. Los textos fijos en inglés del servidor
no se muestran: se traducen en la interfaz o se omiten.

## Apartar por mes
Cuenta de meses = `ceil(falta / monto)` en la interfaz, rotulada como estimación; el monto vive en
`localStorage` (con `try/catch`) y no viaja al servidor. No es un precio ni un veredicto.

## Vocabulario
Lo visible dice «compra» y «componente». Los nombres internos del contrato (`stage`, `piece`) no cambian.
