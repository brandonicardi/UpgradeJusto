# Tasks

Agente `frontend`, salvo la revisión. Leer `README.md` y `preview.html` de `PantallaMiPC` y
`PantallaAgregarPC`. Requiere revisión humana y `pantallas-inicio-y-armar` archivado.

## 1. Mi PC (prueba primero)
- [ ] 1.1 Nueve tarjetas con varias líneas, cantidades y los tres estados.
      Prueba: inventario heterogéneo; «No sé» no se ve como «No tengo». `tests/unit/towers38.test.ts`.
- [ ] 1.2 Estado sin PCs con crear o pegar lista, sin PC de ejemplo.
      Prueba: lista vacía sin selección.
- [ ] 1.3 Completar o Cambiar lleva el foco a la categoría del editor, sin atributos de fabricante.
      Prueba: foco en `tower-status-${category}` y ausencia de M.2 editable.

## 2. Agregar por lista
- [ ] 2.1 Pasos pegar, revisar y confirmar, con paso actual visible y texto conservado al volver.
      Prueba: `tests/unit/tower-extraction.test.tsx` más casos nuevos.
- [ ] 2.2 «Revisá lo que entendimos» con nueve categorías editables y evidencia.
      Prueba: la propuesta no pasa directo a guardada.
- [ ] 2.3 Corregir desmarca la confirmación y el botón explica qué falta.
      Prueba: confirmación desmarcada tras editar una línea.
- [ ] 2.4 Catálogo cambiado y resultado incierto con sus acciones, sin éxito ni botón normal.
      Prueba: `tests/unit/tower-extraction-proxy.test.ts` y `tower-simulation-state.test.ts`.
- [ ] 2.5 Cancelar descarta sin enviar y el candado exige confirmación, probado por comportamiento.
      Prueba nueva junto a `tests/unit/curation.test.ts`, que no se afloja (ver `design.md`).

## 3. Verificación
- [ ] 3.1 `npm test`, `npm run typecheck`, `npm run lint`, y e2e `towers38.spec.ts` y
      `tower-extraction38.spec.ts`.
- [ ] 3.2 Capturas reales y recorrido por teclado a 1440 y 390, con una PC real.
- [ ] 3.3 Revisor: fidelidad, regla de confirmación explícita y que simular no modifique la PC.
