# Tasks

Agente `frontend`, salvo la revisión. Leer `README.md` y `preview.html` de `PantallaCatalogo` y
`PantallaPieza`. Requiere revisión humana y `pantallas-conviene-y-plan` archivado.

## 1. Catálogo (prueba primero)
- [x] 1.1 Buscador, categorías y grilla de `PartCard` sin veredicto.
      Prueba: `tests/unit/catalog-tower-consumer.test.tsx`; sin filtro ni orden sin soporte.
      Grilla en `components/catalog-workbench.tsx` sin la prop `veredicto`; prueba nueva
      `tests/unit/catalog-grid.test.tsx`.
- [x] 1.2 Paginación que conserva parámetros y total del servidor.
      Prueba: combinación de nombre, categoría y orden al cambiar de página.
      Cubierto por `tests/unit/catalog-pagination.test.tsx`.
- [x] 1.3 Estados vacío y error con recuperación, sin tarjetas de muestra.
      Prueba: consulta vacía y fallida. Cubierto por `tests/unit/catalog-states.test.tsx`.
- [x] 1.4 Inspección de la misma variante, descartando respuestas tardías.
      Prueba: cambiar de tarjeta con una respuesta anterior pendiente.
      La selección sale de los datos de la página, así que no hay pedidos asíncronos que descartar.
      `tests/unit/catalog-pagination.test.tsx` prueba que el panel muestra la pieza de la página actual.

## 2. Ficha
- [x] 2.1 Encabezado, imagen, atributos y fuentes con faltantes visibles.
      Prueba: `tests/unit/image-evidence-policy.test.ts`, sin variante parecida. Verde en la suite.
      Prueba nueva `tests/unit/catalog-detail.test.tsx`.
- [x] 2.2 «Comprobar con mi PC» navega a `/pcs` sin guardar ni mostrar veredicto.
      Prueba: enlace y ausencia de pedidos de escritura. Cubierto en `catalog-detail.test.tsx`.
- [x] 2.3 Ofertas con procedencia a 390 y oferta vencida sin rótulo de vigente.
      Prueba: `tests/unit/retail-presentation.test.tsx` y `tests/unit/catalog-grid.test.tsx`. Ofertas
      vigentes vistas a 390 px sin desborde; la oferta vencida se comprobó solo con pruebas unitarias.

## 3. Verificación
- [ ] 3.1 `npm test`, `npm run typecheck`, `npm run lint`, y e2e `catalog.spec.ts` y
      `catalog-data38.spec.ts`.
      Frontend verde: `npm test` 74 archivos / 652 pruebas; `typecheck` y `lint` sin errores.
      E2e del 5/11: `catalog-data38.spec.ts` en verde. `catalog.spec.ts` queda con 1 aprobado y 1
      fallido, por eso esta tarea sigue sin marcar: la línea 37 compara el título de la ficha con un
      nombre abreviado, y la pieza con precio muestra el nombre completo. Se agotaron los dos
      reintentos. `tests/evidence/v0-routes.spec.ts` se alineó sin ejecutarse.
- [x] 3.2 Capturas reales de catálogo y ficha a 1440 y 390, con datos de la base.
      `.local/capturas/pantallas-catalogo-y-pieza/`, contra `localhost:3000`, sin desborde horizontal.
- [x] 3.3 Revisor: fidelidad, evidencia de precios y fotos, y alcance.
      Sin bloqueantes. Tres importantes corregidos: oferta vencida en la tarjeta, enlace de fuente sin
      validar y `data-component-id` fuera del `article`. No se repitió la pasada tras corregir.
