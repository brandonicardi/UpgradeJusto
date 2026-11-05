# Tasks

Agente `frontend`. Rearmar desde `preview.html`, no retocar lo viejo.

## 1. Catálogo
- [ ] 1.1 Encabezado, buscador, píldoras, barra y grilla de `PantallaCatalogo`.
- [ ] 1.2 «¿Encaja en…?» con las PCs de la persona y estado por tarjeta desde `/simulate`.
      Prueba: sin sesión no hay estado; cambiar de PC descarta respuestas viejas; sin escrituras.
- [ ] 1.3 Conservar búsqueda, categoría, orden y paginación del servidor. Prueba: parámetros en la URL.

## 2. Ficha
- [ ] 2.1 Migas, encabezado y «Lo que conviene saber» con atributos reales; faltantes visibles.
- [ ] 2.2 Tabla «Dónde la vimos y a cuánto», con fecha y tienda; «El más bajo» solo entre ofertas vigentes
      que la API devuelva con importe.
- [ ] 2.3 «¿Encaja en tu PC?» con selector, comprobaciones y estado desde `/simulate`.
- [ ] 2.4 «Sumar a mi plan» y «Ver cómo quedaría mi PC» reales. Prueba: ninguna guarda sin confirmar.
- [ ] 2.5 Procedencia y datos técnicos accesibles en un desplegable, sin jerga en lo principal.

## 3. Verificación
- [ ] 3.1 `npm test`, `npm run typecheck`, `npm run lint`, y e2e `catalog.spec.ts` y `catalog-data38.spec.ts`.
- [ ] 3.2 Captura real al lado de la maqueta, a 1440 y 390, con las diferencias listadas.
- [ ] 3.3 Revisor: fidelidad contra la maqueta, veredicto solo del servidor y precios sin inventar.
