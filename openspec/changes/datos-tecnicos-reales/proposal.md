# Proposal

## Why

De las 763 piezas del catálogo, solo 14 tienen datos técnicos y ninguna de esas tiene precio. Las piezas
`cg-*` y `venex-*` nunca reciben hechos técnicos, así que el motor responde «Falta un dato» en casi todo
y nunca «No encaja», ni siquiera en un choque evidente como memoria DDR5 en una placa DDR4.

## What Changes

- Un archivo versionado con hechos de fabricante para un grupo chico de piezas reales con precio, cada
  uno con URL, fecha de consulta y ubicación en la página.
- El esquema de `tower_stock_v1` admite los hechos que usa la política esencial.
- Un publicador que los escribe por identidad exacta, con su fila de soporte de CPU.
- `demo_seed` lo aplica después de los lotes, en todos los entornos locales y en Docker.

Depende de `compatibilidad-esencial`: con esa política una torre real llega a «Encaja», y sus variantes a
«No encaja» o «Falta un dato». Este cambio no toca reglas.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `catalogo`: suma la publicación de hechos de fabricante en piezas de tienda.

## Impact

- `backend/upgradejusto/catalog_import/`, `retail/technical_parser.py`, `demo_seed.py`,
  `data/catalogo/tecnicos/` y sus pruebas.
- Sin migración. Sin cambios de frontend.
- Los datos salen de `.local/tecnicos/propuesta.json`, curados a mano desde páginas de fabricante.
