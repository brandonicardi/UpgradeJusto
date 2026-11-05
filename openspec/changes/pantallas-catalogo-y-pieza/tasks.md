# Tasks

Agente `frontend`, salvo la revisión. Leer `README.md` y `preview.html` de `PantallaCatalogo` y
`PantallaPieza`. Requiere revisión humana y `pantallas-conviene-y-plan` archivado.

## 1. Catálogo (prueba primero)
- [ ] 1.1 Buscador, categorías y grilla de `PartCard` sin veredicto.
      Prueba: `tests/unit/catalog-tower-consumer.test.tsx`; sin filtro ni orden sin soporte.
- [ ] 1.2 Paginación que conserva parámetros y total del servidor.
      Prueba: combinación de nombre, categoría y orden al cambiar de página.
- [ ] 1.3 Estados vacío y error con recuperación, sin tarjetas de muestra.
      Prueba: consulta vacía y fallida.
- [ ] 1.4 Inspección de la misma variante, descartando respuestas tardías.
      Prueba: cambiar de tarjeta con una respuesta anterior pendiente.

## 2. Ficha
- [ ] 2.1 Encabezado, imagen, atributos y fuentes con faltantes visibles.
      Prueba: `tests/unit/image-evidence-policy.test.ts`, sin variante parecida.
- [ ] 2.2 «Comprobar con mi PC» navega a `/pcs` sin guardar ni mostrar veredicto.
      Prueba: enlace y ausencia de pedidos de escritura.
- [ ] 2.3 Ofertas con procedencia a 390 y oferta vencida sin rótulo de vigente.
      Prueba: `tests/unit/retail-presentation.test.tsx`.

## 3. Verificación
- [ ] 3.1 `npm test`, `npm run typecheck`, `npm run lint`, y e2e `catalog.spec.ts` y
      `catalog-data38.spec.ts`.
- [ ] 3.2 Capturas reales de catálogo y ficha a 1440 y 390, con datos de la base.
- [ ] 3.3 Revisor: fidelidad, evidencia de precios y fotos, y alcance.
