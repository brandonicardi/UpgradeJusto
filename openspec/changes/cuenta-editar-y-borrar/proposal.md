# Proposal

## Why

La maqueta `PantallaCuenta` permite cambiar el nombre y la contraseña y borrar la cuenta, y la app no.
Brandon pidió sumar lo que las maquetas muestran y no existe.

## What Changes

- Guardar un nombre visible para la cuenta.
- Cambiar la contraseña, pidiendo la actual. Cierra las demás sesiones.
- Borrar la cuenta y lo que guardó, con doble confirmación.
- El correo sigue de solo lectura. Las cuentas de Google no tienen contraseña local.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `cuentas`: edición y baja de la cuenta.

## Impact

- Backend: rutas en `api/auth.py`, servicio y repositorio de `auth`, una migración si falta el nombre.
- Frontend: secciones nuevas en `/account` y su proxy en `app/api`.
