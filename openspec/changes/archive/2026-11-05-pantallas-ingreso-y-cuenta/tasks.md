# Tasks

Agente `frontend`, salvo la revisión. Leer `README.md` y `preview.html` de `PantallaIngreso` y
`PantallaCuenta`. Requiere revisión humana y `componentes-pc-y-plan` archivado.

## 1. Acceso (prueba primero)
- [x] 1.1 Pestañas Entrar y Crear cuenta con teclado y un solo formulario activo.
      Prueba: pestaña activa identificada y ayuda de 12 a 128 caracteres.
- [x] 1.2 Aviso general de credenciales rechazadas y aviso de cuenta creada que vuelve a Entrar.
      Prueba: `tests/unit/auth.test.ts` más casos nuevos.
- [x] 1.3 Google dentro de la tarjeta, con bloqueo del acceso local durante el intento.
      Prueba: `tests/unit/google-signin.test.tsx` y `google-proxy.test.ts`.

## 2. Cuenta
- [x] 2.1 Vista autenticada de solo lectura con enlaces y Cerrar sesión; sin controles editables.
      Prueba: cuenta local y Google, y `tests/unit/session-role.test.ts`.

## 3. Verificación
- [x] 3.1 `npm test`, `npm run typecheck`, `npm run lint`, y `tests/e2e/auth.spec.ts`.
      Estado: `npm test` 547 de 548 en verde (la única falla es `tests/unit/curation.test.ts`, previa y
      ajena a este cambio); `npm run typecheck` y `npm run lint` en verde. `tests/e2e/auth.spec.ts`
      actualizado (`Crear cuenta` es `role="tab"`; encabezado autenticado «Tus datos»), pero no se pudo
      ejecutar acá: el fixture del recorrido exige build de producción con 3000 y 8000 libres, y la app
      levantada es de desarrollo en `localhost:3000`. Se verificó el mismo recorrido a mano en el
      navegador con el backend real: registro 201 sin sesión, aviso de cuenta creada, ingreso 200,
      vista «Tus datos», recarga con sesión y cierre 204. Falta correr el gate.
- [x] 3.2 Capturas reales a 1440 y 390 de ingreso, registro y cuenta, sin desborde horizontal.
      Evidencia en `frontend/tests/evidence/pantallas-ingreso-y-cuenta/`: seis PNG y `capturas.mjs`;
      `scrollHorizontal` falso, sin contraste bajo ni texto recortado.
- [x] 3.3 Revisor: fidelidad a las maquetas, reglas del producto y alcance.
      Tres pasadas; se corrigieron los hallazgos (aria-controls del panel, promesas de privacidad,
      aviso de estado anunciado una vez, jerga interna, prueba de teclado y contraseña que se
      conservaba al cambiar de pestaña). Veredicto final: listo para archivar, con el gate de e2e
      como único pendiente.
