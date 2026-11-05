# Tasks

Pedidos reales a sitios de terceros, aprobados por Brandon el 5/11: solo CompraGamer y Venex, con los
lectores existentes, una corrida. Sin HardGamers ni otras tiendas.

## 0. Decisión previa
- [x] 0.1 Brandon aprobó leer CompraGamer y Venex y ampliar la validez a 30 días (5/11). Los términos
      de uso no se revisaron.

## 1. Lectura
- [ ] 1.1 Comando único que corre los dos lectores con pausa y corte por tiempo.
      Prueba: sin red, con respuestas guardadas; un sitio caído no borra el lote anterior.
- [ ] 1.2 Generar lotes nuevos y su manifiesto; importarlos sin duplicar.
      Prueba: reimportar el mismo lote no agrega nada.
- [ ] 1.3 Validez de 30 días en vez de 24 h: `retail/models.py:209`, `recommendations/tower_cost.py:33`
      y cualquier otro límite igual, con una sola constante. Prueba: a los 29 días vale, a los 31 no;
      una oferta vencida nunca cuenta como cero. Actualizar las pruebas de 24 h sin aflojar el resto.

## 2. Pantalla
- [ ] 2.1 Rótulo «precio de referencia» con moneda, fecha y tienda.
      Prueba: falta la fecha → «Sin precio».

## 3. Verificación
- [ ] 3.1 `pytest`, `ruff`, `npm test`, `npm run typecheck`, `npm run lint`.
- [ ] 3.2 Revisor: regla 5 de `AGENTS.md` y que nada invente ni promedie precios.
