# CU04 — catálogo readonly Sprint31b A

> Vigencia documental 27/10/2026: esta spec reúne requisitos y contratos por versión. Una frase fechada como «antes de implementar», «pendiente» o un resultado Sprint32/38 describe ese incremento; no acredita ni niega el estado de la entrega actual. Estado y aceptación únicos: [CONTINUAR](../CONTINUAR.md) y [matriz](../ENTREGA38_VISUAL.md). Desarrollo detenido; esta consolidación no autoriza ejecutar órdenes históricas.

## Delta autorizado38 — antes de implementar

Nueve categorías torre; búsqueda/paginación remota y resolución por ID independientes
de primeros50 en todos los consumidores. Fotos exactas y ofertas en recursos de
publicación versionados, sin modificar image:null/snapshots antiguos. HTTPS/hosts
permitidos, sin URL arbitraria/SVG ni descargador general; origen/fecha/derechos/
variante/status y fallback honesto. Ofertas ARS contado/lista, stock/consulta/expiración,
24h retail-offer-freshness-1; stale/fallo no es vigente/cero. DTO exacto
[contrato38 §3](CU03-pcs.md#origen-backend-integral38-contract-md). Importación amplia idempotente,
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
# Pedido92 — orden comercial visible, aceptado antes de implementación

Brandon detectó que la página inicial presentaba sólo piezas de referencia sin fotos
ni ofertas aunque ya existen productos comerciales publicados. Se acepta un orden
explícito `sort=retail_first|id` para el GET de listado existente; sin endpoint nuevo,
filtros por parecido ni consultas masivas desde navegador.

- API conserva `id` por defecto para consumidores anteriores. La web puede iniciar
  explícitamente en `retail_first`, con selector de orden visible y URL/paginación que
  preserven la selección. No filtra ni oculta piezas incompletas; total y filtros AND
  mantienen su significado.
- Antes de paginar, ordenar determinísticamente por grupos: foto exacta verificada
  publicada + importe ARS asociado; importe ARS asociado; foto; resto. Desempatar por ID.
  Asociación de oferta por component_id, no por nombre; fotografía requiere exact_variant,
  status verified y URL no nula. No descargar imágenes en el servicio de catálogo.
- Ordenar por referencia publicada no demuestra vigencia, stock, compatibilidad ni
  recomendación. Conservar estados, fechas, fuente y cantidades desconocidas. No
  rejuvenecer precios, modificar revisiones ni cambiar el motor para ordenar tarjetas.
- Enum cerrado y query acotada en API/BFF; mismos límites de página/tamaño y controles
  de transporte. Conservar acceso al orden anterior y a fichas sin recursos.
