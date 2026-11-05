# Design

## Rutas

`PATCH /api/auth/account` (nombre), `POST /api/auth/password` y `DELETE /api/auth/account`. La identidad
sale siempre de la sesión y todas llevan CSRF. Sumarlas a las listas exactas de `proxy_ip` y del proxy
de `frontend/app/api`.

## Contraseña

Pide la actual y aplica la misma política de 12 a 128 caracteres del registro. Si la actual es
incorrecta responde el mismo error general que el ingreso. Al cambiarla se revocan las demás sesiones
y queda viva la actual. Una cuenta de Google responde error y la pantalla no muestra la sección.

## Borrado

Hay que escribir `BORRAR` en el pedido; una cuenta local además manda su contraseña. Cada módulo borra
lo suyo por su servicio: un módulo no escribe tablas de otro. Se borra todo en una transacción: PCs,
planes y su progreso, enlaces compartidos, conversaciones y sesiones. Los enlaces compartidos dejan de
responder. Un admin demo no se puede borrar si es el último admin.

Antes de escribir, revisar las `ondelete` existentes: lo que ya cae en cascada no se borra a mano, y lo
que quede con `SET NULL` hacia una persona se revisa para no dejar datos personales huérfanos.

## Registros

Nunca se registran contraseñas ni el correo en texto plano.
