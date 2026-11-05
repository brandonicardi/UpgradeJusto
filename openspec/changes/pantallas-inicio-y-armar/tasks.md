# Tasks

Agente `frontend`, salvo la revisión. Leer `README.md` y `preview.html` de `PantallaInicio` y
`PantallaArmar`. Requiere revisión humana y `pantallas-ingreso-y-cuenta` archivado.

## 0. Decisión previa
- [x] 0.1 Resuelto el 5/11: `lib/purchase-draft.ts` queda intacto y el subtotal se rotula como
      estimado. El origen de los precios se planifica en `precios-de-referencia`.

- [ ] 0.2 Pasar las reglas viejas por elemento de `app/globals.css` (`button`, `input`, `select`,
      `textarea` y demás) a `@layer base`. Hoy están fuera de capa y le ganan a Tailwind: `Button` y las
      pestañas ignoran `rounded-pill` y salen cuadrados, y `.uj-btn` pide `--radius-pill`.
      Prueba: en el navegador, `Button` y las pestañas de ingreso computan 999 px; capturas de una
      pantalla vieja sin regresiones.

## 1. Inicio (prueba primero)
- [ ] 1.1 Promesa principal y caminos a guía, `/pcs`, `/pcs/import` y `/build` por teclado, sin crear
      ni enviar nada. Prueba: `tests/unit/beginner-actions.test.tsx` y `hardware-guide.test.tsx`.
- [ ] 1.2 Pieza destacada real con estado sin datos y acceso al catálogo.
      Prueba: catálogo fallido con los caminos disponibles.

## 2. Armado
- [ ] 2.1 Bloque de criterios: tres objetivos, selector de trabajo y presupuesto decimal u opcional.
      Prueba: un monto decimal se conserva sin redondear y uno vacío sigue vacío.
- [ ] 2.2 Nueve categorías seleccionables y resumen lateral rotulados como manual y por comprar.
      Prueba: armado vacío sin PC automática, total confirmado ni compatibilidad evaluada.
- [ ] 2.3 Agregar o quitar conserva cantidad y cotización y vuelve a pedir consentimiento.
      Prueba: `tests/unit/purchase-draft.test.tsx` sin cambios en sus expectativas.

## 3. Verificación
- [ ] 3.1 `npm test`, `npm run typecheck`, `npm run lint`, y `tests/evidence/beginner-entry.spec.ts`.
- [ ] 3.2 Capturas reales de `/` y `/build` a 1440 y 390, con datos reales y sin recortes.
- [ ] 3.3 Revisor: fidelidad, reglas del producto y que `lib/purchase-draft.ts` siga intacto.
