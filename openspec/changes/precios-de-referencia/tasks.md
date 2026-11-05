# Tasks

**No empezar sin el OK de Brandon:** hace pedidos reales a sitios de terceros.

## 0. Decisión previa
- [ ] 0.1 Brandon aprueba leer CompraGamer y Venex, después de revisar sus términos de uso.

## 1. Lectura
- [ ] 1.1 Comando único que corre los dos lectores con pausa y corte por tiempo.
      Prueba: sin red, con respuestas guardadas; un sitio caído no borra el lote anterior.
- [ ] 1.2 Generar lotes nuevos y su manifiesto; importarlos sin duplicar.
      Prueba: reimportar el mismo lote no agrega nada.

## 2. Pantalla
- [ ] 2.1 Rótulo «precio de referencia» con moneda, fecha y tienda.
      Prueba: falta la fecha → «Sin precio».

## 3. Verificación
- [ ] 3.1 `pytest`, `ruff`, `npm test`, `npm run typecheck`, `npm run lint`.
- [ ] 3.2 Revisor: regla 5 de `AGENTS.md` y que nada invente ni promedie precios.
