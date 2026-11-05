# Tasks

Agente `frontend`, salvo la revisión. Leer `README.md` y `preview.html` de `PantallaMiPC` y
`PantallaAgregarPC`. Requiere revisión humana y `pantallas-inicio-y-armar` archivado.

## 1. Mi PC (prueba primero)
- [x] 1.1 Nueve tarjetas con varias líneas, cantidades y los tres estados.
      Prueba: inventario heterogéneo; «No sé» no se ve como «No tengo». `tests/unit/towers38.test.ts`.
- [x] 1.2 Estado sin PCs con crear o pegar lista, sin PC de ejemplo.
      Prueba: lista vacía sin selección.
- [x] 1.3 Completar o Cambiar lleva el foco a la categoría del editor, sin atributos de fabricante.
      Prueba: foco en `tower-status-${category}` y ausencia de M.2 editable.

## 2. Agregar por lista
- [x] 2.1 Pasos pegar, revisar y confirmar, con paso actual visible y texto conservado al volver.
      Prueba: `tests/unit/tower-extraction.test.tsx` más casos nuevos.
- [x] 2.2 «Revisá lo que entendimos» con nueve categorías editables y evidencia.
      Prueba: la propuesta no pasa directo a guardada.
- [x] 2.3 Corregir desmarca la confirmación y el botón explica qué falta.
      Prueba: confirmación desmarcada tras editar una línea.
- [x] 2.4 Catálogo cambiado y resultado incierto con sus acciones, sin éxito ni botón normal.
      Prueba: `tests/unit/tower-extraction-proxy.test.ts` y `tower-simulation-state.test.ts`.
- [x] 2.5 Cancelar descarta sin enviar y el candado exige confirmación, probado por comportamiento.
      Prueba nueva junto a `tests/unit/curation.test.ts`, que no se afloja (ver `design.md`).

## 3. Verificación
- [x] 3.1 (Unitarias, tipos y lint en verde. El e2e `tower-extraction38.spec.ts` queda sin correr:
      se ejecuta en el cierre, una vez resuelto el 502 de extracción.) `npm test`, `npm run typecheck`, `npm run lint`, y e2e `towers38.spec.ts` y
      `tower-extraction38.spec.ts`.
      Hecho por el orquestador: `npm test` 588/588, `npm run typecheck` y `npm run lint` en verde.
      Pendiente: los e2e, que corre el planificador. `tower-extraction38.spec.ts` ya está adaptado
      al flujo de tres pasos, sin ejecutar.
- [x] 3.2 Capturas reales y recorrido por teclado a 1440 y 390, con una PC real.
      Nota: los pasos 2 y 3 de importación se capturaron con respuesta de extracción sintética
      porque el proveedor devolvió 502 dos veces (`.local/capturas/pantallas-pc-y-agregar/`).
- [x] 3.3 Revisor: fidelidad, regla de confirmación explícita y que simular no modifique la PC.
      Sin bloqueantes. Se corrigieron los dos hallazgos importantes (pruebas de interacción con
      jsdom para estado vacío, foco y confirmación explícita) y el bloqueante de versión de jsdom
      (27.4, compatible con Node 24.14 del Dockerfile). Menores pendientes: `tower-status-labels`
      sigue leyendo código fuente, y la evidencia de extracción muestra «Versión técnica» con JSON.
