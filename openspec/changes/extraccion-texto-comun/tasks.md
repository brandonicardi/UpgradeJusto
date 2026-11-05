# Tasks

Agente `backend`. Nada de reintentos ni de fragmentos que no sean literales del texto.

## 1. Observaciones dudosas
- [x] 1.1 `unknown` con observaciones responde y no agrega líneas confirmadas.
      Prueba: `tests/test_tower38_extraction.py`.
- [x] 1.2 Ausencia no literal se degrada a `unknown`. Prueba: ausencia inventada sin extracto.

## 2. Gramática
- [x] 2.1 Comas y prefijos naturales, en lista propia. Prueba: seis categorías simples y casos negativos.
- [x] 2.2 « y », «de» y artículos. Prueba: «Tengo una placa madre B550M, un Ryzen 7 5700X y una fuente
      de 650W»; «quiero comprar una RTX 3060 y un SSD» no agrega líneas.
- [x] 2.3 Categorías de una sola unidad sin cantidad valen 1; RAM, discos y ventiladores siguen sin
      cantidad inventada. Prueba: `test_single_category_without_quantity_is_one_but_ram_stays_unknown`.

## 3. Salida del proveedor
- [x] 3.1 Esquema estricto de nueve categorías con el modelo por defecto; modo JSON si no se soporta.
      Prueba: el pedido lleva el formato y el chat no cambia. Queda modo JSON: con
      `openai/gpt-oss-20b`, Groq rechazó `json_schema` estricto (HTTP 400, el modelo generó 17 ítems) y
      sin `strict` (HTTP 400 `json_validate_failed`).

## 4. Verificación
- [ ] 4.1 `pytest`, `ruff check` y `tower-extraction38.spec.ts`.
      `pytest` 934 aprobadas y 263 salteadas; `ruff check` limpio. Falta el e2e.
- [x] 4.2 Medición en vivo de tres textos, con líneas propuestas y motivo de cada falla.
      Antes de 2.3, 9 llamadas: 8 respondieron y 1 dio 502 (`json_validate_failed`). Texto con comas:
      2 líneas correctas en 3 de 3. Texto del e2e: 0 líneas, correcto porque no nombra modelos. Texto
      «Tengo una placa madre…»: 0 líneas en 2 corridas, 2.3 ataca la que venía sin cantidad.
- [ ] 4.3 Revisor: citas literales, identidad exacta y cantidad explícita sin aflojar.
