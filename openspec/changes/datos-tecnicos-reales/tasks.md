# Tasks

Depende de `compatibilidad-esencial`. No editar reglas de `compatibility/`.

## 1. Datos
- [x] 1.1 `data/catalogo/tecnicos/fabricante.json` desde `.local/tecnicos/propuesta.json`, con las
      exclusiones de `design.md`. Prueba: cada hecho tiene fuente, fecha y ubicación.

## 2. Publicador
- [x] 2.1 Armar componentes, fuentes y soporte. Prueba: MPN distinto, faltante o pieza inexistente rechaza todo.
- [x] 2.2 Publicar por `ImportExecutor`. Prueba con PostgreSQL: atributos, foto y ofertas previas se
      conservan; la segunda corrida da `unchanged`.
- [x] 2.3 Aplicarlo en `demo_seed.run`. Prueba: un error técnico no impide cargar los lotes.
- [x] 2.4 Los hechos sobreviven a un lote nuevo. Prueba con PostgreSQL.

## 3. Evaluación real
- [x] 3.1 Torre real con BIOS P2.30: `compatible`. Con la memoria DDR5 o la CPU AM5: `incompatible`. Sin
      BIOS: `requiere_verificacion`. Prueba de integración sin mocks del motor.

## 4. Verificación
- [ ] 4.1 `pytest` con PostgreSQL y `ruff`. «Encaja» y «No encaja» visibles en catálogo y ficha.
- [ ] 4.2 Revisor: sin datos inventados, identidad exacta, procedencia y reglas intactas.
