# 38A — torre schema2 preparada para gate Build, no cierre integral38

## Resultados Build y corrección focal de fixtures/formato

Build informó modelos14PASS exit0, PG38A2PASS exit0 y Ruff check18 archivos exit0.
Format check:11 archivos pendientes/7 correctos exit1. Regresiones116:102PASS y14FAIL
exit1. No se atribuyen ejecuciones al escritor ni aceptación A todavía.
Diagnóstico: fixture CU02 generaba9 evidencias iterando Category mientras contrato
legacy conserva6; catálogo HTTP asumía seed activo y orden de precios; prueba de
rollback PC usaba dataset default viejo y fallaba por409 antes de alcanzar FK.
Corrección SOLO fixtures: propuesta CU02 enumera seis en orden original; catálogo
usa override de snapshot PG histórico EXPLÍCITO sin resetear active/importados y
comprueba pointer intacto al salir; comparación de precios por orden Decimal sin
cambiar importes/cuentas/condiciones; categoría inválida ahora monitor; rollback PC
usa revisión activa explícita conservando assertion IntegrityError y PC intacta.
Formato/imports corregidos por PATCH, sin shell ni cambios lógicos productivos.
Build: rerun focal de fallos diagnosticados y Ruff afectado. No abrir38B antes de
regressionfix+formato+revisión;102 aprobados solo repetir si cambio lo justifica.

Contrato revisión2 aceptado por coordinación; Build confirmó diez specs actualizadas
ANTES de implementación. Ya no existe bloqueo documental. Ownership escritor backend
solo; no cambios a scripts raíz/frontend/specs externas ni datos del usuario.

## Código/API

- `pcs/tower_models.py`: estados explícitos de9 categorías, UUIDs de línea,
  selección catálogo XOR modelo declarado, cantidades estrictas. Desconocido no
  absent; declarados no se normalizan por nombre ni inventan especificaciones.
- `pcs/tower_tables.py`, `tower_repository.py`, `tower_service.py`: escrituras PG
  atómicas, header lock y revisión/CAS, línea propia de PC/categoría, catálogo
  versionado sin fallback. PK(pc_id,line_id), no categoría para múltiples discos.
- `api/towers.py`: GET/POST colección y GET/PUT/DELETE por pc_id, identidad/CSRF/IP
  existentes, cache no-store. Listado incluye adaptaciones legacy de lectura sin
  persistir marker/UUIDs; nuevo PUT explícito convierte a2, mantiene pc_groups viejo.
- Category catálogo añade storage/cooler/fan. Legacy PC/Replacement/Extraction
  explícitamente seis categorías; no cambia sus significados ni evidencia anterior.
- `/api/pcs` filtra torres v2 del listado; GET/PUT/DELETE y servicios legacy de
  evaluación sobre una torre v2 retornan409, nunca proyección truncada verde.
- `api/proxy_ip.py` incorpora towers al mismo gate privado/query firmado;
  `main.py` registra router y no-store. Body/quota/cancel37 sin cambios.

Migración ADITIVA `alembic/versions/38_a_001_towers.py`, parent37_001, crea tablas
nuevas y amplía check categoría catálogo. No backfill/reescritura grupos/JSON/share.
Downgrade rechaza torres persistidas y PG rechaza catálogo de nuevas categorías;
no borra datos para aparentar reversibilidad.

## Límites de acciones

38A publica SOLO CRUD de §1–2, NO simulate/evaluate/recommend/extract de torre aún.
PUT reemplaza configuración explícita completa. category_status exacto9, present
requiere líneas; unknown/absent no llevan líneas. Nuevos line_id null/omitidos y
asignados servidor; reutilización exige misma PC/categoría. RAM quantity=módulos,
no GB, máximo4 grupos/16; discos16; fans8 grupos/32; singulares quantity1.
No herencia implícita de BIOS: context.bios_version es campo requerido explícito,
null válido; no se completa con dato anterior si falta. Simulación posterior usará
candidate_context/replace_category RAM; no activar acciones parciales sobre legacy.
GB resueltos/cobertura torre/métricas/ofertas/fotos/GIS son bloques posteriores.
Nunca presentar CRUD parcial como compatibilidad torre certificada.

## Pruebas preparadas, NO ejecutadas por escritor

`tests/test_towers38_models.py`: nueve estados, datos declarados/unknown/absent,
límites/bool, XOR, autoridad y duplicados de línea, DTO seis categorías preservado.
`tests/test_towers38_pg.py`: CU10 revisión propia con55 discos sintéticos SIN datos
hardware/precio inventados; selección de ID de página posterior50, dos discos
distintos/fans, CRUD, ownership A/B, line_id ajeno/random, CSRF/query/owner_id,
CAS concurrente, legacy409, lectura legacy estable, conversión explícita con BIOS
null y pc_groups/snapshots/share previos intactos. Migración real sobre esquema PG
pre38 SINTÉTICO aislado: copia mínima37, upgrade/downgrade y datos legacy intactos;
limpieza solo de ese namespace TEST. Ninguna migración DEV usada como prueba.

Build (comandos separados, registrar exit individual; escritor NO los ejecutó):
- Wrapper TEST existente seleccionando `tests/test_towers38_pg.py`; conftest migra
  head38_a_001. Ejecutar desde backend, no root para imports de helpers pytest.
- `.venv/Scripts/python.exe -m pytest -q tests/test_towers38_models.py`.
- Ruff check/format focal de archivos38A (incluye integración legacy afectada).
- Regresiones justificadas de PC/compatibility API/extraction/catálogo; no repetir
  suites enteras37/hardware por rutina, ningún proveedor externo necesario paraA.

Sin shell, runners, instalaciones, commits, servidores ni mutaciones DEV propios.
Avisar frontend al pasar gate A; no arrancar API con esquema viejo. No se afirma
PASS/exit ni seguridad aprobada de38A hasta evidencia de Build/revisor.

## Próximo38B tras aceptación A

Google GIS con google-auth[requests]==2.62.0 verificado por Build, migración de
identidades/nonce/nullable; pin backend, lock/sync SOLO Build. Ofertas/media/evidencia
versionadas desde datos reales de Build, filtros667 no límite60. Métricas Blender
CPU workload explícito/TPU1440p raster como referencia chip/memoria con límites y
hash; nada de FPS/variante ASUS exacta inventados. Primero contratos/adaptadores y
datos versionados, después activación controlada de recomendaciones/motor torre,
extracción/planes/MCP/shares según contratos. Google humano pendiente no bloquea
resto. No iniciar38B antes de READY A y checks acordados.
