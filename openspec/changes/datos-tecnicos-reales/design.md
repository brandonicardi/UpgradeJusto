# Design

## Context

`ImportExecutor` publica por el servicio de administración, sin SQL propio. `resolve_published_technical`
ya mezcla `tower_stock_v1` sobre los datos base, y `technical_validation` exige identidad y fuentes
exactas. Hay una torre curada de piezas reales y dos alternativas en `.local/tecnicos/`.

## Goals / Non-Goals

**Goals:** hechos reales en piezas con precio; «Encaja», «No encaja» y «Falta un dato» reales.

**Non-Goals:** tocar reglas, ampliar a todo el catálogo, lectura automática de páginas, y usar datos de
`buildcores`.

## Decisions

- **Archivo versionado.** `data/catalogo/tecnicos/fabricante.json`. Cada hecho lleva fuente y ubicación;
  la procedencia publicada es por página, con `source_id` estable.
- **Un solo sobre.** Todos los hechos van en `tower_stock_v1`, ampliando `SCHEMA` de forma aditiva, en vez
  de repartirlos entre dos esquemas.
- **Qué se excluye.** Coolers y ventiladores, fuera de la política. Cabezales de ventilador, porque su
  voltaje sale de dividir valores. El límite de fuente publicado como «< 200», porque exige interpretarlo.
  Bahías del gabinete, porque su independencia es una lectura; una unidad SATA quedará desconocida.
- **Largo de la placa de video.** ASUS publica tres medidas sin rotular. Se toma la mayor, que es la que
  debe entrar en el gabinete: es la lectura conservadora, y la ubicación lo aclara.
- **Puertos que comparten carriles.** Se publican como exclusiones de a pares, que es lo que documenta el
  fabricante, y no como presupuesto compartido.
- **Soporte de CPU.** La fila P02/P03 ya curada describe el mismo modelo y MPN. Se publica una fila para
  las piezas de tienda con la misma evidencia y BIOS mínima.
- **Publicador.** `catalog_import/manufacturer.py` arma la propuesta y `ImportExecutor` la publica. Si un
  nombre, categoría o MPN difiere, rechaza todo. Las filas de soporte ya publicadas no se pisan.
- **Orden.** En `demo_seed.run`, después de `publish_batches`. Un error se informa y no tumba los lotes.

## Risks / Trade-offs

- [Cobertura chica] → la mayoría de las piezas sigue en «Falta un dato». Es lo honesto.
- [El nombre de una pieza cambia en un lote] → la publicación se rechaza entera y se informa.
- [`pcie8_count` es un mínimo publicado] → puede subestimar; solo produciría un «No encaja» conservador.
