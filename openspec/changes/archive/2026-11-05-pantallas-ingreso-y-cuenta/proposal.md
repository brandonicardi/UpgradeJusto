# Proposal

## Why
El acceso y la cuenta todavía usan la composición anterior. Se necesita una presentación coherente con `PantallaIngreso` y `PantallaCuenta`, conservando el acceso local y Google real.

## What Changes
- Rediseñar los estados anónimo y autenticado de `/account`: presentación lateral, pestañas de acceso, formulario, datos de cuenta y salida.
- Reusar `Button`, `Field` y `Notice`; conservar carga, errores y bloqueo durante operaciones.
- Adaptar la maqueta a las capacidades existentes: cuenta de solo lectura y accesos a PCs, planes y armado.
- Fuera de alcance: editar nombre/email, cambiar o recuperar contraseña, borrar cuenta, aceptar términos sin documento real y contadores de recursos. No existen esos flujos en la pantalla/API consumida; tampoco se adopta la política de contraseña de ocho caracteres de la maqueta.

## Capabilities
### New Capabilities
Ninguna.

### Modified Capabilities
- `sistema-diseno`: composición accesible de ingreso y cuenta con estados reales.

## Impact
`frontend/app/account/page.tsx`, `components/account-profile.tsx` y presentación envolvente de `components/google-signin.tsx`; estilos locales con tokens. Contratos `lib/auth.ts` y proxies de autenticación se conservan.

Verificar `tests/unit/auth.test.ts`, `google-signin.test.tsx`, `google-proxy.test.ts`, `session-role.test.ts` y `tests/e2e/auth.spec.ts`; capturas y recorrido 1440/390.

Propuesta pendiente de revisión humana antes de apply. El orquestador asigna un único escritor frontend, después de liberar `componentes-pc-y-plan`; el revisor evalúa de forma independiente. No se modifica ningún cambio existente.
