# Tasks

Agente `frontend`. Rearmar desde `preview.html`, no retocar lo viejo.

## 1. Catálogo
- [x] 1.1 Encabezado, buscador, píldoras, barra y grilla de `PantallaCatalogo`.
- [x] 1.2 «¿Encaja en…?» con las PCs de la persona y estado por tarjeta desde `/simulate`.
      Prueba: sin sesión no hay estado; cambiar de PC descarta respuestas viejas; sin escrituras.
- [x] 1.3 Conservar búsqueda, categoría, orden y paginación del servidor. Prueba: parámetros en la URL.

## 2. Ficha
- [x] 2.1 Migas, encabezado y «Lo que conviene saber» con atributos reales; faltantes visibles.
- [x] 2.2 Tabla «Dónde la vimos y a cuánto», con fecha y tienda; «El más bajo» en la oferta que marque el
      servidor (2.6) y la nota de la maqueta. Prueba: el cliente no compara importes.
      (`tests/unit/catalog-lowest-offer.test.tsx`; la marca sale solo de `offer_id === lowest_offer_id`.)
- [x] 2.3 «¿Encaja en tu PC?» con selector, comprobaciones y estado desde `/simulate`.
- [x] 2.4 «Sumar a mi plan» y «Ver cómo quedaría mi PC» reales. Prueba: ninguna guarda sin confirmar.
      «Sumar a mi plan» abre un borrador donde la persona elige objetivo, presupuesto y etapas.
- [x] 2.5 Procedencia y datos técnicos accesibles en un desplegable, sin jerga en lo principal.
- [x] 2.6 Backend: `lowest_offer_id` calculado al leer, entre ofertas de contado, vigentes, en stock, con
      importe y vistas hace 7 días o menos; `null` si ninguna califica. Empate: menor `offer_id`.
      Prueba: oferta vieja, sin stock, de lista o sin importe no gana.
      (`tests/test_catalog_lowest_offer.py`, 9 en verde; hashes/versiones intactos.)
- [x] 2.7 Backend: orden `price_asc` y `price_desc` por esa oferta; las piezas sin ella van al final en
      ambos, y el empate se resuelve por `id`. Prueba: paginación estable y orden inválido rechazado.
      (Orden inválido: 422 vía Literal; pruebas en `test_catalog*.py`.)
- [x] 2.8 Frontend: «Más baratas primero» y «Más caras primero» en Ordenar; la tarjeta muestra la oferta
      marcada si existe. Prueba: el parámetro viaja en la URL y el cliente no reordena.
      (`catalog-pagination.test.tsx`; proxy con lista cerrada para `sort`.)

## 3. Verificación
- [x] 3.1 `npm test`, `npm run typecheck`, `npm run lint`, y e2e `catalog.spec.ts` y `catalog-data38.spec.ts`.
      (82 archivos / 736 pruebas; typecheck y lint limpios; e2e: 3 de 3 en catálogo.)
- [ ] 3.2 Captura real al lado de la maqueta, a 1440 y 390, con las diferencias listadas.
      Reabierta: la ficha no carga los estilos del encabezado de catálogo y su fecha, precio y pie
      difieren de la maqueta.
      Capturas en `.local/capturas/comparacion/`; desborde 0 px en todas. Sigue distinto:
      catálogo muestra píldoras de categorías extra por datos, orden por defecto «Con fotos y precios
      primero» (por diseño, «Más elegidas» no se muestra) y el pie agrega «comprobá disponibilidad»;
      pieza lista las 12 comprobaciones con «Falta un dato» (la maqueta muestra 4), «Lo que conviene
      saber» queda en una tarjeta sin datos y hay desplegables extra de procedencia y versión.
- [x] 3.3 Revisor: fidelidad contra la maqueta, veredicto solo del servidor y precios sin inventar.
      (Revisor independiente: bloqueante de privacidad y «compatible» contradictorio corregidos y revalidados.)
