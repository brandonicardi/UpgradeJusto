# Design

Cambio de presentación en `/account`. Los contratos de `lib/auth.ts` y los proxies no se tocan.

## Decisiones
- **Pestañas:** `role="tablist"` con flechas de teclado; se monta un solo formulario por vez. Cambiar
  de pestaña limpia el error general, no el correo escrito.
- **Política de contraseña:** la ayuda dice 12 a 128 caracteres, la regla vigente. El «8 caracteres»
  de la maqueta no se copia.
- **Registro completado:** vuelve a Entrar con `Notice` de cuenta creada; no abre sesión sola.
- **Credenciales rechazadas:** `Notice` general con `role="alert"`, sin marcar un campo ni confirmar
  que el correo existe.
- **Google:** `google-signin.tsx` conserva su lógica y solo cambia lo que lo envuelve. Mientras corre
  un intento, el formulario local queda bloqueado y el estado sigue visible.
- **Cuenta:** solo datos que devuelve la sesión (email, nombre y proveedor si vienen), enlaces a PCs,
  planes y armado, y Cerrar sesión. Lo que la maqueta muestra sin contrato real se omite; no se dejan
  controles deshabilitados ni contadores.

## Composición
Dos columnas a 1440 y apilado a 390, con los tokens de `globals.css`. Reutiliza `Button`, `Field` y
`Notice` de `components/uj`.

## Riesgo
`tests/e2e/auth.spec.ts` puede buscar textos o roles de la pantalla anterior. Se actualiza el selector
solo si cambia el texto visible; nunca se afloja lo que comprueba.
