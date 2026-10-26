# Retail38B2 — contrato y continuidad

Estado: implementación preparada; sin ejecuciones propias ni aprobación38.
Build es único runner. No se descargan URLs ni se leen credenciales.

## Entrada estable

`python -m upgradejusto.retail.importer --batch PATH --admin-id UUID --expected-active VERSION`

CLI exclusivamente TEST: UJ_ENV=test, UJ_TEST_POSTGRES=1 y DATABASE_URL idéntica a
TEST_DATABASE_URL, destino exacto del fixture PG existente. Admin UUID es identidad
operativa local, NO autorización del modelo; se comprueba rol PG dentro de transacción.
HTTP futuro debe pasar identidad de sesión servidor, nunca admin_id del cuerpo.

JSON UTF8 máximo16MiB, extra fields rechazados, máximo5000 registros:
`{store:"compragamer"|"venex",source_version:string,raw_sha256:hex64,
observed_at:ISO8601conzona,partial_batch:boolean,pagination_complete:boolean,
records:[{product_id:string,category:unaDeNueve,name:string,source_url:https,
mpn:string|null,gtin:string|null,variant_key:string,
identity_verified:boolean,rights_note:string,
image:{url,alt,source_url,retrieved_at,rights_note,exact_variant,status,
photo_bytes_verified:boolean}|null,
offers:[{condition:"cash"|"list",amount:"123.45"|null,
availability:"in_stock"|"out_of_stock"|"unknown",stock_quantity:int|null,
condition_verified:boolean}]}]}`.

`identity_verified` acredita producto/variante del vendedor, no equivalencia con
curación técnica. `variant_key` identifica esa variante exacta; MPN y GTIN separados.
No inferir atributos desde nombre, no unir por nombre/GTIN/UPC. Sin reconciliación
documentada los IDs son cg-PRODUCTID / venex-PRODUCTID, atributos vacíos, precios
legacy vacíos. Identidad incompleta/conflicto se conserva en cuarentena, no se publica.
Precio desconocido null; no cero ni cuotas. Dos condiciones como máximo, sin duplicar.
observed_at común al lote es fecha REAL de adquisición, no fecha de importación.

## Integración

No main wiring requerido: PostgresCatalogRepository agrega recursos por versión al
DTO Component: image URL|null, image_evidence y offers. Columnas históricas image
siguen NULL. Nueva migración `38_c_001` parent `38_b_001`.
`RetailService.publish(server_identity, batch, expected_active)` es la entrada
operativa/HTTP reutilizable; no hace fetch. Publica copia completa de versión actual,
conserva curación, fuentes, soporte y recursos previos. Hash de payload validado más
source_version identifica reintento; igual publicación retorna original sin mover
puntero activo. Ediciones de recursos pasan por nueva publicación, no mutación.

CG: host imagenes.compragamer.com, ruta real /productos/compragamer_Imganen_general_…jpg.
Venex: únicamente host venex.com.ar/www.venex.com.ar y /products_images/; si Build
encuentra otro host/ruta REAL, comunicar evidencia antes de ampliar allowlist.
No proxy, redirect ni validación de bytes propia. photo_bytes_verified distingue
URL mapeada de comprobación binaria; no afirmar667 fotos comprobadas.

## Gates pendientes de Build

Ruff y pytest focal `tests/test_retail38*.py` por separado; migración/rollback TEST;
publicación real CG667 y Venex parcial por Build, revisión de hosts/rutas/condiciones;
conservación históricos; rol revocado; atomicidad; idempotencia; más de50 IDs;
frescura24h e imágenes hostiles. No se ejecutaron comandos aquí.

Archivos listos para integración, NO checks aprobados:
retail/{models,tables,repository,service,reading,importer}.py; migración
alembic/versions/38_c_001_retail.py; catálogo models/postgres y administración
repository (herencia de recursos solo si identidad/nombre/fuentes no cambiaron).
Pruebas nuevas: test_retail38_models.py y test_retail38_postgres.py.
Build debe ejecutar Ruff format/check de estos archivos (sin tocar ajenos), y luego
pytest focal. No claim de formato, resultados o exit codes: no runner en este hijo.
`usable_offers(offers, condition, now)` entrega únicamente fresh/in_stock/monto
conocido para condición explícita; no suma costes ni decide recomendación/compatibilidad.
CLI queda restringida a TEST deliberadamente; publicación operativa en otro entorno
solo mediante servicio e identidad servidor, previa autorización independiente.
No reconciliación con curados ni atributos nuevos: límite material de38B2; Build
debe aportar crosswalk exacto documentado antes de cotizar mejoras sobre esos IDs.
Refresh conflictivo/ambiguo suprime ofertas vigentes y pone foto en cuarentena en
la NUEVA publicación; la publicación anterior conserva toda su evidencia original.

## Gate posterior atribuido a Build

Modelos puros18 PASS0; lint/formato13 archivos0 (wrapping residual completado por
Build tras READY). Las2 pruebas PG retail, incluida curación tras refresh, aprobaron
dentro del gate conjunto12 PASS de Google/migración/retail en TEST; no ejecución
independiente adicional. Revisora cerró P2 y aceptó B2 local tras esa evidencia.
Build publicó lotes reales667CG+10Venex en TEST:691 registros incluidos14 previos,
0 cuarentena;11 reintentos idempotentes conservaron puntero activo. Solo14 registros
tienen atributos técnicos; no conciliación automática ni compatibilidad de691 piezas.
672 URL de foto asociadas y626 ofertas fresh/in_stock; URLs no equivalen a bytes
verificados ni el stock a garantía. No prueba DEV ni cierre integral38.

Normalización posterior: CU10 recortaba nombres y descartaba recursos de registros
pre-fix con espacios extremos. Canonicalización exclusivamente strip, categoría y
fuentes exactas; rename real/case change sigue retirando evidencia. Revisión de
seguridad cerró P2. Build4 PG PASS0 después de reconstruir legado en draft antes de
congelarlo; nunca UPDATE de publicado ni desactivar trigger. Lint/formato0 finales.

## Corrección P2 — refresh comercial y curación CU10

Delta: retail/repository.py crea componente/entradas/fuente vacíos solamente para
identidad nueva. Identidad existente validada conserva componente materializado y
todas las entradas CU10/fuentes sin modificación; refresh cambia recursos comerciales.
Prueba PG añadida en test_retail38_postgres.py:
test_commercial_refresh_preserves_cu10_curation_and_history. Publica sintético,
enriquece atributos vía CU10 manteniendo identidad/nombre/fuentes, publica y refresca
oferta; compara atributos, fuentes, entradas completas e históricos inmutables.
No ejecutada por este hijo. Build: format/check de los dos Python del delta por
separado; después pytest focal PG cuando B1 esté estable; revisión solo del delta.
No publicar lotes reales antes de aprobar este gate.

## Delta integración — canonicalización de nombre, sin matching aproximado

Causa diagnosticada por Build: filas retail antiguas conservaban espacios finales;
CU10 aplica strip al materializar y la comparación exacta descartaba recursos.
VendorRecord.name ahora aplica solo strip tras validar texto. CU10 hereda recursos
si categoría/fuentes coinciden EXACTAMENTE y nombres coinciden tras strip solamente.
No casefold, normalización interna, cambio de variante ni escrituras históricas.
Refresh comercial mantiene la protección P2 de curación/entradas existentes.

Nuevas pruebas propias: test_vendor_name_canonicalizes_only_boundary_whitespace;
test_cu10_legacy_name_trim_preserves_resources_but_real_rename_drops (dos variantes,
incluye cambio de mayúsculas). La prueba PG reconstruye exclusivamente filas y
entradas sintéticas pre-fix dentro de transacción exterior con rollback; compara
recursos completos/ofertas/fuentes/atributos e históricos antes/después de CU10.
Un rename real sigue retirando fotos/ofertas. Sin cambios de fixture torre.

Build: format/lint separados para retail/models.py, administration/repository.py y
tests/test_retail38_{models,postgres}.py; después pruebas retail y cinco tower API
en TEST exclusivo. Sin runners ni nuevos resultados comprobados por este hijo.
