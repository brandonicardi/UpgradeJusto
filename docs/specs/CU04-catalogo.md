# CU04 — catálogo readonly Sprint31b A

## Delta autorizado38 — antes de implementar

Nueve categorías torre; búsqueda/paginación remota y resolución por ID independientes
de primeros50 en todos los consumidores. Fotos exactas y ofertas en recursos de
publicación versionados, sin modificar image:null/snapshots antiguos. HTTPS/hosts
permitidos, sin URL arbitraria/SVG ni descargador general; origen/fecha/derechos/
variante/status y fallback honesto. Ofertas ARS contado/lista, stock/consulta/expiración,
24h retail-offer-freshness-1; stale/fallo no es vigente/cero. DTO exacto
[contrato38 §3](../../backend/INTEGRAL38_CONTRACT.md). Importación amplia idempotente,
sin tope60 ni combos/periféricos inflando; cuarentena y publicación atómica CU10.
Aceptación >50, foto rota/variante/host, fecha/coste/stock/licencias. Es alcance,
no importación ejecutada ni garantía de stock; históricos31b conservados.

Contrato aceptado para este incremento, antes de implementar frontend. No decide
compatibilidad ni presupuesto. Dataset `sprint31b-a-v1`, curado exclusivamente desde
HARDWARE_DEMO líneas 9–31, 52–82 y 178–194; 84–114 solo para atributos pertinentes.
Seis categorías: `cpu`, `motherboard`, `ram`, `gpu`, `psu`, `case`. Cooler/pasta
quedan fuera. Identificadores Pxx originales; orden lexicográfico ascendente por id.

## HTTP estable (dataset A y futura persistencia PostgreSQL)

- `GET /api/catalog/components?category=gpu&q=asus&page=1&page_size=12`
- `GET /api/catalog/components/{component_id}`
- Sin autenticación para lectura. Sin escrituras, SQL arbitrario ni evaluación CU05.
- `category` opcional, enum anterior; `q` opcional, strip, máximo 100 caracteres,
  búsqueda substring case-insensitive sobre nombre; vacío equivale a no filtrar.
  Ambos filtros se combinan con AND antes de paginar.
- `page` entero 1..10000 (default 1), `page_size` entero 1..50 (default 12).
- Lista 200: `{dataset_version,items,total,page,page_size}`. Página fuera del
  conjunto: items vacío conservando total. No duplicados ni omisiones al recorrerlo.
- Detalle 200: el mismo objeto componente de la lista, sin envoltorio adicional.
- Componente: `{id,category,name,attributes,sources,prices,image}`.
  `attributes` es un mapa de strings o null; null significa desconocido, nunca
  cero/falso. No inventar atributos ni inferir compatibilidad de nombres comerciales.
  `sources`: lista `{id,url}` de referencias Fxx documentadas para esa pieza.
  `prices`: lista `{amount,currency,date,source}`; amount decimal string positivo,
  currency ISO documentada, date ISO YYYY-MM-DD, source string de procedencia
  documentada. Precio no documentado: lista vacía, no cero. Históricos, no ofertas
  actuales ni garantía de disponibilidad. Conservar observaciones sin inventar fecha.
  `image`: null; UI muestra explícitamente «Imagen no disponible» (sin fotos).
- Detalle inexistente: 404 `{detail:"Component not found"}`. Parámetros inválidos:
  422 con `detail` de validación FastAPI (incluye ubicación y mensaje); no 500.

## Aceptación

API router→servicio→repositorio/dataset; preservar health y motor28. Pruebas HTTP
de combinación, límites, recorrido paginado, vacío, detalle, desconocidos y precios.
UI real en `/` o redirección a `/catalog`, filtros/páginas/detalle con procedencia,
desconocidos, históricos, estados vacíos/error accesibles. Sin mocks finales.
Backend pytest/Ruff/sync; frontend build/typecheck/lint/Vitest y Playwright con ambos
servidores locales reales. Cada comando y código requiere evidencia; no inferirlos.

La revisión independiente31b confirmó fidelidad documental de piezas, atributos,
fuentes y precios, sin validación externa adicional. El checkpoint intermedio que
esperaba códigos fue superado por la corroboración de Build indicada a continuación.

Cierre histórico31b: **A verificado**. Build corroboró exit0 de pytest118, Ruff lint/formato,
sync, tipos/build frontend actuales, lint, Vitest12 y Playwright2. Curación y revisión
integrada cerradas sin hallazgos abiertos; smoke local catálogo/API/health satisfactorio
informado por Build. No implica PostgreSQL, autenticación ni compatibilidad CU05.
