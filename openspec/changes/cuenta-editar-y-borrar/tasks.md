# Tasks

Backend primero (agente `backend`). La sección 2 es del agente `frontend` y espera a que el frontend
esté libre. Prueba primero.

## 1. Backend
- [x] 1.1 Nombre visible: migración nueva si hace falta y `PATCH /api/auth/account`.
      Prueba: se guarda y vuelve en `/api/auth/session`; vacío o demasiado largo falla; sin CSRF falla.
- [x] 1.2 Cambio de contraseña. Prueba: actual incorrecta falla con error general; la contraseña vieja
      deja de entrar; otras sesiones caen y la actual sigue; Google falla; política de 12 a 128.
- [x] 1.3 Borrado. Prueba: sin `BORRAR` o con contraseña mala no borra nada; borrar deja sin PCs,
      planes, enlaces, conversaciones ni sesiones; un enlace compartido deja de responder; otra persona
      no pierde nada; último admin no se borra.

## 2. Frontend
- [ ] 2.1 Proxy con lista exacta y CSRF. Prueba: nunca envía `user_id`.
- [ ] 2.2 Secciones de `PantallaCuenta`: nombre, contraseña y borrar, con confirmación de `BORRAR`.
      Prueba: `tests/unit/`, botón bloqueado hasta escribir la palabra; error visible.

## 3. Verificación
- [ ] 3.1 `pytest`, `ruff`, `npm test`, `npm run typecheck`, `npm run lint`.
- [ ] 3.2 Recorrido real a 1440 y 390: cambiar nombre, cambiar contraseña, borrar una cuenta de prueba.
- [x] 3.3 Revisor: identidad en el servidor, borrado completo y sin fugas entre personas.
