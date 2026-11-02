# Entregas técnicas históricas — consolidación 27/10/2026

Evidencia de etapas 37/38/92 y anteriores, NO órdenes ni estado actual. Desarrollo detenido. Las cuotas, bloqueos, permisos, resultados y próximos pasos internos pertenecen a la fecha de cada registro. Estado actual: [CONTINUAR](../CONTINUAR.md); aceptación: [matriz](../ENTREGA38_VISUAL.md). No cargar este volumen completo; buscar el registro requerido. Originales exactos en el respaldo privado de C:, output/archivo-d-2026-10-27/originales.zip.

## Índice
- [backend/BASIC_HANDOFF.md](#origen-backend-basic-handoff-md)
- [backend/CU02_CU10_HANDOFF.md](#origen-backend-cu02-cu10-handoff-md)
- [backend/IMPORT_HANDOFF.md](#origen-backend-import-handoff-md)
- [backend/INTEGRAL38_A_HANDOFF.md](#origen-backend-integral38-a-handoff-md)
- [backend/INTEGRAL38_ASSISTANT_HANDOFF.md](#origen-backend-integral38-assistant-handoff-md)
- [backend/INTEGRAL38_B1_HANDOFF.md](#origen-backend-integral38-b1-handoff-md)
- [backend/INTEGRAL38_ENGINE_HANDOFF.md](#origen-backend-integral38-engine-handoff-md)
- [backend/INTEGRAL38_EXTRACTION_HANDOFF.md](#origen-backend-integral38-extraction-handoff-md)
- [backend/INTEGRAL38_PLAN_HANDOFF.md](#origen-backend-integral38-plan-handoff-md)
- [backend/INTEGRAL38_RECOMMEND_HANDOFF.md](#origen-backend-integral38-recommend-handoff-md)
- [backend/INTEGRAL38_RETAIL_HANDOFF.md](#origen-backend-integral38-retail-handoff-md)
- [backend/INTEGRAL38_SHARE_HANDOFF.md](#origen-backend-integral38-share-handoff-md)
- [backend/INTEGRAL38_TECHNICAL_HANDOFF.md](#origen-backend-integral38-technical-handoff-md)
- [backend/SECURITY37_HANDOFF.md](#origen-backend-security37-handoff-md)
- [frontend/INTEGRAL38-DESIGN.md](#origen-frontend-integral38-design-md)
- [frontend/SECURITY37-CHECKPOINT.md](#origen-frontend-security37-checkpoint-md)
- [backend/upgradejusto/assistant/HANDOFF.md](#origen-backend-upgradejusto-assistant-handoff-md)


<a id="origen-backend-basic-handoff-md"></a>

## Origen: backend/BASIC_HANDOFF.md

# CU05/CU06 básico stock — CORE activado; verificación Build pendiente

## Corrección focal revisor: sockets de fuentes independientes

B01 básico reconcilia socket de CPU y motherboard en BasicSpecs con observaciones
publicadas cpu_support. Conflicto declarado o discrepancia documentada añade
`cpu_support.cpu_socket_source_conflict/disagreement` o
`cpu_support.motherboard_socket_source_conflict/disagreement`; no prioridad favorable
inventada. Se conservan hechos/evidencia y cualquier fallo BIOS conocido. La ausencia
del campo en dataset no invalida por sí sola el soporte CPU documentado independiente.
Legacy cpu_rule/evaluate_d intactos; inventario/scope/versiones sin cambios.
Preparados `tests/test_basic_stock_socket.py` y los dos casos parametrizados
`tests/test_basic_stock_pg.py::test_published_socket_conflict_blocks_new_evaluation_preserves_old_bytes`.
Cubren conflicto CPU/board, discrepancia AM5 sin marcador, ausencia no contradictoria,
fail BIOS/P16 con faltantes, publicación CU10 y bytes previos plan/share/PC intactos.
Build: seleccionar SOLO estos nuevos unitarios/PG focal y Ruff de archivos tocados;
sin repetir107 aprobados. No shell ni ejecución propia; pendiente verificación/revisión.

## Gate final preparado (sin ejecución propia)

Contrato permanece B01–B07 requerido, mismos scope/policy/inventory/engine IDs.
Build informó:40 focales PASS0,19s y evaluación real PG A/B compatible con7checks y
8warnings tras corrección DIMM; son resultados de Build, no de este escritor.
Test nuevo `tests/test_basic_stock_pg.py` consume muestra RAW real mediante
build_proposal y publica fuentes/datos por CU10 autenticado en revisión propia.
Reutiliza admin_actors/plan_actors/actors y su restauración final de pointer/limpieza.
Cubre dos positivos API, BIOS unknown, P16 fail+missing, recomendaciones RAM/VRAM,
presupuesto insuficiente, identidad/rol, extras scope/checks rechazados, source AMD
retirada solo en revisión nueva y bytes previos plan/share/PC intactos.
`assistant/graph.py`: solo POLICY textual exige scope.label/assumptions,
warnings/excludes, prohíbe certificación física total y reinterpretación legacy.
`tests/test_basic_stock_assistant.py` comprueba contrato textual y proyección completa
de resultados importados, faltantes y scope dentro del límite24k; no es prueba live.

Selección para Build: wrapper PG existente con
`tests/test_basic_stock_pg.py`; unitarios nuevos
`.venv/Scripts/python.exe -m pytest -q tests/test_basic_stock_assistant.py`.
Ruff focal sobre esos dos tests y `upgradejusto/assistant/graph.py`; checks separados,
sin servidores concurrentes. No se ejecutaron aquí ni se atribuyen códigos propios.
Pendientes: nuevos focales PG/unit, revisión independiente, asistente LIVE/recorrido
web coordinado. No declarar diez CU cerrados ni repetir suites históricas de rutina.

## Contrato estable para frontend

Rutas/cuerpos/identidad/propiedad/revisión y errores existentes conservados. No hay
flags cliente de alcance, preaprobación, owner_id ni cooler seleccionado.
Nuevas evaluaciones API, simulaciones, recomendaciones y cálculos de planes usan
evaluate_current → evaluate_basic. Leer planes/shares anteriores no recalcula.
evaluate/evaluate_d y serialización legacy de12 checks permanecen reproducibles.

DTO aditivo sobre EvaluationResponse:

- `scope`: `{id,policy_version,inventory_version,label,operating_regime,
  inventory_reason,includes,excludes,assumptions}`.
- `id=cu05-basic-stock-1`, `policy_version=basic-stock-policy-1`,
  `inventory_version=basic-stock-inventory-1`, `operating_regime=stock_no_oc`.
- `rules_version=cu05-basic-stock-engine-1`; data_revision incluye publicación,
  basic-manufacturer-evidence-1 y digests de importación usados.
- `coverage.required` y rule_results: **exactamente B01–B07**. CPU/BIOS, RAM,
  GPU/interfaz, largo nominal GPU, política PSU, conectores, formatos/largo PSU.
- `additional_checks[]`: `{id,status,reason,evidence_refs}`. Status outside_scope,
  unknown, pass o fail. B08 almacenamiento/B09 frontales visibles, NO required,
  sin inventar mapa instalado ni ausencia. Fallo adicional documentado domina.
- `warnings`: texto visible. Geometría/cables milimétricos/transitorios/certificación
  térmica fuera del alcance. Compatible solo significa básico stock condicionado;
  unknown adicional no se disfraza de aprobación. Unknown básico bloquea.

Snapshots legacy omiten scope/additional_checks/warnings. Validación rechaza mezclar
inventarios/versiones o declarar compatible con unknown básico. Shares preservan
metadata/advertencias con etiquetas canónicas, sin notas privadas; asistente valida
y conserva metadata, proyectando también evidencia adicional.

## Publicación necesaria por Build, NO fallback estático

**Antes de probar positivos reales**, publicar mediante CU10 existente las cuatro
filas exactas exportadas por
`upgradejusto.compatibility.basic_manufacturer.SUPPLEMENTAL_SOURCES`:
`BASIC-PCIE-1`, `BASIC-NVIDIA4060-1`, `BASIC-NVIDIA5070-1`, `BASIC-AMD-STOCK-1`.
Son SourceData `{source_id,url,consulted_on,locator}`, sin migración/dependencias.
No basta que URLs estén en el código: se exigen filas publicadas coincidentes;
sin NVIDIA/PCIe publicadas B05/B03 siguen unknown. Investigación25/10 fue comunicada
por coordinación; no atribuir reconsulta ni publicación a este escritor.

Política: continua≥MAX(ASUS exacta550/750W,NVIDIA chipset550/650W).
Margen contenido en recomendaciones; sin reservas añadidas ni sumas TDP/placa/RAM.
Inferencia de aplicabilidad explícita Ryzen5000AM4 stock clase≤65W frente a referencias
Ryzen95900X105W/Ryzen99950X170W; clase NO es demanda DC ni garantía universal.
Sin OC/PBO, una GPU/un NVMe/hasta cuatro fans/sin cargas extraordinarias.
RM750e750W total coherente; conflicto12V62,5A vs54,2A visible adicional, sin elegir
cifra favorable. Cables propios; adaptador exige ramales independientes, no solo
cantidad de conectores. Ruta nativa preferida. Rating CX55030°C visible, no medido.
5600 boxed/cooler y5700X sin cooler son advertencias: nunca cooler instalado ficticio.

## Adaptador importador/MFR

`attributes.basic_stock_v1` conserva contrato real≤2000 caracteres:
`{version:1,data:{...},fields:{campo:[source_ids]},conflicts:{campo:[{value,source}]},import_digest:sha256}`.
Refs contra sources publicadas y asociadas al componente. Números/decimales/unidades
preservados, cero no implica desconocido; dimensiones/capacidades no positivas no
producen aprobación. Complemento MFR por modelo+atributos técnicos+fuentes exactas
publicadas, no ID de pieza/PC. Fuentes añadidas no borran hechos MFR independientes;
cambios de atributos/fuentes invalidan; conflictos relevantes no se suprimen.
Quarantine BC no impide evidencia ASUS/Corsair independiente del modelo exacto.
Beneficio RAM/VRAM general por capacidad documentada; no FPS/gaming/productivity
inventados. Costos Decimal ARS conservan precios/fechas/dependencias completos.

## Checks

Preparados: test_basic_stock_contract.py, test_basic_stock_engine.py y
test_basic_stock_scenarios.py (fixtures unitarias, NO prueba de PostgreSQL).
Cubren inventario7, positivo/negativo/unknown/fail+missing, MHz nominales, umbrales,
aplicabilidad CPU, ramales/nativo, fuentes faltantes/ediciones, IDs nuevos, legacy,
dos demos y recomendaciones ARS/presupuesto insuficiente. **No ejecutados aquí**.
Build informó gate anterior9PASS/import6PASS y1PG; son anteriores a este delta,
no validan automáticamente activación/política/consumidores nuevos.
Pendiente: Ruff focal, estas pruebas, regresiones afectadas y PG real por wrapper;
revisión independiente y recorrido web final. No declarar CU05/06 cerrados aún.
No shell/runners/instalaciones propios, ni cambios a importador/datos/frontend,
README/dependencias/migraciones/docs raíz. IMPORT_HANDOFF.md denegó lectura; se usó
contrato comunicado y proposal.py de solo lectura.



<a id="origen-backend-cu02-cu10-handoff-md"></a>

## Origen: backend/CU02_CU10_HANDOFF.md

# Sprint33 backend — contrato exacto CU02/CU10

**Vigente25/10:** bloque funcional LOCAL aprobado por revisión independiente.
Gate web Groq+PG aprobado y cancelación posterior a propuesta probada separadamente
con respuesta controlada. El405 y los bloqueos siguientes quedan como historia.
Prompt aclara JSON sin envoltorio y excerpt RAM literal con nombre/cantidad, sin
relajar validadores;26 tests extracción0. PG posterior consistente con14 componentes
y precios/fuentes restaurados mediante nueva revisión. Detener para medir cuota.

Actualización Build: migraciones/seed DEV y TEST0;26 tests nuevos y113 regresiones
afectadas0. Delta posterior:39 tests focales0, incluyendo bootstrap exacto del
proyecto, shares versionados y concurrencia real. Mismo revisor resuelve ambos
hallazgos backend. Ruff lint/formato123 archivos0. Integración web NO APROBADA:
405 consultando prices de revisión; sin Groq/confirmación/publicación browser.
Detenido para medir cuota. El estado preparado siguiente es el handoff original.

Estado: código preparado, **sin ejecutar** migración/tests/IA en esta sesión.
Build ejecuta checks separados, captura cada exit code y formatea solo estos cambios.
No habilitar frontend como verificado hasta gates PG + Groq y revisión independiente.
Sin nuevas dependencias/manifests, instalaciones ni shell del especialista.

## Convenciones

JSON cerrado, cookies/sesiones/CSRF existentes. Mutaciones requieren `Origin` y
`X-CSRF-Token`; identidad siempre servidor. Errores `{detail: string}` salvo 422 de
validación HTTP `{detail: [{type,loc,msg}]}`; nunca incluir input, prompt ni respuesta
cruda. Auth 401, CSRF/rol 403, inexistente 404, revisión 409, validación 422, cuota
429, proveedor/JSON 502, PG/config 503, timeout total proveedor 504. No retries de IA.

## CU02

- `POST /api/pcs/extract` `{text: string}` (1–12000, no blanco/NUL) →200:
  `{proposal: PCCreate, evidence: Evidence[6], warnings: string[], dataset_version}`.
- `PCCreate`: `{name: string(1–100), components: ComponentGroup[0..6],
  context: {bios_version: string|null, notes: string|null}}`.
  `ComponentGroup`: `{category, component_id: string, quantity: integer(1..8)}`;
  no categorías repetidas; salvo RAM cantidad=1. Unknown se omite de components.
  Categorías: `cpu|motherboard|ram|gpu|psu|case`.
- `Evidence`: `{field: category, origin: catalog|text|unknown|ambiguous,
  excerpt: string(1..400)|null, candidate_ids: string[]}`; seis categorías únicas.
  IDs validados contra revisión fijada; excerpt debe ser fragmento real del input.
  Selección requiere evidencia catalog unívoca; matching literal, no fuzzy/alias.
  RAM seleccionada requiere cantidad explícita `Nx`/`N×`/`N módulos` en excerpt.
  La propuesta fija nombre `PC extraída`, BIOS/notas null: editar declaración antes
  de guardar. No herramientas de modelo, guardado de texto ni trazado LangSmith.
- `POST /api/pcs/extract/confirm`
  `{confirmed: true, pc: PCCreate, metadata: {dataset_version: string, edited: boolean}}`
  →201 PC existente `{id,name,revision,components,context}`.
  Falta/falso/no booleano/owner_id/user_id/campos extra →422. Metadata no autentica
  extracción. Revisión distinta/referencias cambiadas →409. PCService recibe dueño
  de sesión, vuelve a validar y escribe FK de revisión fijada; lock PG evita guardar
  tras cambio del puntero durante el request. **Sin idempotencia/retry automático**.
  La UI bloquea doble envío; ante red incierta revisar lista antes de reenviar.

## CU10: rutas exactas

Todas consultan rol PG `admin` en cada operación; ninguna acepta rol/owner del cliente.

| Método/ruta | Body | Respuesta |
|---|---|---|
| GET `/api/admin/revisions` | — | página revisiones |
| POST `/api/admin/revisions` | `{base_version}` | 201 `{id,base_version,status:"draft"}` |
| GET `/api/admin/revisions/{id}/{collection}` | — | página filas |
| POST misma | `{data: DTO}` | 201 `{id,data}` |
| PATCH misma + `/{row_id}` | `{data: DTO parcial}` | 200 `{id,data}` completo |
| DELETE misma + `/{row_id}` | — | 204 |
| POST `/api/admin/revisions/{id}/publish` | `{expected_active_version}` | 200 `{dataset_version,status:"published"}` |

`collection` cerrado `components|prices|sources|cpu_support`. Páginas:
`{items,total,limit,offset}`, limit 1–100/default25, offset>=0/default0. Revisiones:
`{id,base_version:string|null,status:draft|published,active:boolean}`.
IDs de filas/revisión/componentes nuevos generados servidor. Los `source_id` dentro
de evidencia son identificadores de procedencia declarados, no identidad/autorización.
PATCH mezcla solo campos superiores; objetos/listas anidados se reemplazan completos
y el resultado completo se valida. Referencias cruzadas pueden quedar incompletas en
borrador; publicar las valida todas y falla422 sin cambiar activa.

### DTO `data` por colección (campos obligatorios al POST)

- **components**: `{category,name,attributes,sources}`. `sources` lista no vacía de
  Source existente `{id,url}`; cada par debe existir en colección sources al publicar.
  `attributes`: valores string|null y claves cerradas por categoría:
  - cpu: socket, cores, threads, memory_type, tdp.
  - motherboard: form_factor, memory_type, dimm_slots, max_memory, installed_bios.
  - ram: capacity_per_module, rank, memory_type, latency, voltage, module_type, height.
  - gpu: length, height, thickness, slots, vram, interface, power_connector, recommended_psu.
  - psu: continuous_power, length, pcie_cables, temperature_rating, dimensions,
    standard, spare_pcie_cable_count, evidence_note.
  - case: motherboard_formats, psu_limit, gpu_length_limit, gpu_height_limit,
    cooler_height_limit, slots.
  No claves nuevas/DSL; installed_bios solo null (la instalada se declara en PC).
  No `id/prices/image` dentro de data: precio se administra aparte, image sigue null.
- **prices**: `{component_id,amount,currency:"ARS",date:"YYYY-MM-DD",source}`.
  amount string decimal no negativo, hasta dos decimales, <=999999999999.99;
  nunca float. source string no vacía de procedencia/condiciones; conserva el formato
  histórico de Price, no un ID inventado. Ausencia de fila = precio desconocido,
  no cero. Todas las filas históricas se copian al borrador; cambiar una no elimina
  las demás. Publicar materializa precios de la revisión, sin PRICE_RECORDS estático.
- **sources**: `{source_id,url,consulted_on:"YYYY-MM-DD",locator}`.
  HTTP(S), sin credenciales; servidor no navega URLs. Par source_id/url único.
- **cpu_support**: `{cpu_component_id,motherboard_component_id,cpu_socket,
  motherboard_socket,applicable_revision,row}`. Observaciones:
  `{value:string,status:"documented",evidence:EvidenceRef[]}` (evidencia no vacía).
  row reutiliza CpuSupportRow:
  `{cpu_model,motherboard_model,applicable_revision,minimum_bios,
  earlier_bios:string[],evidence:EvidenceRef[]}`.
  EvidenceRef: `{source_id,url,locator,consulted_on:"YYYY-MM-DD"}`; par y fecha deben
  existir en sources. Modelos/revisión exactos; una fila por par CPU/placa.
  `minimum_bios`/`earlier_bios` son cadenas exactas de relación explícita existente:
  NO float, orden lexicográfico, SemVer ni aliases. No tolerancias ni familias nuevas.

Publicación PG bloquea puntero, comprueba base esperada, valida, inserta dataset nuevo,
materializa componentes/precios y cambia puntero en una transacción. Triggers protegen
publicados. Repositorio público construido **por request**, carga catálogo y parámetros
del mismo puntero, no constante global ni fallback. Evaluaciones nuevas incluyen nueva
data_revision; planes/shares anteriores no se actualizan, FK PC antigua conservada.
Eliminar una referencia del catálogo activo no remapea PCs antiguas silenciosamente:
lectura de PC conserva IDs; nuevas evaluaciones/guardados pueden exigir revisión manual.

## Bootstrap y checks que ejecuta Build

Crear cuenta NUEVA explícita del proyecto `@example.test` usando flujo existente,
credencial exclusivamente local/ignorada; nunca cuenta personal ni heurística.
En entorno local `UJ_ENV=dev|test`, PG loopback migrado:

`.venv/Scripts/python.exe -m upgradejusto.administration.bootstrap --email <nueva@example.test> --confirm-project-test-account`

No registro automático en CLI, no endpoint de elevación. Bootstrap rechaza cuenta
ausente/personal, falta de confirmación, PG remoto o entorno producción.

Checks individuales, entorno mediante wrapper autorizado (no leer credenciales):
1. Ruff format **solo archivos cambiados del bloque**; luego check y format --check,
   cada comando/código separado. El especialista no pudo ejecutar formatter.
2. Alembic upgrade head, migración `33_001` sobre `32_i_001`, PG real; verificar seed.
3. pytest `tests/test_extraction.py` (unitario; proveedor doble NO es prueba IA real).
4. pytest `tests/test_cu02_cu10_postgres.py` con guardas PG existentes (`UJ_ENV=test`,
   UJ_TEST_POSTGRES=1, DATABASE_URL/TEST_DATABASE_URL configurados por wrapper).
   Ejecutar sin paralelismo: test publica y restaura puntero, conserva revisiones
   publicadas de prueba append-only por diseño; limpia solo actores/planes propios.
5. pytest `tests/test_extraction_live.py`, opt-in `UJ_TEST_EXTRACTION_LIVE=1`, una
   llamada Groq facturable y confirmación real. No CU08 chat LIVE ni fullsuite32.
6. Revisión independiente de auth/aislamiento y delta antes de integración frontend.

Pendiente y no verificado: todos los códigos de salida, PG/migración/bootstrap real,
proveedor Groq, UI, concurrencia de publicación fuera del conflicto secuencial probado
por el test preparado, revisión independiente. No cierre CU02/CU10 ni CU05/R01.

Checkpoint final del bloque: **DETENER continuación automática y medir cuota**.



<a id="origen-backend-import-handoff-md"></a>

## Origen: backend/IMPORT_HANDOFF.md

# Import handoff — proposed contract, 2026-10-25

Scope: importer only; no catalog/engine/administration edits. Sources are the local
acquired raw-sample.json, never executable upstream repositories. Publication is
local only: BuildCores CC-BY-NC-SA-4.0 attribution/NC/SA and docyx MIT preserved.

CORE contract requested: allow `basic_stock_v1` in ComponentData attributes for
all categories. Value is canonical compact JSON, <=2000 characters:
`{"conflicts":{},"data":{"socket":"AM4","tdp_w":65},"fields":{"socket":["hw-…"],"tdp_w":["hw-…"]},"import_digest":"…","version":1}`.
Keys: version, data, fields (field -> source IDs), conflicts (field -> observations),
import_digest. Unknown = null; numeric zero is preserved, never missing-by-truthiness.
No CPU support/BIOS rows, no prices imported. Existing attributes/prices retained;
overlap contradictions with existing curated attributes are reported, not overwritten.
SourceData remains unchanged: source_id, pinned raw URL, consulted_on, locator.
Locator is compact JSON recording revision, record hash, license, schema and transform.
Component.sources deduplicates by source ID and URL.

Proposal input has no user identity. Executor receives owner only from its trusted
server caller and reuses AdministrationService create/write/publish, including PG
authorization and optimistic active-version guard. No credentials, bootstrap or HTTP
endpoint. Same metadata/sources means no draft creation. Old snapshots are immutable.

## READY Build — implementation prepared, NOT executed

Files: `upgradejusto/catalog_import/{__init__,proposal,executor,__main__}.py`,
`tests/test_catalog_import.py`, `tests/test_catalog_import_pg.py`, this handoff.
No writes elsewhere. No shell, installation, credentials, network, migrations,
upstream execution or publication performed. No check exit codes available.

Canonical JSON keys exactly: `version`, `data`, `fields`, `conflicts`,
`import_digest`. `fields` lists source IDs including existing curated references
when involved in a conflict. Each conflict observation is `{value,source}`.
Numerical keys carry units in their names. `interface` normalizes e.g.
`PCIe 4.0 X8`; formats: `ATX`, `mATX`, `ITX`; connector counts retain zero and
null separately and MUST NOT be interpreted as independent cables. Empty upstream
format lists become null (not evidence of no supported formats). TDP != demand DC.
BIOS, cooler inclusion, power recommendations and ARS quotes are not fabricated.

Closed `data` keys by category (all unlisted fields stay outside this import):
- CPU: socket, cores, threads, tdp_w, ppt_w, memory_types.
- Motherboard: socket, form_factor, memory_type, dimm_slots, max_memory_gb.
- RAM: memory_type, module_type, capacity_per_module_gb, modules, voltage_v,
  ecc, buffering. `288-PIN DIMM` is not silently aliased to UDIMM.
- GPU: length_mm, vram_gb, interface, tdp_w, slots, power_connectors.
- PSU: continuous_power_w, length_mm, form_factor, psu_connectors.
- Case: board_formats, psu_formats, gpu_length_limit_mm,
  cooler_height_limit_mm, slots.

`build_proposal(sample, active_component_rows)` consumes the acquired data, preserves
legacy strings/null and all 14 existing IDs (untouched IDs are inherited from base
revision), imports no new components and creates no prices/support rows. Source pins,
record SHA256 and optional canonical envelope checksum fail closed. CLI additionally
requires raw-file SHA256. Digest is SHA256 over pinned canonical observations and
transform version, independent of record order/direct duplicate acquisition rows.

Trusted invocation:
`version, rows, sources = active_snapshot(service, authenticated_owner)`;
`proposal = build_proposal(sample, rows)`;
`ImportExecutor(service).publish(authenticated_owner, version, proposal)`.
No owner in DTO. CLI prints proposal only; `--publish` deliberately refuses until
a trusted server adapter supplies authenticated identity (no credential-file design).
CU10's existing publication is atomic; an interrupted staging operation can leave a
draft but cannot partially change active catalog. Same metadata/sources is a no-op;
no restoration of old pointers, mutation of old revisions or duplicate source rows.

Identity limits requiring coordinator decision: P08 is AR while acquired BC SKUs
are NA/EU/UK/AU; these are NOT accepted aliases. P15/P16 candidates without the
exact MPN stay unresolved. Meshify TG/null-panel docyx rows stay quarantined for
Solid; RM750e2023 never becomes2025; Pro4 never becomes ProSE. docyx contributes
actual CPU chip fields (not BOX/WOF cooler claims) and exact motherboard-model
fields only after BC exact identity evidence. Candidate targets never authorize a
match. Report has all14 targets, missing fields, source IDs, duplicate/conflict and
quarantined locators. Counts/results await execution, not claimed as PASS.

Build checks, individually, no routine suites:
1. `python -m pytest -q tests/test_catalog_import.py` (actual acquired sample).
2. Existing TEST wrapper: `python -m pytest -q tests/test_catalog_import_pg.py`.
   Requires CORE allowlist first; uses real `pg_engine`, synthetic local admin,
   PG savepoints + outer rollback; proves role denial, old snapshot preservation,
   new publication, no-op/revision-row counts and stale-active refusal.
3. Ruff check/format only these new files. Build owns execution/format/setup;
   no dependency additions. One diagnosed correction then escalate if needed.

CORE must adapt its evidence identity-envelope handling intentionally: adding
sources/metadata currently invalidates old curated baseline extracts. This importer
does NOT change that guard or label imported evidence compatible/recommended.

## Independent review correction — legacy conflict reimport

Diagnosed: both overlap branches assigned legacy observations to every accumulated
Component.sources reference, including imported BC/docyx sources on the second run.
Correction: legacy observations use only sorted/deduplicated non-import references.
`hw-` is the importer's reserved source-ID namespace. Before excluding one, verify
its complete ID+URL against sources derived from the checksum-validated pinned
acquisition records; edited/foreign import identities require explicit recuration
and fail closed. A conflicting legacy observation without non-import provenance
also fails closed; it is neither discarded nor reassigned to BC/docyx. Existing
legacy value/source edits are evaluated from the active snapshot, not overwritten
from previous metadata. No metadata/API/engine contract change.

READY regressions: consecutive proposals must be exactly equal (metadata, conflicts,
digests, references and reports) for socket AM5, unparsed edited socket and recognized
cores8 conflicts. No imported source may receive the foreign legacy observation.
Changed imported URL and loss of legacy provenance are rejected; an actual new
legacy edit changes the proposal instead of masquerading as a no-op. Real PG test
now parametrizes no edit / recognized cores8 / unparsed edited cores: first publish
the explicit CU10 legacy edit, publish import, rebuild, require identical proposal
and no-op with unchanged revision/row counts and preserved old snapshots. Socket
mutation stays unit-only because existing CPU-support rows independently require
the declared socket; this correction does not bypass that CU10 validation.

Execution evidence supplied by coordinator BEFORE this correction: 6 unit tests
exit0 (0.10s), 1 PG test exit0 (0.30s), 49 acquired records, 11 proposed components,
16 imported source rows. These results do NOT verify the correction. New focal
tests and Ruff formatting await Build; no shell/runners/dependencies used here.



<a id="origen-backend-integral38-a-handoff-md"></a>

## Origen: backend/INTEGRAL38_A_HANDOFF.md

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



<a id="origen-backend-integral38-assistant-handoff-md"></a>

## Origen: backend/INTEGRAL38_ASSISTANT_HANDOFF.md

# Assistant38 — seven read-tool/context increment READY for Build gates

Contract accepted/spec CU08 applied by Build before code. NO checks executed here.
No Groq/live success claim, no full38/CU08 closure. get_plan TORRE implementado con
interfaz real recibida después; fixture PG propio preparado con helper aprobado. Exactly
seven registered names remain, no save/apply/share/extract-confirm tool introduced.

## Files

New: assistant/tower_{context,inputs,tools,projection,plans,plan_projection}.py.
Changed existing: assistant/{models,tool_inputs,tool_projection,mcp_server,graph,
repository,service}.py. service change ONLY exposes the fixed, whitelisted full-API
overflow error code; four runner arguments, timeouts and cleanup remain unchanged.
New tests: tests/test_tower38_assistant_pure.py,
tests/test_tower38_assistant_plan_projection.py, tests/test_mcp38_tower_pg.py,
tests/test_mcp38_tower_plans_pg.py.
Documents: INTEGRAL38_ASSISTANT_CONTRACT.md (accepted state), this handoff.
No provider/auth/quota/deadline/main/PC/compatibility/retail/plan/extraction changes.

## Interfaces and transport

- MessageCreate adds optional TurnContext: context_version2, configuration_schema1/2,
  pc_id,expected_pc_revision,objective/budget_ars/price_condition/workload. Closed,
  no client snapshot/notes/owner/URL/proof. Budget reuses Decimal validator and
  workload must apply to productivity. Absent context preserves legacy request flow.
- Repository.begin checks conversation ownership and duplicate request, then
  load_context(engine,server_owner,request) BEFORE pending rows/provider reservation.
  Per-turn TurnHistory(list) carries sanitized context_snapshot attribute only.
  Text remains original; DB history is still plain role/content,20 completed rows.
  No new columns, saved selection or reinterpretation of pasted JSON/history.
- load_context reads owned TowerRepository, checks actual origin_schema/revision;
  legacy is serialized through PCService, tower through Tower DTO. It removes notes,
  includes selected component names from FULL pinned PG catalog (not691-name dump),
  publication/objective metadata and applies24000-byte context cap. The graph adds
  context as versioned HumanMessage DATA, never SystemMessage/authorization. Current
  tool accesses always revalidate owner/revision, not historical contextual authority.
- validate_call keeps seven names. Legacy config tools default configuration_schema1;
  tower requires explicit2. Discriminated closed data uses existing EvaluateRequest,
  TowerSimulationDTO/TowerPreviewRequest without accepting evidence/disabled checks.
  MCP additionally rejects nonempty materials: LLM confirmed:true is NOT a verified
  user availability confirmation. Explicit material confirmation stays in web flow.
- TowerReadTools(engine,catalog,pcs) binds existing TowerService,
  TowerCompatibilityService(TowerEvaluationRepository), and
  TowerRecommendationService(TowerRecommendationRepository). Same server owner,
  expected revision and complete catalog flow as web services. Schema mismatch
  rejects before legacy truncation. Simulation/preview never write PCs or plans.
- get_pc/evaluate_pc/simulate_pc/preview_recommendations tower outputs use
  {configuration_schema:2,data:existingDTO}; project_tower validates typed wrapper,
  preserves ALL lines/rules/facts/missing/coverage/scope/versions and emits
  projection_version2. Notes are removed from each evaluated configuration including
  preview alternatives. Overflow reports full API required, not partial success.
- catalog_search adds page/default1,page_size1..20/default12 with full total; raw
  basic_stock_v1/tower_stock_v1 strings are omitted from its MODEL projection, not
  from service/domain data. Display attributes, sources, image/evidence and dated
  prices/offers retained. search_public_docs retrieval is unchanged, not SQL/fetch.
  Legacy projections remain version1; old plan quotes are not recotized.
- MCP private session/conversation capture/pop/allowlist and per-call auth.current +
  conversation ownership checks unchanged; no provider key inherited or logs added.

Unchanged budgets: projection24KB/input2MB/depth24/nodes50k; graph4 rounds/8calls,
recursion14; service90s/queue64/output32k/close2s/persist3s and all stricter37 controls.
No TLS/provider/quota workaround; extraction691-name TPM413 fix belongs to B3.

## Build-only verification

Ownership released at READY for checks. Seventeen Python paths are scoped above
(the original twelve plus the four plan-branch paths and service.py listed below).
Ruff format/check must use PATCH correction, not shell formatter modifying checkout;
no claimed format approval. Check separately (no pipes):

1. `.venv/Scripts/ruff.exe check upgradejusto/assistant/models.py upgradejusto/assistant/tool_inputs.py upgradejusto/assistant/tool_projection.py upgradejusto/assistant/mcp_server.py upgradejusto/assistant/graph.py upgradejusto/assistant/repository.py upgradejusto/assistant/tower_context.py upgradejusto/assistant/tower_inputs.py upgradejusto/assistant/tower_tools.py upgradejusto/assistant/tower_projection.py tests/test_tower38_assistant_pure.py tests/test_mcp38_tower_pg.py`
2. `.venv/Scripts/ruff.exe format --check` with those SAME twelve paths; report residual
   mechanical delta to sole writer, no semantic relaxation of gates.
3. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_assistant_pure.py`
4. Authorized TEST wrapper: `.venv/Scripts/python.exe -m pytest -q tests/test_mcp38_tower_pg.py`

Pure tests: seven input names; closed identity/proof rejection; explicit2 vs legacy1,
strict bounds; complete12-rule three-state projection/fail+missing; unknown/absent,
UUID/counts; nested notes/privacy; quotes preserved; raw catalog envelope filtering,
paging beyond50 and explicit overflow; ephemeral context not inferred from user text.
PG test: actual SDK stdio listing7 and A/B conversation/PC isolation, live revocation,
actual web-created tower selected from beyond50, read/evaluate equals authoritative
service, simulation/preview no PC write, revision/schema mismatch, catalog page4,
legacy projection1. Context PG admission tests foreign/stale rejection before any
message/provider admission, valid reservation with per-turn snapshot, duplicate409,
interrupted cleanup/release and original text/history unchanged. No mocked PG proof.

No routine repeat of all approved suites requested. Build may select affected legacy
MCP/cancellation regression if diagnostics justify; actual Groq/web gate remains
separate and unverified, with known TLS/TPM issues not fixed by this block.

## Seventh tower branch — real interface received

read_owned_plan(engine,catalog,server_owner,identity) uses real
TowerPlanService(TowerPlanRepository(engine)).get(owner,identity,revision=None), and
TowerPlanRead validation. Legacy read remains real PlanService. Only404 is treated
as absent format; other errors fail closed. Both own live formats sameUUID =>409.
No get recompute/clock/write. MCP shared catalog bootstrap remains as before; tower
plan service itself receives neither catalog nor clock. Projections retain quotes
as stored even if current time/catalog differ; no fresh-price promotion on GET.

tower_plan_projection uses explicit outer/snapshot/stage/version allowlists and
typed Tower/TowerEvaluationResponse, preserving all stages and all coverage. Removes
base.context.notes,stage.evaluated_configuration.context.notes,stage.evaluation.
evaluated_configuration.context.notes and nested allowed context notes. Unknown future
normalized_input/private stage fields are not copied. Pure synthetic tests cover
three poison paths, frozen past dates/status/versions and explicit stage overflow.

Additional Python paths for Ruff/check: assistant/tower_plans.py,
assistant/tower_plan_projection.py, tests/test_tower38_assistant_plan_projection.py.
Pure command: `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_assistant_plan_projection.py`.
Creation interface/helper subsequently received and used, not guessed:
TowerPlanCreate + svc.save(owner,request)->(raw,replayed), plan_context/body from
test_tower38_plan_pg. New test_mcp38_tower_plans_pg.py prepares actual PG/SDK gates:
fresh own A/B towers via TowerService, real unknown plan generation, legacy reads,
owned historical INSERT fixture with >50 other own records, expired synthetic quote
preserved byte-for-byte, all three notes paths/unknown input filtered, no truncation
on live identical UUID across formats, foreign/forged-owner/deleted/revoked rejection,
history1 preserved and absent history404. Only own fixture headers/legacy/conversations
are cleaned; current691 catalog/resources untouched, no UPDATE frozen revisions.
Existing test_mcp38_tower_pg.py covers six-tool/context gates; no test execution or
seventh PG approval claimed here. No write/save/share tool introduced.

Additional Ruff path: tests/test_mcp38_tower_plans_pg.py. New PG command via TEST wrapper:
`.venv/Scripts/python.exe -m pytest -q tests/test_mcp38_tower_plans_pg.py`.
All creation/read interfaces now supplied; no interface blocker remains. READY here
means complete source/test preparation, not passed gates, deployed routing or live
provider success. Relevant precondition for beyond50 MCP fixture is the preserved
published TEST catalog (>60 records, currently691); no automatic reset/import.
Include assistant/service.py in Ruff paths too. Its pure stream test verifies
overflow emits the explicit safe code with failed (not completed) lifecycle; unit
repository is NOT an authentication/PG substitute. No timeout/cleanup values changed.
B3 review/physical policy remain; no real-hardware positive from imports/tests.

## Style-only closure checkpoint — results communicated by Build

Build reports18 pure PASS/exit0 and5 real TEST PG/MCP + mounted-plan PASS/exit0.
Groq real extraction gate already PASS according to Build; not rerun by this child.
That extraction gate does NOT verify this increment's assistant/MCP live LLM/SSE
and history journey. These are reported results, not executions here or MCP approval.

Delta now ONLY imports/wrapping in ten paths: assistant/{graph,tool_projection,
tower_inputs,tower_plan_projection,tower_plans,tower_tools}.py and tests/
{test_mcp38_tower_pg,test_mcp38_tower_plans_pg,test_tower38_assistant_plan_projection,
test_tower38_assistant_pure}.py. No changes to algorithms, values or assertions;
three-path privacy, frozen quotes, ephemeral context and seven-tool inventory intact.
I001 import groups corrected in tower_plan_projection and test_mcp38_tower_pg.
No shell/runners/format executions here; final lint/format confirmation pending Build.
Do not repeat functional/PG/provider gates for this style-only delta. Next step:
focused lint/format, then independent MCP review; no full38 closure or commit/push.

## TEST ONLY — one-turn live diagnostic, source1a34cd4 unchanged

Build reports two failed UI live attempts with HTTP200/SSE, get_pc completed but
no evaluate running event/nonempty delta; terminal generation_failed. This does
NOT identify quota, HTTP413 or validation as cause. New file ONLY:
tests/test_tower38_assistant_live_diagnostic.py. No product/runtime/provider changes.

Transparent test wrappers capture closed tool enums and input shape booleans at
graph.validate_call; known exception classes/numeric status at actual model factory,
bind_tools/astream; whitelisted ToolFailure code at actual runner. Original model,
schemas, arguments, chunks, MCP stdio, auth, PG provider admission, deadlines and
retries/config are untouched. A numeric413 is reported as http_413, not inferred TPM.
No exception strings/bodies/prompts/IDs/context/cookies/tokens in the report.

Actual authenticated message POST uses AssistantService(real Repository, observed
actual graph.run_turn), not direct quota-less run_turn. It creates its own partial
P01 tower and conversation and deletes only those resources after terminal cleanup.
Ordinary user/assistant text persists normally until own fixture cleanup. One message
POST only, no retry. Completion requires real get_pc/evaluate completions + visible
delta + done/completed history; otherwise pytest.fail emits safe JSON, pytrace=False.

Preflight refuses any live request unless BOTH UJ_TEST_ASSISTANT_LIVE=1 and
UJ_TEST_ASSISTANT_DIAGNOSTIC=1, tracing off, no showlocals/verbose SDK logging, and
UJ_TEST_ASSISTANT_DIAGNOSTIC_MESSAGE holds the EXACT synthetic UI utterance supplied
by Build (literal not guessed, not logged). These are process-local TEST inputs;
no .env/provider/model/account/TLS/quota configuration is changed. Read UI literal
from the already-approved public synthetic test, not private prompts/history.

Build first checks only this new file with Ruff lint/format-check separately, then
non-billable wrapper tests:
`.venv/Scripts/python.exe -m pytest -q tests/test_tower38_assistant_live_diagnostic.py -k "not one_admitted"`.
Three pure tests prove observation transparency/redaction, NOT SDK/auth/live success.

Only after that preflight, one justified actual diagnostic via authorized TEST wrapper:
`.venv/Scripts/python.exe -m pytest -q --tb=short --show-capture=no --log-level=WARNING --log-cli-level=WARNING tests/test_tower38_assistant_live_diagnostic.py::test_live_tower_assistant_one_admitted_diagnostic`.
Default capture hides incidental library output; the failure message carries the
closed report. No own execution, results or cause claimed here. No routine repeat
of approved MCP/PG/Groq gates and no changes to the active CU09 writer's files.

## Final bounded diagnostic refinement — TEST ONLY

Build reports prior preflight3 pure PASS0/lint0/format0, then one actual diagnostic:
HTTP200, one message POST, second astream APIError without numeric status,
get_pc completed, no evaluate validation/running event, failed history and successful
cleanup. This excludes parent validate_call rejection and local get_pc projection
failure for THAT run; it does NOT establish413/429/quota or a specific provider code.
Its SDK body was not persisted and cannot be recovered from the captured report.

Only the diagnostic test and this handoff change. Report version2 adds:
provider_error_code (eight explicit allowed literals, unknown string->other_error_code,
nonstring/absent->null), provider_error_type (five allowed literals, unknown string->
other_error_type), body_type_known (dict/list/str/none/other). Root dict or ONE nested
error dict only; code/type keys only. Never message,failed_generation,request/operator
arguments, body string parsing,repr/default=str or raw payload capture. Numeric HTTP
status remains absent if absent on the actual exception; top SSE200 is not copied.

Strict existing synthetic metadata expectation updated with the three new fields.
Additional pure cases exercise direct/nested tool_use_failed, private unknown code/
type sanitization, deeper error objects ignored and opaque/list/string/None bodies.
Sentinel exception message/str/repr and opaque payload str/repr raise if touched.
No SDK/model/account/options/retry/config changes; original factory/logging guard and
all actual service/PG/MCP authorization/admission paths remain intact.

Build preflight (separate lint/format checks of this test), then pure non-billable:
`.venv/Scripts/python.exe -m pytest -q tests/test_tower38_assistant_live_diagnostic.py -k "not one_admitted"`.
Latest live node unchanged: test_live_tower_assistant_one_admitted_diagnostic;
the same two opt-ins, exact unprinted UI message, trace/logging guards and one POST
apply. No own execution. Build MAY authorize one final bounded diagnostic after
preflight; then STOP provider attempts unless a concrete fix is identified. No
product/tool/CU09 changes or full38 completion claimed.

## STOP provider — Build final diagnostic and static-only follow-up

Build reports v2 lint/format0,10 non-billable PASS/one deselected, then the ONE final
live diagnostic failed4.44s: second provider_astream APIError, body_type_known=dict,
provider_error_code=tool_use_failed/type=invalid_request_error, numeric status absent,
no413/429; get_pc completed, no evaluate validation/running event, no delta, failed
history, own cleanup complete and one message POST. These are communicated results,
not executions here. No further provider attempts without a concrete identified fix.
The error enum alone does not identify the generated tool or invalid argument/schema.

Static source clarification: get_pc signature/PCInput contain pc_id ONLY. There is
no configuration_schema default in get_pc. Its universal diagnostic schema-absence
booleans do not imply legacy dispatch: TowerReadTools.get_pc checks server origin_schema
and wraps native towers as2. Missing schema defaults1 apply to evaluate/simulate/
preview selections; a mismatch there rejects AFTER running, not at this observed
provider boundary. No evidence to reopen accepted get_pc privacy/ownership behavior.

Static contract discrepancy to verify without Groq: simulate_pc advertises independent
configuration_schema Literal1|2 and data SimulateRequest|TowerSimulationDTO. Consequently
the signature allows the cross-product schema1 + valid tower actions data, whereas
validate_selection discriminates1 and rejects actions under legacy SimulateRequest.
This is a synthetic schema/validator counterexample, not captured failed_generation
and NOT established cause of the observed upstream tool_use_failed. No test/product
edit authorized/performed for this discrepancy yet.

Graph forwards SDK input schemas to bind_tools; nested unions/references are possible,
but no explicit strict=True is set in source. anyOf/$defs/additionalProperties alone
do not establish Groq incompatibility. Provider factory remains timeout30/retries0/
temperature0 and verified TLS; no change proposed from this diagnostic alone.
Minimal next step: coordinator authorization for one non-billable actual MCP/final
bound-schema vs local-validator contract test with that synthetic combination, plus
valid schema2 evaluation control. No raw provider payload/log access or new LIVE.

## Subsequent Build verification and independent reviews

Build Ruff check17 files0; initial format left four files with wrapping residuals.
Mechanical PATCH only, then format17 files0 and lint changed4 files0. No algorithms,
values or assertions changed;18 pure/4 PG MCP were not rerun for formatting. The
fifth combined PG test belongs to mounted private plans, not an extra MCP test.
Independent functional and security reviews accepted this increment LOCALLY without
verified blockers. Live assistant→MCP→incremental response→history remains pending;
context selection is per-turn, not durably persisted. No full38 or hardware approval.

Privacy boundary: internal MCP transport still carries full private DTOs. Notes are
removed in project_tool_result BEFORE delivery to the LLM, including base context
and both stage configuration paths. Do not expose this transport as a public API
or bypass projection. Future CU09 requires a separate public allowlist and gates.



<a id="origen-backend-integral38-b1-handoff-md"></a>

## Origen: backend/INTEGRAL38_B1_HANDOFF.md

# 38B1 GIS — implementación preparada; gate Build/seguridad pendiente

## Checkpoint de corrección de estilo (resultado atribuido a Build)

Build informó en TEST, sin DEV ni llamadas Google reales:

| Check | Resultado | Exit |
| --- | --- | --- |
| Dependencias LOCK | OK | 0 |
| Dependencias SYNC | OK | 0 |
| Dependencias CHECK | OK | 0 |
| Verificador Google sintético | 21 PASS | 0 |
| Google PG + migración + retail PG, head38_b/38_c | 12 PASS | 0 |
| Regresiones auth/security/authPG/security37PG/body | 52 PASS | 0 |
| Ruff check previo a esta corrección | Separación import local | 1 |
| Ruff format previo a esta corrección | Diez archivos pendientes | 1 |

Build instaló localmente google-auth2.62.0 y transitivas; lock/setup son suyos.
Corrección posterior exclusivamente por PATCH: formato de los diez archivos
señalados, separación uuid4/Pydantic y clave HS256 sintética de al menos32bytes.
Sin cambios de lógica de producto, contratos, migración ni assertions.
No ejecuté shell/runners, instalaciones, PG ni Google; Ruff posterior pendiente
de Build. PG12/regresiones52 no requieren repetición por este delta de estilo.
READY para rerun separado Ruff check/format y revisión independiente de seguridad;
no equivale a gates aprobados ni cierre integral. Si queda estilo residual,
escalar al coordinador con el diff del formatter, sin bucles de corrección.
Login Google humano en navegador sigue pendiente y no lo acredita RSA sintética.

Solo Google38B1. Ownership auth/API Google/main/schema/deps/migración/tests propio;
no retail/catalog/admin ni compatibility/tower_* de otros escritores. No runner,
shell, instalación, lectura de archivos privados, mutación DEV ni llamada Google
propia.38A aceptado y commitcd4f286 informado por Build, no reabierto.

## Dependencias/migración (Build)

Pin añadido pyproject: `google-auth[requests]==2.62.0` (versiones oficiales/C7 ya
verificadas por Build). Nuevo import lazy: app/config/local auth no simulan login si
falta instalación; callback válido sin librería falla503. Build debe lock/sync local,
sin globales ni actualizar proveedores. Tests usan PyJWT/cryptography existentes
confirmados por Build; no claves reales ni archivos de credenciales sintéticos.
Migración ADITIVA `38_b_001_google_identity.py`, parent38_a_001: email/password_hash
nullable juntos explícitamente, profile_email/display_name nuevos, identidades
canonical issuer/sub y tabla intentos nonce. Downgrade rehúsa Google-only/identidades,
no borra cuentas para aparentar reversibilidad. No cambiar histórico38A/37.

## Contrato frontend EXACTO

GET `/api/auth/google/config` →200 `{enabled:bool,client_id:string|null}`.
Solo env público `UJ_GOOGLE_CLIENT_ID`; sin leer archivos/client secret ni tokens.
No modifica UJ_ORIGIN: Build alinea localhost:3000/loopback para demo final. TEST
conserva origen127 de fixtures autorizadas, no acredita orígenes GIS reales.

1. GET `/api/auth/csrf` obtiene cookie anónima y csrf_token (reuso sin emisión37).
2. POST `/api/auth/google/attempts`, cuerpo vacío, Origin/CSRF/cookie actuales →200
   `{attempt_id:UUID,nonce:string,expires_at:ISO}`. Dar nonce a inicialización GIS.
3. Callback JS POST `/api/auth/google` JSON `{attempt_id,credential}` y controles
   anteriores. credential SOLO IDtoken; campos email/user_id/token_type extras422.
4.200 devuelve user y Set-Cookie HttpOnly/SameSite=Lax/path/api rotada12h. Refrescar
   GET csrf antes de próxima mutación: el token CSRF anterior ya NO autoriza.

Local public user sigue EXACTO `{id,email}`. Google-only:
`{id,email:string|null,auth_provider:google,display_name:string|null}`.
email solo perfil verificado/normalizable, puede ser null; nunca clave de enlace.
Frontend debe tratar display_name como texto escapado, no HTML/Markdown confiable.
Mismo email local y Google crea DOS cuentas independientes, no auto-link/fusión.
Google-only tiene columnas email/password_hash null, no contraseña ficticia; ingreso
local conserva Argon2/guardas y rechaza hash ausente. Identidad única canonical
`https://accounts.google.com`/sub; alias oficial accounts.google.com normalizado.

Errores JSON detail sanitizado:401 `Invalid Google ID token`;403 `Forbidden` por
Origin/CSRF/sesión/vinculación incorrecta;409 `Google attempt unavailable` por intento
expirado/usado/cambio clientID;409 `Google identity conflict` ante enlace local no
autorizado;429 `Too many requests` +Retry-After;503 `Google sign-in unavailable` o
`Google verification unavailable`, DB503 `Service unavailable`.413/408/42237 igual.

## Uso único/seguridad/transporte

Intento TTL5min por reloj PG, nonce aleatorio32bytes guardado SOLO SHA256, ligado a
digest de sesión/Origin/client ID. Emisión comparte contador37 `csrf-issue:IP` hash,
30/15min por defecto: anónima+GIS NO tienen presupuestos independientes duplicados.
Solo client_ip servidor confiable. Callback claim PG atómico antes de verificar:
una tentativa realiza máximo una verificación; JWT inválido o certificados503 exige
intento NUEVO (no reintentar credential con mismo attempt).403 previo no quema intento.
completed_at se escribe en la MISMA transacción que identidad + rotación de sesión.
Sesión/expiración se revalidan al reclamar y completar, no se confía en lectura vieja.
Se reconsulta reloj PG DESPUÉS de locks, incluido subject advisory; no aceptar TTL
vencida mientras se esperaba. Exp del IDtoken verificado solo viaja en memoria y
se vuelve a comprobar antes de completar; nunca se persiste el JWT.
Locks sesión→intento→subject advisory(380001,hash32), orden fijo. Claims nunca son
SQL ni owner/model authorization. Sin access/refresh/IDtoken almacenados/loggeados.

Verificador oficial verify_oauth2_token con audience, firma y tiempos, más RS256
obligatorio, issuer/aud/azp, iat/exp enteros, semántica IDtoken/typ, nonce constant-time
y sub acotado. Rechaza jku/x5u/jwk/crit: URL del JWT jamás elige claves.
Certificados SOLO https://www.googleapis.com/oauth2/v1/certs, mapa x509 válido, sin
ramal JWKS que cree transport alternativo. Usa Request oficial con sesión de
transporte fija respaldada por httpx, TLS con política UJ_TLS_TRUST existente,
sin proxies de entorno/redirecciones, status200, ≤1MiB, timeouts2s y deadline
monotónico5s en lectura. Bajo I/O cooperativo, última lectura puede agotar hasta2s
adicionales; cache lock espera≤1s. DNS/event loop/runtime no cooperativos siguen
limitación de plataforma, no garantía física de terminación remota. Nada de120s.
Cache por proceso, max-age/Age respetados con cota1h, no-store/no-cache=0; no refresh
forzado por kid arbitrario. Falla cerrado503 sin bypass TLS ni claves alternativas.

Retención explícita37 añade intentos viejos y referencias a sesiones terminales
viejas ANTES de borrarlas; FK restrictiva, sin cascada de cuentas/conversaciones.
No limpieza automática/startup. No apply DEV ni cambios a PCs/plans/shares/cuotasLLM.

## Pruebas preparadas y selección Build (no ejecutadas aquí)

- `tests/test_google38_verifier.py`: crypto RSA real efímera+google-auth oficial,
  firma alterada/alg/aud/issuer/iat/exp/nonce/access/header/key URL; cache/TLS/fetch
  fijo/timeout/metadatos. Mock solo transporte de certificados PÚBLICOS sintéticos.
- `tests/test_google38_pg.py`: PG/HTTP sesión anónima/local, issuer canónico, no
  auto-link email, perfil nullable/local login, nonce replay/wrong session/Origin/
  CSRF/expiry, quota37 compartida, concurrencia de un intento con crypto real gated,
  rotación/cookie, payload cerrado y DBfail503 antes de verificador. Limpieza solo
  cuentas/filas sintéticas propias antes del teardown de actores.
  Incluye fallo FK/unique inducido DESPUÉS de crypto válida: rollback de identidad,
  usuario y revocación; conserva claim terminal sin autenticar ni escribir cookie.
- `tests/test_google38_migration.py`: esquema auth previo sintético aislado en TEST,
  upgrade conserva credenciales locales y downgrade no elimina Google-only.
- Build lock/sync, Alembic head por wrapper TEST, pytest focales y Ruff separados
  con códigos individuales. Regresiones justificadas CU01/auth/security37 (emisión
  y mantenimiento compartidos); no hardware/frontend/provider suites rutinarias.
  Desde backend: `.venv/Scripts/python.exe -m pytest -q tests/test_google38_verifier.py`;
  wrapper PG TEST selecciona `tests/test_google38_pg.py tests/test_google38_migration.py`.
  Si el head incorpora38_c del escritor retail, coordinar su gate antes de usar
  conftest head; no editar/omitir migraciones ajenas para simular aceptación B1.
- Selecciones desde backend, no root (helpers pytest). Sin callbacks reales Google
  para probar cuota/errores. Sin runner/DB/cache en memoria como prueba PG.

Google navegador REAL continúa pendiente de intervención humana/cuenta; ningún test
de RSA sintética ni botón prueba login Google/orígenes reales. No pedir contraseña/
códigos al modelo. Pendiente gate Build y revisión seguridad independiente B1.
Ofertas/retail/motor avanzan en ownership separado; no se declaran integrados aquí.

## Gate posterior Build/revisión (sin ejecución del autor)

Recheck Ruff check0/format20 archivos0 tras corrección del autor y wrapping mecánico
residual de Build. Test negativo HS256 con clave sintética larga:1 PASS/20 deselected0,
sin aviso de clave corta; no se suma como cobertura independiente a los21 anteriores.
Revisora de seguridad leyó código/pruebas: backend38B1 aceptable LOCALMENTE, sin
defecto bloqueante comprobado. Reservas de cobertura: TTL durante espera del lock de
subject y error de certificados seguido de replay no tienen contraste específico,
aunque el código los contempla. No pentest/Google externo/UI/integral38 aprobado.



<a id="origen-backend-integral38-engine-handoff-md"></a>

## Origen: backend/INTEGRAL38_ENGINE_HANDOFF.md

# MOTOR PURO38 — READY para verificación focal, no integrado

## Contrato adapter

`evaluate_tower(tower, evidence) -> TowerEvaluationResult` en
`upgradejusto.compatibility.tower_engine`; sin HTTP/BD/LLM ni persistencia.
Acepta Tower/TowerCreate schema2 validado; en integración usar Tower leído con
revisión/UUID servidor. El adapter resuelve TODOS los IDs desde publicación fijada.
No exponer `TowerTechnicalEvidenceDTO` como entrada cliente.

`TowerTechnicalEvidenceDTO(data_revision, components, cpu_support=None)`:
components indexado por component_id exacto, valores
`TowerComponentEvidence(category, model, data_revision, specs:BasicSpecs)`.
Cada campo exige `BasicSpecs.references[key]` con EvidenceRef; conflicto/fuente
ausente = desconocido. Model es variante exacta del catálogo, no nombre inferido.
cpu_support reutiliza CpuSupportInput, con instance_id=UUID de línea convertido a
string; soporte exacto/revisión/fuentes como legado. El motor SIEMPRE sustituye
installed_bios por tower.context.bios_version. Placa reemplazada debe recibir BIOS
null por adapter/simulación, nunca heredar contexto anterior. Declarados no resuelven
datos por texto. La entrada no acepta flags para omitir reglas.

## Nuevos campos de evidencia (unidades en nombres)

Se mantienen todos los campos BasicSpecs B01–B07 sin modificar su motor.
motherboard: tower_ports, fan_headers (colecciones de NominalResource),
shared_limits (SharedLimit[]), fan_total_current_ma.
case: storage_bays (NominalResource[]), cooler_height_limit_mm, fan_positions,
fan_supported_sizes_mm. storage: storage_interface (M2-NVMe/SATA u otro exacto),
storage_form, sata_power_count. psu: sata_power_count.
gpu: tower_port_kind, tower_port_form (matching nominal exacto).
cooler: cooler_sockets, cooler_type=air, cooler_height_mm, fan_count,
fan_voltage_mv, fan_current_ma, fan_connector. fan: fan_voltage_mv,
fan_current_ma, fan_connector, fan_size_mm. CPU con stock_cooler_included=true
puede portar explícitamente los mismos campos del cooler incluido; no se deducen.

NominalResource: resource_id,kind,accepts(tuple),voltage_mv?,max_current_ma?,
excludes(tuple IDs de la misma colección),group?,cost=1.
SharedLimit: group,capacity. Puerto por unidad; sin splitters/hubs implícitos.
Conservar listas JSON como tuples al construir NominalResource estricto.
Inventarios vacíos documentados son evidencia de cero; ausentes siguen unknown.
Fan headers/bays usar group=null: el presupuesto eléctrico agregado de headers
está en fan_total_current_ma; no se inventa lane-sharing ni corriente.

## Resultado y límites

Scope/policy/inventory/rules propios fijos según contrato38 §4. T01–T07 remapean
resultados individuales básicos; T08 discos, T09 cooler, T10 fans, T11 presencia e
identificación, T12 asignación GPU/discos y aplicabilidad de potencia extendida.
coverage.required/evaluated enumera12; pending se representa mediante unknown y
missing_fields (también conserva missing en un check fail). Fallo domina siempre.
RAM cantidades son módulos; no hay acciones de sustitución ni escrituras aquí.
Advertencias visibles de geometría/transitorios/térmica y funciones frontales.

PSU conserva política stock existente: una GPU, un NVMe y hasta4 fans contando
cooler; más discos/cargas no reciben verde por heredar recomendación básica.
GPU ausente permanece unknown: no implementada política integrada/salida/objetivo.
Cooler no-air/bombas permanecen unknown, sin inventar montaje/corriente. La política
actual conservadora necesita ampliación documentada, NO flags cliente.

Fuentes identificadas: basic_specs/basic_evaluation/basic_policy/cpu_rule y modelos
existentes; contrato38 §§1,4 y delta CU05. No nuevas afirmaciones de fabricante.
Pruebas nuevas son SYNTHETIC: un positivo solo demuestra algoritmo, no torre real.
Catálogo667 sin atributos validados NO queda compatible.

## Checks solicitados a Build (sin ejecución propia)

Desde backend, separados y registrando cada exit code:

1. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_engine.py`
2. `.venv/Scripts/ruff.exe check upgradejusto/compatibility/tower_contract.py upgradejusto/compatibility/tower_engine.py tests/test_tower38_engine.py`
3. `.venv/Scripts/ruff.exe format --check upgradejusto/compatibility/tower_contract.py upgradejusto/compatibility/tower_engine.py tests/test_tower38_engine.py`

Build puede aplicar formatter únicamente a estos nuevos archivos. No se ejecutaron
shell/runners ni pruebas PG; no hay resultados/exit codes propios. Sin integración
API, evaluación real ni aprobación38 completa. Siguiente: Build verifica focales,
revisión independiente y autorización explícita para adapter/DTO HTTP del escritor
principal. No reutilizar EvaluationResult legado (su validador solo admite B/R).

## Delta revisión P1 — pendiente de recheck Build e independiente

Causa1: guardas sobre listas globales de faltantes suprimían imposibilidades de
matching con datos suficientes. Ahora matching usa inventarios validados y demandas
conocidas; presupuestos desconocidos se relajan, no se inventan. Una imposibilidad
del subconjunto conocido conserva fail aunque SATA-power, tamaños de fans o límites
agregados independientes sigan missing. Inventario inválido no equivale a vacío.

Causa2: BasicSpecs comprueba fuentes/conflictos, no tipos. Adapter puro propio
sanitiza colecciones/scalars consumidos antes de reutilizar básicos; cooler_sockets
exige lista/tupla no vacía de strings no vacíos. String/dict/bool/colección mixta
queda unknown sin substring ni excepciones. Recursos/presupuestos exigen colecciones
reales y modelos estrictos. Sin modificaciones al motor básico histórico.

Regresiones: shared_budget_failure_survives_independent_storage_unknown,
header_matching_failure_survives_independent_unknown,
cooler_socket_collection_is_strict_not_substring (parametrizado),
source_backed_malformed_collections_never_approve (parametrizado),
documented_empty_inventory_differs_from_malformed (parametrizado).
Ejecutar los mismos tres comandos focales anteriores, separados. Build informó
14 PASS/exit0 ANTES de este delta; no son evidencia de aprobación del delta ni de
hardware real. Aquí no se ejecutaron runners ni se declara revisión aceptada.

## Integración38 — READY para wiring/verificación, no endpoints activos por esta entrega

Archivos NUEVOS de este incremento:
- upgradejusto/compatibility/tower_application.py
- upgradejusto/compatibility/tower_evidence.py
- upgradejusto/compatibility/tower_http_models.py
- upgradejusto/api/tower_compatibility.py
- tests/test_tower38_application.py
- tests/test_tower38_api.py

También delta mínimo en tower_engine.py anunciado al coordinador: dimensiones
nominales básicas length_mm/gpu_limit_mm/psu_limit_mm admiten int/float finitos
positivos (no bool/strings), como basic_stock_v1 y evidencia existente227,2mm.
Regresión nueva test_published_fractional_nominal_dimension_failure_survives_adapter
demuestra largo fraccionario superior a límite conservando fail+missing. No se
modificó el motor básico, sus fuentes ni archivos ajenos. Los52 PASS/exit0 y Ruff
previos fueron informados por Build para el motor ANTERIOR; no verifican este delta.

### Wiring exacto, a cargo del escritor main/Build coordinado

Importar `from upgradejusto.api.tower_compatibility import router as tower_compatibility_router`
y ejecutar `app.include_router(tower_compatibility_router)` una vez, junto a routers
existentes. Ningún archivo main/proxy/auth fue editado aquí. Nueva dependencia
service reutiliza api.towers.service, catálogo Postgres fijado y runtime existentes;
no servicio/proveedor nuevo ni llamadas LLM ni consumo de cuota proveedor.

POST /api/towers/{pc_id}/evaluate: EvaluateRequest {expected_pc_revision}.
POST /api/towers/{pc_id}/simulate: TowerSimulationDTO {expected_pc_revision,actions}.
TowerAction y TowerCandidate prohíben extras; nada de owner_id/evidencia/resultados.
RAM solo replace_category; add_line solo storage/fan; remove/replace_line comprueban
UUID y categoría de línea propia. Candidates sin UUID cliente. IDs efímeros UUID4
servidor, revisión PC conservada, ninguna escritura. Cada acción se valida sobre
resultado acumulado. Retirar última línea declara absent, no unknown. Reemplazar o
retirar placa borra BIOS salvo candidate_context explícito para reemplazo.

Respuesta TowerEvaluationResponse conserva claves EvaluationResponse y contiene
evaluated_configuration:Tower completo, sin truncamiento de categorías ni owner_id.
Incluye notas solo en respuesta privada del propietario (igual a GET torre);
NO apta para shares sin proyección de privacidad futura. Snapshots antiguos no se
leen/recalculan/escriben por el servicio.

Whitelist/gateway a coordinar por su dueño: SOLO método POST, query vacía, patrón
canónico exacto `/api/towers/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/(?:evaluate|simulate)`
con fullmatch, firma ligada a POST+raw_path exacto, sin wildcard método ni ruta.
backend/api/proxy_ip.py ya aplica política de query privada a /api/towers/ y
firma método/raw_path; no edité este archivo. Build debe verificar allowlist de
gateway/composición vigente. Mantener cap general37, sin ampliar bytes ni alterar
cuotas. Tests API usan controles reales del app y requieren wiring previo: no
montan routers ni sustituyen auth/CSRF por mocks.

### Snapshot/evidencia y límites

TowerEvaluationRepository reutiliza lectura TowerRepository bajo transacción y
locks de lectura: owner404 precede detalle revisión; expected_revision409 y cambio
del active pointer respecto del catálogo ya fijado409. Snapshot entero inmutable
de PostgresCatalogRepository, TODOS los IDs sin búsqueda paginada. Selección guardada
retirada/recategorizada en publicación fijada devuelve409; candidato inválido422.
Cada NUEVO cálculo usa la publicación activa fijada al inicio, identificada en
data_revision; no pretende reproducir la publicación original de cada línea.
Cambiar active después de obtener snapshot no altera esa publicación inmutable.

tower_evidence reutiliza resolve_stock_specs y SOLO cpu_support publicado exacto,
sin tabla demo fallback, aliases, parseo de nombres ni BIOS genérica. Revisión de
datos incluye publicación, MANUFACTURER_VERSION, adapter y digests efectivamente
usados. Cada componente lleva esa revisión y fuentes por campo. Declarados no
resuelven evidencia. No se inventó un envelope técnico nuevo para storage/cooler/
fan: formato legítimo nuevo aún requiere contrato/publicación propios. Por ahora
esos campos ausentes permanecen missing y bloquean verde. No consumir datos de
fixtures sintéticos como curación real; no hardware positivo certificado.

### Checks a Build, cada comando/exit separado, exclusivamente TEST

Desde backend, primero sin servidor:
1. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_application.py tests/test_tower38_engine.py`
2. `.venv/Scripts/ruff.exe check upgradejusto/compatibility/tower_application.py upgradejusto/compatibility/tower_evidence.py upgradejusto/compatibility/tower_http_models.py upgradejusto/compatibility/tower_engine.py upgradejusto/api/tower_compatibility.py tests/test_tower38_application.py tests/test_tower38_api.py`
3. `.venv/Scripts/ruff.exe format --check upgradejusto/compatibility/tower_application.py upgradejusto/compatibility/tower_evidence.py upgradejusto/compatibility/tower_http_models.py upgradejusto/compatibility/tower_engine.py upgradejusto/api/tower_compatibility.py tests/test_tower38_application.py tests/test_tower38_api.py`

Después wiring, wrapper TEST existente configura entorno/guardas; comando interno:
4. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_api.py`

PG reutiliza actores A/B y publicación stock de TEST propios; no mocks de PG ni
reset DEV. Cubre auth/CSRF/ownership, revisión409, catálogo fijado409, falloPG503,
unknown honesto, fail+missing, RAM/BIOSclear, no escrituras de tablas PC/torre,
bytes planes/shares legacy intactos y51 discos sintéticos con selección beyond50.
No fueron ejecutados por este escritor. No afirmar rutas activas, pruebas aprobadas
ni cierre38 hasta Build+revisión independiente. Sin main/proxy wiring aún.

## Checkpoint integración — diagnóstico/corrección de fixture con catálogo amplio

Informado por Build: main router YA activado por su autor; main/Google commit
89015c8 y retail b0ec116. Adapter+motor69 PASS/exit0, Ruff lint8 archivos exit0.
PG test_tower38_api.py:1 PASS y4 ERROR de setup en stock_published/publish422,
NO cuatro fallos de endpoint ni integración aprobada. Formatter8 pendiente.

Causa localizada en fixture compartida importada: collection() pide limit100 sin
offset. stock_published construía el mapa de fuentes existentes con esa primera
página y hacía POST si no encontraba una referencia. En catálogo691 puede duplicar
una referencia (source_id,url) que sí existe fuera de esa página; materialize()
rechaza precisamente duplicados, además de otras referencias inválidas. Build
informó que materialize(active691) es válido: no corresponde relajar producción
ni resetear a14. No inspeccioné en PG el borrador fallido, por lo que identificar
la pareja duplicada concreta queda como confirmación de ejecución de Build.

Corrección SOLO tests/test_tower38_api.py: fixture stock_published LOCAL sustituye
import compartido, pagina exhaustivamente components/sources/prices/cpu_support,
upsert de fuentes por pareja exacta con actualización del índice después de cada
POST/PATCH, y prevalida borrador completo usando el MISMO materialize de producción.
Conserva IDs completos de publicación original (no cota14/691 hardcodeada), fuentes
y recursos no afectados por propuesta; comprueba recursos originales inmutables y
heredados sin cambios para componentes no editados. Publicación propia vía CU10,
roles/sesiones reales; finalmente restaura exactamente el pointer original amplio.
No se cambiaron main, retail, CU10, validaciones ni fixture compartida. El caso>50
mantiene catálogo amplio y51 discos propios sintéticos; no se borran datos DEV.

Sin runners propios, sin nueva aprobación PG. Próximo Build: recheck EXCLUSIVO TEST
`.venv/Scripts/python.exe -m pytest -q tests/test_tower38_api.py`, luego Ruff check
y format --check de tests/test_tower38_api.py; conservar69 puros ya aprobados si no
hay cambios que justifiquen repetirlos. Si materialize(borrador) sigue fallando,
escalar diagnóstico concreto antes de cambiar producto o encadenar correcciones.

## Resultado posterior atribuido a Build y revisión independiente

Build ejecutó pytest focal tras corregir ambos P1:52 PASS, exit0; Ruff check0.
Después del READY del autor completó wrapping mecánico residual, sin cambio lógico;
Ruff format de contrato/motor/tests confirmó0. La revisora funcional independiente
releyó los dos defectos y regresiones: aceptación LOCAL del motor puro, sin otros
defectos demostrables en ese delta. No ejecutó pruebas ni aprobó hardware real,
adapter/API, cargas ampliadas fuera de política ni producto38 integral.

## Resultado posterior de integración — evidencia Build

69 pruebas puras application+engine PASS0. Cinco pruebas API TEST pasaron dentro del
combinado25 PASS3 FAIL; los tres fallos eran fixtures retail, corregidos después con
rerun exclusivo4 PASS0. No contar esos5 API como ejecución adicional independiente.
La fixture API conserva paginación completa y asserts estrictos de recursos691;
permitió detectar normalización whitespace que retiraba recursos, corregida por su
autor en retail/CU10 sin resetear catálogo ni desactivar inmutabilidad.
Lint0 y format8 archivos integración0. Revisiones funcional y seguridad independientes
aceptaron LOCALMENTE evaluar/simular, sin positivos de hardware real, frontend/MCP ni
recomendaciones futuras por ese dictamen. Datos nuevos sin respaldo siguen unknown.



<a id="origen-backend-integral38-extraction-handoff-md"></a>

## Origen: backend/INTEGRAL38_EXTRACTION_HANDOFF.md

# CU02 torre38 — contrato previo a implementación

## Contextv2 aceptado — implementación READY, checks nuevos pendientes

Autorización posterior del coordinador: ProposedContextv2 aceptado y CU02 spec
actualizada por Build ANTES del código. Esta sección añade estado, no reemplaza
checkpoints históricos inferiores. No comandos propios ni claim de fallo vivo resuelto.

Archivos de este delta:
- NUEVO upgradejusto/extraction/tower_context.py
- upgradejusto/extraction/tower_service.py
- upgradejusto/extraction/tower_provider.py
- NUEVO tests/test_tower38_extraction_context.py
- tests/test_tower38_extraction.py
- tests/test_tower38_extraction_pg.py
- INTEGRAL38_EXTRACTION_HANDOFF.md

tower_context.whole_label contiene la MISMA gramática antes situada en servicio;
servicio la reutiliza como _whole_label. Conserva spans originales exclusivos,
variante exacta, unknown/null, cantidades y validación contra snapshot COMPLETO.
INSTRUCTIONS/NEGATIVE_NAMES y SYSTEM existentes trasladados sin cambiar su contenido.

relevant_components recorre TODOS los IDs, solo incluye nombres completos con
ocurrencia literal/frase completa probada en texto original. Prefijo de cantidad
literal opcional reconoce el framing, sin convertirlo en dato técnico. No fuzzy,
normalización de nombres Unicode ni primeras50/topN. Orden por ID; duplicados de
nombre conservan todos sus IDs ambiguos. Unknown/declarados funcionan con contexto
catalog vacío. Solo id/category/name al proveedor, jamás atributos/ofertas/contexto
privado de PCs.

prepare_context serializa JSON human ensure_ascii=False, separators=(',',':'),
sort_keys=True, allow_nan=False. Mide exactamente UTF-8 SYSTEM + human completo
(schema cerrado y texto íntegro incluidos). Límite inclusivo24000 bytes: exceso
422 `Extraction context too large; shorten pasted text`, sin truncamiento ni
descarte de matches para caber. No es estimación de tokens/cuota ni envelope SDK.

TowerExtractionService.preview prepara ANTES ProviderBudget.execution; errores de
preflight no adquieren lease ni cargan contadores de proveedor. Lectura de catálogo
y autenticación servidor siguen existentes. Una solicitud válida conserva UNA
admisión37 y llama extract_prepared con el objeto preparado; normaliza respuesta
contra el snapshot COMPLETO original, no contra el subconjunto enviado.

PreparedTowerContext frozen/repr=False es interno: revisión, IDs seleccionados,
conteo, bytes y context_version=tower-extraction-context-2. No se devuelve en DTO,
persiste ni loguea; repr por defecto no muestra IDs/texto/prompts. Pruebas inspeccionan
metadata solo en memoria de tests. No nuevos logs ni propagación de metadata al LLM.

TowerGroqExtractor.extract_prepared envía EXACTAMENTE system_message/human_message
medidos, sin reserialización. extract(text,parts) sigue disponible para pruebas de
proveedor y usa el mismo prepare_context. SDK413 =>502 sanitizado
`Extraction provider rejected request size; shorten pasted text`, sin mensaje/rawbody
upstream, Retry-After ficticio ni error engañoso de cuota PG. Resto502/504/429, límite
de respuesta30000, JSON cerrado, tracing desactivado, timeout30s y sin retries intactos.

No main/proxy/body_limits/modelos, SDK/dependencias, cuenta/modelo/proveedor ni TLS/env
modificados. Body cap65536 y text12000 conservados. No se desactivó verificación TLS;
configuración TEST SYSTEM y diagnóstico anterior son evidencia comunicada por Build,
no nuevas conexiones propias. Cap24k no garantiza admisión/frescura de cuota upstream:
el gate Groq vivo sigue pendiente, sin bucle/rotación/reintentos automáticos.

### Checks focales para Build, cada comando/exit separado desde backend

1. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_extraction.py tests/test_tower38_extraction_context.py`
2. `.venv/Scripts/ruff.exe check upgradejusto/extraction/tower_context.py upgradejusto/extraction/tower_service.py upgradejusto/extraction/tower_provider.py tests/test_tower38_extraction.py tests/test_tower38_extraction_context.py tests/test_tower38_extraction_pg.py`
3. `.venv/Scripts/ruff.exe format --check upgradejusto/extraction/tower_context.py upgradejusto/extraction/tower_service.py upgradejusto/extraction/tower_provider.py tests/test_tower38_extraction.py tests/test_tower38_extraction_context.py tests/test_tower38_extraction_pg.py`

Wrapper REAL TEST-PG existente/exclusión proveedor37, sin reset catálogo:
4. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_extraction_pg.py::test_context_preflight_422_does_not_charge_pg_and_valid_call_admits_once tests/test_tower38_extraction_pg.py::test_preview_full_catalog_then_explicit_owner_confirmation`

Nuevas pruebas:691 sintéticos unknown =>0 contexto/bytes exactos; IDs60/690 presentes;
PLUS/puntuación no envía base; ambigüedad conservaIDs y respuesta needs_review;
declarado literal aun con catalog contexto vacío; límite24000 inclusivo/multibyte;
muchos matches =>422 sin dropping; preflight no admisión/SDK; SDK envía cadenas exactas;
stub413 size explícito sin secretos/cuotaPG. TestPG inspecciona contadores reales antes/
después422 y UNA admisión de solicitud válida, sin lease/PC nuevo ni metadata pública.
Fakes propios actualizados al protocolo extract_prepared; no se debilitaron gates de
wholephrase/dedup/cantidades ni extractor legacy.65 regresiones previas no verifican
este delta. Tras checks+revisión, Build coordina UNA llamada web Groq focal sin retries;
no cerrar CU02/38 por esta preparación.

## ProposedContextv2 — PROPUESTA, pendiente de aceptación antes de código

Delta focal del contexto proveedor, no de la resolución servidor ni del motor.
No implementado/activado por esta sección. Conserva íntegros checkpoints inferiores.

1. Servidor conserva snapshot publicado COMPLETO para validación de IDs/categoría,
   variantes, evidencia, spans exclusivos y confirmación/CAS. Para el contexto LLM
   recorre TODOS los componentes, sin primeras50, topN ni fuzzy/aliases. Incluye
   SOLO {id,category,name} cuyo nombre completo literal tiene ocurrencia probada en
   el texto ORIGINAL con la misma gramática conservadora de frase completa ya
   aceptada (incluida variante/sufijo y separadores), no el excerpt elegido por LLM.
   Orden determinista por ID; duplicados de nombres conservan todos sus IDs como
   ambigüedad, no se elige uno. Ningún atributo/oferta/nota privada va al contexto.
   Catálogo relevante vacío es válido: etiquetas declaradas/unknown siguen posibles.
   Quantities/ausencia/evidencia se revalidan contra TODO snapshot, sin relajación.

2. Tope propuesto EXACTO24000 bytes UTF-8 de contenido enviado: bytes del SYSTEM
   vigente + bytes del JSON human final serializado (catalog relevante, schema
   cerrado y untrusted_text completo). JSON canónico ensure_ascii=False,
   separators=(',',':'), sort_keys=True; medir esa MISMA cadena enviada. No es
   estimación de tokens/cuota ni medida del envelope HTTP/SDK. Sin truncar texto,
   schema, nombres o matches; si excede,422 detail='Extraction context too large;
   shorten pasted text'. Preflight ANTES ProviderBudget.execution/admisión/SDK:
   no cargo ni lease PG/proveedor para una solicitud localmente inadmisible.
   Una solicitud admitida conserva UNA ejecución compartida PG37, sin retries.
   Texto entrante sigue máximo12000 caracteres/cap65536, sin ampliar límites.

3. Metadatos públicos de salida NO cambian. ContextSelection interno preparado:
   {catalog_revision,selected_component_ids,matched_catalog_count,payload_utf8_bytes,
   context_version:'tower-extraction-context-2'}; no log de texto/rawprompt/quotes.
   Ni IDs ni metadata son autorización. No se persisten propuestas ni contexto.

4. SDK/upstream413 =>502 detail='Extraction provider rejected request size;
   shorten pasted text', distinto de429 PG/SDK y sin afirmar cuota PG agotada.
   Sin Retry-After ficticio, auto-retry, reducción silenciosa, rotación de modelo/
   cuenta/proveedor ni cambios de límites. Otros502/504/429 existentes conservados.
   TLS verificado siempre; ninguna desactivación ni modificación env/certificados.
   No se expone mensaje/cuerpo upstream, prompts, credenciales ni estimaciones.

5. Gates tras aceptación y código: catálogo691 completo con texto unknown => contexto
   vacío pequeño; ID exacto beyond50 incluido; PLUS/puntuación no selecciona base;
   múltiples IDs ambiguos conservados; exceso24000 =>422 ANTES admisión/SDK sin
   truncamiento; texto multibyte contabilizado UTF-8; stub413 sanitizado; regresiones
   de wholephrase/spans/quantities-null y privacidad. Build ejecuta TEST exclusivamente.
   Una llamada viva focal posterior solo si gates/revisión y coordinación la autorizan;
   TLS SYSTEM verificado es configuración del proceso TEST a cargo de Build, no
   modificación de este escritor. Fallo vivo actual no se declara resuelto aquí.

Estado: CONTEXTCONTRACT READY para coordinador/actualización CU02 y aceptación.
No código, dependencias, main, proveedor, entorno ni checkpoints ajenos modificados.

Estado inicial: DTO propuesto para coordinación/frontend; código y checks aún no
verificados. Solo backend asignado, sin wiring main/BFF ni extractor legacy nuevo.

## API cerrada

### Contexto2 — resultado local posterior

81 pruebas puras PASS0, lint/formato6 archivos0. Dos PG específicos de preflight sin
cargo/admisión única y preview-confirmación aprobaron dentro de6 PASS combinados con
planes/migración; no contar esos otros4 como pruebas de extracción. Revisión de
seguridad aceptó selección/preflight local sin hallazgo bloqueante. Cap24k mide
SYSTEM+JSON human, no envelope SDK/tokens ni garantiza aceptación externa.
Nuevo recorrido vivo espera composición backend estable; no se atribuye éxito Groq
al reducir contexto ni se borra la evidencia anterior de TLS/413.

### Resultado posterior de Build y revisiones

Tras corregir reutilización de una ocurrencia y aceptación del nombre base para
variante extendida:65 puros PASS0, lint/formato0. Dos nodos PG del delta aprobaron
junto a un test HTTP CU06 (3 PASS0);6 PG anteriores fueron otro gate, no sumarlos
como nueva corrida conjunta. Funcional y seguridad aceptaron backend local con esas
verificaciones. Router real registrado antes de CRUD, cap37 exacto conservado.
Frontend recibió revisión seguridad y tipos/lint/build0,21 unitarios; su primer
recorrido Groq real FALLÓ502/APIConnectionError sin statusHTTP, sin propuesta/PC
guardada. Diagnóstico acotado usó admisión compartida y no expuso cuerpos/credenciales.
No afirmar extracción viva aprobada ni atribuir el error a cuota/JSON/TLS sin prueba.
Sin cambio de proveedor, fallback simulado o relajación de confirmación por ese fallo.

POST `/api/towers/extract` `{text:string1..12000}`: sesión servidor/CSRF/Origin,
cap exacto65536 bytes y deadline de lectura37 existente. Una admisión compartida
ProviderBudget PG por extracción nueva, igual a asistente/extractor legacy. Sin
tools/SQL, archivos, navegación, autodetección ni decisión de compatibilidad.
Proveedor Groq/config/TLS actuales, timeout total30s sin retries ni dependencias.

Respuesta200:
`{proposal:TowerCreate,evidence:TowerCategoryEvidence[9],missing_fields:string[],
warnings:string[],catalog_revision:string,requires_confirmation:true}`.

`TowerCategoryEvidence={category,status:present|unknown|absent,
absence_excerpt:string|null,lines:TowerLineEvidence[]}`. Exactly nueve categorías
del contrato torre. `TowerLineEvidence={proposal_line_index:int|null,
component_id:string|null,declared_model:string|null,quantity:int|null,
excerpt:string,quantity_excerpt:string|null,candidate_ids:string[],
resolution:catalog|declared|needs_review}`.

proposal schema2/nombre servidor «Torre extraída», BIOS/notes null; líneas nuevas
line_id=null hasta guardado. Exactamente uno de component_id/declared_model en
líneas propuestas; modelos declarados son etiquetas literales, no atributos.
IDs/categorías resueltos contra TODO catálogo publicado fijado, no primeras50.
Un ID solo se selecciona con nombre exacto no ambiguo en fragmento literal; ofertas,
similitud o texto comercial no acreditan atributos ni compatibilidad.

Cantidad desconocida NO se convierte en1: evidencia conserva quantity=null,
resolution=needs_review, proposal_line_index=null. RAM/storage/fan requieren marcador
literal de cantidad en la misma observación. Si alguna línea de una categoría está
sin resolver, TODA esa categoría queda unknown/sin líneas propuestas, preservando
observaciones en evidence para edición. Evita guardar RAM parcialmente truncada o
afirmar un módulo por «16GB total». Single categories solo una unidad identificada.
Ausencia exige frase negativa literal por categoría, no omisión ni cero; unknown
es distinto de absent. Fragmentos devueltos se restringen a etiqueta de hardware y
marcador de cantidad, no al informe/notas/instrucciones completos del proveedor.

POST `/api/towers/extract/confirm`
`{confirmed:true,proposal:TowerCreate,catalog_revision:string}` →201 Tower.
False,1,"true", extras owner_id/user_id/evidencia/resultados rechazados422.
Propuesta editable: ninguna aprobación de compatibilidad implícita; confirmación
explícita usa TowerService.create/propietario servidor/UUID servidor y CAS catálogo
409, sin LLM ni gasto proveedor. No persistencia durante preview/error/cancelación.
No idempotency nonce nuevo: preview es stateless como legacy; cada POST nuevo
consume admisión compartida37, no se introduce caché/reintento silencioso.

## Wiring posterior por autor original

Router nuevo `upgradejusto.api.tower_extraction.router`, incluir UNA vez antes del
router CRUD `/api/towers/{pc_id}` para evitar captura de `extract` como UUID en rutas
del mismo método. Build/autor main coordinan whitelist/BFF: SOLO POST, query vacía,
fullmatch `/api/towers/extract(?:/confirm)?`, firma método+raw_path exactos. No main
ni proxy_ip modificados por este escritor. Cap exacto /api/towers/extract65536 se
añadirá en body_limits sin cambiar otros límites/deadlines37.

## Verificación pendiente

Build ejecuta puros/mock Groq primero, luego TEST-PG con actores sintéticos propios,
catálogo amplio vigente (sin reset14), cuota compartida37, ownership/CSRF, CAS409,
errores y cancelación liberando lease. Sin secretos/env privados, runners propios,
claim Groq vivo ni cierre CU02/38. Contrato definido antes de implementación; cambios
posteriores/resultado y comandos exactos se anexarán al finalizar incremento.

## READY — implementación aislada preparada, sin ejecución propia

Archivos NUEVOS:
- upgradejusto/extraction/tower_models.py
- upgradejusto/extraction/tower_provider.py
- upgradejusto/extraction/tower_service.py
- upgradejusto/api/tower_extraction.py
- tests/test_tower38_extraction.py
- tests/test_tower38_extraction_pg.py

Único existente modificado: api/body_limits.py, rama EXACTA
`/api/towers/extract ->65536`. Confirm conserva cap general262144; legacy65536,
auth8192 y deadline de lectura5s sin cambios. No modificaciones en motor, main,
proxy, auth, catálogo, retail, extractor legacy ni dependencias.

Implementación conserva contrato anterior. El proveedor solo recibe IDs/categoría/
nombres de TODO catálogo y schema cerrado; no atributos/ofertas, tools ni archivos.
JSON con claves duplicadas o más30000 caracteres es inválido. Timeout total30s,
TLS/modelo/client existentes, callbacks vacíos y tracing desactivado. Errores
502/504/429 sanitizados, cancelación no absorbida; servicio ProviderBudget compartido
controla admisión y liberación PG, sin reintentos automáticos ni bypass por nonce.

Selección requiere nombre completo literal/no ambiguo, límites de palabra y mismo
ID/categoría real. Modelo desconocido se conserva como etiqueta literal (sin inferir
especificaciones) o como needs_review; fragmentos arbitrarios sin etiqueta segura
se omiten de evidence y dejan categoría unknown. No se devuelven notas/instrucciones
del informe: solo etiqueta y marcador de cantidad. El detector lexical adicional
rechaza instrucciones obvias, pero NO se presenta como clasificación semántica
infalible: texto sigue siendo dato no ejecutable, nunca autorización/herramienta.
Cantidad RAM/discos/fans exige marcador adyacente al modelo en fragmento literal;
no acepta sufijo decimal/negativo ni duplica observaciones idénticas para inflar
unidades. Cantidad desconocida permanece null y excluye toda la categoría de las
líneas propuestas; la evidencia queda para edición explícita. BIOS/notes siempre
null en preview. Confirm sí permite la edición explícita de TowerCreate por usuario.

Confirmación no exige conservar exactamente el preview: es editable y stateless
como legacy. Exige confirmed booleano true, revisión catálogo vigente y UUID de línea
null; TowerService.create valida selección completa y CAS del active pointer en la
transacción de creación. Dueño y UUID guardados exclusivamente servidor. Copiar una
propuesta no transfiere propiedad de una PC: cada confirm crea una PC nueva propia,
no cambia PCs existentes ni publica planes. No se implementó idempotencia persistente
de confirmación ni caché de propuestas; repetir confirm explícito puede crear otra PC.

## Wiring y gates para Build/autor main (pendientes)

`from upgradejusto.api.tower_extraction import router as tower_extraction_router`
`app.include_router(tower_extraction_router)` una vez; preferir antes de tower CRUD.
Whitelist/BFF: POST exclusivamente, query vacía, fullmatch
`/api/towers/extract(?:/confirm)?`, firma método/raw_path existente. No se editó main.

Desde backend, separados y registrando cada exit code:
1. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_extraction.py`
2. `.venv/Scripts/ruff.exe check upgradejusto/extraction/tower_models.py upgradejusto/extraction/tower_provider.py upgradejusto/extraction/tower_service.py upgradejusto/api/tower_extraction.py upgradejusto/api/body_limits.py tests/test_tower38_extraction.py tests/test_tower38_extraction_pg.py`
3. `.venv/Scripts/ruff.exe format --check upgradejusto/extraction/tower_models.py upgradejusto/extraction/tower_provider.py upgradejusto/extraction/tower_service.py upgradejusto/api/tower_extraction.py upgradejusto/api/body_limits.py tests/test_tower38_extraction.py tests/test_tower38_extraction_pg.py`

Tras wiring, wrapper TEST existente/cluster autorizado, comando interno:
4. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_extraction_pg.py`

Puromock: tres cantidades, múltiples discos/fans, RAM total sin módulos, declarado/
ausente/unknown, selección beyond50, alias por substring rechazado, mal JSON/clave
duplicada/límites/cantidades impropias/inyección, confirm estricto, errores proveedor
y cancelación. Son pruebas sintéticas de algoritmo, NO evidencia de hardware/Groq.

PG: actores/sesiones A/B reales, snapshot amplio vigente sin reset14 ni publicación,
preview sin PC nueva, confirm crea UUID/owner propios y aísla lecturas, auth/CSRF,
catálogo409/CAS409, cap413, cuota/concurrencia compartida37 (proveedor controlado),
error/cancel libera lease real y fallo PG503 sin nuevas PCs. Reutiliza budget_state
TEST37 con exclusión/restore existentes; ejecutar sin otro runner/proveedor activo.

No comandos ejecutados aquí: sin exit codes nuevos, servidor/API activos ni cierre
CU02/38 declarados. Los69 puros/5 API del incremento evaluar/simular anterior NO
verifican extracción. Luego de gates y revisión independiente, Build puede justificar
una llamada Groq real focal por la ruta nueva con texto/cuenta sintéticos propios;
no ejecutar suite viva rutinaria ni cambiar proveedor/config por esta entrega.

## Delta P1 funcional — READY para recheck, no aceptación anticipada

Build informó41 puros y6 PG PASS/exit0, lint8/format8 exit0 ANTES de esta revisión.
Revisora confirmó dos P1; esos resultados anteriores NO acreditan el delta nuevo.

1. La firma de excerpt crudo no conservaba unidades: dos quotes con prefijo o
puntuación distintos podían reutilizar el mismo «2x modelo» original y sumar4.
Ahora las ocurrencias de etiqueta/cantidad se calculan en el texto ORIGINAL y deben
estar contenidas en ventanas literales de excerpt y quantity_excerpt. Asignación
bipartita exclusiva por spans originales, con control de solapamiento y propagación
de conflicto a todo su componente de evidencia. Una ocurrencia no puede respaldar
dos grupos aunque el proveedor cambie prefijos/puntuación. Dos ocurrencias reales
idénticas sí pueden asignarse a dos grupos. Conflicto => needs_review, quantity=null,
component_id=null, sin líneas propuestas de esa categoría; sin inflar totales.
Offsets son internos calculados servidor, no campos autorizantes del proveedor.

2. Un borde de palabra no prueba variante exacta («modelo PLUS», «modelo+», «/OC»).
Ahora selección exige frase completa en el ORIGINAL, también si el LLM recorta la
quote al nombre base. Gramática deliberadamente conservadora: registros separados
por newline o punto y coma; framing opcional de viñeta, «Tengo», «Mi PC tiene» y
etiqueta de categoría con dos puntos; solo whitespace/punto final tras nombre.
No whitelist de variantes/sufijos, aliases ni inferencia de atributos. Extensión o
prosa no reconocida => needs_review sin ID/cantidad seleccionados. Comas/slashes no
se asumen separadores seguros. Nombres completos catalogados, incluida una variante
catalogada cuyo nombre contiene al modelo base, conservan identidad exacta propia.

Límite explícito: esta gramática no interpreta universalmente toda prosa ni prueba
hardware físico; ante framing no probado deja revisión manual. Los fragmentos de
salida siguen acotados a etiqueta y marcador, no se concatena el reporte/instrucciones
o información sensible vecina. DTO público y confirmación/ownership/CAS/cuota37
no cambian. No se tocaron main, proveedor, body_limits, modelos, catálogo ni otras áreas.

Archivos delta:
- upgradejusto/extraction/tower_service.py
- tests/test_tower38_extraction.py
- tests/test_tower38_extraction_pg.py
- INTEGRAL38_EXTRACTION_HANDOFF.md

Regresiones sintéticas: prefijos/puntuación diferentes de una sola mención; dos
ocurrencias idénticas independientes; sufijos PLUS/+/slash/OC/puntuación con quote
completa y recortada; prefijo de variante; nombre exacto y variante completa legítima;
contexto sensible no reflejado. Se ajustó el test de duplicado crudo para comprobar
unknown/null sin propuesta, no una excepción obligatoria: es el comportamiento
conservador requerido, no aceptación del doble conteo.

Build, desde backend y comandos separados:
1. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_extraction.py`
2. `.venv/Scripts/ruff.exe check upgradejusto/extraction/tower_service.py tests/test_tower38_extraction.py tests/test_tower38_extraction_pg.py`
3. `.venv/Scripts/ruff.exe format --check upgradejusto/extraction/tower_service.py tests/test_tower38_extraction.py tests/test_tower38_extraction_pg.py`

Servicio observable cambió, por eso gate focal REAL TEST-PG con wrapper existente:
4. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_extraction_pg.py::test_preview_full_catalog_then_explicit_owner_confirmation tests/test_tower38_extraction_pg.py::test_variant_and_reused_quantity_remain_unpersisted_review_data`

Segundo caso usa catálogo amplio real TEST y proveedor controlado; comprueba unknown,
cantidades null, ninguna PC nueva y lease liberado. No ejecutado aquí, sin Groq vivo
ni claims de hardware. Revisión independiente del DELTA pendiente tras checks; no
activar frontend de extracción por los resultados anteriores.



<a id="origen-backend-integral38-plan-handoff-md"></a>

## Origen: backend/INTEGRAL38_PLAN_HANDOFF.md

# CU07 torre privado — implementación privada aceptada localmente

## Resultado posterior atribuido a Build/revisiones

Build9 puros PASS0;3 PG de planes y1 migración PASS dentro de corrida combinada6
con2 nodos de extracción. Head38_d_001 único verificado/aplicado solo TEST, sin reset
del catálogo. Lint/formato10 archivos0 tras estilo mecánico, sin repetir gates por ello.
Revisiones funcional y seguridad aceptaron el privado. Después wiring main/proxy/
no-store y guard histórico int32 tras propiedad, test montado sobre main PASS dentro
del combinado5 (otros4 son PG/MCP). Relectura seguridad del delta favorable.
No reinterpretar estas corridas como suite nueva única ni como ejecuciones del autor.
Historial append-only por aplicación, no trigger. Tiempo cooperativo no preemptivo.
Frontend privado en implementación; CU09 separado, sin positivo físico ni cierre38.

## P2 lectura histórica: contrato10 dígitos frente a INTEGER PG

Build diagnosticó en TEST readonly DataError/SQLSTATE22003 al comparar INTEGER
revision con9999999999. Defecto real de binding, NO fallo de hardware ni motivo para
cambiar la capacidad de la tabla/contrato API. Bloquea aceptación de activación
hasta gate/relectura focal; no se declara cerrado por este PATCH.

Corregido exclusivamente tower_repository.historical/get: después de header con
propiedad verificada, entero fuera de1..2147483647 devuelve el404 normalizado de
historial, SIN SELECT/binding a tower_plan_revisions. Valores dentro del rango
siguen el lookup real: no se asume inexistencia por superar current_revision.
API/regex siguen admitiendo hasta9999999999, sin migración/cambio de políticas.
get distingue None de0/false: solo None elige revisión actual; tipos internos no
int/boolean/string no se usan como revisión autorizada ni llegan al bind INTEGER.
Firmas/constructor/interfaz MCP/forma de dict permanecen iguales. Ajeno404 ocurre
ANTES del guard, anónimo401 sigue siendo responsabilidad del transporte servidor.

Regresión en el nodo montado existente: revisión1→200;2147483647,2147483648 y
9999999999→404 de historial para propietario, nunca503; ajeno al máximo→404 de plan,
sin filtrar detalles; anónimo al máximo→401. checked verifica no-store en todos.
Archivos de este delta: plans/tower_repository.py,
tests/test_tower38_plan_mounted.py y este handoff. Main/proxy/DTO/migración intactos.

READY para Build, SOLO después de B2 composición READY, wrapper PG TEST:
`tests/test_tower38_plan_mounted.py::test_mounted_tower_plan_signed_owner_history_cache_and_caps`.
Lint/formato focal y relectura independiente P2 tras PASS. Sin shell/runners propios,
commits, datos privados ni lectura de fuentes activas del asistente. No repetir9/6
por rutina. Evidencia del diagnóstico atribuida a Build, no a ejecución propia.

## Activación coordinada: wiring preparado, gate montado pendiente

Coordinación confirmó aceptación funcional/seguridad LOCAL del bloque CU07 privado,
PURE9 PASS y PG3+migración1 dentro del combinado6 PASS. Ruff format diez archivos0
tras correcciones mecánicas de Build, sin lógica. Historial inmutable por aplicación,
NO trigger/inmutabilidad física garantizada ni positivo hardware real.

Delta actual autorizado exclusivamente en main.py, api/proxy_ip.py, NUEVO
tests/test_tower38_plan_mounted.py y este handoff. Main conserva wiring previo de
CU06 y extracción; añade import ordenado/include_router torre planes UNA vez.
no_auth_cache incorpora SOLO igualdad `/api/tower-plans` y prefijo
`/api/tower-plans/`; éxitos y errores del handler/auth/validación/BD quedan no-store.
BodyLimits sigue exterior,262144/5s sin aumento y sus rechazos413 ya no-store.

Central permitted_query comprueba la política CU07 ANTES de su shortcut query vacía.
Se aplica en client_ip para peer directo y firmado, sin cambiar firma37 de método/
raw_path/IP/timestamp, peers/secret/header whitelist. Sin wildcard genérico ni delta
de query a otros CU. Coincide con rutas del router y acota paginación también en el
centro: page1..10000/page_size1..50 positivos canónicos, únicos, sin alias codificados.
Query máxima canónica23bytes (dos parámetros válidos); no parseo de enteros enormes.

Definiciones exactas, U sustituido por UUID lowercase de8-4-4-4-12 hex:
- GET `/api/tower-plans`, query vacía o page/page_size válidos únicos.
- POST `/api/tower-plans`, query vacía.
- GET/DELETE `/api/tower-plans/U`, query vacía.
- GET `/api/tower-plans/U/revisions/[1-9][0-9]{0,9}`, query vacía.
- POST `/api/tower-plans/U/recalculate`, query vacía.
Encoded raw_path/UUID mayúscula/revisión0 o con leading zero no pasan política.
Métodos restantes no habilitados. Redirect/404 de ruta no constituyen operación
privada autorizada; no se crea endpoint de token/share CU09.

Tests NUEVOS, main.app real, sin app aislada ni overrides de auth/owner/service/IP:
1. `test_mounted_tower_plan_signed_owner_history_cache_and_caps`: CRUD/lista/history,
   replay viejo tras revisión3, A/B404, anónimo401, Origin/CSRF403, flags422, CAS409,
   query403 y413. Verifica no-store en cada éxito/error incluidos503 con fallo
   sintético de getter (NO afirmación de outage PG). Firma con clave sintética
   fixture TEST y peers loopback de actores; no lee secreto real ni cambia archivos
   de entorno. Método/raw_path incorrectos, headers parciales/extra y aliases fallan.
   No PC writes; cleanup SOLO filas de planes de actores sintéticos; active/version
   y número de componentes publicados se comparan sin reset ni hardcode691.
2. `test_tower_plan_central_policy_is_closed_before_empty_query_shortcut`: política
   central exacta, límites/query vacía y métodos/rutas no permitidos; controles de
   política previa /api/pcs sin modificar sus reglas. No simula auth ni PG.

Build único runner: esperar B2 READY por imports de main/assistant antes del gate;
NO leer ni cambiar fuentes activas de B2 para intentar destrabar este test.
Desde backend, dentro del wrapper autorizado TEST:

`.venv/Scripts/python.exe -m pytest -q tests/test_tower38_plan_mounted.py`

O nodo PG montado exacto:
`tests/test_tower38_plan_mounted.py::test_mounted_tower_plan_signed_owner_history_cache_and_caps`.
Ruff check/format focal de los tres archivos Python cambiados. Sin repetir9/6 por
rutina. Ningún runner/exit/PASS posterior propio. Gate API montado aún NO aprobado;
frontend/BFF esperan ese resultado. No CU09, MCP propio, UI ni cierre38.

## Checkpoint Build y corrección exclusivamente de formato

Build informó PURE9 PASS/exit0; head único38_d_001 comprobado por runner;
PG TEST plan3+migración1+extract-context2=6 PASS/exit0. Sin DEV/reset ni cambio
catálogo691/publicación NV3 según Build. Ruff check diez archivos/exit0; format
nueve archivos/exit1, tower_models ya limpio. Suite PURE0.19s incluye ejercicio
real de deadline aprobado; no es medición individual ni interrupción física.

Corrección posterior solo PATCH de formato en esos nueve archivos: migración,
API, calculation/repository/service/tables y tres tests. NO lógica/assertions ni
interfaces cambiadas; no repetir9/6 por rutina. Ruff posterior aún no ejecutado
por este escritor; si queda residual, coordinación puede aplicar diff mecánico.
Funcional/seguridad independientes y gate main/proxy/no-store siguen pendientes.
Contrato aceptado conservado; sin fuentes/escrituras ajenas ni MCP/CU09 implementados.

## Interfaz de lectura EXACTA para autor MCP (sin leer archivos activos)

Imports/constructores existentes:

```python
from upgradejusto.persistence.runtime import runtime_engine
from upgradejusto.plans.tower_repository import TowerPlanRepository
from upgradejusto.plans.tower_service import TowerPlanService
from upgradejusto.plans.tower_models import TowerPlanRead

repository = TowerPlanRepository(runtime_engine())
service = TowerPlanService(repository)
raw = service.get(owner, plan_id, revision)
wire_private = TowerPlanRead.model_validate(raw).model_dump(mode="json")
```

Firmas reales: `TowerPlanRepository(engine)`; `TowerPlanService(repository)`;
**ambos** exponen `get(self, owner, identity, revision=None)`. plan_id corresponde
al parámetro `identity`, no existe keyword plan_id en esos métodos. owner e identity
son UUID servidor; revision=None selecciona actual; si se solicita histórica,
validar entero positivo acotado antes de llamar, nunca0/false como valor implícito.
No añadir método nuevo ni llamar dispatcher desde este módulo.

owner DEBE provenir de identidad servidor autenticada/fresca del transporte MCP;
jamás de argumentos user_id/owner_id generados por modelo. El servicio NO valida
una sesión por sí mismo: repositorio comprueba propietario PG del plan no eliminado
ANTES de leer revisión. Ajeno/inexistente/baja→PCError(404,"Plan not found");
revisión inexistente→PCError(404,"Plan revision not found"). No fallback legacy ni
proyección a seis categorías. No cambia PC guardada, plan, cuotas o historial.

Retorno REAL es dict privado, NO instancia Pydantic:
`{kind:'tower_plan',schema_version:2,id:UUID,name:str,revision:int,pc_id:UUID|None,
created_at:datetime,updated_at:datetime,snapshot:dict}`. Snapshot ya JSON-compatible
con base_configuration/context, stages (evaluated_configuration/evaluation),
actions/materials/dependencies/offers/cost/benefit, scope/versiones/advertencias.
GET hace lectura PG y SET LOCAL timeouts, SIN catálogo vivo, proveedor, recálculo,
recotización, reloj de expiración ni reinterpretación de quotes viejas.

**Privacidad:** wire_private es solo conversión UUID/datetime a JSON, NO proyección
segura MCP/pública. Contiene notas PRIVADAS en
`snapshot.base_configuration.context.notes`,
`snapshot.stages[*].evaluated_configuration.context.notes` y
`snapshot.stages[*].evaluation.evaluated_configuration.context.notes`.
Adaptador MCP debe construir allowlist mínima necesaria y excluir notas/contextos
libres innecesarios y otros identificadores privados; no enviar snapshot entero al
LLM ni buscar/recolectar notas recursivamente para luego publicarlas. No devolver
owner/email/conversación/client_request_id/session/token como evidencia. No existe
en este módulo un método de proyección pública; CU09 sigue separado y sin activar.

Contrato v1 aceptado por Build antes del código y deltas CU07/CU09 aplicados según
coordinación. Estado propio: **READY para Build PURE primero**, NO verificado ni
CU07 productivo completo. Sin runners/shell, instalaciones, migración ejecutada,
lectura de credenciales, cambios de proveedor/servicios, commits ni delegación.

## Archivos nuevos / ownership

- `plans/tower_models.py`: DTO v2 cerrado, Decimal ARS normalizado, acciones/materiales
  de contratos aceptados;12 etapas/36 acciones etapa/96 total y límites torre.
- `plans/tower_calculation.py`: cálculo puro acumulado; configuración/BIOS/RAM reales,
  evaluaciones/versiones, etapa preparatoria sin beneficio ficticio, coste por etapa
  y total; stock por inventario retailer/variante acumulado, no por alias interno.
- `plans/tower_service.py`: hash canónico (preserva BIOS null requerido), deadline
  cooperativo5s, cota JSON UTF8 de1MiB, recheck de expiración antes de commit.
- `plans/tower_repository.py`: SOLO tablas nuevas; PG propietario/CAS/catálogo fijado,
  advisory lock crear por propietario+operación; snapshots de historial sin UPDATE,
  replay de revisión original, baja lógica, SQL3s/locks1s SET LOCAL. Nunca usa la
  petición como autorización de owner ni SQL del modelo. PC propiedad antes409,
  incluido cuerpo conflictivo de idempotencia que apunte a PC ajena.
- `plans/tower_tables.py`: declara header/history sobre metadata existente, registrado
  al importar API/migración. NO fue necesario editar persistence/schema.py/env.py.
- `api/tower_plans.py`: router privado preparado, NO importado/montado en main.
- `alembic/versions/38_d_001_tower_plans.py`: parent38_c_001. Directorio y archivo38_c
  leídos: revisión38_c_001/down38_b_001, no otro head visto. Build debe confirmar
  que no cambió concurrentemente antes de migrar TEST. Solo crea dos tablas nuevas.
- `tests/test_tower38_plan_{pure,pg,migration}.py`: selección focal independiente.

Documentos propios: INTEGRAL38_PLAN_CONTRACT.md con aceptación recibida y este
handoff. Sin escrituras a main/auth/catalog/retail/admin/compat/recommendations/
extraction/planes legacy/shares/schema ni specs. CU09/UI/MCP no implementados.

## Interfaz exacta preparada

Prefijo `/api/tower-plans`; request discriminator `{kind:"tower_plan",schema_version:2}`.
POST raíz201/GET lista/GET UUID/GET UUID/revisions/N/POST UUID/recalculate200/
DELETE UUID204. DTO y snapshot detallados en contrato aceptado. Recalculate recibe
draft completo + expected_plan_revision, misma PC. Crear/recalcular vuelven a
resolver actions/beneficio/compatibilidad/ofertas servidor, no resultados cliente.
GET/historia/replay no consultan catálogo vivo, no reevalúan ni recotizan.
Cada revisión conserva base, nueve categorías, notas PRIVADAS, contexto, actions,
quotes observadas/vencimiento, scope/policy/inventory/rules/identity/references,
missing_fields y cálculo `tower-plan-calculation-1`. No exposición pública preparada.

Crear repetido devuelve200 + `Idempotency-Replayed:true`; initial201. Recalcular
repetido devuelve200 + header y SU revisión antigua aunque exista una posterior.
Clave+cuerpo distinto409 luego de controles de propiedad. Baja lógica404 impide
resurrección. Snapshot antiguo no se vuelve a escribir ni cambia por expiry.
Plan bloqueado o requires_verification se guarda claramente rotulado borrador/no
ejecutar. Ready exige TODOS los prefijos verdes, coste completo/techos y beneficio
final respaldado; no certificación física. T10 desconocido sigue bloqueando ready.

RAM reemplaza conjunto, motherboard no hereda BIOS, storage/fans acumulan líneas.
IDs nuevos de simulación UUID5 incluyen etapa, evitando que una recompra del mismo
SKU en etapa posterior se vuelva gratis por identidad de línea repetida. Referencias
a líneas de etapas anteriores deben ser las del resultado acumulado; si una edición
cambia ese resultado, referencias inválidas422 requieren revisión, no remapeo fuzzy.
Pasta incluida en paquete etapa1 no prueba sobrantes al remontar etapa2. Confirmación
material explícita por etapa; ninguna cuota LLM ni fetch externo de precios/proveedor.

## Wiring futuro obligatorio — no activar parcialmente

No se editó main ni proxy. Rutas canónicas usando
`U=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`:

| Método | raw_path admitido | Query |
| --- | --- | --- |
| GET | `^/api/tower-plans$` | vacía o page/page_size positivos, únicos, límites DTO |
| POST | `^/api/tower-plans$` | vacía |
| GET/DELETE | `^/api/tower-plans/U$` | vacía |
| GET | `^/api/tower-plans/U/revisions/[1-9][0-9]{0,9}$` | vacía |
| POST | `^/api/tower-plans/U/recalculate$` | vacía |

U es sustitución del patrón UUID completo, NO literal ni wildcard. Regex querylista:
`(?:page|page_size)=[1-9][0-9]*(?:&(?:page|page_size)=[1-9][0-9]*)*` más rechazo de
duplicados; page1..10000/page_size1..50. Router aplica esa política para transporte
directo y llama client_ip37; firmado también debe pasar política central existente.
Actualmente proxy_ip NO autoriza query firmada del nuevo prefijo: **necesita delta
coordinado explícito**, no fallback ni wildcard genérico. Firma37 método/raw_path
exactos sin cambios a secretos/peer trust. Frontend/BFF no activados.

Main deberá importar/include_router una vez y ampliar no_auth_cache a igualdad
`/api/tower-plans` y prefijo `/api/tower-plans/`, para éxito Y errores. Ingress
general262144/5s vigente; no nuevo proveedor/framework/middleware de auth. Hasta
esa integración revisada no declarar API montada/caché/gateway verificados.

## Gates solicitados a Build, separados y con exit individual

Desde backend:

1. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_plan_pure.py`
2. Ruff check y format de archivos nuevos anteriores, corrección mecánica focal;
   no reabrir suites aprobadas ni cambiar lógica ajena por formato.
3. SOLO después de PURE aprobado: wrapper autorizado PG TEST, upgrade head38_d_001
   y `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_plan_pg.py tests/test_tower38_plan_migration.py`.
4. Revisión funcional/seguridad del delta privado. Wiring main/proxy por coordinación
   y test montado posterior antes de frontend. No repetir diez CU por rutina.

Ningún check ejecutado por este escritor: sin PASS, conexión activa o exit inventados.
No usar SQLite/memoria como prueba PG. Si un check falla, diagnóstico/corrección focal
y escalar resultados concretos, no rotación de suites. Formato manual pendiente de
Ruff Build; no ocultar residual ni asumir que imports equivalen a ejecución.

PURE preparado: acumulación RAM/BIOS/storage; stock6+6 contra10; presupuesto etapa y
total con subtotal conocido+unknown; preparación sin mejora independiente; gates
green/fail+missing SINTÉTICOS; hash/BIOS null/DTO/caps; deadline/expiry/size; >50 por
ID y recompra no gratuita; pasta paquete nuevo vs remount siguiente/confirmación.
Incluye ejercicio de deadline REAL con12 etapas/96 acciones sobre torre sintética
densamente poblada (RAM16, storage16, fans32); Build debe medir/pasar, no se afirma
duración desde este escritor. No garantiza terminación preemptiva de motor síncrono.
Un green parcheado prueba agregación, NO hardware real, T10 ni benchmark ejecutado.

PG preparado: app aislada con middleware/handlers reales y auth/CSRF/owner existentes,
solo override construcción de servicio hacia repositorio PG real. A/B, PC antes409,
CAS PC/catálogo/plan, create200 replay, history1/2 tras revision3, softdelete y no
resurrección; dos hilos PG crean UNA revisión; fallo después de INSERT history
revierte header/history; PC intacta. Catálogo recibido coincide con TODOS los IDs de
publicación real disponible, sin asumir tamaño fijo. GET/replay prohíben lookup vivo;
quote histórica sintética expirada insertada en filas propias conserva JSON/status,
no se vende como precio actual. Revocación de sesión real→401 en GET.

Migración preparada: esquema anterior sintético aislado en TEST, credenciales/JSON
legacy propios conservados; downgrade rehúsa borrar history, luego drop solo tablas
nuevas si vacías. NO drop/reset global ni mutación de publicaciones/catalog691.
Downgrade offline prohibido, online requiere tablas nuevas vacías. Metadata/FKs se
registran por imports propios; confirmar head real antes de aplicar por concurrencia.

## Límites y siguiente paso

Deadline cooperativo5s comprobado entre etapas/antes de commit; NO garantía de
interrupción dentro del motor síncrono ni de commit físico. Gate de duración pendiente.
Generation observa expiración actual PG de quotes antes de commit, sin repricing.
Pruebas PG preparadas no acreditan main/gateway montado; no-store de errores requiere
wiring descrito. Stock desconocido no es0 y no se promete reserva futura.
CU09/MCP/UI quedan para sus incrementos, sin stubs públicos que parezcan funcionales.
Groq/extracción real conserva su bloqueo externo informado; no reconfiguración ni
excusa para proveedor falso. Primero Build PURE, luego PG TEST, revisión y wiring.



<a id="origen-backend-integral38-recommend-handoff-md"></a>

## Origen: backend/INTEGRAL38_RECOMMEND_HANDOFF.md

# 38C — contrato previo a activación frontend

## Resultado posterior atribuido a Build/revisiones

Material reutilizado/stock conocido insuficiente y remonte stock conservando CPU
fueron corregidos y releídos: aceptación funcional y seguridad LOCAL. Última
selección pura31 PASS/1 FAIL solo por assert de dependencia de placa legítima;
corregido únicamente ese assert, nodo focal1 PASS/31deselected. No nueva corrida
completa32PASS declarada. Lint/formato0 finales. Tres PG previos usaban app aislada;
un nuevo test sobre main real aprobó junto a2 nodos extracción (3 PASS0), cubriendo
propiedad/CSRF/CAS/query403/flags422/cap413 y ausencia de escrituras dePC.
Router montado realmente; ni las referencias ni las ofertas acreditan compatibilidad
del catálogo sin atributos. No positivo físico completo, frontend/planes/MCP ni
entrega integral aprobados por este gate. El error de conexión Groq corresponde a
extracción viva; preview determinístico no llama al proveedor.

## P1 residual: CPU conservada y remount por motherboard

Relectura independiente: P2 stock y P1 cooler explícito cerrados respecto del delta;
P1 residual aún bloqueaba aceptación. Build informó PURE31 PASS/exit0 previo y lint0;
PG3 anterior, sin cambio de repositorio. No equivale a aprobación de esta corrección.

Corregido SOLO tower_service, test pure y este handoff. Se conserva wrapping de Build
y canonical_actions, sin editar archivos compartidos, repositorio, main ni motor.
El guard stock_package ya NO descarta CPUs no adquiridas antes de leer necesidad:
adquisición determina exclusivamente si se puede acreditar pasta incluida, nunca
elimina la dependencia de una operación de remount con respaldo publicado.

Con CPU conservada, motherboard distinta y sin cooler explícito: stock_cooler_included
true + thermal_compound_required_on_remount true activan dependencia conservadora
CONDICIONAL a reutilizar ese cooler stock. La razón aclara que la instalación real
es desconocida; inclusión en caja no demuestra cooler instalado ni sobrantes.
Sin confirmación explícita: missing, coste incompleto, nunca recommended. Confirmación
usuario true: available_confirmed. Paquete CPU nuevo documentado conserva included.
No se crean facts técnicos, no se llena cooler unknown ni se cambia motor/cobertura.
Sin fuente positiva de necesidad no se aplica pasta universal ni se convierte unknown
en false; el motor conserva sus faltantes. Esta precisión sustituye la descripción
anterior que limitaba el ramal stock exclusivamente a CPU recién adquirida.

Regresión focal nueva: CPU/línea conservada y placa distinta; exige missing/subtotal
conservado/coste incompleto/no recommended; confirmación habilita material, no verde;
necesidad unknown no infiere requerimiento universal. Comprueba cooler unknown y PC
original intacta. Test previo de paquete CPU nuevo→included permanece sin debilitar.

READY para Build PURE focal y lint/formato afectados, luego relectura del delta P1.
`.venv/Scripts/python.exe -m pytest -q tests/test_tower38_recommend_pure.py`
Sin runners/shell/commits propios; resultado posterior no verificado. No repetir
PG3 por rutina: no cambia lógica de repositorio. API38C sigue sin montar en main.

## Delta de revisión independiente P1/P2 — no aceptado todavía

Evidencia anterior atribuida a Build: PURE27 PASS/exit0, PG TEST3 PASS/exit0,
Ruff check ocho archivos/exit0; Ruff format siete residuales/exit1. Revisión
independiente confirmó P1/P2 funcionales, por tanto esos gates NO cierran38C.

P1 corregido en tower_service.material_dependencies:
- Inclusión de pasta es evidencia de paquete, NO de sobrantes de cooler instalado.
- CPU/placa cambiada conservando cooler, o reselección del MISMO component_id con
  nueva línea: con necesidad documentada, missing salvo confirmación explícita de
  material. Sin cotización de material soportada no se inventa estado priced.
- Definición conservadora determinista de paquete nuevo: component_id de cooler
  distinto de los instalados Y línea nueva. Esa adquisición cuesta como acción.
  Incluso si se cobra reemplazo del mismo SKU, no se presupone paquete/pasta nuevo;
  confirmar disponibilidad o elegir pieza distinta documentada es la alternativa.
- Solo paquete nuevo con inclusión sourced true permite included. Inclusión unknown
  no acredita disponibilidad; si requerida=true queda missing/coste incompleto.
- CPU nueva sin cooler previo/explícito puede aportar paquete stock SOLO con facts
  stock_cooler_included y pasta/necesidad con fuentes. No llena categoría unknown ni
  cambia veredicto del motor. Unknown de necesidad NO se transforma en false o en
  necesidad universal; se conserva incertidumbre del motor y limitaciones.
- Reason y source_refs distinguen paquete recién adquirido de reutilización.

P2 corregido en tower_cost:
- select_offer recibe cantidad y excluye stock_quantity conocido insuficiente;
  busca otra oferta vigente suficiente. None sigue unknown, NO cero; in_stock con
  cantidad no declarada conserva política pública vigente. Nunca reserva stock.
- incremental_cost agrega TODA demanda nueva por component_id antes de seleccionar
  UNA quote/variante que cubra el conjunto; no puede repartir líneas/acciones para
  sortear stock. Unidades instaladas inalteradas no suman compra. RAM sustituida se
  cobra completa. No se suman stocks de ofertas alternativas ni variantes distintas.
- Si falta oferta suficiente: coste incompleto. Subtotal conocido y presupuesto
  insuficiente conocido se preservan; no se reinician a cero.

Tests focales actualizados/añadidos: reutilizado+included=true→missing; confirmación
explícita→available_confirmed; cooler distinto nuevo→included; mismo SKU reseleccionado
no paquete acreditado; inclusión unknown con necesidad documentada→missing; paquete
stock CPU sourced sin asumir instalación; preview real conserva subtotal y coste
incompleto. RAM4 con stock1/alternativa stock4, RAM en dos grupos, stock0/None, dos
acciones storage mismas piezas agregadas sin contar instalación y subtotal/budget.
Mocks de evidencia son sintéticos; motor/gates reales NO se debilitan.

Archivos funcionales: tower_service.py, tower_cost.py, test_tower38_recommend_pure.py.
Solo formato además en API, references, repository y test PG; sin lógica repositorio
modificada. Hand-off actualizado. Sin main/auth/motor/deps/escrituras ajenas.
READY para Build PURE focal, Ruff check/format separados y revisión delta tras gates.
PG anterior3 PASS sigue evidencia anterior, NO nuevo resultado; según criterio del
coordinador no repetir PG por rutina: repositorio solo cambió wrapping.
Ningún runner/shell propio ni aprobación posterior declarada. Formato manual pendiente
de verificación; si queda residual se necesita diff mecánico del coordinador.

## Corrección de BIOS requerida y estilo — gate aún pendiente

Build informó PURE27:26 PASS/1 FAIL; Ruff check1 y format1, PG38C NO ejecutado.
El fallo restante era propio: exclude_none recursivo eliminaba bios_version:null,
que es un campo REQUERIDO del contexto aunque su valor sea nullable. Corregido
canonical_actions: omite contexto opcional None, pero si existe serializa ese objeto
con model_dump(mode=json) SIN exclude_none y conserva {bios_version:null}.
No se cambian DTO/validaciones compartidas. CPU sigue sin candidate_context y el
test motherboard espera el null explícito, valida roundtrip y simula borrado de BIOS
anterior sin herencia ni mutación del original.

Corrección de imports multilínea en API/servicio/dos tests y E741: variables line
en lugar de l. Formato manual por PATCH sobre los siete archivos propios señalados:
API, cost, references, repository, service, tests pure/PG. Sin más funciones ni
cambios de precios, fuentes, gates de motor o identidad. tower_models.py no tocado.
READY para rerun PURE, Ruff check y format separados; PG TEST después de resolver
cadena optional/required y gates. No runners/shell propios ni resultados posteriores.
Si Ruff conserva envolturas residuales, escalar diff mecánico al coordinador, no
declarar formato aprobado ni entrar en un bucle de corrección manual a ciegas.

## Corrección focal posterior al gate PURE de Build

Build informó25 tests:23 PASS y2 FAIL; gate NO aprobado. PG y Ruff aún no ejecutados.
No se atribuye código de salida no comunicado ni aprobación a ese resultado.

Diagnóstico/corrección limitada a archivos propios:

1. Mock de materiales usaba SimpleNamespace no hashable donde BasicSpecs.evidence
   deduplica referencias. Sustituido por EvidenceRef real, sintético y frozen, con
   URL/fecha/locator. BasicSpecs y assertions de estados de material intactos.
2. Serialización de propuestas incluía candidate_context:null para CPU y otras
   categorías; el contrato compartido exige OMITIR ese campo no aplicable. Era
   también un defecto de producción de roundtrip, no solo una fixture incorrecta.
   Nuevo canonical_actions usa model_dump(mode=json, exclude_none=True) al emitir
   item.actions y en la fixture manual. No se cambia TowerAction ni su validación.
   Contexto motherboard desconocido conserva {bios_version:null}, campo requerido;
   IDs requeridos de acción se conservan, candidatos no reciben UUID.

Tests añadidos: acciones de respuesta real preview.model_dump(mode=json) se pasan
SIN reparación a TowerPreviewRequest manual y TowerSimulationDTO (solo agregando
expected_pc_revision donde corresponde). Se verifica reemisión canónica, misma
evaluación/estado y conservación de XOR declarado/seleccionado, line_id y BIOS
desconocida de motherboard. No se debilitan cobertura ni gates de recomendación.

READY para Build: repetir PURE focal; después PG TEST y Ruff check/format pendientes.
Comando PURE desde backend:
`.venv/Scripts/python.exe -m pytest -q tests/test_tower38_recommend_pure.py`.
Cambios de esta corrección: tower_service.py, test_tower38_recommend_pure.py y este
handoff. No runners/shell propios, cambios compartidos, instalaciones ni main wiring.
Resultado posterior todavía NO verificado. Frontend no debe activar38C antes gates.

Estado: código preparado para gate Build; NO montado en main, sin gates ejecutados.
Ownership exclusivo nuevos recommendations/tower_*.py, API y tests propios.

POST `/api/towers/{pc_id}/recommendations/preview`, UUID, query vacía.
Sesión/propiedad servidor y Origin/CSRF existentes; no evidencia técnica cliente.
Request cerrado: expected_pc_revision, objective general|gaming|productivity,
budget_ars string decimal positivo ARS, price_condition cash|list,
mode automatic|manual_comparison, workload blender-cpu|null, materials y alternatives.
Materials solo thermal_compound/available_confirmed/confirmed:true.
Alternatives manuales key/actions idénticas a TowerSimulationDTO; automático no
acepta alternativas. Nunca guarda PC, plan, cuota, sesión ni consulta proveedor.

Respuesta: pc_id, pc_revision, objective, budget_ars, mode, items, missing_fields,
limitations. Item: key/actions/evaluation/benefit/cost/dependencies/offers/versions/
status/missing_fields. Status recommended solo verde completo, beneficio sustentado,
coste completo y presupuesto; fallo conocido domina sin eliminar faltantes.
Manual se etiqueta comparación, nunca una promesa de mejora sin fuente.
Coste incremental sin crédito por piezas retiradas; RAM reemplaza conjunto.
Sin precios históricos fallback; ofertas fresh/in_stock/identidad exacta/condición,
Decimal ARS, vencimiento <=24h. Envío/financiación/mano de obra excluidos.

Referencias: docs/REFERENCIAS_RENDIMIENTO38.md leído completo; Blender4.5.0 CPU
solo workload explícito; TPU raster1440 nativo sin RT/upscaling, índices NO FPS.
Identidad por MPN exacto documentado o modelo curado exacto y evidencia técnica;
no ID whitelist, parecido, núcleos, VRAM ni precio como rendimiento.

Wiring posterior por dueño de main: importar router de api.tower_recommendations e
include_router una vez. No se modifica main durante revisión actual.
Gateway existente rechaza query POST torre y firma método/raw_path exactos.

Interfaz retail B2 transmitida explícitamente por coordinación tras denegación del
handoff (sin reintento de lectura): `upgradejusto.retail.tables.resources`.
El repositorio consulta identity SOLO dataset_version del snapshot fijado AND todos
sus component_id servidor. Nunca SQL del modelo, user_id ni IDs cliente autorizantes.
MPN publicado exacto y categoría permiten referencia aunque attributes esté vacío;
esto NO añade evidencia técnica ni convierte unknown del motor en compatible.
GTIN NO es MPN. Nombres retail/VRAM/precio no reemplazan crosswalk de fabricante.

## Archivos y verificaciones solicitadas a Build

- recommendations/tower_models.py: request cerrado, alternativas key/actions sin
  revisión duplicada ni datos técnicos; boolean true explícito para materiales.
- tower_repository.py: lectura PG real con locks propietario/revisión/publicación;
  published_catalog_snapshot completo, sin paginación ni fallback de catálogo.
- tower_references.py: Decimal scores/hashes/URLs de las fuentes leídas; matching
  exacto de modelos curados con envolvente técnica y fuentes; ningún ID demo.
- tower_cost.py: ofertas servidor fresh/in_stock/condición/24h, multiplicación de
  cantidades, sin crédito por retirados ni precio histórico. Gates independientes.
- tower_service.py: evalúa motor existente, IDs de simulación estables, conjuntos RAM,
  máximo128 evaluaciones explícito; TODOS los primarios se consideran antes de
  aplicar cota. Bundles motherboard/RAM/PSU/cooler: dos ofertas más baratas por
  categoría tras escanear todo el snapshot, no óptimo exhaustivo ni todos los kits.
  Dependencias adicionales cuestan completo; incompatibilidad conocida domina.
- api/tower_recommendations.py: router preparado, Depends(owner/client_ip) existentes.
- tests/test_tower38_recommend_pure.py: identidad arbitraria, workload, más de90 IDs,
  beneficios RAM/CPU, frescura/stock/condición/expiración, cantidades/budget, todos los
  gates, fallo+faltantes, materiales documentados/unknown/manual y request cerrado.
- tests/test_tower38_recommend_pg.py: propietario404 antes de revisión409, snapshot
  coincide con TODOS los IDs PG publicados, revisión/PC preservadas; app HTTP aislada
  prueba CSRF/Origin/query/ownership sin editar main ni montar rutas globales.

Desde backend, Build único runner TEST, checks separados y exit individual:

1. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_recommend_pure.py`
2. Wrapper TEST PG existente: seleccionar `tests/test_tower38_recommend_pg.py`.
3. Ruff check y format de estos nueve archivos nuevos (sin reabrir suites aprobadas).

Ninguno ejecutado por este escritor; no PASS/exit inventados. Sin deps, migraciones,
auth, main, motor, datos o publicación modificados. Formatting manual pendiente de
Ruff Build, sin runners propios. Tests sintéticos NO prueban rendimiento físico.

## Límites para revisión, no ocultar como aceptación integral

Interfaz retail resuelta por transmisión del coordinador: published_identities lee
resources en la MISMA transacción/locks de PC/publicación. No inspección adicional
de módulos retail activos ni lectura privada. TowerRecommendationCatalog conserva
identity internamente, no DTO técnico cliente. Resolver versionado identity-2
permite5700X por MPN100-100000926WOF sin depender de CG13355/P02 u otros IDs.
El beneficio devuelve MPN/método/fuente/versión y el motor sigue unknown si no hay
atributos. Ofertas también deben coincidir store/product_id/variant_key/source_url
con esa identidad publicada; sin coincidencia, ningún importe utilizable.
Tampoco se inventó crosswalk de una variante5070Ti sin MPN validado; el índice123
está versionado en GPU_BENCHMARKS y documentado en la fuente, pero no se aplica a
una variante aún no identificada.
No hay cotización de pasta externa: necesidad documentada sin incluida/confirmada
queda missing, coste incompleto. Campos nuevos no publicados permanecen unknown.
El gate verde real torre depende de evidencia técnica publicada del otro bloque;
los691 registros/ofertas/fotos no la reemplazan. El test de clasificador verde usa
resultados sintéticos como prueba de gates, NO acredita una PC real compatible.
PG prueba conjunto completo de publicación disponible y además70 relaciones
sintéticas propias en dos versiones: identidad posterior a50, exclusión de IDs fuera
del snapshot y ausencia de mezcla entre versiones. No muta active ni publicaciones
existentes. La fixture relacional no pretende acreditar publisher/retail reales.
READY para Build/revisión de este delta, NO cierre38 ni recomendación retail real
acreditada. Wiring/API frontend solo después de gates.

## Delta posterior: identidad retail estable

Lógica cambiada DESPUÉS del READY anterior: tower_repository, tower_references,
tower_cost, tower_service y dos tests propios; ejecutar selección PURE y PG de este
bloque y Ruff nuevamente. No repetir suites Google/motor/retail aprobadas por rutina.
Tests añadidos: beneficio positivo por MPN sin atributos, IDs arbitrarios, fuente/
versions, coste oferta completo pero estado requires_verification; GTIN no usado,
MPN parecido/categoría/variante/fuente inválidos no caen a nombre curado;5070Ti sin
crosswalk permanece unknown; oferta y identidad deben coincidir exactamente.
Sin ejecuciones propias, PASS o códigos nuevos. Build único runner TEST.



<a id="origen-backend-integral38-retail-handoff-md"></a>

## Origen: backend/INTEGRAL38_RETAIL_HANDOFF.md

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



<a id="origen-backend-integral38-share-handoff-md"></a>

## Origen: backend/INTEGRAL38_SHARE_HANDOFF.md

# CU09 torre v1 — preparación backend para Build

## Estado vigente: expiración HTTP BLOQUEADA temporalmente, sin evidencia vencida

Build informó lint del test exit0 y8 wraps mecánicos aplicados, sin cambios de lógica.
El nodo de expiración HTTP falló a4.08s con el prerrequisito previsto:
`existing expired quote unavailable`. No skip/xfail ni relajación del criterio.

Agregado PG de solo lectura comunicado por Build:
- Hora PG: `2026-10-26T20:16:24.303935-03:00` (23:16Z).
-56 versiones publicadas,15342 recursos,30509 ofertas RAW válidas: TODAS sin vencer.
- Primera expiración: `2026-10-27T13:53:41.862776Z`.
- Última expiración: `2026-10-27T14:34:15.578109Z`.

Causa temporal demostrada: todavía no había cotización vencida, no fallo de binding
observado. Se DETIENE búsqueda/extracción; sin cambiar reloj/fechas/precios/fuentes,
crear publicaciones, esperar automáticamente, programar jobs ni reintentar ahora.
Test y datos permanecen intactos. Build comunicó catálogo preservado; las aserciones
posteriores de conservación/costes del nodo NO se alcanzaron y no son prueba aprobada.

Nodo listo para un futuro intento SOLO tras vencimiento real y autorización nueva:
`tests/test_tower38_share_expiry_http.py::test_existing_expired_raw_quote_published_and_read_frozen_over_http`.
No se inició scheduler ni continuación diferida. GET congelado normal ya PASS no
demuestra GET con quote efectivamente vencida. No cierre de esta reserva ni relato
de historia real de usuario; la snapshot del fixture sigue explícitamente sintética.

Se mantienen cierre LOCAL del pipeline TEST,5 boundary PASS y proceso cooperativo
post-start PASS2.82s con revisión de seguridad cerrada. Expiración real pendiente
NO bloquea implementación frontend independiente ni gates Next/BFF/logging. Sin
autorizar producción/mounts. Este turno solo documenta el bloqueo: no ejecución,
código/test/DTO nuevo, reloj/entorno/PG, proveedores, root/frontend, commits o delegación.

## Checkpoint vigente: test HTTP de quote RAW realmente vencida (preparado)

Nuevo archivo único de test: `tests/test_tower38_share_expiry_http.py`;
nodo `test_existing_expired_raw_quote_published_and_read_frozen_over_http`.
**READY para Build; NO ejecutado ni reserva de expiración cerrada todavía.**

Fuentes/interfaces inspeccionados: fixture real share_context/actors/checked/signed;
published_catalog_snapshot, tablas catalog_revisions/active/retail_resources,
Offer/make_offer/current_offer/select_offer, TowerRepository.get, TowerPlanCreate,
Generation.calculate, request_hash y tablas privadas headers/revisions. Nada de
providers/SDK/HTTP externo ni lecturas de archivos de entorno.

Selección determinística sin IDs permitidos ni primera página: recorre TODOS los
versions publicados y recursos RAW por versión/componente/offer_id. Exige quote ya
vencida respecto de clock_timestamp real, zona horaria, expires=observed+24h,
CG/Venex, URL HTTPS y selección histórica real según condition/stock/status/importe/
variante/identidad. PublicSources.quote verifica contra recurso y publicación
histórica; exige referencia retail_product reconstruible. Si no existe candidata
apta/publicable: FAIL explícito `existing expired quote unavailable`, no skip/verde,
clock patch, espera artificial, precio nuevo ni fallback silencioso.

Snapshot de fixture: base es PC propia del actor real, revisión actual. Se restaura
solo la decoración de freshness de lecturas usando modelos Offer del RAW original,
sin cambiar ningún campo ni persistirlos. Generation.calculate real recibe midpoint
del intervalo REAL observed/expires y presupuesto exactamente igual al importe RAW.
No se fabrican resultados compatibles ni se desactivan reglas; conserva9 categorías
y estado blocked/requires_verification. NO se usa HTTP save ni se parchea/llama con
fecha falsa a before_commit: no se presenta como creación real con precio vencido.

INSERT solo de NUEVO header y revisión1 propios, timestamps de metadata actuales y
snapshot calculada con generated_at histórico SINTÉTICO, nombre de fixture explícito.
No UPDATE de ninguna revisión/puntero existente ni escrituras de catálogo/precios/
fuentes/publicaciones. Header CAS1 y request.expected_pc_revision son reales del
fixture; no se afirma que el plan fuese emitido en el pasado.

Después: POST shares REAL con sesión/CSRF/HMAC37 a main montado SOLO en TEST por
fixture existente; GET público REAL200 mientras expires_at ya está en pasado.
Comprueba offer NO vacía, importe/condición/moneda/availability histórica/fechas/
notice y metadatos de referencia contra reconstrucción de publicación RAW. Locator
público es etiqueta controlada, NO locator libre original copiado. Veredicto/coverage,
status y costes exactos del servidor se conservan, sin repricing. Segundo GET exige
bytes idénticos completos. Lectura pública no altera PC, revisión privada ni recurso
seleccionado; compara además puntero activo y conteos de catálogo/recursos/versiones.

Cleanup reutiliza fixture existente: solo planes de sus actores y claves de contador
de sus IPs sintéticas; actores limpian sus PCs/sesiones. Sin conversaciones creadas,
nuevas migraciones ni mounts de producción. Auth/servicio/admission no se overridean.
Fallos propios: fases fijas y mensajes sanitizados, sin cuerpos/precios/IDs/tokens/URLs
ni excepciones crudas en salida. No redundancia de revocar/B404 aquí: cubiertos por
gate previo; este nodo se limita a evidencia de quote vencida y conservación.

Build, runner exclusivo y wrapper TEST existente, desde backend:

```powershell
.\.venv\Scripts\python.exe -m pytest -q tests/test_tower38_share_expiry_http.py::test_existing_expired_raw_quote_published_and_read_frozen_over_http
.\.venv\Scripts\ruff.exe check tests/test_tower38_share_expiry_http.py
.\.venv\Scripts\ruff.exe format --check tests/test_tower38_share_expiry_http.py
```

Códigos de este incremento: ninguno. Formato manual por revisar. No repetir suites
anteriores ni modificar evidencia para obtener candidata. Si falta quote existente,
reportar prerrequisito a Build; no inventar fuente/precio. Este test no cierra UI de
expiración/Next-BFF ni503 de proceso ni certificación física. Solo este archivo y
handoff editados; sin Shell/runners/deps/commits/delegación/frontend/producto.

## Checkpoint vigente: cierre LOCAL de P2 post-start y DTO para consumidor

Build comunicó5 boundary PASS/exit0, lint/formato2 archivos exit0 y EXACTO mismo
proceso cooperativo antes fallido ahora PASS2.82s. Relectura de seguridad cerró P2
post-start LOCAL para el pipeline TEST; no se modificaron logging/probe/worker/
needles para conseguirlo. No equivale a certificación de APM ni producción montada.

Nuevo `docs/specs/CU09-compartir.md#origen-backend-integral38-share-dto-md`: contrato descriptivo de campos realmente
emitidos, derivado mediante lectura de proyección/fuentes/registro/modelos/repositorio/
servicio/router, más tipos técnicos/beneficio y handlers de errores. Incluye raíz
pública DIRECTA (no envelope snapshot), todos los niveles y null/opcionales,
referencias locales, evidence_summary por categoría, quotes/cost/benefit/dependencies,
versions exactas y metadatos privados de creación/listado/revocación.

Precisiones para frontend: títulos exactos `Plan de mejora de torre` y
`Plan de mejora por etapas`; POST201 sí retorna projection_version/revoked_at además
de id/plan_revision/title/created_at/token, NO effective_state. GET privado es solo
{items:[metadata+effective_state]}, sin paginación ni token; DELETE usa revisión
CAPTURADA y204 sin body. Dinero string/null y status no se rederivan de verdict.

Este turno SOLO añadió DTO y actualizó este handoff; ningún cambio de lógica,
tests, mounts, proveedor, scripts ni frontend. Sin shell/runners/deps/commits/
delegación. No nuevos resultados ejecutados por este escritor ni repetición de gates.
Build debe leer/transmitir DTO al owner frontend si su perfil no permite backend;
no reintentar accesos denegados. Documento no autoriza activación ni include_router
de shares en main: frontend prepara contra fábrica TEST para gates Next/BFF.
Reservas cotización vencidaHTTP/Next end-to-end/503 de proceso y alcance de evidencia
se mantienen visibles. Lo siguiente conserva historial, no reemplaza este checkpoint.

## Checkpoint vigente: fix focal PRODUCTO tras fuga post-start demostrada

Evidencia comunicada por Build:8 guards PASS/exit0 y lint/formato3 archivos exit0.
Proceso cooperativo falló privacidad a2.93s: BEFORE500 correcto, AFTER200/chunk23
exacto, evento de raise alcanzado, graceful_completed/exit0/EOF/captura completa;
sin force cleanup ni timeout. Hits: **after_token=true, note=true**, demás false.
No se imprimieron logs/valores. Esto demuestra fuga de marcadores SINTÉTICOS del
probe a logs reales de Uvicorn, no exposición observada de un bearer real emitido.

Causa concreta: boundary propagaba la excepción original después de start;
Uvicorn podía registrar su mensaje con marcador/nota. Build autorizó este fix
acotado, no filtros globales ni cambios de proveedor/middleware/main/routing.

Delta:

- `upgradejusto/api/tower_share_boundary.py`: nueva clase interna
  `ShareResponseInterrupted(RuntimeError)`, constructor sin parámetros y mensaje
  fijo `Public share response interrupted`. Solo para Exception post-start y paths
  shares ya reconocidos. Se abandona primero el except y DESPUÉS se lanza la nueva
  excepción, sin variable de error original ni traceback/cause/context conservados.
  No basta from None dentro del except: eso solo ocultaría __context__ al formatear.
- Mantiene propagación al servidor, nunca traga el fallo ni manda otro start/body,
  repara SSE o cambia200 ya enviado. Pre-start500 fijo/headers igual, cancelaciones
  y BaseException pasan intactas, no-share sigue con excepción original.
  Clase/mensaje son contrato interno de fallo del servidor, NO campo/API de cliente.
- `tests/test_tower38_share_mounted.py`: actualiza el nodo existente de stream+
  cancelación para exigir clase/mensaje seguros y __cause__/__context__ realmente
  None. Nuevo `test_share_boundary_post_start_error_is_closed_without_exception_chain`
  prueba ambos paths share con fallo de send al primer start, un único intento200,
  sin segundo envío, str/args/repr fijos y ausencia de causa/contexto; control
  no-share preserva identidad de la excepción original.
- Probe/worker/nodo de logging/needles/captura/plazos/eventos NO modificados.
  Se debe repetir EXACTAMENTE el caso de proceso que detectó la fuga, no retirar
  needles ni silenciar productor/loggers. Main/routers de producción unchanged.

**READY para Build y relectura independiente; NO ejecutado aquí ni P2 cerrado.**
Desde backend en wrapper pertinente, checks focales y mismo proceso:

```powershell
.\.venv\Scripts\python.exe -m pytest -q tests/test_tower38_share_mounted.py::test_share_boundary_pre_router_timeout_statuses_and_stream_passthrough tests/test_tower38_share_mounted.py::test_share_boundary_closed_prefixes_do_not_change_other_cus tests/test_tower38_share_mounted.py::test_share_boundary_unexpected_dependency500_headers_and_nonshare_control tests/test_tower38_share_mounted.py::test_share_boundary_started_errors_and_cancellation_propagate tests/test_tower38_share_mounted.py::test_share_boundary_post_start_error_is_closed_without_exception_chain
.\.venv\Scripts\ruff.exe check upgradejusto/api/tower_share_boundary.py tests/test_tower38_share_mounted.py
.\.venv\Scripts\ruff.exe format --check upgradejusto/api/tower_share_boundary.py tests/test_tower38_share_mounted.py
.\.venv\Scripts\python.exe -m pytest -q tests/test_tower38_share_logging.py::test_test_process_unexpected500_and_started_error_log_redaction
```

Sin repetir guards8, nodo normal201/log,17/4 ni suites amplias por rutina. Si aparece
nuevo fallo material: escalado tras corrección diagnosticada, no bucle/rotación.
No shell/runners/deps/commits/delegación/env/SDK/costes/LLM. No promesa universal de
APM con captura de locals o access logging arbitrario: gate acotado a configuración
verificada y marcadores sintéticos. Falta PASS real del mismo proceso y cierre de
seguridad/relectura; expiración HTTP/Next-BFF/503 siguen pendientes. Producción OFF.

## Checkpoint vigente: worker cooperativo y prueba de unwind completo

Build informó FAIL diagnóstico2.72s: BEFORE correcto, AFTER200 observado, chunk23
bytes exacto, interrupted=false/errorclass=null; captura completa sin hits antes de
terminación forzada. Esto NO prueba redacción tras unwind. Revisión independiente
explicó BaseHTTP: puede cerrar HTTP normalmente y después elevar app_exc. Por
decisión Build, interrupción deja de ser condición obligatoria, no se silencia error.

Fuentes de decisión comunicadas por Build: Starlette base.py184–208 y wrapper230–251;
documentación oficial Uvicorn Config/Server vía Context7 y server.py de0.54 inspeccionado
por Build: should_exit, run/main_loop/shutdown/task wait. Este escritor no releyó
dependencias denegadas ni invocó herramientas/runners para inferir APIs.

Delta solo TEST:

- NUEVO `tests/tower_share_process_worker.py`: guard UJ_ENV=test/DB coincidente ANTES
  de imports de Uvicorn/probe/main/recursos; argv contiene solo puerto numérico.
  Config/Server públicos, localhost, asyncio/h11/access_log=False y timeout graceful4s
  (dentro del wait5s existente del padre). Sin monkeypatch de señales/SDK/registro.
  Añade solo backend a sys.path del hijo para lanzamiento directo del script local.
- Un reader daemon de stdin acepta STOP fijo o EOF de cleanup, solicita should_exit;
  comandos inválidos fallan. Server.run queda en main thread. Marcador fijo
  WORKER_GRACEFUL_COMPLETED solo tras retorno de run, control válido y sin force_exit;
  salida0. El padre exige además startup propio, STOP enviado, EOF real y ausencia
  del mensaje de timeout de tareas de Uvicorn; no basta el marcador por sí solo.
- `tests/tower_share_runtime_probe.py`: exclusivamente rama opt-in TEST, imprime
  TEST_SHARE_STREAM_ERROR_REACHED con flush justo ANTES de RuntimeError, sin await
  intermedio. Error mantiene marcador/nota sintéticos RAW para que la prueba detecte
  una fuga real si aparece. No se corrigen logger ni boundary de producto.
- `tests/test_tower38_share_logging.py`: nodo de errores usa worker/stdinPIPE;
  tras cerrar cliente envía STOP/flush/cierra stdin y espera5s. Kill solo emergencia
  propia, invalida gate. Nunca terminate como camino normal ni kill de otros procesos.
  Mantiene startup10s/HTTP5s/cap1MiB/post-bind/poll/no redirects/sesiones/firmas.
  Chunk exacto y200+headers siguen exigidos. interrupted se conserva como observación.

Prerequisitos adicionales de PASS: evento de raise exactamente una vez, worker
completed exactamente una vez, exit0, STOP enviado, no forced cleanup, no timeout
graceful, EOF del reader, captura no truncada/incompleta y TODOS los needles ausentes.
La búsqueda de privacidad siempre ocurre después del cleanup y tiene prioridad,
incluso con fallo HTTP u otros prerequisitos. No xfail, filtrado ni ocultación.

Schema JSON seguro previo conservado, más synthetic_error_reached/graceful_completed/
forced_cleanup/stop_sent/worker_exit0/capture_eof/shutdown_timed_out (boolean).
Falta de unwind usa phase process_graceful_completion_unproven. Hits siguen usando
process_after_start_logs_sensitive_metadata con categorías boolean, nunca valores.

**READY para Build, sin ejecución propia ni PASS nuevo.** Desde backend, wrapper
TEST, primero guards y checks focales, después UN nodo de proceso:

```powershell
.\.venv\Scripts\python.exe -m pytest -q tests/test_tower38_share_logging.py::test_error_worker_refuses_environment_before_resources tests/test_tower38_share_logging.py::test_error_probe_refuses_non_test_or_invalid_markers_before_import
.\.venv\Scripts\ruff.exe check tests/tower_share_process_worker.py tests/tower_share_runtime_probe.py tests/test_tower38_share_logging.py
.\.venv\Scripts\ruff.exe format --check tests/tower_share_process_worker.py tests/tower_share_runtime_probe.py tests/test_tower38_share_logging.py
.\.venv\Scripts\python.exe -m pytest -q tests/test_tower38_share_logging.py::test_test_process_unexpected500_and_started_error_log_redaction
```

Worker guard nuevo tiene2 casos (no TEST/DB mismatch), rehúsa antes de importar
recursos. No repetir nodo normal2.83s ni suites17/4; su harness no fue refactorizado.
El nuevo proceso todavía puede FALLAR privacidad tras unwind completo: reportar
solo metadata y esperar decisión Build antes de tocar producto. Main/boundary/proxy/
loggers/servicios/proveedores unchanged, producción sin mounts. Sin shell/runners/
deps/commits/delegación, sin llamadas LLM. Reservas expiraciónHTTP/Next-BFF/503 intactas.

## Checkpoint vigente: diagnóstico cerrado y privacidad SIEMPRE tras cleanup

Build: guard opt-in6 PASS/exit0, lint exit0; wraps de formato ajustados por Build.
Nodo nuevo de errores en proceso: FAIL a2.59s en process_after_start_http/classgate.
BEFORE500+headers+body fijo pasó. No se sabe todavía si AFTER recibió0 bytes,
si faltó interrupción o si difirió el chunk. El fallo anterior abandonaba el nodo
antes del guard de privacidad: NO constituye evidencia de ausencia/presencia de
metadatos sensibles en logs.

Cambio solo en `tests/test_tower38_share_logging.py`, en el nodo de errores nuevo:

- Conserva intacta exigencia de RemoteProtocolError y chunk exacto inocuo. No acepta
  len0 como éxito, no agrega sleeps, filtros ni timeouts. Una pérdida/buffering del
  chunk antes de flush es una hipótesis de fixture/transporte, NO defecto demostrado
  de producto ni motivo para relajar esta aserción sin decisión de Build.
- Guarda el fallo HTTP como fase/clase cerradas en lugar de fallar definitivamente
  antes de la comprobación de logs. Tras detener/join del hijo propio, SIEMPRE busca
  needles en RAM aun si checked/status/protocolo falló; cleanup fallido/incompleto
  también se reporta sin mostrar excepciones. Mantiene cap1MiB y barrera post-bind.
- Privacidad tiene prioridad: cualquier hit produce phase
  `process_after_start_logs_sensitive_metadata`, aunque exista fallo HTTP. Captura
  incompleta falla; solo sin hits y captura completa se reporta la fase HTTP previa.
  Nunca se devuelve captura, substring, body, URL, excepción original ni valores.

Schema exacto de diagnóstico de fallo (JSON), SOLO claves/literales/medidas seguras:

- phase: process_after_start_logs_sensitive_metadata / process_capture_incomplete /
  process_startup / process_before_start_http / process_after_start_http.
- http_failure_phase: null o una de las tres fases HTTP anteriores.
- failure_class: null / http / gate.
- before_start_passed, response_started_observed, interrupted: boolean.
- received_len: entero de bytes retenidos del stream, máximo4096;
  expected_chunk_match: boolean (chunk fijo exacto).
- http_error_class: null / RemoteProtocolError / ReadError / OtherHTTPError.
- capture_complete: boolean.
- marker_hits: flags boolean por categoría before_token/after_token/before_url/
  after_url/before_digest/after_digest/note/csrf; no contenidos ni conteo de substrings.

**READY para UN intento diagnóstico focal por Build; NO ejecutado aquí.**

```powershell
.\.venv\Scripts\python.exe -m pytest -q tests/test_tower38_share_logging.py::test_test_process_unexpected500_and_started_error_log_redaction
```

Lint/formato focal del único test modificado pendientes. No repetir nodo normal
ya PASS a2.83s, guard6, boundary ni suites17/4 por rutina. Ante resultado: reportar
solo este schema para decidir causa/corrección, sin iteración ciega. Main/proxy/
boundary/loggers/SDK/proveedores y configuración de producto NO modificados.
Sin shell/runners/delegación/deps/commits. Producción sigue sin mounts shares;
expiración HTTP/Next-BFF/503 y redacción post-start continúan pendientes de evidencia.

## Checkpoint vigente: caracterización REAL de errores500/post-start, sin fix preventivo

Build comunicó4 boundary PASS/exit0, lint/formato3 archivos exit0 y proceso normal
de logging1 PASS (2.83s). Seguridad cerró P2 de headers500 LOCAL PREACTIVACIÓN.
Precisión: aquel500 usó stack completo FastAPI/Starlette sintético, NO composición
main de producción. Ninguno de esos resultados demuestra redacción de excepción
inesperada después de start en Uvicorn. Producción sigue SIN routers shares.

Delta solo TEST, sin modificar boundary/main/proxy/loggers/configuración de producto:

- `tests/tower_share_runtime_probe.py`: conserva guard TEST+DB coincidente antes
  de imports/recursos. Flag explícito `UJ_TEST_SHARE_ERROR_PROBE=1`, por defecto OFF.
  Exige BEFORE/AFTER en `UJ_TEST_SHARE_ERROR_BEFORE_TOKEN` y
  `UJ_TEST_SHARE_ERROR_AFTER_TOKEN`,43 ASCII URL-safe cada uno y distintos; errores
  de configuración sanitizados. Marcadores generados por el test en RAM, no emitidos
  por servicios de shares, no reales ni tomados de cuentas del usuario.
- Solo opt-in/fábrica fresca: dos rutas GET literales bajo shared-tower-plans,
  registradas ANTES del catch-all real, omitidas de OpenAPI. Usan public_ingress
  existente, BodyLimits/boundary/main real. BEFORE lanza RuntimeError desde dependency;
  AFTER manda chunk inocuo fijo de StreamingResponse y después lanza RuntimeError.
  Excepciones incluyen marcador/nota SINTÉTICOS para comprobar captura, no imprimirlos.
  No bypass de sesión de negocio ni prueba de presupuesto: son rutas de fallo de TEST.
- `tests/test_tower38_share_logging.py`: nuevo guard puro con6 entradas de rechazo,
  asegura negativa antes de importar composición; no red/PG en ese nodo.
- Nuevo nodo de proceso usa mismo Uvicorn target y --no-access-log, puerto efímero,
  stdout propio post-bind antes de health/requests y poll por request. Modifica solo
  las tres variables opt-in en copia del entorno del hijo, nunca argv/archivos.
  Firma real con helper/actor TEST para ingress; no necesita transferir cookies.
- BEFORE exige500 fijo+cuatro headers. AFTER exige200 con headers, chunk fijo y
  terminación incompleta RemoteProtocolError, sin segunda respuesta exitosa.
  Request timeout5s y startup10s no ampliados. Captura RAM1MiB sin filtros/reenviar
  stdout/stderr, needles ambos marcadores/URLs/digests/nota/CSRF, sin valores en fallos.
  Overflow/incompletitud falla cerrado; proceso/fixtures propios únicamente.

**READY para prueba focal, sin ejecución ni nueva aprobación.** Build primero guard
puro, luego SOLO nodo nuevo de proceso en wrapper TEST y exclusión mutua de runners:

```powershell
.\.venv\Scripts\python.exe -m pytest -q tests/test_tower38_share_logging.py::test_error_probe_refuses_non_test_or_invalid_markers_before_import
.\.venv\Scripts\python.exe -m pytest -q tests/test_tower38_share_logging.py::test_test_process_unexpected500_and_started_error_log_redaction
.\.venv\Scripts\ruff.exe check tests/tower_share_runtime_probe.py tests/test_tower38_share_logging.py
.\.venv\Scripts\ruff.exe format --check tests/tower_share_runtime_probe.py tests/test_tower38_share_logging.py
```

El proceso normal ya PASS no se repite por rutina: su nodo no fue refactorizado y
el opt-in permanece OFF por defecto. Toda ejecución nueva todavía NO VERIFICADA.
Fases de fallo fijas process_startup/process_before_start_http/process_after_start_http;
si encuentra metadatos sensibles en logs, falla con SOLO JSON estático
`{"phase":"process_after_start_logs_sensitive_metadata"}`. No xfail ni expectativa
de fuga tratada como verde: es posible/probable FAIL por excepción post-start que
actualmente se propaga. No se elimina needle, bytes ni excepción para ocultarlo.

Ante evidencia de fuga, reportar FAIL sanitizado y esperar decisión de Build antes
de corregir producto/logging; no reconfigurar loggers globales ni servicios. La
prueba es de fallos SINTÉTICOS en pipeline REAL Uvicorn/main, no outage PG, prueba
de hardware, acceso autenticado nuevo, presupuesto ni certificación end-to-end.
Expiración con oferta por HTTP/Next-BFF/503 de proceso continúan pendientes.
Sin shell/runners/delegación/deps/commits ni proveedor/LLM; mounts de producción OFF.

## Checkpoint vigente: P2 inesperado500 PREACTIVACIÓN y bridge cookie conservado

**READY de código para pruebas focales/relectura; aceptación de exposición retenida.**
La revisión señaló falta de headers en500 inesperado; no demostró fuga de bearer.
Causa: TowerShareBoundary es outermost USER middleware, pero ServerErrorMiddleware
de Starlette está fuera. Una excepción anterior a response.start podía escapar y
producir su500 exterior sin headers de shares.

Delta adicional (sin sobrescribir el fix de cookies activo):

- `upgradejusto/api/tower_share_boundary.py`: solo paths shares ya definidos por
  share_path. Intercepta Exception antes del primer intento response.start y emite
 500 fijo `{"detail":"Internal server error"}`, application/json y longitud exacta,
  con no-store/no-referrer/nosniff/noindex,nofollow. No captura/renderiza/loguea texto
  de error, body original, target o token. No excepción de auth/ingress convertida
  silenciosamente en éxito; estado500 explícito.
- Marca start antes del send para no duplicar respuesta si el transporte falla.
  Tras start vuelve a propagar el error, sin otro start/body500. No captura
  BaseException/CancelledError/KeyboardInterrupt/SystemExit, ni cambia deadlines,
  HMAC/raw_path, body/chunks/SSE, paths ajenos o control de identidad.
- `tests/test_tower38_share_mounted.py`: dos nodos nuevos, sin PG requerido:
  `test_share_boundary_unexpected_dependency500_headers_and_nonshare_control`
  usa FastAPI/Starlette completo con dependency RuntimeError sintética real y
  raise_server_exceptions=False; paths shares público/privado500 con headers y body
  fijo sin markers, y path no-share sigue en500 estándar sin headers adicionales.
  `test_share_boundary_started_errors_and_cancellation_propagate` comprueba chunks
  intactos, un solo start, propagación post-start y cancelación sin generar500.
- main sigue con registro existente de boundary, SIN mounts shares ni handler
  global nuevo. No cambios a cookies/producto, proveedor, MCP, DB ni scripts.

El bridge real uj_session del checkpoint anterior permanece preparado junto con
su reproducción pura y diagnósticos por fase/clase. NO hay prueba nueva ejecutada
por este escritor. Build ejecuta primero los nodos puros y revisa fuentes; solo
después el proceso TEST con sesión PG real. Desde backend, en wrapper pertinente:

```powershell
.\.venv\Scripts\python.exe -m pytest -q tests/test_tower38_share_logging.py::test_cookie_bridge_actual_testclient_container_to_httpx_scoped_jar
.\.venv\Scripts\python.exe -m pytest -q tests/test_tower38_share_mounted.py::test_share_boundary_pre_router_timeout_statuses_and_stream_passthrough tests/test_tower38_share_mounted.py::test_share_boundary_closed_prefixes_do_not_change_other_cus tests/test_tower38_share_mounted.py::test_share_boundary_unexpected_dependency500_headers_and_nonshare_control tests/test_tower38_share_mounted.py::test_share_boundary_started_errors_and_cancellation_propagate
.\.venv\Scripts\python.exe -m pytest -q tests/test_tower38_share_logging.py::test_test_process_share_creation_public_errors_and_bounded_log_capture
.\.venv\Scripts\ruff.exe check upgradejusto/api/tower_share_boundary.py tests/test_tower38_share_mounted.py tests/test_tower38_share_logging.py
.\.venv\Scripts\ruff.exe format --check upgradejusto/api/tower_share_boundary.py tests/test_tower38_share_mounted.py tests/test_tower38_share_logging.py
```

Rerun boundary justificado por cambio de su lógica, no repetir17/4 ni mounted PG
anterior por rutina. Códigos posteriores: ninguno, todo lo nuevo NO VERIFICADO.
No shell/runners/procesos/dependencias/commits/delegación ni inspección de procesos
ajenos. Instaladas Starlette/httpx: lecturas denegadas antes, no se reintentaron.

Límite de seguridad explícito: errores DESPUÉS de start todavía pueden propagarse
al servidor y requieren revisión/captura real de logs antes de exposición. El test
de500 de stack completo es sintético local y NO demuestra logging de Uvicorn de
inesperado500. Falta gate de ese500 en proceso real; no añadí opt-in ni rutas de
error al probe sin acuerdo Build. Continúan también cotización vencida por HTTP,
Next/BFF real y503 de proceso no demostrado. Header/cache correcto no equivale a
redacción end-to-end. Routers de producción siguen SIN montar.

## Checkpoint vigente: bridge explícito de cookie entre clientes de TEST

Build informó fallo del logging dinámico a2.66s: AttributeError de `str.domain`,
localizado en `client.cookies.update(ctx.a[0].cookies)`, antes de crear plan/share.
No prueba auth fallida; el hijo había superado startup/health. Sin puerto ajeno
contactado. Lint previo3 archivos exit0; Build ajustó wrap de health por formato.

Diagnóstico/interfaz: se pasaba el contenedor de cookies de TestClient directamente
al update de otra librería cliente. No se debe tratar su iteración de nombres como
cookies interoperables. Las lecturas de fuentes instaladas solicitadas fueron
denegadas; no se reintentaron ni se afirma inspección de esos internals. Fuentes
disponibles: `api/auth.py` define SOLO `COOKIE=uj_session`, Path=/api, HttpOnly y
SameSite=lax; `/csrf` devuelve token JSON y autorización usa X-CSRF-Token, no hay
cookie uj_csrf. Fixture real ya utiliza cookies.get(COOKIE) como valor string.

Corrección focal solo en `tests/test_tower38_share_logging.py`:

- `copy_test_session(source, target)` extrae únicamente ese valor real mediante get,
  valida tipo/no delimitadores de header y usa cookies.set con domain127.0.0.1 y
  path/api. No copia cookie jar ajeno ni otras cookies, no fabrica identidad ni
  reemplaza sesión/CSRF. Target fijo HTTP localhost, redirects explícitamente false;
  conserva el régimen HTTP de TEST, no cambia auth del producto ni configuración.
- `test_cookie_bridge_actual_testclient_container_to_httpx_scoped_jar`: dummy ASGI
  local sin red/PG/debug route de producto, emite cookies sintéticas en TestClient
  real y reproduce el update anterior. Si no reproduce AttributeError, falla cerrado
  para escalar. Prueba el bridge con httpx real, solo uj_session, domain/path correctos,
  ninguna cookie en health/otro host y rechazo de target externo/redirects.
- Diagnóstico futuro acotado: fases literales clientstart/cookiecopy/plancreate/
  sharecreate/publicread/publicerrors/revoke/budget/finish, y clases cerradas attribute/
  type/value/http/gate/other. Nunca texto original de excepción, headers, cookies,
  cuerpos, URLs, tokens, SQL ni traceback locals. Incluye fallos explícitos del gate.
- Deadline10s, captura1MiB, puerto efímero, anuncio post-bind y poll previo a cada
  request, firmas37 y cleanup propio permanecen. No otro archivo de lógica modificado.

**READY de preparación, NO ejecutado ni PASS reclamado**. Build debe comprobar
primero la reproducción/bridge puro; solo si pasa, un intento focal de proceso en
wrapper TEST desde backend. Sin repetir mounted/boundary,17/4 ni suites amplias:

```powershell
.\.venv\Scripts\python.exe -m pytest -q tests/test_tower38_share_logging.py::test_cookie_bridge_actual_testclient_container_to_httpx_scoped_jar
.\.venv\Scripts\python.exe -m pytest -q tests/test_tower38_share_logging.py::test_test_process_share_creation_public_errors_and_bounded_log_capture
```

Lint/formato focal del único test editado pendientes. Si el repro no confirma o
aparece otra causa material, escalar con fase/clase fijas; no ensayo ciego ni rotación.
No shell/runners/install/proveedor/env/commits, main/proxy ni inspección de proceso
ajeno. Continúan pendientes expiración con cotización HTTP, Next/BFF real y503 de
proceso; producción sin shares montados. Resultados anteriores no prueban este fix.

## Checkpoint vigente: puerto efímero y barrera de arranque del proceso TEST

Resultados nuevos comunicados por Build: boundary **2 PASS, exit0**; mounted HTTP
con PG real **1 PASS, exit0** (1.85s). El test de logging falló ANTES de arrancar hijo
por puerto8765 ocupado (WinError10048). No hubo solicitud al servidor ajeno ni se
autoriza detenerlo/reutilizarlo/inspeccionar su command line. No se repiten los tres
tests aprobados por este ajuste. MCP contract4 PASS independiente no prueba LIVE.

Delta exclusivamente TEST:

- `tests/test_tower38_share_logging.py`: bind localhost puerto0, getsockname y cierre;
  mismo puerto literal en argv Uvicorn y base_url. No cambia origen configurado,
  firma37, servicios, fábrica, main ni routers.
- Carrera bind cerrada por readiness del hijo propio: reader usa read1 para no
  esperar4096 bytes/EOF, observa en su stdout `Application startup complete.` y el
  anuncio POST-bind `Uvicorn running on http://127.0.0.1:<puerto> (` antes de permitir
  el primer HTTP. Nunca usa health de un tercero como fallback de startup. Si otro
  proceso gana el bind, no hay anuncio propio y se falla por exit/deadline10s.
- Hook previo a CADA request exige startup propio, poll vivo y captura sin overflow;
  health adicional permanece dentro del plazo original, sin retries a otro servidor.
  Se conserva captura acotada1MiB, no forwarding de logs, errores sanitizados y cleanup
  exclusivamente del Popen propio/fixtures PG propios. No kill/requests a procesos ajenos.
- `tests/test_tower38_share_mounted.py`: solo elimina import sqlalchemy no utilizado.
  Ajustados manualmente los wraps largos señalados en logging; sin formatter/runner.

**READY para Build**, resultado posterior todavía NO VERIFICADO. Próximo comando
único de comportamiento, mediante wrapper TEST existente desde backend:

```powershell
.\.venv\Scripts\python.exe -m pytest -q tests/test_tower38_share_logging.py::test_test_process_share_creation_public_errors_and_bounded_log_capture
```

Lint/formato focal solo de los dos tests modificados. No repetir boundary/mounted
ni17/4 anteriores por puerto/estilo. El ejemplo8765 de notas inferiores es histórico;
el test actual selecciona puerto efímero, no se debe lanzar el probe manual allí.
Antes de habilitar shares: Build ejecuta logging y revisa ingress/headers; todavía
sin include_router de shares en producción. Se conservan pendientes de cotización
vencida por HTTP, Next/BFF real y503 de proceso no demostrado. Test antiguo403 se
coordinará por separado; este delta no lo modifica ni acredita redacción completa.

## Incremento vigente: ingress/headers y montaje exclusivo TEST

**READY de preparación para Build; NO activación ni prueba aprobada de logging.**
Build comunicó aceptación PREMOUNT de ambos P2 tras3 casos puros,1 PG y lint/formato
de cuatro archivos exit0. Esa evidencia precede a este incremento y no lo verifica.

Archivos de este delta:

- `upgradejusto/api/proxy_ip.py`: conserva firma literal37 y políticas previas;
  añade GET/POST colección privada shares y DELETE share UUID, minúsculas y sin query.
  Público solo GET raw `/api/shared-tower-plans/[A-Za-z0-9_-]{1,128}` sin query;
  permite longitud inválida de bearer para que el servicio consuma PG antes de404.
  Alias percent, slashes extra y consultas no se aceptan como ingress canónico.
  Se reutilizan peer real/headers cerrados/HMAC existente, sin owner cliente.
- `upgradejusto/api/tower_share_boundary.py`: `TowerShareBoundary(app)` puro ASGI,
  únicamente cambia response.start. Prefijos decoded cerrados público y privado
  UUID/shares; no cambia receive/body/chunks/SSE/raw_path/método/firma ni logging.
  no-store, no-referrer, nosniff y X-Robots-Tag noindex,nofollow; otros CU intactos.
- `upgradejusto/api/tower_shares.py`: añade X-Robots-Tag y actualiza comentario de
  ingress; no cambia servicios, propietarios, CSRF, tokens, snapshots ni cuotas.
- `upgradejusto/main.py`: solo import/registro del boundary DESPUÉS de BodyLimits,
  outermost user middleware para incluir errores pre-router. Routers/lifespan/orden
  anterior conservados. **NO include_router de shares privados ni públicos**.
- `tests/tower_share_runtime_probe.py`: `app` y `create_app()`, importan main y montan
  shares SOLO tras comprobar UJ_ENV=test y DATABASE_URL no vacía igual a
  TEST_DATABASE_URL. Rechazo sanitizado antes de importar composición/recursos.
  No seeds/debug routes/overrides/auth falsa ni lectura de archivos de credenciales.
- `tests/test_tower38_share_mounted.py`: fixture `share_context` con sesiones A/B
  reales, datos sintéticos y mounts temporales sobre main real, restaura rutas/schema.
- `tests/test_tower38_share_logging.py`: proceso TEST real opcional, puerto8765
  exclusivo con rechazo si ocupado; no usa3000/8000 ni mata procesos ajenos. Captura
  stdout/stderr solo RAM hasta1MiB, drena excedente sin retenerlo y falla cerrado.
  No imprime bodies/bearers/digests/URLs/cookies/CSRF; errores de prueba sanitizados.

Tests/comandos focales propuestos desde backend, NO ejecutados por este escritor.
Build configura su wrapper TEST existente; primero boundary/HTTP estable y solo
después proceso de logging. Sin repetir17/4 ni gates anteriores por rutina:

```powershell
.\.venv\Scripts\python.exe -m pytest -q tests/test_tower38_share_mounted.py::test_share_boundary_pre_router_timeout_statuses_and_stream_passthrough tests/test_tower38_share_mounted.py::test_share_boundary_closed_prefixes_do_not_change_other_cus
.\.venv\Scripts\python.exe -m pytest -q tests/test_tower38_share_mounted.py::test_mounted_share_owner_csrf_signed_frozen_revoke_budget_and_headers
.\.venv\Scripts\python.exe -m pytest -q tests/test_tower38_share_logging.py::test_test_process_share_creation_public_errors_and_bounded_log_capture
.\.venv\Scripts\ruff.exe check upgradejusto/api/proxy_ip.py upgradejusto/api/tower_share_boundary.py upgradejusto/api/tower_shares.py upgradejusto/main.py tests/tower_share_runtime_probe.py tests/test_tower38_share_mounted.py tests/test_tower38_share_logging.py
.\.venv\Scripts\ruff.exe format --check upgradejusto/api/proxy_ip.py upgradejusto/api/tower_share_boundary.py upgradejusto/api/tower_shares.py upgradejusto/main.py tests/tower_share_runtime_probe.py tests/test_tower38_share_mounted.py tests/test_tower38_share_logging.py
```

Target Uvicorn soportado por el probe, SOLO para Build en su TEST wrapper y después
del gate HTTP; el test de logging lo inicia/detiene de forma acotada:

```powershell
.\.venv\Scripts\python.exe -m uvicorn tower_share_runtime_probe:app --app-dir tests --host 127.0.0.1 --port 8765 --loop asyncio --http h11 --no-access-log
```

Cobertura preparada: POST201 real, listado active, público200 y bytes fijos tras
recalcular/borrar PC, propietarioB404, sin sesión401/CSRF403, HMAC incorrecto403,
query/alias/headers falsos403,405 de métodos no soportados,413 real pre-router,
422,429 PG antes de lookup incluso tokens malformados y503 sintético explícito
por fallo inyectado solo en repository.public (no fake owner/service ni outage real).
Prueba ASGI separada comprueba408 real del BodyLimits sin cambiar sus5s por defecto
y passthrough de chunks/headers para estados403/404/405/408/413/422/429/503.
El proceso real prepara201/200/404 inválido/revocado/403/413/422/429 bajo captura.
Sesiones/cookies del fixture, no credenciales humanas; cleanup solo planes de sus
actores, contadores de sus IPs aleatorias y rutas temporales. HeadE ya aplicado,
sin nueva migración ni cambios a catálogo activo691/NV3 o recursos publicados.

Límites/decisiones pendientes, SIN disfrazar de aprobación:

1. Todos los resultados de estos comandos: **NO VERIFICADOS**. Formato manual,
   recheck de Build pendiente. Si aparece fallo material, una corrección diagnosticada
   y después escalado al coordinador. No ejecuté shell, runner, proceso ni instalación.
2. El test antiguo `test_tower38_share_api.py::test_central_policy_blocks_private_shares_until_authorized_wiring`
   documenta una precondición ya reemplazada: la allowlist nueva permite llegar a
   sesión y ya no garantiza403. NO se editó fuera del scope temporal autorizado;
   requiere autorización/coordinación de ajuste, no un bypass de auth ni mantener
   artificialmente el bloqueo anterior. Su aserción de main sin mounts sigue vigente.
3. Fixture HTTP actual: plan desconocido SIN ofertas. Sus bytes fijos no prueban
   cotización vencida por HTTP; falta fixture histórico con cotización vinculada real
   de origen/precio para ese gate. No se insertaron ofertas/precios inventados ni se
   modificó una snapshot para aparentar caducidad. Pruebas previas de fuente histórica
   no sustituyen este recorrido HTTP pendiente.
4. Captura de proceso todavía NO demuestra503 real: rama503 del test montado es
   sintética declarada. No se provoca outage PG ni se tocan servicios globales.
   La configuración --no-access-log forma parte de la condición de operación; no
   acredita seguridad con access logging activado ni con APM/locals/binds arbitrarios.
5. Build extenderá SU script raíz solo mediante flag soportado de TEST factory;
   este escritor no tocó scripts ni inventó flags. El404 preliminar de dev/prod
   comunicado por Build no prueba201/200 ni estos errores del probe.
6. Sigue PENDIENTE BFF frontend real/Next, caches/referrers y redacción end-to-end.
   No activación en main/producción por la sola preparación o un PASS backend:
   esperar logging proof y aprobación explícita de Build/revisión independiente.
7. Coordinación: frontend LIVE diagnóstico sigue separado. Ejecutar este gate con
   fuentes estabilizadas y exclusión mutua de runners, antes del gate de proceso;
   no iniciar ni reconfigurar servidores existentes de diagnóstico.

Este checkpoint sustituye el estado del delta anterior; lo siguiente es historial.

## Estado vigente: corrección de dos P2 PREMOUNT

**READY para verificación focal; aceptación de seguridad todavía retenida.**
La revisión no encontró fuga directa de bearer/notes en su scope, pero confirmó
dos P2. No equivale a aprobación de exposición ni a prueba de logging efectivo.

1. `tower_projection.py`, `stages`: la degradación por evidencia reservada podía
   convertir una etapa privada blocked por presupuesto/materiales en
   requires_verification al no haber incompatibilidad técnica. Ahora el blocked
   privado domina explícitamente junto con los fallos técnicos. No cambian
   veredicto, cobertura, coste ni faltantes; unknown no se promueve a verde.
2. `tower_repository.py`, `list`: descartaba el header propio y devolvía solamente
   revoked_at, ambiguo si el plan estaba eliminado sin revocación individual.
   Ahora usa el header fresco bloqueado en la misma transacción y añade únicamente
   `effective_state` por item: revoked_at presente → `revoked`; en otro caso plan
   eliminado → `disabled_plan_deleted`; en otro caso → `active`. Propiedad antes de
   leer/devolver estado. No persiste este estado derivado ni modifica snapshot.
   Creación/`share_metadata` conservan su forma anterior, sin campo nuevo en POST.

Tests nuevos/ampliados, NO ejecutados por este escritor:

- `tests/test_tower38_share_pure.py::test_stage_blocked_dominates_withheld_without_technical_failure`
  tres casos sintéticos: budget blocked/within_budget false, material blocked y
  requires_verification. Motor compatible simulado y evidencia pública reservada;
  comprueba estado por etapa/global, coste/faltantes, veredicto/cobertura e inmutabilidad.
  No constituye prueba de hardware ni de cálculo real de presupuesto.
- `tests/test_tower38_share_pg.py::test_owner_cas_frozen_revision_revoke_after_recalculate_and_delete`
  escenario PG existente ampliado: active → disabled_plan_deleted con revoked_at
  null → revoked tras revocación, públicos404 iguales tras eliminar/revocar,
  ownerB404 al listar antes/después, shape privada cerrada y snapshot fijo intacto.
  Conserva actores reales de fixture y limpieza propia; no cambia catálogos/cuotas.

Build debe ejecutar solo esos nodos, con su wrapper TEST para PG, y lint/formato de
los cuatro archivos modificados; no repetir17 PURE/API ni4 PG anteriores por rutina.
Los cuatro archivos son proyección, repositorio y ambos tests citados. Sin shell,
runners, migración, commits, cambio de DTO privado, main/proxy ni montaje.

Evidencia previa comunicada por Build: lint13 exit0 y format13 exit0 después de sus
PATCH mecánicos residuales;17 PURE/API y4 PG exit0 corresponden a la base PRE-P2,
**no verifican estas correcciones**. Resultado focal posterior todavía pendiente.
Ante otro fallo material: escalar al coordinador, no bucle ni rotación.

Reserva adicional de seguridad para wiring: SAFE_HEADERS todavía no incorpora
`X-Robots-Tag`; resolverlo explícitamente antes de activar y comprobar propagación
router/main/BFF/proxy, incluidos errores exteriores. Este delta solo lo documenta,
no cambia headers ni infraestructura. Continúan pendientes revisión funcional
GENERAL/seguridad independiente y gate separado HTTP montado A/B/CSRF, logging real,
referrers/cache/BFF. **Routers siguen SIN montar; no hay autorización de exposición.**

Esta sección sustituye el estado anterior para el delta P2; lo siguiente conserva
historial y evidencia de la base.

## Estado vigente posterior a Build y ajuste exclusivamente de estilo

Evidencia comunicada por Build, no ejecución de este escritor:

- PURE/API: **17 PASS, exit0**, incluida corrección adversarial.
- Ruff check sobre13 archivos: **exit0**.
- Wrapper TEST PG, `test_tower38_share_pg.py` + `test_tower38_share_migration.py`:
  **4 PASS, exit0**. Definiciones inspeccionadas:3 tests core PG y1 de migración.
- Head único y aplicado solo TEST: **38_e_001**. Build confirmó preservación de
  publicación NV3 activa `revision-3014a27f8dee4150b16d83d756a2a3cb`,691 componentes,
  677 recursos retail. No prueba de hardware completo ni de exposición pública.
- Format check previo: **exit1**,12 archivos requerían formato y1 ya estaba formateado.
  No se recibió el detalle por archivo del output; no se atribuye por conjetura.

Delta actual SOLO estilo mediante PATCH manual: saltos, sangría, paréntesis de
continuación y comas finales. Sin cambios de algoritmos, literales/contratos,
aserciones, clasificación, validación ni corrección de future fields. Archivos:

1. `upgradejusto/shares/tower_tables.py`
2. `upgradejusto/shares/tower_registry.py`
3. `upgradejusto/shares/tower_sources.py`
4. `upgradejusto/shares/tower_projection.py`
5. `upgradejusto/shares/tower_repository.py`
6. `upgradejusto/shares/tower_service.py`
7. `upgradejusto/api/tower_shares.py`
8. `alembic/versions/38_e_001_tower_shares.py`
9. `tests/test_tower38_share_pure.py`
10. `tests/test_tower38_share_api.py`
11. `tests/test_tower38_share_pg.py`
12. `tests/test_tower38_share_migration.py`

`upgradejusto/shares/tower_models.py` inspeccionado sin cambio; completa el scope13.
Handoff actualizado con evidencia. No shell/runners/formatter/dependencias/commits
ni escritura de main/proxy/otros consumidores. Routers siguen SIN montar.

**READY para recheck focal de lint/formato por Build**; resultado posterior de
formato todavía pendiente, NO se afirma exit0. No repetir17 PURE/API ni4 PG por este
delta mecánico. Revisión independiente, HTTP montado A/B/CSRF y prueba REAL de
redacción siguen pendientes: las pruebas API actuales solo verifican ausencia de
mounts/bloqueo, no seguridad de activación ni ausencia efectiva de tokens en logs.

Las notas siguientes preservan preparación e historial; este estado vigente
sustituye sus resultados anteriores de ejecución/pendientes ya resueltos.

## Corrección focal posterior al primer check de Build

Build informó PURE/API:15 total,14 PASS/1 FAIL; sin PG ni migración aplicada.
Fallo diagnosticado: `gain` validaba directamente configuraciones privadas con
`Tower.model_validate`; `lines.0.future_private` disparaba extra_forbidden. No era
evidencia de fuga, pero impedía omitir campos futuros según contrato.

Corrección única: `_benefit_configuration` construye un Tower interno con claves
literales cerradas, IDs/selecciones/cantidades solo internos, nombre controlado y
contexto vacío. No copia notes/BIOS/nombres/keys nuevos; verifica catálogo publicado
y categoría. Estructura inválida da PCError422 sanitizado; selección no vinculable
reserva beneficio como unknown sin scores. No se modificó el DTO privado ni se
habilitó extra-ignore. Veredicto/cobertura históricos permanecen sin cambios.

Se conserva/amplía el test adversarial en las tres configuraciones, incluyendo keys
futuras de configuración/contexto/línea. Dos tests nuevos verifican inputs cerrados,
identidades/cantidades internas conservadas, ausencia de mutación,422 sanitizado y
beneficio reservado sin scores cuando no hay componente publicado.

Ruff check informado por Build: exit1, tres I001. Se corrigieron manualmente imports
en `test_tower38_share_pg.py`, `test_tower38_share_pure.py` y `tower_projection.py`.
Format check aún no ejecutado; no se reformatearon los13 archivos manuales completos.
Estas correcciones NO se ejecutaron en este turno. Siguiente paso Build: repetir
solo PURE/API y check focal; no PG hasta PASS. Si aparece otro fallo material,
escalar al coordinador, sin bucles de corrección ni suites amplias.

## Checkpoint y alcance

Código preparado; **ejecución de Build registrada arriba, sin activación**.
Contrato base/apéndice A aceptado antes del código; alta NV3 autorizada registrada
en `INTEGRAL38_SHARE_CONTRACT.md`. No se reintentó su lectura denegada.
No shell, runner, migración, instalación, commit, fetch, delegación ni cambios fuera
de los archivos autorizados. Legacy, motor, catálogo y planes privados no editados.

## Archivos e interfaces

- `upgradejusto/shares/tower_models.py`: solicitudes cerradas, dos títulos,
  confirmación estricta y revisión positiva máxima9999999999.
- `tower_registry.py`: versiones/clases/URLs/valores cerrados; HTTP y Tom's denegados.
- `tower_sources.py`: reconstrucción sobre publicación histórica, referencias
  unidas por tupla completa y componente, NV3 además por MPN/envelope exactos;
  cotizaciones históricas contrastadas con recursos crudos, sin reloj de caducidad.
- `tower_projection.py`: `TowerPublicProjection`; allowlists, referencias locales,
  contextos privados descartados íntegros, razones controladas y cobertura T01–T12.
- `tower_tables.py`: solo `tower_plan_shares`, `tower_share_read_budgets`.
- `tower_repository.py`: `TowerShareRepository(engine)`; `publish`, `list`,
  `revoke`, `consume_read`, `public`. Propiedad antes de CAS; header bloqueado para
  límite100; revocación usa revisión capturada incluso tras soft-delete/recalcular.
- `tower_service.py`: `TowerShareService(repository)`; `publish(owner, plan_id,
  request)`, `list(owner, plan_id)`, `revoke(owner, plan_id, share_id, revision)`,
  `public(token, verified_ip)`. Deadline cooperativo5s y límite integral1MiB,
  token43/256bits, hash-only PG; bearer devuelto únicamente después del commit.
- `api/tower_shares.py`: `router`, `public_router`, `service`; **sin montar**.
- `alembic/versions/38_e_001_tower_shares.py`: padre `38_d_001`, aditiva;
  downgrade rechaza filas de cualquiera de las dos tablas, incluido contador.
- `tests/test_tower38_share_{pure,pg,migration,api}.py`: nuevas pruebas focales.

Rutas privadas POST/GET `/api/tower-plans/{plan_id}/shares`, DELETE
`/api/tower-plans/{plan_id}/shares/{share_id}`. POST devuelve metadatos más `token`;
GET privado solo metadatos, nunca bearer/digest/snapshot. DELETE204 idempotente con
precondición sobre revisión capturada. GET público `/api/shared-tower-plans/{token}`
devuelve proyección fija; inválido/revocado/plan eliminado: mismo404.
Todos los resultados del router incluyen no-store/no-referrer/nosniff.429 incluye
Retry-After. Sesión, propietario y CSRF reutilizan `api.pcs.owner`; no owner cliente.

## Wiring futuro: NO realizado

1. Build debe reconfirmar archivos, metadata y head real D antes de aplicar E en TEST.
   Importar `upgradejusto.shares.tower_tables` registra ambas tablas sobre metadata
   existente; importa revisiones privadas solo para resolver FK. No cambiar legacy.
2. La política central CU07 **actualmente rechaza** paths privados `/shares`.
   Requiere ampliación autorizada exacta GET/POST colección y DELETE UUID, sin query;
   conservar sesión/CSRF/HMAC y no reescribir raw_path para eludirlos.
3. El GET público requiere ingress firmado/directo verificado por `client_ip`;
   contar tokens malformados de un segmento admitidos por ingress, igual que válidos,
   antes de lookup. Contador PG propio en transacción separada que ya ha hecho commit
   al responder404/429; no sustituirlo por memoria ni limitar solo tokens válidos.
4. **Antes de montar**, prueba REAL de redacción Uvicorn/BFF/proxy/APM/excepciones/SQL:
   ni token, ni URL cruda, ni digest en logs/trazas. Evitar captura de locals/binds y
   targets crudos. Middleware exterior debe conservar no-store/no-referrer también
   en errores previos al router, timeouts,404/405 y respuestas del gateway.
   No basta no imprimir en Python. También navegador/cache/referer y buffering.
5. Solo tras aprobación: importar `router, public_router` de `api.tower_shares` y
   añadir ambos mediante `app.include_router`; ampliar límites de body/ingress exactos
   y revisar deadline ASGI existente sin desactivar guardas. Nada de esto se escribió.

## Cuatro comandos focales históricos (Build ya ejecutó PURE/API y PG)

Desde `backend/`, Build usa su wrapper TEST existente para el entorno, sin mostrar
credenciales. Confirmar PG TEST/head/preservación antes del segundo comando: fixture
existente `pg_engine` aplica head y comprueba seed base append-only. No usar DEV,
SQLite, memoria ni modo offline para presentar evidencia PG. Un comando por check;
registrar código individual, sin pipes.

```powershell
.\.venv\Scripts\python.exe -m pytest -q tests/test_tower38_share_pure.py tests/test_tower38_share_api.py
.\.venv\Scripts\python.exe -m pytest -q tests/test_tower38_share_pg.py tests/test_tower38_share_migration.py
.\.venv\Scripts\ruff.exe check upgradejusto/shares/tower_models.py upgradejusto/shares/tower_tables.py upgradejusto/shares/tower_registry.py upgradejusto/shares/tower_sources.py upgradejusto/shares/tower_projection.py upgradejusto/shares/tower_repository.py upgradejusto/shares/tower_service.py upgradejusto/api/tower_shares.py alembic/versions/38_e_001_tower_shares.py tests/test_tower38_share_pure.py tests/test_tower38_share_api.py tests/test_tower38_share_pg.py tests/test_tower38_share_migration.py
.\.venv\Scripts\ruff.exe format --check upgradejusto/shares/tower_models.py upgradejusto/shares/tower_tables.py upgradejusto/shares/tower_registry.py upgradejusto/shares/tower_sources.py upgradejusto/shares/tower_projection.py upgradejusto/shares/tower_repository.py upgradejusto/shares/tower_service.py upgradejusto/api/tower_shares.py alembic/versions/38_e_001_tower_shares.py tests/test_tower38_share_pure.py tests/test_tower38_share_api.py tests/test_tower38_share_pg.py tests/test_tower38_share_migration.py
```

## Límites y evidencia pendiente

- Códigos de salida comunicados por Build: PURE/API0, PG0, Ruff check0;
  format check1 anterior al ajuste manual de estilo. Recheck focal pendiente;
  no instalar dependencias ni repetir suites funcionales por formato.
- Pruebas preparadas: tres rutas de notes/contexto, declarados/facts/razones/keys
  adversariales, tipos/unknown/zero, doce reglas, fail con faltantes, URLs/fotos HTTPS,
  cotización vencida exacta, payload/deadline; PG propietarios reales A/B derivados
  de sesión fixture, CAS/recalcular/PC-delete/soft-delete/revocar, rollback,100 total,
 60 concurrentes/reset y migración aislada con preservación legacy/refusal.
- API de preparación solo demuestra **bloqueo** central y ausencia de mounts.
  No demuestra aislamiento HTTP/CSRF de rutas nuevas: gate real posterior obligatorio
  con actores existentes, sin overrides de owner ni firma fingida. Tras autorización
  de mounts se debe adaptar la aserción de ausencia; no borrar evidencia para ocultar.
- Clasificación deliberadamente conservadora: nombres públicos genéricos de categoría,
  no nombres arbitrarios del catálogo ni alt comercial. BIOS privada y detalles/facts
  no registrados se reservan. No hay exportación completa de todos los facts técnicos.
  La revisión compuesta privada se reserva; por ello esta versión conservadora no
  promete verde público aunque el veredicto histórico del motor fuese compatible.
  Veredicto, doce estados, cobertura y faltantes permanecen; presentación se degrada,
  nunca se inventa compatibilidad ni se interpreta unknown como0. Fallo domina.
- Límite1MiB se verifica tanto entrada privada como salida pública completa; no cortes.
  Deadline cooperativo comprueba por etapa y antes del commit, no interrumpe CPU/commit
  de forma preemptiva ni reemplaza deadline exterior ASGI/timeout SQL.
- Por confirmar con Build: salida TEST/catálogo691, publicación NV3 activa, recursos,
  PCs e historia privada sin cambios; sin reset ni limpieza global. Pruebas eliminan
  únicamente planes de sus actores, contador por clave sintética y esquema UUID propio.
- Pendientes adicionales antes de aceptación: revisión independiente; HTTP A/B/CSRF
  montado; logging real; expiración con GET byte-equivalente por HTTP y mismo404;
  carreras emisión/revoke/delete bajo HTTP, y fuente NV3 exacta sobre publicación TEST.
  Los tests puros/PG preparados no sustituyen estos gates ni acreditan entrega38 total.

Estado de retorno: preparado para revisión/Build, NO activado ni aprobado. Si aparece
un fallo, una corrección diagnosticada; después escalar al coordinador sin rotación.
## Estado vigente27/10 — montaje normal PASS LOCAL, trabajo en PAUSA

Resultado comunicado por Build: nodo test_tower38_share_normal_pg.py real sobre
main normal1PASS2.05s, sin factory ni inyección de routers/auth. Navegador normalmain
2PASS8s: publicar, snapshot congelado, propietarioB404, revocar y consentimiento nuevo.
Son evidencias actuales de integración local, no despliegue ni permiso de nuevos gates.
Revisión UI P2 PC/etapas desktop cerrada; recorrido central posterior2PASS20.1s.
Sin cambios frontend en este cierre. Todo backend en PAUSA, sin reintento automático.

### Checkpoint previo — historial, reemplazado por resultados anteriores

Build informó Ruff check0/format0 y único nodo PG FAIL1.57s en inventario previo a
handlers: FastAPI0.156 usa _IncludedRouter sin path en app.routes. OpenAPI público
confirmó los cuatro métodos esperados. Corregido SOLO el test: inventario OpenAPI
y AST de main para imports productivos/montajes únicos incondicionales; sin acceso
a atributos privados SDK. Guardas auth/overrides/HTTP intactas. Recheck pendiente;
no se afirma PASS ni se reanuda chat.

Brandon autorizó explícitamente montar los routers CU09 en la aplicación normal.
main importa/incluye una vez tower_shares.router y public_router, sin flags,
factories, rutas de error o imports de tests. Boundary exterior y handlers de
propiedad/CSRF/HMAC/budget/proyección/hash/cabeceras permanecen sin cambios.

Preparado tests/test_tower38_share_normal_pg.py, nodo
test_normal_main_share_publish_frozen_owner_revoke_without_pc_writes: usa main,
sesiones/PG reales y helpers de cuerpo/firma existentes; NO monta routers, no
override auth/servicio. Publicar201, lectura anónima congelada, B404, revocar204,
404 uniforme, cuatro cabeceras y PC intacta. Pendiente de ejecución por Build;
no se afirma PASS ni cierre de entrega. Sin llamadas LLM ni cambios DEV/datasets.

Compatibilidad de harness históricos: test_tower38_share_mounted.share_context
añade routers temporalmente y duplicaría el montaje; NO usarlo para este gate.
test_tower38_share_api.test_public_and_private_capability_routes_are_not_mounted_in_main
expresa el estado PREVIO y ya no es criterio vigente. No se alteran esos harness
en este incremento. Las notas siguientes conservan evidencia HISTÓRICA y sus
reservas de premontaje, no una prohibición activa del montaje aquí autorizado.



<a id="origen-backend-integral38-technical-handoff-md"></a>

## Origen: backend/INTEGRAL38_TECHNICAL_HANDOFF.md

# Technical38 — implementation READY, not runtime integration

Contract2 accepted/specs applied by Build26/10/2026 before code. Thermal bool steering
was added to the contract before those keys were implemented. Only synthetic fixtures
in tests; no manufacturer facts imported, no code executed by this child.

## Modules and signatures for B3

- `retail.technical_parser.load_technical_envelope(raw: str) -> TechnicalEnvelope`
  rejects duplicate JSON keys, nonfinite constants, closed-schema/category/type errors,
  byte/ref overflow and structural conflicts. Raises ValueError (including Pydantic
  ValidationError). Pure, no HTTP/DB/provider dependency. Does not itself prove source
  registration: use revision binding below before treating facts as published evidence.
- `retail.technical_models`: TechnicalEnvelope dataclass with version, identity,
  data, fields, conflicts, import_digest. identity: TechnicalIdentity; fields values
  are tuples of SourceRef(source_id,url,consulted_on,locator); conflicts values tuples
  of ConflictObservation(value,source_refs). `envelope.references()` lists all refs.
  data resource arrays contain typed NominalResource; shared_limits typed SharedLimit;
  ordinary arrays remain lists; scalars strict ints/bools/exact tokens. Models support
  model_dump(mode="json") for adaptation; no domain evaluator classes imported here.
- `retail.technical_validation.validate_technical_binding(raw, component_id,
  component, source_rows) -> TechnicalEnvelope`: component is JSON-style dict with
  category,name,attributes,sources; source_rows are registered revision SourceData
  dicts with ISO consulted_on strings. Checks exact identity and source metadata,
  component sources, nonoverride of overlapping basic facts. Raises ValueError.
- `preserve_retail_resource(resource, previous, component) -> bool`: internal CU10
  predicate; component dicts include id. Supports exact-source or validated technical
  superset only. Raises ValueError on documented technical/retail MPN disagreement;
  requires deterministic vendor ID/category/origin/variant binding, copies payload
  unchanged. Caller must have run materialize first. No retail reconciliation.

CU10 write validates envelope structure and category. Materialize validates row ID,
name/category binding, every reference ID/URL/date/locator and component membership.
Publication checks preservation under existing fresh PG role/atomic transaction.
No new endpoints/migrations, no edits to engine, scopes or limits37. Legacy attributes
retain their2000-character bound; only tower_stock_v1 gets24000 UTF8 bytes.

## Consumer constraints

B3 must adapt resolved publication evidence in a separately authorized change and
include envelope digest/revision in evaluation. Do not merge conflicting fields over
basic facts: missing/conflicts stay unknown and known failures keep dominance.
No substring/casefold normalization of nominal tokens. Connector tokens3pin/4pin,
header kind fan. Typed resource objects are publication models, not preapproved passes.
No runtime resolver was modified here; publishing this attribute alone cannot turn
an evaluation green.

Thermal bools only cooler or CPU with documented stock cooler included:true. Missing
is unknown; included describes NEW packaging, never remaining user material. No
universal remount requirement or default inclusion. AG400 facts are not supplied.
Global fan current policy, expanded-load stock applicability, physical dimensions,
header allocations and actual manufacturer evidence remain separate unresolved gates.
Integer-mm schema does not round fractional dimensions into observations.

## Build-only checks, separate commands from backend/

Ownership is released at READY for mechanical formatting/check execution of this
increment only. No code/exit-code claim from this child.

1. `.venv/Scripts/ruff.exe format upgradejusto/retail/technical_models.py upgradejusto/retail/technical_parser.py upgradejusto/retail/technical_validation.py upgradejusto/administration/models.py upgradejusto/administration/validation.py upgradejusto/administration/repository.py tests/test_tower38_technical_models.py tests/test_tower38_technical_postgres.py`
2. `.venv/Scripts/ruff.exe check` with those SAME eight explicit paths.
3. `.venv/Scripts/ruff.exe format --check` with those SAME eight explicit paths.
4. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_technical_models.py`
5. Existing authorized TEST wrapper: `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_technical_postgres.py` (real PG only, existing guards, no DEV).

Tests cover strict types/closed JSON/duplicate keys/unknowns,501 refs independently
of byte cap,UTF8 bounds,basic conflict preservation,exact source and identity binding;
PG source mutations422/atomic pointer,role revocation,technical superset preserving
photos/quotes/history,retail refresh preserving technical curation and source removal
dropping resources. No routine rerun of previously accepted tower gates implied.

Next: Build focal checks, one diagnosed correction if needed, independent delta
review; only then B3 resolver integration and separately supplied actual source facts.

## Runtime resolver — new authorized increment after043eb78

Previous publication block accepted locally by security:34 pure/9 real TEST PG,
lint/format eight files0, per Build communication. This appendix supersedes the
earlier "no runtime resolver modified" statement ONLY for the following new delta:

- compatibility/tower_technical_resolver.py (new)
- compatibility/tower_evidence.py (only existing code edited)
- tests/test_tower38_technical_resolver.py (new)

`resolve_published_technical(component, catalog, basic: BasicSpecs)
-> ResolvedTechnicalSpecs(specs: BasicSpecs, revision_token: str|None)`.
Consumes the SAME full pinned ResolvedCatalog/source_rows as basic resolution.
Reuses validate_technical_binding before any merge; SourceRef becomes frozen domain
EvidenceRef. Publication resource/limit models convert through strict JSON validation
to domain NominalResource/SharedLimit (arrays -> required tuples, exact tokens).
No namespace/category/source inference, fetch, PG writes or rules imported/changed.

Known technical values with valid provenance add fields. Existing basic conflicts
cannot be cleared. Differing independently known values conflict rather than win
by order. Explicit validated conflicts remove that fact, retain combined references,
and mark BasicSpecs.conflicts, including overlapping basic facts. Other basic facts
and failures remain untouched. False and zero stay explicit observed values, not
missing. No electrical budgets, stock assumptions, splitters, hubs or thermal
defaults are manufactured.

No envelope => identical BasicSpecs object and no revision token; legacy revision
string/adapter version remain exactly unchanged. Valid envelopes contribute sorted
resolver-version/status/SHA256 tokens to tower data_revision, alongside publication
ID and original basic digests. Hash includes component ID, complete valid envelope
(thus technical digest/field/reference content), and raw length. Invalid envelopes
contribute bounded invalid tokens only, no raw source URLs/errors or field values.
Oversized invalid strings fingerprint a bounded prefix+length, not an unbounded
diagnostic; they never grant facts. Invalid/rejected evidence leaves basic untouched;
it cannot erase an independent known failure. Technical-only facts stay absent and
produce ordinary engine missing fields where required, not a global disable flag.

Tests use accepted synthetic motor fixture for complete-positive adapter proof,
explicitly NOT real hardware or manufacturer evidence. A synthetic basic resolver
seam supplies its pre-existing basic observations; all technical observations still
pass real parser/binding/domain adaptation. Additional tests: invalid sources/date/
locator/identity/category and malformed JSON; fail dominance plus missing; distinct
source conflict clearing only affected field; exact legacy no-envelope revision/
verdict; fractional basic dimensions preserved; thermal False/CPU inclusion guard;
digest changes with field/provenance/publication; full snapshot selected ID beyond50;
typed shared limits and old conflicts not cleared. No PG mock as integration proof.

Build-only, separate commands from backend (no own executions/results for this delta):

1. `.venv/Scripts/ruff.exe check upgradejusto/compatibility/tower_evidence.py upgradejusto/compatibility/tower_technical_resolver.py tests/test_tower38_technical_resolver.py`
2. `.venv/Scripts/ruff.exe format --check upgradejusto/compatibility/tower_evidence.py upgradejusto/compatibility/tower_technical_resolver.py tests/test_tower38_technical_resolver.py`
3. `.venv/Scripts/python.exe -m pytest -q tests/test_tower38_technical_resolver.py`

If needed, Build selects affected TEST PG integration separately, not routine suites.
No engine, HTTP, quotas, recommendation consumer, extraction, persistence, scopes or
policies edited. No actual manufacturer facts published. B3 must review integration
before any real-hardware positive claim. Global fan-budget necessity, expanded PSU
loads, physical measurements and evidence acquisition remain unresolved by this
representation/resolver block. Used/new thermal-package distinction stays with the
existing CU06 consumer; forwarding a bool does not authorize unlimited reused paste.

## Resultado posterior — atribución Build/revisión

Build:34 puros PASS0;9 PG TEST PASS0; Ruff check8 archivos0. Tras ajuste de estilo
del autor y wrapping residual mecánico Build, format8 archivos0. Ningún runner del
autor ni hechos de fabricante publicados. Revisora independiente aceptó LOCALMENTE
representación/publicación, sin hallazgo bloqueante comprobado. Metadatos de fuente
no certifican verdad técnica; resolver y política aplicable requieren gates propios.

## Resultado posterior del resolver — Build y revisiones independientes

17 pruebas puras PASS0; lint/formato3 archivos0 tras wrapping mecánico Build.
Con composición READY, prueba nueva de recomendaciones sobre main y2 nodos PG del
delta extracción pasaron juntos3 PASS0. No atribuir ese gate a hechos de fabricante.
Revisiones funcional y seguridad aceptaron LOCALMENTE el resolver; no hallazgos
bloqueantes comprobados. El binding runtime es identidad ID/categoría/nombre y fuentes;
no repetir como propio el control MPN retail realizado durante publicación.
Faltan hechos reales publicados y decisión explícita sobre globalfanbudget **T10**;
T12 no es el guard universal de ese campo. No cambió política por esta integración.



<a id="origen-backend-security37-handoff-md"></a>

## Origen: backend/SECURITY37_HANDOFF.md

# Security37 — código y pruebas preparados, NO aceptación ni ejecución propia

## Delta P2 de revisión: deadline absoluto sin carrera EOF

Body guard usa deadline monotónico explícito antes y después de CADA receive,
incluido EOF, y antes de llamar downstream. No depende del despacho de callback de
asyncio.timeout. asyncio.wait limita la espera sin aguardar indefinidamente el
desenrollado de una coroutine receive que demora aceptar cancelación. Al vencer:
cancel del receive, callback que consume eventual resultado/error,408 y cero parser.
Cancelación externa también cancela/drena receive; no se crean tareas de limpieza
recursivas ni temporizador para procesamiento/SSE. Contrato sigue5000ms/caps iguales.

Límite runtime explícito: deadline y respuesta necesitan event loop y send ASGI
cooperativos. Python no puede matar una coroutine receive que bloquea el thread o
ignora cancelación para siempre. Si receive demora cancelación, puede quedar SOLO
esa recepción cancelada hasta que el servidor/desconexión la termine; su resultado
se drena, nunca inicia parser ni proveedor. No afirmar cero tareas residuales ante
una implementación ASGI permanentemente no cooperativa: requiere corregir/terminar
ese runtime. Bajo receive ASGI cooperativo no quedan recepciones activas.

Nuevos tests en tests/test_security37_body.py: reloj controlado EOF justo después
del deadline sin callback despachado, precheck evita receive vencido, cancelación
demorada no retrasa408 y error tardío drenado, cancelación externa sin downstream.
Pendiente Build: SOLO body tests y Ruff de body_limits.py/test_security37_body.py;
sin DB ni repetición de PG7/regresiones67 aprobadas. Sin shell/ejecución propia.

## Resultados comunicados por Build; corrección mecánica posterior

TEST: body11PASS exit0; security37 PG7PASS exit0; regresiones afectadas
authsecurity/authPG/assistantPG/cancellation/extraction67PASS exit0. Retención TEST
dry-run applied=false,181sessions/396attempts/0leases, exit0. Primera invocación PG
desde raíz falló4 imports; invocación correcta desde backend exit0, no defecto producto.
Ruff check exit1 (orden imports) y format --check exit1 motivaron exclusivamente
patch de formato/imports. Sin cambio lógico ni nuevos comandos propios. Pendiente
recheck Ruff por Build y revisión de seguridad; estos PASS no son aprobación final37.

Solo backend. Sin shell, instalaciones, cambios de proveedor, llamadas LLM, lecturas
de credenciales, operaciones DEV, commits/push propios. Build realiza setup/migración,
checks TEST y commits locales después de revisión.38 todavía no iniciado.

## Contrato HTTP para frontend/Build

BodyLimits ASGI puro, exterior a middleware FastAPI: cuenta bytes REALES incluso
sin Content-Length, chunks o declaración inferior. Buffer limitado; no request.body
ilimitado. Caps: global262144, /api/auth/*8192,
/api/conversations/*/messages32768, /api/pcs/extract65536 bytes.
Deadline ABSOLUTO5000ms exclusivamente durante recepción.413 oversize,
408 timeout,400 longitud declarada inválida; JSON detail fijo y no-store. Desconexión
o cancelación no invoca parser/servicios. No temporiza procesamiento ni SSE.
No cuota adicional para GET públicos. El transporte/proxy sigue responsable de sus
propios buffers/conexiones: ASGI no puede evitar asignación de un chunk ya recibido.

GET /api/auth/csrf reutiliza sesión válida sin escritura ni cuota de emisión.
Nueva emisión: UPSERT atómico y creación en misma transacción PG, namespace
sha256 csrf-issue:IP obtenido solo por client_ip existente. Default30/15min/IP,
UJ_CSRF_ISSUES_PER_15M1..300. Denegación429 Retry-After conserva contador acotado,
no crea sesión. Credenciales/cookies/CSRF/rotación/propiedad siguen vigentes.

## Presupuesto PG compartido asistente/extracción

Nueva migración ADITIVA `alembic/versions/37_001_provider_budget.py`, parent33_001:
provider_execution_leases(owner FK restrictiva, expiry) e índices de retención.
Ninguna migración histórica modificada. Se requiere migrar antes de servir rutas.

Defaults/env, todos enteros validados:
- UJ_PROVIDER_USER_PER_MINUTE5 (1..60), GLOBAL_PER_MINUTE20 (1..300).
- UJ_PROVIDER_USER_CONCURRENT1 (1..4), GLOBAL_CONCURRENT4 (1..32).
- UJ_PROVIDER_LEASE_SECONDS180 (150..600): superior al turno acotado90s y margen
  de cierre/persistencia, también superior a extracción30s. No modificar esos límites.

Una admisión por NUEVO turno asistente o extracción; no por chunk/MCP/callback ni
UUID repetido. Un turno puede tener varias inferencias dentro del límite existente
de rondas; esto NO es una contabilidad monetaria ni contador externo de tokens.
Identidad servidor, auth antes de admisión. begin asistente conserva lock/UUID antes
de presupuesto; denegación revierte mensajes y contadores.429 con Retry-After antes
de SSE. Extracción recibe el mismo repositorio de presupuesto en composición HTTP.
DB error falla cerrado503, sin invocar proveedor. No fallback memoria en producción.

PG advisory lock fijo370001 ordena global→usuario/counters/leases para todos los
workers. Conversation lock se obtiene antes; release nunca obtiene conversation
lock. Counters comparten auth_attempts en namespaces hash distintos. Contención PG
limitada a3s statement/2s lock. Sin contadores autorizantes del cliente/modelo.
Release idempotente owner+lease en finally, cancel/error incluidos. Si teardown de
runner sigue vivo, conservar lease hasta finally del productor o TTL, sin liberar
prematuramente. Si PG falla al liberar, TTL permanece: no afirmar release exitoso.
Crash/process kill: no renovación silenciosa; leases vencidas dejan de contar y la
retención explícita las elimina más tarde. Todos los nodos deben usar misma PG y
settings compatibles; reloj autoritativo PG. No garantiza cancelación de cómputo ya
aceptado remotamente por un proveedor tras caída del proceso.

## Retención explícita

AuthMaintenance.retain dry-run por defecto; apply explícito. Edad mínima24h,
default24h: sesiones vencidas o revocadas fuera de edad, intentos antiguos y leases
vencidas fuera de edad. No users/PCs/conversaciones/planes, no cascadas ni limpieza
automática al startup. FK inesperada aborta transacción. CLI restringida UJ_ENV=test.
Solo usar wrapper TEST existente; no preparar/leer credenciales manualmente.

## Checks a ejecutar por Build, separados y con exit individual

- Migración head mediante wrapper TEST habitual (conftest ya ejecuta Alembic head).
- pytest focal `tests/test_security37_body.py` (unit ASGI, sin PG/proveedor).
- wrapper PG TEST seleccionando `tests/test_security37_pg.py`.
- Regresiones justificadas: auth/session/CSRF, assistant cancellation/UUID y
  extracción confirm, no suites legacy de hardware de rutina.
- Ruff check/format focal sobre archivos37; no instalar dependencias nuevas.
- Con entorno TEST del wrapper: `.venv/Scripts/python.exe -m upgradejusto.auth.maintenance --dry-run`.
  No --apply DEV ni llamadas reales al proveedor para probar cuota.

PG tests usan cuentas propias; snapshot/restore de contador global solo bajo gate
TEST exclusivo sin runners/servidores concurrentes. Prueba retención aplica dentro
de transacción PG exterior revertida: no borra permanentemente filas ajenas.
Matriz preparada: chunks/noCL/falsaCL, límites y deadline/cancel/disconnect; emisión
IP concurrente/reuso; rates y concurrencia user/global; aislamiento/UUID antes de
consumo; asistente bloquea extracción; release cancel/error; expiry recovery;
DB fail-closed; retención dry-run/aplicación preservando sesión válida y FKs.
No resultados ni códigos propios disponibles. Pendiente ejecución Build, revisión
solo lectura de seguridad y aceptación37 antes de38. No afirmar seguridad cerrada.



<a id="origen-frontend-integral38-design-md"></a>

## Origen: frontend/INTEGRAL38-DESIGN.md

# Integral38 — entrada acompañada y gate central

## SAVED focal posterior a revisión literal P2 — PC y etapas compactas
Build informó CENTRAL1440/390PASS19.6s, scratch1440/390PASS, CU09mainnormal2PASS8s. Revisión independiente REAL8PNG sigue rechazando paridad literal: PC con controles/explicaciones altos antes del inventario y plan con comparación/evaluación extendidas dominando primera etapa. No se rehace diseño, no cambio de color/datos/proveedor. Cuota25libre/corte15/reserva10; ChatSTOP.

Delta8archivos (incluida esta nota): pcs.tsx conserva edición exclusivamente tras botón EditarPC; identidad/revisión compactas, formato técnico/borrado bajo Másopciones; selector/CRUD/lista siguen en disclosure nativo abierto al elegir/editar y cerrado en lectura guardada. tower-recommendations.tsx mantiene objetivo/presupuesto/condición+acción primaria arriba; mueve confirmación de materiales no marcada y explicaciones a detalle explícito después del inventario; errores/trabajo siguen visibles antes, statusinformativo después. No form anidado ni modificación de serialización/consentimiento.

TowerPlanView mantiene antes/después/aside; summaryetapa añade coste y categorías/cantidades del servidor. Dentro deja compras/fotos52/cantidades/costeacumulado/fechasfuentesstock/requireddependencies y breve veredicto/cobertura/fallos conocidos/faltantes visibles. Comparación interna, desglose, beneficio y evaluación extensa quedan en UNdetalle técnico cerrado de cada etapa, con evidencia intacta. No se decide compatibilidad cliente: resumen reutiliza towerResultLabel y etiquetas cerradas de reglas fallidas. Stage0 sigue abierto por defecto, demáscomoantes. CSS sólo densidad/contextos afectados; no clipping global. Puede crecer con evidencia real necesaria, no se ocultan fallos para forzaraltura.

planAnchorEvidence abre detalle técnico y comparación mediante clicks reales sólo para susPNG y los cierra al terminar antes de fotografiar compras. openPlanStagesForEvidence sigue abriendo etapas/resolviendo metadatos sin abrircomparaciones/evaluaciones; captura04 representa lectura compacta, no comparaciones internas desplegadas accidentalmente. central.spec abre comprueba uncheckedycierra Materiales explícitamente. Unitstowerplans verifican compras/unknown/cobertura antes del detalle cerrado y evidencia retenida; configuración antes de materiales, sin confirmación implícita. Referencias/capturas rechazadas inmutables; nuevascarpetas timestamp obligatorias.

Build únicoejecutor, CWDfrontend, checks afectados únicamente:
```powershell
node .\node_modules\vitest\vitest.mjs run tests/unit/tower-plans.test.tsx tests/unit/tower-recommendations.test.tsx
npm run typecheck
npm run lint
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.v0-routes.config.ts --grep "@central38"
```
No runner/LLM/shell/instalación/backend/Git/delegación porfrontend. Sin nuevasAPIsNext ni cambios deframework; guíaprevia local estuvo denegada, no se reintenta para lógicaReact/HTMLexistente. Pendiente evidenciaactual1440/390: inventario visible trasfranjacompacta, segundaetapa distinguible, comparaciónampliable sin perderacciones/fuentes. No afirmar aceptación por source/tests. Fuente PAUSADA trasSAVED para Build.

## SAVED/PREPARED — continuación posterior92, precios vencidos y entrada manual
Build informa compile92PASS/catalogrealPASS4.1s/routes8PASS15.3s/scratch2PASS; NO aprobación estética. Central falló real-preview porque pidió rechazo cotizado que ya no existe:1requires_verification/0rejected/0recommended. No se cambian precios, fechas, fuentes ni reloj. Chat sigue BLOQUEADO tras reparación/Astra: get_pc0/evaluate0/TTFT21s; ninguna nueva llamadaLLM autorizada o ejecutada aquí. Cuota externa25libre, NUEVOcorte15/reserva10 sustituye notas36/corte25.

Delta acotado guardado: playwright.tower-share38.config.ts hereda webServer NORMALmain y entorno de playwright.config, sin factory/runtimeprobe/app-dir/inyección; artefactosOFF/cacheproyecto intactos. No se añadió PNG público ni se manipularon capacidades. Build informó mainnormalPG publish→frozenafterrecalc→B404→revoke404PASS2.05s, no equivale a ejecución frontend. v0-workbench.css sólo corrige franja<800: objetivo/presupuesto2cols, tercercontrolfila completa con pago editable; resto composición congelado. V0integrated mide cajas reales390, sin ocultar overflow ni fakeDOM. Workspace de planes cambia sólo explicación a preciosguardados/nuevaversión.

CU07 integración mínima: editor existente NO tenía entrada vacía desde resultado sin acciones. Nuevo emptyManualPlan construye únicamente referenciaPC/revisión/catálogo real y criterios del usuario; unaetapa SINacciones/SINmateriales, sin compras niAPIwrite. Botón explícito «Preparar plan manual vacío (no guardar)» desde preview recibido; no sustituye una recomendación ni decide compatibilidad. Preserva borrador abierto y consentimiento; guardar bloqueado hasta acción en TODASlasetapas+confirmación. Materiales no heredados. Tests puros verifican accionesvacías, sinmutación y rechazo estructural previo aHTTP.

Central evidencia usa helper observacional centralPreviewBranch con hora real pasada explícitamente por test: mantiene rama rechazo cotizado sihayoferta actualmente válida+acciones/costeconocido/fuera presupuesto; alternativamente exige resultado requires_verification/costenull/within_budgetnull/costmissing no vacío yCEROcotizacionesvigentesconimporte entre todas las ofertas DEVUELTAS porpreview, nunca se afirma escaneo exhaustivo691. Si hay fresh ambiguo o recomendado inesperado falla, noacceptconstant. Ramaqueda index.observed_branch conconteos seguros. Ruta alternativa fotografía UNKNOWN, elige explícitamente planvacío y unaGPU REAL de página1retail_first mediante editor/catálogo existente; exige fotoexacta realmente cargada y TODASlasofertasvinculadas de ESAcandidata sinprecio vigentealobservar. Se selecciona almacenamiento REAL porAPI+UI en segundaetapa (sin modelo ficticio), cantidades1expresadas, guardadoconsentido201, costeplanunknown/ramaunknown, plannoReady, historial inmutable yPCsinmutación. NoSKU/page2/mocks/recotizacióncliente. No afirmar que12candidatas sean todoelcatálogo. Capturasnuevastimestamps; originaleshistóricas preservadas. Historial captura región ACTUAL «Precios guardados de etapa1», noel viejo disclosure eliminado92. No afloja cobertura/fallos ni fuerza positivo. Timeout30s intacto; sinruns porfrontend.

Checks focales PREPARADOS para Build, CWDfrontend:
```powershell
node .\node_modules\vitest\vitest.mjs run tests/unit/central-preview-branch.test.ts tests/unit/tower-plans.test.tsx tests/unit/tower-recommendations.test.tsx tests/unit/playwright-config.test.ts
npm run typecheck
npm run lint
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.v0-routes.config.ts --grep "@central38"
node .\node_modules\@playwright\test\cli.js test --config=playwright.v0-routes.config.ts --grep "@v0-integrated"
node .\node_modules\@playwright\test\cli.js test --config=playwright.tower-share38.config.ts
```
Ningún runner/shell/proveedor/servicio/env/dependencia/delegación/Git ejecutado porfrontend. Pausa source para Build; una corrección diagnosticada después escalar, sin ciclos. Aceptación requiere PNGactuales revisados, no counts de tests. Checkpoint con ramaobservada pendiente, sin anunciar que expiredcausa fue comprobada más allá de evidenciaBuild hasta ejecutar guards.

## READY fuente92 posterior — seis referencias vistas, contrato catálogo enlazado
Leídas DIRECTAMENTE las seisPNG: pc-escritorio.png, desde-cero-escritorio.png, desde-cero-movil.png, catalogo-escritorio.png, plan-escritorio.png, plan-movil.png en .local/integral38/v0-reference. El impedimento por nombres queda RESUELTO; no se pidió/listó otra carpeta ni se tocaron referencias. Vistas composición/Arial/header72/ancho1280/inventario73/arte52/aside330/ficha220/beforeafter/etapas, y defectos de prototipo: scratchmobile superpuesto, torre invadiendo título, hoverblanco y valores hardcoded inconsistentes. No se copian esos defectos ni datos/demo.

Fuente92 lista para Build, NO aceptación visual: nuevo app/v0-workbench.css con medidas/tokens oscuros/Arial literales, prefijo .v0-integrated por shell para ganar frente al legado sin !important ni overflow global. Shell header72/62, marca de barras del export, navegación principal3rutas reales y utilidades cuenta/chat/admin conMenú móvil accesible (rol sigue servidor). Banner de referencia sustituye demo por aviso real de precios guardados. PathSelector reproduce panel/columnas/espaciado para inicio/PC/build sin inventarPCactual ni datos. Inicio9filas vacías explícitas, muestra comercial real en contenedor220; inventario compacto foto/arte52+modelo+estado (43móvil), evidencia ampliable y sin cargar precios de conservados como compras. Propuesta: hardware primero y decisión330derecha conprecio/fecha/fuente visibles; fallos/presupuesto/unknown siguen conservados. Plan: beforeafterCards sobre etapas+aside330, comparación deriva exclusivamente de base_configuration y última evaluated_configuration; cantidades y categorías declaradas, NOFPS/PSU/capacidades ni PCposeída inventadas. Etapas mantienen acciones acumuladas, precios guardados/procedencia, raw y comprobaciones. Imágenes reales en mismos contenedores; HardwareArt explícitamente ilustración sin marcaRYZEN cuando no hay foto. Mobile1col y torre con espacio separado del texto.

Catálogo contrato92 ACTUAL (sustituye propuesta anterior): sort=retail_first|id, defaultAPIid intacto. TowerCatalogQuery propio opcionalenum y towerQueryString preservan filtro/q/tamaño/página/orden; no ampliarCategory6 ni modificar queryStringlegacy. Web y RemoteProductSelector envían retail_first explícito; selectorvisible «Con fotos y precios primero / Orden habitual». BFF permite sóloenum2enlista yrechazaduplicados/unknowns/queriesendetalle; hosts/transportes/límites/HMAC sin cambios. Servidor ordena antes de paginar y conserva todos los registros (grupo fotoexacta+ofertaARSvinculada, precio, foto, resto, tieID); cliente no recalcula ranking ni promete vigencia. CatalogWorkbench reproduce lista+ficha contextual del export, selecciónlocal sólo cambia presentación de la variante real de página; enlace ficha completa existente y nueve categorías visibles. No scan691 niSKU/page2hack. Testreal catálogo ahora UI/APIpage1sortretail_first idénticos, prueba idmismototal/acceso/paginación y detallesdeIDs recibidos; fuertes asserts foto/precio/fuente conservados. Evidence v0routes elimina barrido y usa exactamente primera página ordenada; si falta prerrequisito falla explícito. Backend debe terminar contrato antes del runner; 422 no se tapa con fallback.

Otras pantallas reutilizan tokens/Arial/spacing del shell, cuenta privada sin beneficio interno, chat200muestraaccionespropias/401muestrasóloacceso/errorservicenosimulacontroles; no llamadaGroq/Ollama ni cambio proveedor. FechasAR: timestampzonaBuenosAires yfechas-solasUTC para conservar día; precio/basefechainmutables. Cambios de copy en tests no reducen asserts consentimiento/decimalexacto/unknown/revisiones/PCinmutable. Usuarios/cookies/CSRF/roles/semillas/cancelaciónsin cambios. Adaptaciones indispensables: no demo falso; cantidades/status/precios desconocidos reales ocupan espacio variable; controles>=44px/foco/menú utilidades para diezCU; comparación no se rotulaPCposeída, ni inventa 'sinPC' cuando base es borrador guardado. Ninguna instalación/dependencia/font/Analytics ni backend/servidores/Git. Catálogo necesita implementación backend en paralelo, no otro contrato.

Build único ejecutor, TESTenv preparado y exclusión mutua de servidores. Checks afectados92 (no ejecutados por frontend):
```powershell
node .\node_modules\vitest\vitest.mjs run tests/unit/catalog-tower-consumer.test.tsx tests/unit/towers38.test.ts tests/unit/hardware-art.test.tsx tests/unit/beginner-actions.test.tsx tests/unit/purchase-draft.test.tsx tests/unit/retail-presentation.test.tsx tests/unit/central-decision.test.tsx tests/unit/tower-plans.test.tsx tests/unit/assistant-context.test.tsx
npm run typecheck
npm run lint
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.catalog-data38.config.ts catalog-data38.spec.ts --grep "@catalog-data38"
node .\node_modules\@playwright\test\cli.js test --config=playwright.v0-routes.config.ts --grep "@v0-routes"
node .\node_modules\@playwright\test\cli.js test --config=playwright.v0-routes.config.ts --grep "@v0-integrated"
node .\node_modules\@playwright\test\cli.js test --config=playwright.v0-routes.config.ts --grep "@central38"
```
Nuevas capturas1440/390: rutas28PNG; v0integrated22PNG(11/ancho, nueva comparación superior); central44PNG(22/ancho si unaacción/etapa). Todas timestamps derivados inmutables; runner sintrace/video/autoscreenshot. Comparar lado a lado mismosanchors shell/franja/inventario/cataloglista+ficha/planbeforeafter+etapas, no reconstruir referencias. Códigos de salida y revisión visual aún PENDIENTES. Falta CU02propuestarecuperada/chatLIVE/CU09aislado en matriz: no se fabrican historias. Una corrección diagnosticada, después escalar si persiste. PAUSA escrituras trasREADY para Build; última medición36libre/corte25/reserva20, sin estimaciones.

## Pedido92 — criterio previo al cambio: paridad de composición, NO aceptación global
Brandon rechazó la integración actual: direcciónv0 aprobada no significa aceptación visual de la app. Se conservan referencias/cierres funcionales anteriores, no se usan30PNG como aprobación estética. Hito fuente: hardware antes del texto; inicio como mesa de configuración sinPC ficticia, inventario9filas con foto52/modelo/estado y decisión330derecha, franja objetivo/presupuesto3cols, catálogo con navegación por categoría y ficha foto220, plan con comparación/acciones primero y decisión lateral, móvil1col. Grafito #10141b, panel #191f29, elevado #222b38, línea #344052, texto #edf2f8, azul #65aaff; misma tipografía local Segoe UI, sin fuentes/deps nuevas. Alineación izquierda, densidad de configurador, no hero de dos tarjetas ni panel de texto dominante. Esquema: [hardware/etapas comparables | decisión330]; móvil [hardware][decisión]. El acento distingue selección y acciones, no adorna datos. LenguajeESAR: precios guardados/comprobación/configuración, fechasAR; versiones/formatos en detalle. Unknown/fallos/precios con procedencia y consentimiento permanecen. Primero fuente tangible; Build único ejecutor y nueva revisión1440/390 decide aceptación. Guía Next local vuelve a estar bloqueada por perfil, sin retry de PNG ni cambio de APIs Next. Última cuota externa36libre; corte25/reserva20, sin estimaciones.

### Precisión92 posterior — export literal prevalece; checkpoint por referencia PNG no localizable
La instrucción posterior exige réplica lo más exacta posible del export, NO reinterpretación. Por tanto las propuestas de tokens/tipo del párrafo anterior quedan sustituidas: Arial/Helvetica y tokens oscuros/spacing del export son especificación visual. Leídos source-app-page.tsx124líneas, source-app-globals.css45líneas y revision-visual92.md16líneas autorizados, sin ejecutar el prototipo ni adoptar sus datos/demo/lógica. HardwareArt de categoría adaptado sin marcaRYZEN. Estado fuente tangible YA conservado: inicio sin tarjetones y con9filas vacías explícitas, inventario compacto sin precios de piezas conservadas dominantes, build con ilustraciones/estado inicial amable/sin0líneas cotización, plan comparación abierta y etapas/decisión330, fotos220 en ficha/inicio, cuenta beneficio privado, chat sólo acceso primario según GETservidor401/éxito y error sin exponer controles inutilizables, fechasAR deterministas conservando día de fecha-sola. Ningún cambio de cookies/permisos/CSRF/guardados ni llamadas de proveedor.

Bloqueo ESPECÍFICO tras nueva exigencia «ver PNG antes de más edits»: listado .local/integral38/v0-reference sigue Permission denied incluso tras aviso de perfil actualizado; pc.png no existe. Los nombres exactos de PNG copiadas no se transmitieron. No se intentaron más rutas adivinadas ni acceso externo; NO se afirma haberlas visto ni fidelidad exacta. Pedidos nombres exactos al coordinador mediante comentario. Se detienen siguientes cambios VISUALES hasta poder leer esos archivos, se conservan todos los deltas previos. Pendiente llevar tipografía/cascada a especificación literal sin legacy counterstyles y terminar distribución de propuesta/catálogo según PNG; no declarar fuente globalREADY ni aprobación visual. Sí se actualizaron tests afectados por nuevo copy/fechas y se añadió test de9ilustraciones explícitas. Build no ejecutado por frontend.

Contrato catálogo PROPUESTO, no implementado ni enviado: sort=retail_first|catalog aplicado por servidor antes de paginar, envelope actual intacto, orden estable, todos los registros accesibles y selector visible «Con ofertas primero / Orden del catálogo». Asociación oferta-componente exacta, sin prometer precio vigente/compatibilidad. Backend/coordinador deben confirmar criterio exacto y compatibilidad/default. NOscan691, SKUwhitelist ni página2redirigida. Categoría tabs y ficha contextual siguen pendientes del cierre visual/contrato, no se finge resultado backend.

Guard admin actualizado antes92: TEST_DATABASE_URL y DATABASE_URL no vacías/idénticas, UJ_ENV=test, dialecto exclusivamente postgresql+psycopg:, host127.0.0.1:55433, baseupgradejusto_test, rolupgradejusto_test_app, sinquery/hash. Sustituye la abreviación errónea test_app/localhost/protocolosplain de nota anterior; no tocaPG ni guardbackend.

Checks afectados para Build DESPUÉS de resolver referencia y cerrar fuente (no ejecutados aquí):
```powershell
node .\node_modules\vitest\vitest.mjs run tests/unit/hardware-art.test.tsx tests/unit/beginner-actions.test.tsx tests/unit/purchase-draft.test.tsx tests/unit/retail-presentation.test.tsx tests/unit/central-decision.test.tsx tests/unit/tower-plans.test.tsx tests/unit/assistant-context.test.tsx
npm run typecheck
npm run lint
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.v0-routes.config.ts --grep "@v0-routes"
node .\node_modules\@playwright\test\cli.js test --config=playwright.v0-routes.config.ts --grep "@v0-integrated"
node .\node_modules\@playwright\test\cli.js test --config=playwright.v0-routes.config.ts --grep "@central38"
```
Mismos anchos1440/390, capturas derivadas timestamp, sin proveedor. Aprobación requiere comparación real lado a lado conPNGv0 y revisión independiente, no CSSsource/antiguas30PNG. No runners, shell, backend, dependencias, commits, delegación ni segundo escritor. Checkpoint para continuar exactamente desde referenciaPNGs+fuente literal, sin revertir ajenos.

## Checkpoint27/10 — READY claridad del plan y evidencia de rutas (sin ejecutar)

Build confirmó15units/tipos/lint/build0, catálogo realPASS y v0PASS1440/390 (14PNG), central existentePASS1440/390 (15PNG/ancho), sin overflow y cleanup completado. Referencias04:13/04:15 conservadas. Revisor visual vio15PNG+4index y acepta PARCIAL entrada/compras/propuesta grafitoazul y móvil legible;3P2 funcionales cerrados. No aprobación estética integral. Único delta producto autorizado: PendingFields del encabezado del plan ahora recibe la base congelada; configurationNextSteps distingue ausentes de desconocidos para CPU/placa/RAM/fuente/gabinete/almacenamiento, sin decidir requisitos/compatibilidad ni exigirGPU/cooler/fan. Acción humana y enlace existente /pcs; aclaración de conteo de entradas, NO piezas/compras distintas. Código exacto context.bios_version traducido a comprobar documentación, sin deducir versión. Conteos/RAW originales/veredictos/fallos/coste intactos.3units nuevos en central-decision.test.tsx.

Evidencia derivada: plan-anchor-evidence abre los controles reales de comparación, toma antes/después separados y cada acción/cantidad por etapa en AMBAS ramas. Sin nuevosPOST aparte del journey propio ya requerido por el delta. V0 prevé10PNG/ancho (7+3); central prevé21PNG/ancho (15+6 si una acción/etapa). Si el servidor devuelve más acciones:1PNG adicional por acción, index exacto al ejecutar. Cada ejecución conserva carpeta timestamp nueva y anteriores inmutables.

Nuevo playwright.v0-routes.config.ts hereda arranque normal backend+Next/cache de proyecto/proxy/HMAC;30s por test,8tests en4grupos separados,workers1/retries0 y trace/video/autoscreenshotOFF. Reutiliza newImageEvidenceContext, tres hosts fijos y TLS normal; no toca fixtures/transporte/server. routes28PNG previstos: por ancho catálogo4 (shell9filtros/lista/foto real/detalle ofertas), cuenta+listaPC+editor+RAM+CU02entrada5, chat propio vacío/contexto3, admin2. Sin fullpage gigante ni recorte global de navegación. Catálogo busca candidato REAL paginado hasta total, no heurística porSKU/página inicial; candidato con oferta/fuente y foto efectivamente cargada. Helpers producen sólo fases estáticas/conteos/booleans, sin excepciones crudas/URLs/cookies/credenciales. Recursos PC/conversación propios borrados porID exacto. No endpoint de borrado de cuenta: cuentas sintéticas permanecen sóloTEST.

Admin: actualización contractual Build autoriza exclusivamente bootstrap server existente. Guard previo a registrar usuario exige UJ_ENV=test, DATABASE_URL PostgreSQL localhost/127.0.0.1:55433/upgradejusto_test usuario test_app. Cuenta routes-UUID@example.test NUEVA propia víaAPI; spawnSync shell:false ejecuta sólo Python local + scripts/bootstrap-admin.py --email propio --confirm-project-test-account, timeout5s/stdout-stderr ignorados. Sin SQL ni roles cliente ni cuentas ajenas. Re-login y GET admin200 verifican permiso servidor. Publicación activa buscada por paginación API yUI; sólo lectura, contador adminwrites0. Cuenta/rol sintéticos permanecenTEST sin endpointcleanup autorizado.3units del guard no ejecutan CLI real; navegador sí usa CLI real autorizado. No dependencia de credenciales admin preexistentes ni bootstrap duplicado. Runner heredaTESTenv Build; server conserva UJ_ADMIN_EMAIL/PASSWORD vacíos.

Reservas visibles en index: CU02 sólo formulario, ninguna recuperación propia de propuesta disponible y ninguna extracción nueva; chat historial persistido realmente vacío, mensajesPOST0/LIVE bloqueado; CU09 diferido a su gate aislado por lifecycleDEV Build. No mocks/fulfill de producto, Groq/Google/mensajesLLM0, ni pretensión de matriz diezCU cerrada. Guía Next local solicitada devolvió Permission denied: no se reintentó, no APIs/rutas Next nuevas. Autor sólo archivos frontend, sin runners/shell/install/delegación/Git.

Build ÚNICO ejecutor, CWD frontend, TESTenv existente sin reconfigurar ni imprimirlo. Serializar runners/servidores:
```powershell
node .\node_modules\vitest\vitest.mjs run tests/unit/central-decision.test.tsx tests/unit/route-test-admin.test.ts
npm run typecheck
npm run lint
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.v0-routes.config.ts --grep "@v0-routes"
node .\node_modules\@playwright\test\cli.js test --config=playwright.v0-routes.config.ts --grep "@v0-integrated"
node .\node_modules\@playwright\test\cli.js test --config=playwright.v0-routes.config.ts --grep "@central38"
```
No repetir proveedor ni otros gates aprobados. Tras resultados, Build debe autorizar al revisor rutas PNG/index exactas de NUEVOS timestamps, no acceso general.local; no reemplazar referencias. Una corrección diagnosticada, luego escalar si persiste. Escrituras PAUSADAS tras READY hasta Build/revisión. Última medición externa41libre/corte25; sin inferencias de consumo. MCP commit local e499ac3 informado por Build, no modificado por frontend.

## Hito integrado:3P2 y diagnóstico navegador — plan focal antes de corrección
Build informó37unit/tipos/lint/build0. Catálogo falló300ms nav200/origintrue pero heading/combobox0 con envelope APIválido: se corrige espera DOM acotada, NO se atribuye fallo DB ni se relaja parser. Ambos recorridosv0 expiraron30s en fase amplia selección antes dePC/planPOST;2PNG propios por ancho preservados. Build vio entrada y scratchmóvil:390sin solapamiento; fotoentrada podía quedar en blanco antes de load, no aprobación estética.

Cambios acotados: subtotal SIEMPRE de compras seleccionadas, no totaldelarmado; categorías no elegidas con count/lista (sin exigir todas9). Comparación presupuesto decimal exacta BigInt: excedente conocido o saldo provisional, precios pendientes=>saldo definitivo desconocido; guardar no bloqueado por presupuesto. Cada compra conserva tienda/condición/fecha/fuente segura al colapsar selector. Foto real muestra carga/fallback visible sin DOM ficticio/URLs sustituidas. Tests: esperar SSR DOM, descomponer selección en etapas5s y preservar assertions/30s global, foto settle real y captura shelltop separada. No cambios al consentimiento, PCID, RAM/qty/plan válidos ni server/share. Nuevas capturas sólo en carpetas timestamp, ninguna referencia previa se altera.

Delta READY: purchase-draft.ts renombra total_ars a selected_subtotal_ars (suma sólo compras elegidas, nunca totalPC); purchaseBudget normaliza presupuesto válido a centavos BigInt y expone excedente/saldoPROVISIONAL sin cálculos Number; compra parcialmente sinprecio conserva null. Nuevo components/purchase-cost-summary.tsx muestra categoría no elegida/count y provenance segura por línea fuera del selector; PurchaseBuilder lo integra sin bloquear guardado por presupuesto. Ejemplo unitCPU10/budget0.01=exceso9.99; missingbudget/zero/invalid desconocido, pendingprice implica saldo definitivo desconocido. No se imponeGPU/cooler/fan como universalmente necesarios. Qty/guardado/PCID/semillas válidos no cambiaron.

TowerProductPhoto muestra Cargando foto mientras recibe bytes, Sin foto real en error y loaded sólo naturalWidth>0; callbackref atiende imagen realmente completa antes de hidratación, sin URLs alternativas ni loading DOM manipulado. CSS sólo overlay del estado loading (imagen conserva caja/source, sin clipping documental). Declaración de imagen no certifica atributos. Captura espera fotos visibles dentro viewport cargadas/fallback y añade00-entrada-shell en scrolltop, conserva01-entrada de contenido.7PNG por ancho si completa (14total), previos4PNG de intento fallido conservados.

Catálogo test espera heading visible y combobox visible5s antes de count9; en fallo recoge H1count y enums cerrados (catálogo/fallo/notfound/other), no texto libre/HTML. APIrawitemcount separado del parsecount evita inferir lista vacía de un parse nunca alcanzado. No parser/fixture/BFF/data relajados. V0test divide API/status/parse/prereq/fillbudget/opencategory/searchfill/searchclick/partclick/qty/offer/add/collapse en fases separadas, acciones<=5s, journey30s intacto. Cuenta controles/selecciones y verifica después de colapsar fuente visible,8categorías sin elegir yexceso CPUreal sobre0.01. Mantiene POST0antesconsent/201motor/planfrozen/PCsinmutación. Si falla, subfase/matcher/booleans/counts quedan en index yerror seguro, sin IDs/URLs/payloads.

Build desde frontend, SIN repetir37units ni otrosCUs:
```powershell
node .\node_modules\vitest\vitest.mjs run tests/unit/purchase-draft.test.tsx tests/unit/retail-presentation.test.tsx
npm run typecheck
npm run lint
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.catalog-data38.config.ts catalog-data38.spec.ts --grep "@catalog-data38"
node .\node_modules\@playwright\test\cli.js test --config=playwright.v0-integrated.config.ts v0-integrated.spec.ts --grep "@v0-integrated"
```
purchase units ahora9 (4nuevos P2/imagen). retail-presentación focal justificado por componente Photo compartido cambiado. Ningún check ejecutado por escritor, diagnóstico causal de selección aún pendiente. No más expansión visual hasta hito navegador completo y relectura14PNG; descripciones Build usadas, no aprobación estética general. Escritura PAUSADA tras READY para evitar carrera con Build. Server/share/proveedor/Google/env/deps/commits intactos; STOP25 externa sin estimaciones.

## Hito v0 integrado — ejecución autorizada desde descripción visual Build
Canal local explícito de6PNG ignorados recibido; intentos únicos pc-escritorio/catalogo-escritorio/plan-escritorio también Permission denied, sin retries. Nueva instrucción autoriza construir YA desde transmisión visual completa de Build: no se afirma inspección propia ni se copian dependencias/prototipo. Skill vigente y guía local use-client releída. Fuentes: Build vio PC y scratchmóvil y transmitió header72px, max1280/pad38, inventario9filas con miniatura52, columna decisión330, filtros objetivos3columnas, grafito#0b1420/surface#17293b/border#304960/text#e7eef7/muted#9aacc0/blue#4da3ff. Móvil<700 una columna minwidth0: NO copiar solapamiento del prototipo ni inventario/PSU/disco dummy.

Criterio del primer hito: Home con2entradas reales; /pcs preserva CRUD/extraer/simular/recomendar y muestra inventario en filas+criterios/contexto; /build draft LOCAL vacío de compras9categorías/absent/lines[], selección catálogo real y cantidades/ofertas explícitas, subtotal decimal exacto PARCIAL si faltan precios, sin cobro de conservados. Sólo «Guardar configuración propuesta» + checkbox produce TowerCreate; nombre/nota fija porcomprar, no hardware poseído. Después PCID/revisión reales permiten evaluar y preparar/guardar plan CU07 real con acciones de todas las compras seleccionadas. No endpoint unsaved inventado ni guardado automático, materiales no inferidos. Guardar plan recalcula precios servidor; subtotal local es referencia guardada, no promesa de cotización actual. Todos los estados/faltantes/versiones siguen disponibles.

Composición: shell horizontal desktop y menú compacto móvil, filas catálogo e inventario, paneles de criterio/coste responsivos, navegación Mis planes a ruta actual con legado existente accesible; ayuda extensa progresiva en Home. Coherencia compartida de tokens/controles para rutas actuales sin reescribir auth/chat/admin/import. Plan before/after sólo con copia base/evaluada REAL, sin hardware agregado de ejemplo. CU09/server/probe sin tocar. Prueba catálogo diagnóstica preparada se conserva para siguiente Build. Hito verificable con units focales/tipos/lint/build y nuevo recorrido1440/390 real sin proveedor, evidencia nueva .local/integral38/v0-integrated, no referencias previas alteradas ni aceptación visual por código.

### Primer hito entero preparado — READY UI real, aún sin checks/píxeles nuevos
Implementado: Home consulta muestra real de catálogo50 (si falla, ausencia explícita, no ejemploPC),2entradas /pcs y /build, ayuda extensa progresiva. Shell horizontal72px desktop y menú móvil; Mis planes /tower-plans activo también /plans, legacy ya accesible en workspace sin tocarlo. Cuenta sólo copia/links de continuación, no lógica auth/Google. /pcs mantiene CRUD/contexto y criterios existentes; inventario9filas con52px fotos/estado/cantidades; coloca configuración/contexto debajo de criterios dentro TowerRecommendations sin duplicar provider/controlador. Lista catálogo filas y ficha contextual, mismo DTO funcional/parser y exact-photo/retail data, sin clases de prototipo importadas ni dependencias nuevas. Tokens/controles comunes dan coherencia a import/chat/admin existentes, no nuevos flujos allí.

Nuevo /build: purchase-builder.tsx + lib/purchase-draft.ts. Draft realmentevacío9absent/lines[], selección real paginada/GET-ID, cantidades explícitas; RAM sustituyeconjunto/storage+fan añadenlínea. Oferta elegida explícitamente de las publicadas y condición; subtotal BigInt exacto sólo compras elegidas, pendientes=>totalnull y subtotalconocido rotulado, no0total ni hardwareconservado. Estado stale se muestra histórico, fuente/fecha siguen en selector/ficha; nunca precioactual garantizado. Cambio de criterios/piezas/nombre invalida consentimiento. TowerCreate sólo submit+checkbox, nombreprefix porcomprar/notafija semántica, posiblefallo latchea incertidumbre y exige revisar PCs sinretry. Guardado devuelverevisión/ID real; compatibilidad/recomendaciones normales sólo después. Directo «Planificar compras seleccionadas» produce borrador CU07 con accionesdetodaslascompras, catálogo actual consultado explícitamente y materialesvacíos; noPOSThasta consentimientoCU07, precio final motorservidor, reprepare tienekeynuevo. Plan muestra antes/resultado por estados/cantidades de configuración base/resultado acumulado REAL y precios guardados confecha real, sin reprice.

Archivos producto: app/page.tsx, components/beginner-entry.tsx, components/shell.tsx, app/account/page.tsx, app/pcs/pcs.tsx, app/pcs/tower-recommendations.tsx, components/tower-inventory.tsx, app/catalog/presentation.tsx, components/tower-plan-view.tsx, app/globals.css; nuevos app/build/page.tsx, components/purchase-builder.tsx, lib/purchase-draft.ts. No server/shareboundaries/env/backend/provider editados. Catálogo diagnóstico previo sigue listo (sin relajación), no se afirma fallo resuelto antes de su resultado.

Nuevos tests: purchase-draft.test.tsx5unit (vacío/ausentes/ram/addqty/exactcost/unknown/semilla/consentSSR); evidencia v0-integrated.spec.ts2widths30s con cuentas sintéticas nuevas víaAPI sin Google, entradaUI→selección catálogo→0POSTantesconfirm→TowerCreate201→motor parcialnogreen→plan201→GETfrozen y PCsinmutación.6PNG por ancho y JSONsólocounts/phases/overflow/cleanup en carpeta timestamp nueva bajo .local/integral38/v0-integrated; sin IDs privados/email/tokens en índices, sin mocks. Config playwright.v0-integrated.config.ts hereda ambosservidores/cache, normalmain, workers1/retries0/artifactautoOFF. Test es preparación funcional/evidencia, no aprobación estética y no ejecución propia.

Build secuencial desde frontend, mientras escritor PAUSA writes tras READY:
```powershell
node .\node_modules\vitest\vitest.mjs run tests/unit/purchase-draft.test.tsx tests/unit/catalog-tower-consumer.test.tsx tests/unit/central-decision.test.tsx tests/unit/tower-plans.test.tsx tests/unit/tower-recommendations.test.tsx tests/unit/beginner-actions.test.tsx
npm run typecheck
npm run lint
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.catalog-data38.config.ts catalog-data38.spec.ts --grep "@catalog-data38"
node .\node_modules\@playwright\test\cli.js test --config=playwright.v0-integrated.config.ts v0-integrated.spec.ts --grep "@v0-integrated"
```
Units antiguas listadas están afectadas por markup/props/coste/inventario/plan/home cambiados; no fullsuite/model LIVE. Existente centralcapture sólo si Build requiere la rama PCexistente ahora modificada, NO por rutina delcierre viejo. Referencias previas inmutables. Contrato unsaved resuelto por explícito guardado, sin bloqueo backend nuevo ni endpointinventado. Reservas: resultados reales (incluye catálogo diagnóstico), revisión visual independiente1440/390, matriz otrasrutas y gate DEVlogging de Build aún no son aprobados por este código. La transmisión de Build es fuente visual utilizada; lecturaspropias PNGdenegadas quedan registradas, no STOPporimagen tras instrucciónúltima. STOPcuota25 externa vigente. Sin instalaciones/runner/Shell/commits/delegación ni claimsintegral38/physicalgreen/GoogleDEV/MCPfixed.

## Reanudación v0 / diagnóstico catálogo — checkpoint focal, sin UI paralela
Autorización posterior de Brandon acepta DIRECCIÓN v0, no app integrada ni datos falsos. Build declara handoff verificado y pide leer exactamente archivos/PNG autorizados. Intentos únicos del handoff,4fuentes y3PNG pc/catalog/plan devolvieron TODOS Permission denied. Sin retry, rutas alternativas, lectura de otro contexto C, import de carpeta/deps/Analytics ni afirmación de inspección visual. Skill frontend-design cargada realmente. Bloque material para integración visual condicionada a píxeles: Build debe transmitir los artefactos/imágenes por canal legible autorizado o resolver permiso; no inventar propuesta vista. Brief transmitido de filas/before-after/grafito/azul queda fuente de dirección, no sustituto de haber visto esos PNG. No nuevas pantallas/desde-cero hasta resolver esta condición y contrastar contrato existente: PCID requerido implica guardar armado por acción explícita, jamás PC previa/POST automático inventados.

Última cuota informada41%libre compartida; STOP25/reserva20 por aviso externo, sin inferencia desde tokens. Server/share boundaries congelados y CU08LIVE/Google/central sin calls/gates repetidos. Delta funcional catálogo conservado,5unit/tipos/lint/build PASS informados; browser FALLÓ174ms phasecatalog, no causa de producto demostrada. Baseline16PNG intacto y sin capturas nuevas.

Único cambio ejecutable nuevo: tests/e2e/catalog-data38.spec.ts. Fases antes de goto/status/DOM/9filters/api-fetch/status/parse/candidate; snapshot con statusnumérico/originboolean/headingboolean/DOMenum/countcombobox+options y envelope types, countitems/candidatosimagen/oferta/combinados. contract_path se construye desde claves cerradas e índices, nunca IDs/fieldnames extraídos/valores; identifica primer tipo incompatible si se observa (no reemplaza autoridad de enums/parser). Si falloDOM impide API, UN probe GET diagnóstico del endpoint mismo-origen; si API ya se intentó no se repite. Catch sólo enum/matcher allowlisted + esas métricas, sin error.message/HTML/URLs/fotos/quotes/body. Assertions de9/foto real/precios/condiciones/fuentes sin relajar.

Relectura fuente pertinente: fixture image-evidence tiene baseURL applicationOrigin127.0.0.1:3000 y app-origin continue intacto; config deriva base real. SSR usa catalogFetch backend mismo /api/catalog/components, parser nuevo; BFF towerCatalogProxy acepta9cat y hace pass-through JSON (no selección de campos). No diferencia de shape demostrada por lectura ni motivo para tocar fixture/network/parser. Próximo resultado debe distinguir navegación, DOM antiguo/fallo o contrato API exacto, sin culpar provider/dataset/CSRF por174ms.

Build desde frontend, sólo preflight test cambiado + rerun diagnóstico focal; sin repetir5units/build de producto ya pasados salvo cambios ajenos:
```powershell
npm run typecheck
npm run lint
node .\node_modules\@playwright\test\cli.js test --config=playwright.catalog-data38.config.ts catalog-data38.spec.ts --grep "@catalog-data38"
```
No ejecutados por escritor. READY instrumentación / BLOQUEADO acceso artefactos v0. Pausa de escritura para verificación Build: esperar diagnóstico y canal legible autorizado de PNG antes del primer hito visual real. Sin commits/deps/delegación/backend/providers/runners ni descarte del trabajo.

Contrato desde-cero confirmado posteriormente por Build (sin lectura backend adicional): todos los endpoints actuales de compatibilidad/recomendaciones requieren pc_id UUID y propiedad servidor; NO existe evaluación HTTP de draft arbitrario sin guardar. Flujo aceptado: selección local de9categorías desde draft inicialmente vacío, objetivo/presupuesto y subtotal de compras reales sin exigir guardado; faltantes unknown/precio parcial nunca total0. Categorías no elegidas declaradas absent para la configuración propuesta, NO hardware poseído ni inventario conservado. Antes del motor, confirmación explícita «Guardar configuración propuesta» usando TowerCreate normal con nombre de armado/borrador propuesto y líneas elegidas; NO POST automático, no pantalla que afirme «Ya tengo esta PC», no compra/reserva. Explicar que el motor exige configuración propia guardada y que guardar NO acredita posesión física. Sólo después usar pc_id/revisión reales con evaluación/recomendaciones/plan actuales; faltantes y fallos intactos. Enfoque aprobado por Build, ya no hay faltante de endpoint a investigar ni necesidad de inventarlo. Sigue pendiente acceso legible autorizado a PNG v0 para cumplir inspección requerida previa a integración visual; este dato contractual no prueba lectura de imágenes ni implementación del flujo.

## Catálogo38 baseline REAL recibido — implementación focal autorizada
Build tipos/lint0 y captura observacional1440/390 PASS2.1s/2.0s (8.3total),16PNG preservados. BEFORE1440 `.local/integral38/catalog-before/2026-10-27T03-05-49-591Z-6f685511/`;390 `2026-10-27T03-05-51-707Z-dc3f485f/`. Índices informados:6filtros, página2 undefinedalt2/12ilustraciones/0fotos/0ofertas renderizadas/12precios pendientes; fichas fan/storage undefinedalt1/sin imagen/ofertas. Build vio píxeles D02 y M03: tarjetas gigantes idénticas y consumidor desfasado. NO es diagnóstico de DB ni aprobación visual. No modificar ni recapturar BEFORE para ocultarlo.

Ahora autorizado delta tangible catálogo/lista/ficha: filas desktop foto/modelo exacto/ofertas/CTA; móvil mismo orden con importes y evidencia legibles. Consulta SSR mantiene endpoint/timeout8s, añade parser allowlist de payload Tower existente para no solucionar sólo con typecast. Fallo de shape muestra servicio no disponible, no datos inventados ni parámetros nuevos.9categorías en filtros y labels via towers; Category6 global intacta. Offers ARS cash/list reales con amountnull desconocido, guardado/vencimiento/fuente/stock al cotizar; stale visible como histórico, jamás compra recomendada. Precios dataset se conservan separados en detalle. Fotos con displayImage/vendorImageURL y asociación exacta existentes; fallback explícito, sin optimizer/serverdownload/hosts nuevos. Full nombre original sin productName que corte variante. Atributos/fuentes/conflictos progresivos, no compatibilidad cliente.

Guía Next page/params y skill ya leídas/cargadas en preparación vigente. No Home/cuenta ni estilos centrales. Nav único ajuste permitido: Mis planes apunta a /tower-plans y marca activo tanto legado /plans como /tower-plans; enlace legacy ya existe dentro workspace, sin editarlo. CU09/server/probe congelados. AFTER nuevo harness con mismas4rutas/anchos/anclas, referencias nuevas inmutables y pruebas de recursos reales/imagen cargada si publicada; fuente BEFORE intacta. Checks y revisión visual por Build, no runners del escritor. Cuota externa52/48 compartida y STOP25 notificado sin estimaciones se mantiene.

Steering vigente posterior: Codex externo prepara v0 tres pantallas; PAUSA composición nueva/ROWS/CSS/hero/Home/cuenta/nav visual y rondas estéticas hasta handoff verificable. Al llegar steering sólo se había actualizado este plan, sin cambios producto/CSS/rows que revertir. Conservar todo; ejecutar únicamente integración funcional catálogo9 con markup/composición existentes, imagen/ofertas/condiciones/fechas/procedencia/unknown correctos. No importar v0 ni tratar sus fuentes como instrucciones. No AFTER estético nuevo ahora; eventual navegador sin screenshots prueba datos/recursos reales, no aprobación visual. Navegación/Home/cuenta se difieren incluso si el bug lógico era conocido; no son necesarios para este delta. Cuota última informada54usado/46libre compartida, STOP25 por notificación externa. CU09/server congelados; central/Google/CU08LIVE sin repetición.

Delta funcional preparado SIN composición nueva: `lib/catalog-tower-consumer.ts` parsea payload real desconocido a9categorías/image_evidence/offers (no simplecast SSR), filtros100chars/page10000/size50 preservados y fetch8s existente; `lib/catalog-offers.ts` binding puro componente/ARS separado para no importar fetchSSR a cliente. `components/catalog-retail-offers.tsx` usa helpers aprobados para importes exactos, cash/list, estado guardado/vencido/indisponible, fechas y stock al consultar/fuente. Amountnull distinto0; no sustitución por históricoUSD. `app/catalog/page.tsx`, `app/catalog/[id]/page.tsx`, `presentation.tsx`: lista usa nueva TowerCatalogCard con MISMAS clases/grid/composición de tarjetas existentes; ficha MISMO detail-grid/resumen, foto guardadaexacta viaTowerProductPhoto, nombre completo sin recorte devariante, ofertas visibles, históricos yfuentes originales progresivos. Evidence/DataWarnings sólo propsPick de campos usados para aceptarDTO9 sin ampliarCategory6; Card legacy conservada. Foto72px actual sin nuevohero/CSS. Ni una modificación CSS/nav/Home/cuenta/server/share.

Pruebas preparadas, NO ejecutadas:5units `tests/unit/catalog-tower-consumer.test.tsx` DTO/9vs6/filtros/precision/stale/nullvs0/list/variant+photo; navegador real `tests/e2e/catalog-data38.spec.ts` compara página2/API,9opciones, boundofferamount+condition+source, imagen real naturalWidth>0 si recurso publicado, filtrosfan/storage/cooler y fichasfan/storage con presencia de image_evidence/offers en API ymarkupigualdatos. Si API realmente no publica recursos, gate falla como contrato concreto, no se inventan parámetros. Config nueva `playwright.catalog-data38.config.ts` base normal/fixturesoptin existentes, trace/video/screenshotOFF. NOAFTERcapturas nuevas ni aprobación estética hasta handoffv0; BEFOREspec/config y16PNG intactos.

Build desde frontend, únicamente funcional:
```powershell
node .\node_modules\vitest\vitest.mjs run tests/unit/catalog-tower-consumer.test.tsx
npm run typecheck
npm run lint
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.catalog-data38.config.ts catalog-data38.spec.ts --grep "@catalog-data38"
```
READY fuente funcional; no afirmar HTTP/fotos pasadas hasta Build. Reservas: handoffv0/integración estética y revisión de píxeles global posterior; nav bug sigue documentado/sin editar. No reset/discard de trabajo previo ni imports v0, instalación/proveedor/commits. Si aparece fallo, corrección diagnosticada focal y escalada sin retries cíclicos. STOP externo25 restante se mantiene.

## Catálogo38 — contrato/plan focal ANTES de producto, BASELINE pendiente
CU09 cierre local informado: unidades/tipos/lint/build0 y nuevo revoke-switch real PASS2.4s/6.8total; relectura seguridad cerró2P2. Server/share/probe quedan CONGELADOS; driver logging dev/prod real aún pendiente. Google humano TEST exitoso informado por Brandon no acredita estética/global/DEV. Central visual local cerrado y capturas previas se reutilizan si siguen representativas, no repetición rutinaria.

Nueva prioridad autorizada: CATÁLOGO SOLAMENTE como primer incremento de coherencia configurador de hardware para el conjunto de la app, sin copiar marca PCPartPicker ni inventar funciones. PRIMERO preparar/capturar baseline real; NO producto hasta Build transmitir imágenes/resultados y autorizar implementación. Matriz global por rutas1440/390 es de Build; este documento sólo planifica catálogo/lista/fichas. Cuota externa informada52usado/48restante compartida; ante notificación25restante/75usado STOP+checkpoint sin reinicio, sin estimar tokens.

Fuente pertinente leída: app/catalog/page.tsx consume Category/Component legacy (6categorías/image:null), fichas usan productName/historicalPrice/ilustración y categories[category]; ProductVisual podría producir altundefined para fan/storage de payload9categorías. Esto identifica desacople de CONSUMIDOR, no demuestra ausencia de ofertas/fotos en DB. IDs públicos cg-10422/cg-10535/cg-10578 sirven de casos visuales en página2; cg-11473 fan y cg-11960 storage para fichas, nunca whitelist de compatibilidad. TowerCatalogPage/TowerComponent ya describen9categorías+image_evidence+offers del endpoint público existente. Fuente de datos real691/677retail informada por Build, no modificada por frontend.

Guía Next local page.md1–80 leída (params/searchParams Promise) y frontend-design skill cargada efectivamente. Dirección futura: tabla/lista comparable por categoría, nombre/variante exactos, foto identificada frente a placeholder, columna de cotización y condición/fecha/fuente; ficha con identificación y ofertas al lado de atributos/evidencia progresiva. Grafito #101419, superficie #181f28, azul #5b94ff, texto #f4f7fb, pendiente #f4d698; Segoe UI local, alineación izquierda y filas comparables en desktop/pila legible móvil. Evitar grilla de tarjetas/disclaimers idénticos como solución genérica. Nada de tema/framework/dependencias nuevos. La composición concreta se ajustará tras píxeles baseline, no aprobación por este plan.

Contrato de implementación POSTERIOR: sólo paths catálogo migran a TowerCategory9/TowerCatalogPage/TowerComponent; NO debilitar ni ampliar globalmente Category6 de formularios legacy. Query9 explícita contra parámetros existentes, GET-ID sin primer-page heuristic. Conservar nombre/variante completa, procedencia/atributos contradictorios y unknown visibles. Foto requiere asociación exacta/evidencia+vendorImageURL existentes; fallo real=>placeholder honesto, no ilustración confundida con foto/undefined. Ofertas ARS reales de offers, cash/list diferenciados, formatRetailARS/offerDisplayStatus/stockLabel reutilizados; importes stale se muestran históricos con fecha/vencimiento/fuente/stock al consultar, no 'desconocido' si el importe existe ni promesa actual. Importe null sigue desconocido, no0. Precios dataset históricos en detalles separados, no sustituto primario de ofertas; sin conversión de moneda/FPS/precios ni compras/compatibilidad decididas cliente. Fotos/ofertas NO validan atributos. No backend/BFF/data changes salvo defecto concreto confirmado.

### Captura BEFORE preparada — observacional, NO gate funcional
Nuevo tests/evidence/integral38-catalog-before.spec.ts: dos tests30s (1440×900 y390×844), visitante sintético anónimo sin sesión, rutas públicas cerradas /catalog?page=1&page_size=12, página2 igual, /catalog/cg-11473 y /catalog/cg-11960. Cada ruta guarda viewport de encabezado y viewport de primeras filas/resumen (8PNG por ancho,16total), no fullpage gigante ni referencia regenerada después del fix. Scroll natural y sólo imágenes con src real visibles en viewport; src ausente, illustrationundefined o fallback son hallazgos, no motivo para reemplazar DOM/bytes. Usa newImageEvidenceContext existente y permitido por3HOSTS exactos/TLS normal; default fixtures intactos, sin mocks/fulfill/proveedor.

Salida nueva/exclusiva `.local/integral38/catalog-before/<timestamp-uuid>/` por test con width en nombres, index.json wx. Índice sólo rutas públicas/nombres de PNG/viewport/estado de captura y observaciones: count opciones categoría (sin Todas), altundefined, ilustraciones/placeholders/fotos cargadas, offer_rendered_count según selectores documentados, precios por confirmar y overflow. offer_rendered_count mide `.tower-offer,.catalog-offer,[data-retail-offer]`, no presume DB ni que cualquier texto de precio sea oferta. Ninguna aserción exige9categorías/ausencia deundefined/ofertas/fotos/precio u overflowfalse para aprobar baseline: el test verifica únicamente captura de páginas reales con contenido y persistencia de evidencia. Resultados de negocio malos quedan visibles. capture_complete NO significa aceptación funcional/visual.

Config nueva playwright.catalog38.config.ts hereda integral38/base: ambos servidores reales normales upgradejusto.main:app y npmstart con build vigente, cache .local/ms-playwright, exclusión puertos/reuseExistingServerfalse, workers1/retries0, artefactos automáticosOFF. No sharefactory/controlprobe ni otras configs editadas. Build wrapper TEST sin cookies humanas; foto sólo opt-in existente. Escritor NO ejecuta runners.

Build desde frontend, preparación sin recompilar producto por este delta exclusivamente tests/doc (si checkout ajeno cambió, Build decide build pertinente):
```powershell
npm run typecheck
npm run lint
node .\node_modules\@playwright\test\cli.js test --config=playwright.catalog38.config.ts integral38-catalog-before.spec.ts --grep "@catalog38-before"
```
Estado BASELINE_READY: sin checks propios ni capturas nuevas todavía; producto intacto. Próximo esperar Build paths/imágenes1440/390 y autorización de implementación. Sólo después delta catálogo + checks focales + capturas AFTER en directorios nuevos y relectura independiente. No central/Groq/LIVE/CU09 repetidos ni cierre estético global.

### Steering posterior: siguientes impactos en alcance, NO autorización de edits ahora
Hallazgos Brandon/Codex transmitidos por usuario, sin copiar seguimiento privado: tras catálogo, Home debe mostrar hardware real disponible o EJEMPLO explícito basado en datos publicados (no PC inventada) y recorrido PC actual→cambios→resultado; ayuda extensa accesible por «Necesito ayuda», no pantallas enteras de formulario/texto. Término principal snapshot podrá cambiar a «precios guardados el…» sólo cuando exista fecha real de quote/generated_at; conservar término y versiones en detalle técnico. Cuenta priorizará «Continuar con mi PC»/datos pertinentes, no tarjeta decorativa de sesión. Nav Mis planes tiene href /plans y startsWith no cubre /tower-plans: bug de integración real informado por Build; futuro delta acotado debe preferir /tower-plans con legacy visible o active branch para ambos, sin duplicar todos los enlaces. No cambiar nav ahora en bloque baseline.

Mantener contexto sólo mediante relaciones/enlaces ya existentes: NO inventar store global de PC, autoPOST/save/recommend. Advertencias junto a pieza/etapa con acción concreta y conteos+RAW progresivo, sin regresar dedupe central. Lenguaje visual hardware comparable: filas foto/modelo/cambio/coste/CTA, conservar/sustituir/añadir e importe incremental sin recomprar piezas conservadas; no nueva capacidad de motor por dibujarla. No editar rutas restantes por este backlog. Matriz final1440/390 entry/cuenta/PC-list-edit/import/catalog9-detail/comparación/recs-presupuesto/planes-público/chat/admin con rol sintético es coordinación Build; central imágenes aceptadas reutilizables donde checkout siga igual. Aprobación estética global de Brandon sigue pendiente, distinta de cierre LOCAL central y Google humano TEST.

Harness baseline mantiene SÓLO4rutas×2anchos para no expandir30s ni repetir Google/entry; Home/cuenta se capturarán antes de su propio delta si corresponde. Config/spec nuevos preparados en este turno, ningún archivo producto/server/share/chat/central editado. No fotos fabricadas ni estado visual exitoso inferido de baseline. Esperar ejecución y mensaje Build antes de implementar catálogo.

## CU09 P2 revocación/boundary + lifecycle de logging — delta focal READY
Base informada Build:8unit/2files PASS0, tipos/build0, lint0errores/1warningimg; journey real tower-share38 PASS3.1s/8.4total (publicar una vez, anónimo frozen, revocar404, B aislado). Seguridad detectó dos P2 y retuvo aceptación; revisión general funcional aún activa. Esta corrección NO borra esa evidencia ni declara nuevo gate pasado. Delegación explícita autoriza ahora frontend/server.mjs sólo para defectos concretos, no backend mount/servicios/global logging.

P2A: TowerShareManager revocación controlada y keyed por id+plan_revision; prepareRevoke siempre descarta consentimiento/anterior operación, copia metadata capturada y avanza generación. Target buttons bloqueados por busy y lock síncrono; DELETE sólo con nuevo checked, AbortController de operación, callback requiere misma generación y componente vivo. Cancel/nuevo target reset, error obliga confirmar de nuevo. Etiqueta privada distingue título + ID metadata corto + revisión, nunca token. Nuevo test real `@tower-share38-revoke-switch` crea DOS enlaces propios mediante2intenciones UI, confirma A, prepara B con checkboxFALSE/submitdisabled/DELETE0, confirma B, verifica DELETE único B+revisión capturada, Aactive/Brevoked, POST2/PCwrites0. Limpieza por IDs propios; sin mocks/proveedor ni artefactos capability. Primer journey aprobado queda intacto.

P2B y alias raw: nuevo lib/share-server-boundary.ts exporta listener inyectable/headers/classificador. Custom server coloca4headers share ANTES de stamp/Next y cubre503 stampfalse/rechazo preheaders con cuerpo fijo, no exception/path reflect. Classificación decodifica sólo segmentos de prefijo hasta reconocer share (se detiene ANTES de bearer), incluye encodedprefix y traversal aliases; NO muta req.url, no cambia HMAC/source ni reescribe rawtarget. Público sólo GET raw `/shared-tower-plans/[A-Za-z0-9_-]{1,128}` y `/api/shared-tower-plans/...` sin query/%/extra; inválidos bounded canónicos siguen hacia backend para presupuesto; fuera de forma404 uniforme antes de Next. No broad bloqueo de otros CU/paths%. Privado BFF canónico sin cambios. Units inyectadas no demuestran routing real Next; prueba NodeHTTP raw dev/prod queda para driver posterior.

Guía local leída efectivamente node_modules/next/dist/docs/01-app/02-guides/custom-server.md1–128, en especial headers ANTES de handle. Intento del path inicial de guía no existía; se leyó el archivo local correcto. Lectura instalada next.d.ts denegada, sin retry/otra vía: app.close():Promise<void> se usa según verificación explícita transmitida por Build, no afirmación de inspección propia.

Lifecycle TEST: UJ_TEST_SHARE_SERVER_CONTROL defaultOFF/0. Cualquier valor distinto de1/off falla cerrado;1 exige UJ_ENV=test y DB URLs iguales/no vacías ANTES de importNext/recursos. Host/puerto/CLI/Next flags normales no cambian. En modo control stdout READY fijo sólo desde callback listen del propio server. Stdin pipe STOP fijo inicia cierre: HTTPserver.close (conexiones activas), drain de promises handle pendientes, awaitapp.close, cerrar stdin/readline, emitir GRACEFUL_COMPLETED fijo y salida normal (sin process.exit exitoso forzado). Nada de quiet/logfilters/webpack/TLS nuevos ni bearer logs propios.

Probe soporte sustituye heurística puerto como identidad por READY de stdout del hijo propio y alive antes de exercise. Chequeo puerto ocupado sólo preflight, sin reutilizar/kill ajeno. Añade únicamente flag TEST permitido tras validar DB; STOP por stdin, espera normal5s; si cuelga kill sólo owned child y gate FAILED, nunca graceful. Espera pipeEOF y exit0 normales, snapshot después declose. Scanner totalRAM262144bytes, StringDecoder separado por pipe conserva multibyte, sólo hits/bytes/overflow/total retornados. Resultado incluye startup_verified/graceful/captureEOF/exit0; todos true + overflowfalse/hits0 necesarios. Error sólo fase/enum y primitives. No ejecución ni garantía de ausencia de fugas todavía.

Imgwarning: excepción eslint local sólo no-img-element con explicación de URL histórica cerrada y ausencia de optimizer/serverfetch; sin suppress global ni alterar imágenes/evidencia. Tests nuevos: share-server-boundary.test.ts6casos de guardas/headers/error injection/rawaliases/defaultTEST/drain; log-probe4casos (2 nuevos control+UTF8); siguen6units DTO/consumidor. Inyección sintética NO es gate real de error Next.

Build desde frontend, secuencial:
```powershell
node .\node_modules\vitest\vitest.mjs run tests/unit/share-server-boundary.test.ts tests/unit/tower-share-log-probe.test.ts tests/unit/tower-shares38.test.tsx
npm run typecheck
npm run lint
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.tower-share38.config.ts tower-shares38.spec.ts --grep "@tower-share38-revoke-switch"
```
No runners por escritor; códigos nuevos PENDIENTES. Relectura independiente necesaria por cambio server normal/boundary. Siguiente bloque autorizado por coordinación tras preflight: driver logging dev/prod backend-only config, casos rawNodeHTTP canónico/encodedprefix/token/query/traversal y éxito/revocado/error; no se ha preparado/ejecutado aún ese driver. Startupgraceful real y gate stdout/stderr pendientes, reservas no se cierran por units. Sin repetir central/Groq/CU08LIVE ni ampliar alcance. Sin backend/main mount/deps/env general/commits/push/delegación.

## CU09 consumidor autorizado — inicio de implementación focal
Build acepta contrato y spec previa; única lectura autorizada de backend/INTEGRAL38_SHARE_DTO.md devolvió Permission denied, sin retry/alternativa. Se usa DTO completo transmitido por coordinación: títulos exactos Plan de mejora de torre / Plan de mejora por etapas; metadata privada y proyección pública v1 con13 versiones, refs locales, nueve categorías y12 reglas. Ningún mount backend producción autorizado.

Guías locales Route Handlers y cache consultadas; unstable_noStore está deprecated, usar connection/Request-time APIs + no-store explícito, params Promise. Skill frontend-design cargada efectivamente: composición de documento congelado, no dashboard: encabezado de estado/coste, inventario y etapas, fuentes/reglas progresivas; gestión separada con disclosure y acciones explícitas. Segoe UI existente, grafito #101419/superficie #181f28/texto #f4f7fb/divisor #354252/azul #5b94ff/pendiente #f4d698; alineación izquierda, columnas minmax responsive, sin decoraciones o framework nuevos. Revisión del plan evita imitar preview: aceptar reglas antes de publicar, observar copia sólo tras creación con acción propia.

Implementación prevista exclusivamente frontend: schemas allowlist y proyección tipada sin JSON privado; gateway/BFF exactos, cap pública1MiB/15s/no redirects/cookies; páginas pública y gestión; tests unit sintéticos y navegador real TEST factory, sin proveedor. Shell público no consulta roles/identidad. Logging actual dev/prod sigue SIN ACREDITAR aunque next.config actual tenga logging:false: no editar server.mjs ni afirmar anonimización end-to-end. Build deberá observar procesos reales con marcadores antes de activar. Central/chat/legacy sin gates repetidos. Startup normal/error-probe OFF, artefactos capability OFF.

### CU09 implementación preparada — checks/gates pendientes, NO activación
Nuevos módulos `lib/tower-share-dto.ts`, `tower-share-proxy.ts`, `tower-share-client.ts`: DTO estructural allowlist13versiones/ref locales/9categorías/12reglas; JSON desconocido extra omitido, no schema1 adapter/veredictos calculados; copia pública sólo fields públicos. Dinero exacto string/null distinto0; quote positiva; reglas/facts completos publicados incluso vacíos/desconocidos. Fact.name registrado se conserva como string técnica escapada sin inventar autoridad, significado o unidades (doc no accesible; contrato permite este consumidor). Respuestas malformadas =>503 fijo sin body/message. Refs existentes de componentes/fuentes comprobadas, no lookup catálogo/PC. BFF exacto público1..128 ASCII/raw sin%query (inclusive tokens longitud inválida forwarded al mismo presupuesto), privado lowercaseUUID + métodos cerrados, HMAC/socket37. Público sin Cookie/Authorization/CSRF, privado conserva controles de servidor. Response pública acotada1MiB, privada262144; caps de entrada/5s/15s originales intactos, redirect error, headers no-store/referrer/nosniff/robots también fallos.

Rutas nuevas API públicas y privadas según contrato; pública WEB server-render dinámica con connection + async headers del socket y MISMA función BFF (sin cookie/direct bypass de gateway).404 explícito para token no disponible, mensaje controlado para429/servicio. No segundo GET automático de metadatos ni precio. Publicación no cacheada explícitamente; rechazo en backend a cada nueva navegación/recarga. Restauración bfcache solicita reload (listener cliente de viewer/fotos). Shell rama pública no hace role probe ni renderiza identidad privada; otros paths iguales. next.config añade headers SÓLO nuevas rutas; logging:false preexistente no es prueba de ausencia de fuga.

UI: `components/public-tower-share-view.tsx`/`public-share-photo.tsx`, público con estado/redacción/withheld+avisos, inventario9categorías, coste/subtotal,12reglas/cobertura/estados/hechos/ref/faltantes, quotes congeladas y fuentes; no foto inventada ni SKU/catálogo fetch, imagen sólo URL policy vendor y bytes_verified honesto, no current-clock reprice. `tower-share-manager.tsx` + página dedicada listan primero independientemente de GET plan (404 sólo impide nuevo CREATE), disclosure sin preview,2títulos/consent explícito, token sólo memoria/copia manual/clipboard/abrir por usuario, no prefetch/storage/retry. Resultado incierto conserva aviso y exige GET/lista+nueva decisión. Revocar usa ítem/revisión capturados incluso plan borrado; sin reactivar. CSS nuevo scoped tower-share-document; central/chat sin cambios. Wrapper `/tower-plans/[id]/page.tsx` sólo añade enlace administrativo prefetchfalse, no cambia workspace privado ni central.

Tests preparados (NO ejecutados): `tests/unit/tower-shares38.test.tsx`6casos sintéticos DTO/strict/money/ref/nocookie/BFF/signing/unknown/SSR/quote antigua; `tests/unit/tower-share-log-probe.test.ts`2casos scanner acotado sin contenido. `tests/support/tower-share-fixture.ts` sólo unit, nunca respuesta final mock. Browser `tests/e2e/tower-shares38.spec.ts` realfactory: propiosA/B/visitante vacío, PC+plan reales desde preview determinístico sin LLM, crear checkbox201/POST1, lista sin bearer, viewer/root/12reglas/9categorías/referrers/noStore/cookies0, reloadhash congelado, B404 y revoke204→404 uniforme para inválido bounded, hashPC/plan sin aplicación, cleanup por IDs propios. Fallos phase/enums/contadores, artefactosOFF. No pruebas Groq/central/LIVE. Config nueva `playwright.tower-share38.config.ts` deriva base y cambia SÓLO módulo/backend app-dir; base/fixtures intactos, workers1/retries0/cache heredados. Build debe mantener error-probe UNSET, TESTDBmatching, puertos propios.

Logging: soporte nuevo `tests/support/tower-share-log-probe.ts` propone ejecutar los procesos reales node server.mjs / --dev (mismos scripts npm), sólo owned child con3000 libre, backendTEST ya iniciado por Build. Captura RAM acotada262144bytes, marcadores divididos entre chunks detectados, snapshot sólo bytes/overflow/hits/total después de cerrar stdout/stderr. Nunca inherit/console/errorbody/traza de tokens. Build puede usar exercise callback para éxito/inválido/revocado/error y marcadores sintéticos; resultado sólo aceptable overflowfalse/hits0. Esto NO es un gate ejecutado ni un script root existente. Si detecta fuga, Build/coordinador autorizan corrección de ingress/logger; frontend NO editó server.mjs.

Preflight Build desde frontend:
```powershell
node .\node_modules\vitest\vitest.mjs run tests/unit/tower-shares38.test.tsx tests/unit/tower-share-log-probe.test.ts
npm run typecheck
npm run lint
npm run build
```
Luego sólo TEST wrapper ya acordado, sin imprimir env, normal businessfactory sin error-probe:
```powershell
node .\node_modules\@playwright\test\cli.js test --config=playwright.tower-share38.config.ts tower-shares38.spec.ts --grep "@tower-share38"
```
RESERVAS: ningún check/código de salida nuevo por escritor; UI/API no aceptados aún. Logging HTTP real Next dev+prod, incluido error poststart, sigue bloqueante antes de activación/mount. Helper no sustituye ejercicio real. Quote antigua verificada sólo en test unit sintético preparado, no evidencia HTTP de quote expirada real. HTTP de baja del plan/list+revoke tras404 y normalización WEB de percent-encoded token requieren foco adicional: API BFF rechaza%raw, params WEB son decodificados por Next y no se afirma bloqueo raw en ingress WEB sin probe real; si se demuestra desvío, elevar a Build sin modificar server por intuición. No claims físicos/integral38/Google/MCP-LIVE arreglado. Si preflight falla, una corrección diagnosticada y escalada si persiste, sin ciclos ni proveedor. Próximo Build resultados focales/revisión y gate procesos real, no producción.

## CU09 startup TEST — contrato confirmado por Build, documentación solamente
Proveniencia: Build leyó playwright.config.ts/package.json reales y verificó el proceso/factory backend ya probado. Cierra el faltante de startup, NO los DTO/aceptación preimplementación. Sin polling del documento backend activo en otro autor ni nueva lectura/ejecución por frontend.

Wrapper Build desde frontend: `. ../scripts/local-env.ps1 -TestDatabase` (heredar entorno, NO imprimir variables/credenciales). Factory exige UJ_ENV=test y DATABASE_URL==TEST_DATABASE_URL. Backend, cwd backend, comando exacto confirmado:
```powershell
./.venv/Scripts/python.exe -m uvicorn tower_share_runtime_probe:app --app-dir tests --host 127.0.0.1 --port 8000 --loop asyncio --http h11 --no-proxy-headers --no-access-log
```
Para journeys normales CU09, flag de error-probe UNSET/default OFF; no inventar nombre/flag adicional. Factory habilita shares de negocio SÓLO TEST; main producción sigue sin include. CATALOG_API_URL existente http://127.0.0.1:8000, sin cambios de dominio/proveedor/flags facturables ni llamadas LLM.

Web producción en3000: `npm run build`, luego `npm run start` (= node server.mjs). Gate futuro de logs dev: `npm run dev` (= node server.mjs --dev). Ambos modos en entorno TEST heredado, appOrigin exacto http://127.0.0.1:3000, proxy/socket/HMAC y stats sourceVerified de fixtures/newIsolatedContext intactos. Exclusión mutua runners/puertos3000/8000: rechazar ocupación, sin reutilizar servidor ajeno, matar procesos extraños ni retries cíclicos.

Cuando implementación esté autorizada, config CU09 nueva derivada del base Playwright: sustituir SÓLO target de primera entrada webServer por tower_share_runtime_probe:app y añadir --app-dir tests con CLI ya verificado; no editar config base aprobada ni ampliar transporte. Fotos, sólo si necesarias, mediante fixture opt-in image-evidence ya aceptada por HOST; default sigue app-only. Artifacts trace/screenshot/video OFF para capability tokens. Eventual evidencia visual exige encuadre seguro sin token/URL; no capturas ahora.

Gate logging dev+prod debe observar procesos REALES con captura acotada en RAM y emitir sólo booleans/conteos seguros; todavía pendiente, NO existe nuevo script/flag acreditado por esta nota. Viewer/rutas no implementados, así que NO crear config/tests/source por este startup. DTO/subformas/títulos/metadata y aceptación/spec preimplementación siguen pendientes de transmisión Build. Único cambio: frontend/INTEGRAL38-DESIGN.md; sin runners, entorno, backend, dependencias, commits ni cierre integral38.

## CU09 torre compartida — CONTRATO CONSUMIDOR / PLAN PRIVACIDAD, sin implementación

### Estado y frontera de autorización
Central visual LOCAL cerrado1440/390: no nuevos cambios, gates ni capturas rutinarios. CU08 fuente aceptada; LIVE BLOQUEADO por tool_use_failed en segundo stream SDK (get_pc completó, evaluate_pc no): STOP llamadas de proveedor; tests/frontend/SDK/TLS/env intactos. No extrapolar cierre integral38.

Build informa CU09 backend premount: dos P2 y defecto ingress/header500 corregidos; fuga de token sintético en excepción post-start diagnosticada/corregida en boundary levantando excepción segura fuera de except, sin cause/context.5boundary PASS y lint/format0; mismo proceso TEST cooperativo PASS2.82s; revisión seguridad acepta PIPELINE TEST LOCAL, NO activación productiva. Main producción todavía sin incluir router de shares. Es evidencia backend informada, no prueba BFF/Next ni licencia para activarlo.

Este bloque autoriza SÓLO documentación frontend. Ningún tipo, renderer, handler, ruta, test, config, servidor ni dependencia se implementa hasta recibir subformas DTO exactas de Build. Guía local Next leída: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md (1–170): handlers Web Request/Response y params Promise; no asumir params síncronos ni caching seguro por defecto. Cuando se autorice UI visual, cargar skill frontend-design y guía local pertinente antes de editar; no afirmar inspección de imágenes por preparar contrato.

### Rutas propuestas aceptadas como literales, distintas del legacy
- WEB pública: `/shared-tower-plans/[token]`; legacy `/shared/[token]` intacta.
- BFF público GET: `/api/shared-tower-plans/[token]`.
- WEB privada dedicada: `/tower-plans/[id]/shares` (gestión de enlaces propios incluso tras baja lógica del plan).
- BFF privado GET/POST: `/api/tower-plans/[id]/shares`; DELETE: `/api/tower-plans/[id]/shares/[shareId]`.
- UUID de plan/share canónico lowercase; query rechazada, sin ampliar rutas/métodos del gateway de forma genérica. Confirmar mapeo upstream literal con Build antes de código.

Público: bearer válido43ASCII base64url, generado por secrets32 con digestSHA256 backend. Frontera raw confirmada por Build: GET path con segmento `[A-Za-z0-9_-]{1,128}`, sin query ni segmento porcentualmente codificado. Ingress debe reenviar también tokens inválidos dentro de esa frontera para que backend cuente válidas/inválidas ANTES de lookup; no limitar BFF a43 ni convertir malformed bounded en rechazo frontend que saltee presupuesto. Sin slash codificado/segmentos extra/query/traversal. Query rechazada con404 público; no transportar tokens por query ni normalizar/decodificar entradas para expandir el alfabeto permitido. Mantener conteo backend de longitud inválida cuando esté dentro de1..128 (por ejemplo distinta de43); no exigir forma de bearer válido antes de forwarding. Fuera de la frontera raw:404 uniforme seguro, nunca login/401 por ausencia de sesión. Respuestas de presupuesto según contrato backend, no retries automáticos ni ocultarlas como éxito/404. No cambiar a fragmento #token sin decisión explícita de negocio.

### Transporte / privacidad end-to-end como gate bloqueante
GET público sin sesión/CSRF ni gate de autenticación. HMAC37 + socket IP de origen test-owned/server-only; no confiar en IP/rol de usuario. NO reenviar Cookie, Authorization, CSRF ni identidad privada al backend público, ni solicitar csrf para abrir un enlace. No devolver Set-Cookie privado. Reutilizar controles37 de origen/CSRF/sesión para escrituras privadas y propiedad servidor para list/create/revoke; no user_id/roles cliente.

Página y BFF públicos dinámicos/no-store en éxito Y error; sin cache compartida, prefetch automático ni persistencia en storage. Noindex/nofollow y referrer no-referrer (headers/meta según guía Next que corresponda), links históricos externos rel noopener noreferrer y sin referrer. Token nunca en título, contenido visible de error, telemetría, console, raw DTO, stack, traces o screenshots. El path bearer inevitablemente pasa por navegador/servidor: NO prometer que desaparece de URL/history. Ni no-store ni header referrer garantizan ausencia en logs.

Riesgo material ABIERTO: Next dev completion/error logs y producción/customserver pueden imprimir request target/token del path, incluso si aplicación no hace console y backend ya pasó gate. Requiere prueba REAL BFF+WEB dev Y prod: éxito, revocado/inválido, error antes y después de start, markers sintéticos en path/body/header/excepción. Build debe detectar sólo conteos/booleans/enums seguros, sin imprimir el token/log contaminado. No leer artefactos privados ni afirmar redacción global. Si hay fuga, elevar fuente exacta al coordinador/Build antes de activación; no cambiar logger global, APM, servicios o root wrappers por rutina. HMAC/gateway/BFF nuevos también deben pasar gate, no sólo HTTP directo backend.

Fetch BFF server timeout15s (backend SQL5s), redirects cerrados, sin dumps de body/error. Respuesta pública hasta1MiB según contrato: comprobar lectura acotada específica, sin ampliar buffers globales ni recortar silenciosamente proyección. Datos faltantes visibles. No SDK/model/proveedor/PG/TLS/env cambios ni llamadas LLM.

### DTO privado: conocido y PENDIENTE de transmisión exacta
CREATE body exacto: `{expected_plan_revision:strict-positive-int,title:enum,public_projection_confirmed:true}`. Título público NO es nombre privado del plan: DOS valores controlados por transmitir, sin inventarlos ni admitir texto libre. Checkbox explícito propio reconoce REGLAS DE PROYECCIÓN/disclosure (qué datos se publican y qué se reserva) y revisión privada seleccionada; NO afirma haber visto una proyección exacta del servidor antes de emitir. No hay endpoint preview público/privado acordado: no inventarlo, ni calcular proyección frontend/rawDTO para fingir vista exacta, ni usar POST crear como consulta. Explicar publicación readonly con datos controlados/cotizaciones históricas/retención de algunos facts y exclusión de notas/nombres privados según contrato backend; no prometer detector universal de PII. No reutilizar checkbox de guardado/materiales ni publicar automáticamente por GET.

CREATE response pendiente de verificar: posible metadata `{id,plan_revision,title,created_at,projection_version?,revoked_at,token}`; NO crear tipos con esta hipótesis. Precisar presencia/obligatoriedad/nulabilidad de cada campo, effective_state si existe y status HTTP. GET listado conocido como `{items:[metadata]}` sin bearer/digest/snapshot; confirmar shape exacto, projection_version y si hay paginación. DELETE body esperado revisión CAPTURADA del ítem (no revisión actual del plan): transmitir nombre exacto del campo, tipos y status/respuesta. No asumir idempotencia CREATE ni campos de revisión que no estén confirmados.

Estados efectivos con precedencia explícita: `revoked > disabled_plan_deleted > active`; null revoked_at no implica activo. Mostrar estado recibido/contratado, nunca deducir sólo de fecha. Sin endpoint reactivar; no ofrecerlo. GET list es autoridad para gestionar metadata propia y NO debe depender de GET plan exitoso (plan borrado puede404). En página dedicada listar primero; la baja impide nueva publicación, no bloquea revocación existente. Confirmar errores401/403/404/409/429 y semántica de respuesta de cada operación antes de implementar.

### UX privada: token una sola vez, sin falso retry
Estados previstos: cargando metadata / lista vacía / error recuperable por GET explícito / revisión privada seleccionada y aceptación del disclosure de publicación / creando bloqueado / creado token sólo memoria de esta operación / resultado incierto / revocando ítem / revocado o deshabilitado. No estado de preview exacto previo a emisión. Token devuelto sólo CREATE: revelar/copiar únicamente por acción explícita; nunca intentar recuperar de GET ni guardar localStorage/sessionStorage/URL de gestión. Tras crear, abrir el enlace para observar la copia publicada requiere otra acción explícita; NO autoopen/prefetch/nueva emisión. Clipboard fallido no crea otro share: conservar resultado en memoria y permitir copia manual explícita. Pérdida de respuesta puede haber creado enlace: aviso, consultar lista y revocar/reemitir por nueva decisión; SIN repost/retry UUID porque CREATE idempotente no está acordado. Cambiar plan/desmontar descarta material temporal, sin promesa de recuperarlo.

Revocar pide confirmación y usa revisión congelada del ítem; bloquear dobleclick, no rebase a última revisión. Actualizar lista tras respuesta real. Texto obligatorio: revocar deshabilita accesos futuros, «Las copias ya vistas o las respuestas iniciadas no se eliminan». No prometer borrado físico, retiro de capturas o interrupción de respuestas ya iniciadas. Nada aplica/salva PC, reserva stock o crea herramientas MCP.

### DTO público: raíz transmitida, NO completar subformas por intuición
Raíz acordada por Build:
`{kind:'shared_tower_plan',schema_version:2,title,plan_revision:int,published_at:ISO,generated_at:ISO,objective:'general'|'gaming'|'productivity',workload:'blender-cpu'|null,budget_ars:string,currency:'ARS',price_condition:'cash'|'list',versions,components:PublicComponent[],references:PublicRef[],base_configuration:PublicConfiguration,stages:PublicStage[],cost:PublicCost,benefit:PublicBenefit,status:'ready'|'blocked'|'requires_verification',projection:{version:string,evidence_complete:boolean,withheld_details:int},missing_fields:[{code:'public_evidence_withheld',count:int}],warnings:string[]}`.

PublicStage transmitido:
`{position,name:controlled-EtapaN,budget_ars,actions:PublicAction[],materials:[{kind:'thermal_compound',state:'available_confirmed',confirmed:true}],evaluated_configuration:PublicConfiguration,evaluation:PublicEval,benefit:PublicBenefit,offers:PublicQuote[],dependencies:PublicDependency[],cost:PublicCost,cumulative_cost:PublicCost,status,missing_fields:[{code:'required_fact_missing',count:int}],warnings}`.

FALTANTES concretos antes de código: ambos enums de title; metadata/list/create/revoke exactos; ocho claves exactas de versions y si incluye projection (sin asumir extensión); PublicComponent/Ref/Configuration/Action/Eval/Quote/Dependency/Cost/Benefit completos con claves, tipos, nulabilidad, enums, cardinalidades/refs locales y campos de evidencia/imagen; tipos precisos de status/warnings/budget de stage/position/name, materials vacío o máximo1, restricciones de count/withheld_details y códigos adicionales si existen. Para PublicEval: TODO inventario, regla/estado, cobertura, facts/evidence/conditions y forma de faltantes; distinguir veredicto original vs visibilidad pública/redacción. Para PublicCost: total nullable/subtotal/within_budget/lines/exclusiones; referencias y ofertas congeladas sin asumir IDs privados ni DTO de seis categorías. No inventar ninguna subforma o endpoint pendiente.

### UX pública: copia congelada honesta, no lookup privado
Renderer nuevo de nueve categorías y cantidades/estados, no reutilizar ciegamente legacy ni TowerPlanRead privado. Usar sólo components/references/configuraciones públicas congeladas; IDs de referencias locales NO son catálogo actual. PROHIBIDO fetch GET-ID/catálogo/PC privada para nombres, fotos, atributos o versiones. Fotos únicamente si el DTO congelado aporta evidencia HTTPS/variante exacta/política pública permitida verificables; sin recurso, placeholder explícito. Sin proxy/descargador/redirect de imágenes ni variante prestada.

Arriba: título controlado, snapshot/revisión/publicado/generado, estado público, presupuesto/coste completo o desconocido/subtotal, límites de compartir y conteos withheld. Si redacción exige requires_verification aunque veredicto histórico fuese compatible, mostrar AMBOS con contexto: estado público no certifica ni altera el motor original; no verde de cobertura total. Conservar todas las reglas/estados/cobertura/evidencia/condiciones disponibles y count de lo retenido; no convertir JSON desconocido en false/0/ausencia/compatible. BIOS/modelos declarados privados se representan sólo con etiquetas neutrales del DTO público. Histórico de cotización/stock/fechas tal como observado, SIN recotización ni reinterpretar como vigente; total null no0, beneficio curado noFPS. Fuentes reconstruidas/allowlisted según contrato, no URLs libres de campos privados. Accesibilidad dark focal en viewer/gestión nueva, sin rediseño central ni legacy. Reuso de componentes sólo si sus tipos no presuponen UUID privado, metadatos corrientes o faltantes string[].

### Verificación preparada conceptualmente, sin comandos inventados ni ejecución
Unidad futura: parse cerrado de DTO real transmitido, refs locales/no lookup, cobertura/redacción+unknown, decimal exacto, token single-segment/normalización, headers/no cookies/CSRF público, CREATE incierto sin retry, clipboard sin POST extra, revoke revisión congelada, precedencia efectiva y lifecycle/aborts sin fuga entre planes. Fixtures sintéticas unit claramente etiquetadas, no resultado final mock.

Playwright TEST nuevo con runtime factory backend de probe, NO include de router producción. Existe `backend/tests/tower_share_runtime_probe.py` guarded UJ_ENV TEST/DBmatched: Build debe transmitir comando de arranque EXACTO y lifecycle/guardas/URLs; no inventar flags ni ejecutar lectura de workspace privado. Config futura deriva ambos servidores/cache existente, runner exclusivo, Next prod con build previo/customserver estable. Matriz real propietarioA/B, público sin sesión, create/list/token una vez, snapshot nueve categorías/unknown/costes, revocar/baja lógica/404 uniforme/budgets, y gate marcadores end-to-end dev+prod en éxito/revocado/error. Artefactos sensibles OFF y sólo métricas seguras. Probar no-store/robots/referrer/sin prefetch/cookies en camino real, no aceptar por lectura de fuente. Backend pipeline aislado no sustituye esto. No activación antes de DTO+gates; no nuevos servicios/proveedores/global logger configs ni suite/central/Groq repetidos.

Checkpoint: CONTRATO READY CON RESERVAS explícitas. Corrección documental posterior Build: confirmación de disclosure/reglas + revisión, NO preview inexistente; frontera raw `[A-Za-z0-9_-]{1,128}` confirmada, bearer43 no filtro previo a presupuesto. Único archivo editado este bloque: frontend/INTEGRAL38-DESIGN.md. Ninguna implementación/ejecución/commit/push ni cierre integral38. DTO/doc backend activos en otro autor: no polling ni lectura de fuente inestable. Próximo: recibir subformas/metadata/títulos de Build y aceptación/spec preimplementación; después Build transmitirá startup TEST/config exactos. Antes de código real leer guía local de cache Next16 además de Route Handlers ya consultada. Logging end-to-end dev/prod sigue sin acreditar; no activar consumidor ni producción antes de gates. Sin repetir central ni llamadas LIVE.

## CU08 primer LIVE fallido — instrumentación test-only READY
Build informó7unit/tipos/lint/build0 y revisión funcional/seguridad local aceptada. Precisión: factory frontend OMITE extras al construir allowlist; no los rechaza. Backend DTO cerrado. Primer LIVE autorizado FAIL7.3s phase stream-terminal, posts1/PCwrites0; HTTP200 y text/event-stream pasaron. El catch anterior no permite saber si falló espera, cierre/delta o herramientas; NO inferir cuota, límite, omisión del modelo ni persistencia exitosa. No llamada adicional ejecutada por escritor.

Delta exclusivo test: `tests/live/tower-context.spec.ts` guarda snapshot antes de assertions y agrega subfases separadas para espera, SSE/start/delta/done/completed, get_pc iniciado/completado, evaluate_pc iniciado/completado y errores. Catch preserva snapshot también si la espera falla, sólo phase, matcher allowlisted, posts/PCwrites y contadores whitelist. `tests/support/assistant-live-observer.ts` exporta installer autocontenido para probar el mismo parser, propiedad window no reasignable, snapshots congelados sólo numéricos y enum observado (generation_failed, round_limit, tool_output_limit_full_api_required, history_unavailable, other; null si no hubo error). No raw código desconocido/mensajes/args/IDs/URLs/texto/providerbody ni archivo/traza/captura. Timer, forwarding de bytes, límites de parser y exigencias fuertes del gate se conservan. Añadido contador de error output-limit sólo para diagnóstico, NO afirma que esa sea la causa.

Nuevo `tests/unit/assistant-live-observer.test.ts`:4 casos de frames sintéticos (SSE partido+ambas herramientas/delta antes de done; enums conocidos/desconocido; malformed/131073; whitelist/propiedad readonly). Prueban instrumentación, NO producto ni servicio LIVE. El archivo LIVE histórico, producto/contexto/BFF/env/proveedor/SDK/config/central siguen intactos.

Preflight Build desde frontend, SIN LLM:
```powershell
node .\node_modules\vitest\vitest.mjs run tests/unit/assistant-live-observer.test.ts
npm run typecheck
npm run lint
```
No build de producto requerido por delta sólo tests salvo cambios ajenos que Build considere. Sólo tras preflight0 y decisión EXPLÍCITA Build, UNA ejecución diagnóstica justificada:
```powershell
node .\node_modules\@playwright\test\cli.js test --config=playwright.tower-chat-live.config.ts tower-context.spec.ts --grep "@tower-chat-live"
```
Formato seguro de fallo: JSON `{phase,matcher,stream:{responses,reads,startEvents,nonEmptyDeltaEvents,doneEvents,errorEvents,invalidFrames,terminalCompleted,getStarted,getCompleted,getFailed,evaluateStarted,evaluateCompleted,evaluateFailed,deltaBeforeDone,error_enum},posts,pc_writes}`. Sin interpretación de resultados no observados ni promesa de gate pasado. Esperar ese diagnóstico; no retry automático/model fallback/prompt tuning. Si no alcanza, escalar al coordinador.

## CU08 lint lifecycle — corrección focal preparada
Build informó13unit/2files PASS0 y tipos0; lint falló exclusivamente react-hooks/set-state-in-effect al iniciar carga/listclear sincrónicamente dentro del efecto de TowerChatContext. NO build ni intento LIVE. Causa de lifecycle, no backend/proveedor/contrato.

Corrección: loading inicial true/listnull por useState; paginación y reload pasan por requestList en handler de intención del usuario, que inicia loading y limpia opciones antes del cambio de página/revisión. Efecto sólo crea petición abortable y actualiza estado en respuestas reales, sin setState inicial, disables ESLint ni deferred/microtask hacks. Epoch de lista avanza sincrónicamente en intención para que ni un callback anterior al siguiente cleanup pueda reinstalar opciones/errores/loading viejos. Abort cleanup sigue vigente. Reload además llama choose(Ninguna), aborta detalle/invalida generación/borra contexto mediante callback de evento; ninguna selección/revisión nueva se autoacepta. Paginar conserva sólo la selección explícita ya confirmada, no opciones de la página anterior bajo el nuevo número. Fallo lista permite mensaje sin contexto y muestra error, no falsea lista vacía como total0.

Archivos: components/tower-chat-context.tsx; lib/assistant-context.ts (helper epoch puro); tests/unit/assistant-context.test.tsx (ahora7 casos, uno nuevo epoch+SSR inicial loading/nav disabled); este documento. Unit epoch verifica algoritmo de invalidación y SSR verifica markup inicial, NO son prueba interactiva del navegador ni LIVE. Sin cambios a chat send/SSE/META/fixtures/config/captura/BFF/timeout/env/provider ni gates centrales.

Build desde frontend:
```powershell
node .\node_modules\vitest\vitest.mjs run tests/unit/assistant-context.test.tsx
npm run typecheck
npm run lint
npm run build
```
Escritor NO ejecutó; esperar resultados y revisión ANTES de autorizar el único turno LIVE ya preparado. No iniciar automáticamente ni repetir suite/proveedor por este fix. Una corrección diagnosticada aplicada; si persiste fallo, escalar evidencia concreta sin retries cíclicos.

## CU08 contexto explícito por turno — contrato/UX antes de código
Central visual aceptado LOCAL por relectura7PNG; Build10unit/tipos/lint/build0 y ambos recorridos PASS. Referencias aceptadas D2026-10-26T20-56-13-098Z-a2dcae49/M20-56-21-425Z-5b8aeabc. No repetir gates/capturas centrales ni declarar cierre integral38.

DTO transmitido/verificado por Build: MessageCreate `{content:1..8000,client_request_id:UUID,context?:{context_version:2,configuration_schema:1|2,pc_id:UUID,expected_pc_revision:integer>=1,objective:general|gaming|productivity|null,budget_ars:decimalSTRING>0|null,price_condition:cash|list,workload:blender-cpu|null}}`. Dos argumentos históricos de messageInput omiten context. Factory valida y copia sólo campos cerrados, nunca notas/modelos/user_id/roles/materiales/evidencia. Objetivo distinto de productividad elimina workload en UI y el validador rechaza combinación inválida. Dinero se valida como string decimal positivo sin Number. Servidor mantiene propiedad/revisión/permisos/decisión, frontend no autoriza.

UX: selector Ninguna + torres propias origin_schema2 obtenidas por API paginada, botones anterior/siguiente sin truncar catálogo a primera página. GET detalle al elegir confirma revisión; nueve estados/cantidades visibles sin notas/modelos. Criterios opcionales únicamente si se eligió PC. «Solo este turno; selección no guardada en conversación». Nada autoseleccionado por historia ni persistido en storage; cambio de conversación y fin de turno limpian selección transitoria. GETs abortables con generación para descartar respuestas tardías; selección/criterios bloqueados durante envío, body copiado al submit. Identidad de solicitud incluye contenido y contexto inmutable; no reuso de UUID para cuerpo diferente, no retry automático.409 exige recuperar historia y recargar/revisar PC, nunca rebase/repost automático. Cancel/read SSE/Markdown/citas/105s existentes conservados.

Preparar gate LIVE separado (NO ejecutar): contexto torre propia con unknowns, una llamada LLM desde UI pidiendo get_pc/evaluate_pc; observer sólo contadores, delta antes de done, herramientas iniciadas/completadas, historial completed estable tras reload, POST1/PCwrites0, propietarioB404. Artefactos off, sin payload/credenciales en diagnóstico. Reusar observer del LIVE existente vía helper compartido, no repetir escenario Groq previo. BFF assistantProxy ya pasa JSON con cap existente y streaming sin buffering; no ampliarlo. Si proyección real excede límite, error honesto y escalar, no truncar/reconfigurar proveedor.

### CU08 preparado para checks focales — LIVE pendiente de orden explícita Build
Producto: nuevos `lib/assistant-context.ts`, `components/tower-chat-context.tsx`; `lib/assistant.ts` añade tercer argumento opcional y mantiene firma histórica2args; `app/chat/chat.tsx` monta contexto por conversación/turno, bloquea cambios durante envío, compara identidad content+context, copia DTO cerrado, limpia al terminar/cambiar y explica409 sin rebase/repost. Locks síncronos evitan doble admisión UI; historial sólo se actualiza para conversación actual. Selector GET paginado20 sin primer-page heuristic, filtro origin_schema2/schema2, GET detalle abortable/generación; selección pendiente bloquea envío sin fingir Ninguna. Resumen9categorías sólo estado/cantidades, nunca notas/modelos. Sin chips añadidos ni rediseño/CSS/nav/página/server. Request BFF revisado: assistantMessage32768 bytes, deadline cuerpo5000ms, upstream/SSE105000ms intactos; error de tamaño no se disimula ampliando límites.

Tests nuevos: `tests/unit/assistant-context.test.tsx`6 casos de DTO cerrado/copia congelada/2args, versiones/revisión estrictas, presupuesto decimal sin Number/null≠0, objetivo-workload, resumen privado nueve categorías, SSR Ninguna. LIVE nuevo `tests/live/tower-context.spec.ts`, configuración `playwright.tower-chat-live.config.ts` derivada de LIVE existente con ambos servidores/cache y artefactos off. Observer reutilizable nuevo `tests/support/assistant-live-observer.ts` conserva enfoque de TransformStream del LIVE previo y añade contadores get_pc; el archivo LIVE anterior queda intacto (no se extrajo su código para evitar cambiar gates aprobados). No archivo gigante duplicado ni payload archive, errores sólo phase/error_enum/números. Nuevo gate pide una vez get_pc+evaluate_pc, comprueba herramientas completadas, delta antes de done, persistencia/hash tras reload, selección no durable, ownershipB404/POST1/PCwrites0 y cleanup específico. No cuenta registro/login como llamada LLM.

Build desde frontend, checks sin proveedor:
```powershell
node .\node_modules\vitest\vitest.mjs run tests/unit/assistant-context.test.tsx tests/unit/assistant.test.ts
npm run typecheck
npm run lint
npm run build
```
Sólo tras autorización explícita de ejecución LIVE de Build, con opt-in ya configurado por Build (escritor NO cambia env):
```powershell
node .\node_modules\@playwright\test\cli.js test --config=playwright.tower-chat-live.config.ts tower-context.spec.ts --grep "@tower-chat-live"
```
Todos estos checks nuevos NO ejecutados por escritor; no inferir Groq desde extracción ni pruebas centrales aprobadas. LIVE1turno pendiente, sin retries/cuota/prompts iterativos/fallback ni cambios de motor/MCP/PG/provider. Si tools faltan o proyección real excede límite, fallo explícito y escalada al coordinador tras diagnóstico, no truncar datos. Central cerrado sin modificaciones ni capturas/gates repetidos. Sin backend/servicios/deps/commits/push.

## Dos P2 de relectura — delta focal READY, pendiente de Build/píxeles
Base informada por Build:7unit focal PASS, tipos/lint/build0; central1440 y390 PASS,15PNG por ancho, overflowfalse, foto real1, historia200/frozen, POST1/PCwrites0/cleanup. Seguridad presentación aceptada localmente. Relectura independiente11PNG cerró fotos/clipping móvil/jerarquía, pero NO cierre sin reservas: cobertura390 parte palabras y faltantes57/117 repiten tres bullets neutros.

Corrección1 sólo CSS central: cobertura dt con wrap por espacios normal, sin word-break/hyphens; en <=700px dl apila etiqueta completa y valor en una columna minmax(0,1fr), dd conserva wrap de códigos y separación. No acortar etiquetas, ellipsis, clipping ni cambiar nombres accesibles. Desktop mantiene dos columnas. Causa de esta reserva: columna de etiqueta comprimida más overflow-wrap:anywhere heredado; no overflow documental.

Corrección2: helper puro `pendingGroups` en lib/central-presentation. Usa únicamente traducciones cerradas ya existentes con Object.hasOwn y patrón exacto de oferta por etapa; no agrega supuestos de presencia/ausencia ni hechos de engine. Agrupa textos reconocidos por orden de primera aparición, suma duplicados, muestra máximo3 grupos distintos con conteo de entradas. `remainingCount = total - suma(conteos visibles)` incluye unknowns y grupos reconocidos omitidos; una sola nota «Otros N datos o condiciones requieren revisión; consultá el detalle técnico». `unknownCount` separado para comprobar contabilidad. Null/false/0/arrays/objetos no se descartan ni se convierten a positivos. Detalle avanzado sigue con TODAS las entradas originales, traducción individual y JSON completo escapado, sin deduplicar RAW.

Archivos delta: `lib/central-presentation.ts`, `components/central-decision.tsx`, `app/globals.css`, `tests/unit/central-decision.test.tsx` y este checkpoint. Test focal ahora10 casos (3 nuevos: agrupación/conteos/cap3; SSR una nota+duplicados; unknown JSON escapado). NO ejecutados por escritor. Sin cambios fixture/helper imagen/capture, API, decisiones/costes/fechas/META/editor/nav. Selectores visuales y semánticos intactos.

Build desde frontend:
```powershell
node .\node_modules\vitest\vitest.mjs run tests/unit/central-decision.test.tsx
npm run typecheck
npm run lint
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.central38.config.ts integral38-central.spec.ts --grep "@central38"
```
Sólo tras checks0, nuevas capturas1440/390 justificadas por PendingFields compartido, directorios timestamp nuevos, referencias previas intactas. No repetir suites funcionales/Groq/MCP ni reprepare por este delta sin cambios de ciclo. Relectura independiente obligatoria: móvil02c muestra «Comprobaciones necesarias» íntegro y valores; desktop02/04 y móvil04 una sola nota de restantes, conteo total íntegro y RAW accesible. Cierre visual todavía PENDIENTE de esas dos P2; escritor no afirma haber visto PNGs nuevos. Si falla, corrección sólo diagnosticada y escalada sin retries cíclicos.

## Corrección focal de contrato JSON en presentación — pendiente de Build
Build informó28unit/4files PASS0 y lint0; typecheck FAIL TS2322 en tower-evaluation-view: PendingFields aceptaba string[] aunque el contrato existente admite JsonValue[]. No build ni capturas nuevas ejecutadas. Causa: estrechamiento indebido en el consumidor de presentación, NO defecto/backend ni autorización de cambiar TowerEvaluation.

Corregido sólo `components/central-decision.tsx`: PendingFields acepta readonly JsonValue[] importado de lib/compatibility; únicamente strings pasan al mapa cerrado. Null/false/0/arrays/objetos cuentan como entradas pendientes y reciben resumen neutral, sin convertirlos a ausencia/cero compatible. Avanzado conserva JSON completo mediante JSON.stringify + texto React escapado en pre/code; no casts, filtros, coerción [object Object], dangerouslySetInnerHTML ni import circular de EvidenceValue.

Test focal añadido a `tests/unit/central-decision.test.tsx`:6 valores con null/false/0/objeto anidado/sentinel script/array/string conocido, count íntegro, escape seguro, JSON conservado y traducción string preservada. Archivo ahora7 casos, NO ejecutados por escritor. Fixture/helper imagen/capture/env/backend intactos. No aceptación visual ni build aprobado por este parche.

Build: repetir sólo unit central-decision, tipos/lint y build; si todo0, ambas capturas centrales en directorios nuevos e inspección independiente de píxeles. Comandos desde frontend:
```powershell
node .\node_modules\vitest\vitest.mjs run tests/unit/central-decision.test.tsx
npm run typecheck
npm run lint
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.central38.config.ts integral38-central.spec.ts --grep "@central38"
```
No repetir28unit ni Groq/MCP/suites completas. Una corrección diagnosticada aplicada; si persiste fallo, escalar evidencia precisa al coordinador en lugar de retries cíclicos.

## Bloque visual central — intención ANTES de producto
Build confirmó transporte1440 PASS7.2s,15PNG, foto real TUF5070 cargada, historia200/frozen PASSED, CONNECT externo0/POST plan1/PCwrites0/cleanup completo. No corrección productiva de fotos necesaria. Fixture/helper/capture congelados para revisión de seguridad; no nuevos selectors ni modificaciones de transporte en este bloque.

Dirección: banco de trabajo de hardware, no landing ni dashboard decorativo. Base grafito #101419, superficies #181f28, divisores #354252, texto #f4f7fb, azul de interacción #5b94ff, ámbar de pendiente #f4d698. Segoe UI local para recorrido central; títulos compactos, números monetarios con mayor peso, texto auxiliar discreto pero contrastado. Sin fuentes remotas, animaciones ni nuevas dependencias.

Composición alineada a izquierda: inventario compacto de nueve categorías (3 columnas desktop/1 móvil) → contexto y comprobación a un lado / objetivo y propuestas al otro en desktop → editor con etapas en dos columnas → snapshot con estado/presupuesto/subtotal/total prioritarios y etapas separadas. Móvil sigue orden DOM, sin sticky footer ni columnas comprimidas. No convertir todos los avisos en tarjetas idénticas: configuración dividida por filas, coste sobre fondo oscuro, advertencia con borde ámbar. El gesto propio es inventario + mesa de decisiones, no otra capa de colores.

Causa estática identificada para corregir: `.stack`/`.stack-sm` generan tracks auto cuyo mínimo intrínseco crece con códigos/evidencia; EvidenceValue aplica break-words (no reduce min-content), y la cadena anidada de grids amplifica el ancho al abrir cobertura. Los fieldsets del editor también usan grid auto, y checkbox inline sin columna propia queda expuesto a ese ancho. Solución dirigida al central: minmax(0,1fr), min-width0 de hijos, overflow-wrap:anywhere para evidencia/códigos, pre con pre-wrap, checkbox en grid20px+minmax(0,1fr). Sin body overflow hidden ni recortes ni cambios a EvidenceValue histórico compartido. Diagnóstico definitivo móvil pendiente de nueva geometría/PNG390.

Presentación española por diccionarios cerrados y patrón exacto stage.offer:unidentified_component; unknown conserva advertencia genérica y RAW íntegro en detalles, no infiere motivo/compatibilidad. Beneficio explicado por workload conocido, label original en avanzado; sin scores calculados ni FPS. Mantener cobertura/fallos/faltantes visibles con conteos y todo valor técnico, fuentes, condiciones y versiones accesibles. Plan privado conserva fechas/vencimiento histórico, sin recotización. Tests nuevos de helpers/SSR; nombres semánticos de captura y ciclo writer/confirmación/reprepare sin cambios. Build ejecutará gates focales y nuevas capturas1440/390, revisión independiente de píxeles obligatoria. Esto es intención, no aprobación visual.

### Producto preparado — READY, sin ejecución ni aprobación visual
Archivos de producto: `app/pcs/pcs.tsx`, `app/pcs/tower-recommendation-view.tsx`, `app/pcs/tower-evaluation-view.tsx`, `components/tower-plan-view.tsx`, `components/tower-plan-editor.tsx`, `app/globals.css`; nuevos `lib/central-presentation.ts`, `components/central-decision.tsx`, `components/tower-inventory.tsx`. Test nuevo `tests/unit/central-decision.test.tsx` (helpers/SSR:6 casos). Fixtures/helper imagen/capture/config congelados sin editar. Sin cambio nav, landing, cuenta, legacy, API, motor/datos ni lifecycle de writer/META.

Composición final de este delta: inventario9categorías junto a contexto/comprobación desktop; propuestas y editor ocupan después todo el ancho, con decisión/coste y etapas en dos columnas. Se evitó encajonar etapas/propuestas dentro de una barra derecha estrecha. Móvil una columna sin reordenar DOM. Fotos exactas de propuesta128px/96px móvil; demo48px sin préstamos. Plan prioriza estado/presupuesto/total incompleto/subtotal conocido y revisión PC/catálogo; quotes/expiry/historia intactos. Encabezado conserva limitación de servidor/no certificación. Faltantes: conteo y primeras3 explicaciones visibles, todos los códigos y explicaciones accesibles en detalle; incompatibilidades conocidas y cobertura permanecen explícitas, sin reducir inventario/estados/reglas.

Selectors de captura: NINGUNO cambiado; mismos aria-label de regiones/forms/stages, textos de consent/save/history, títulos y summaries de cotizaciones/cobertura. Sólo wrappers/clases/labels de acción/beneficio/faltantes modificados. El test central debe seguir sin parche. Rootcause de transporte ya cerrado por Build, no atribuirlo al producto. Corrección de sizing estática implementada, cierre overflow390 pendiente de navegador real; no se afirma inspección de PNGs denegados.

Build, secuencial, desde frontend (no ejecutar suites/provider rutinarios):
```powershell
npm run typecheck
npm run lint
node .\node_modules\vitest\vitest.mjs run tests/unit/central-decision.test.tsx tests/unit/tower-recommendations.test.tsx tests/unit/tower-compatibility.test.tsx tests/unit/tower-plans.test.tsx
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.central38.config.ts integral38-central.spec.ts --grep "@central38"
node .\node_modules\@playwright\test\cli.js test tests/e2e/tower-plans38.spec.ts --grep "@tower07-reprepare"
```
Reprepare focal justificado por wrappers del editor; no whole@tower07. Central1440/390 verifica flujo real explícito201, lectura frozen, foto real y overflow, nuevas carpetas timestamp-only preservando todas las anteriores. No repetir revisión de seguridad imagen por este delta productivo; esperar su resultado independiente. Códigos nuevos de checks: NO ejecutados por escritor. Si gate focal falla, una corrección diagnosticada y escalar si persiste, sin retries cíclicos. Próximo: Build resultados y revisión independiente de píxeles1440/390 antes de aceptar visualmente.

## Transporte opt-in de evidencia y lazy photos — READY para Build
Diagnóstico confirmado por Build1440: history GET200, comparación frozen PASSED, fallo en history-settle-photos;12 ERR_TUNNEL_CONNECTION_FAILED Compra Gamer y12 rechazos CONNECT de fixture. No defecto de producto demostrado. Corrección focal: helper `tests/support/image-evidence-policy.ts`, fixture `newImageEvidenceContext` en fixtures existente, tests puros `tests/unit/image-evidence-policy.test.ts` y consumidor central. Proxy/socket handler, context y newIsolatedContext existentes sin cambios de comportamiento; sólo captura central usa nueva fixture.

Contexto NUEVO sin storage/extraheaders heredados, serviceWorkers block, TLS normal, routing global antes de páginas. Bypass literal `imagenes.compragamer.com,venex.com.ar,www.venex.com.ar,<-loopback>`: app sigue proxy/socket/HMAC. AppOrigin continúa sin modificaciones; externo sólo GET image HTTPS443 validado con vendorImageURL y sin query/fragment/credenciales. Host normalizado por URL (mayúsculas aceptadas), otros hosts/puertos/IP/recursos/métodos bloqueados. Headers externos sin Authorization/Referer/x-uj/CSRF. Cookie/Host no son sobrescrituras válidas: no se afirma aislamiento por headers; contexto vacío y scoping navegador, sin cookies privadas añadidas a vendors. Cookies públicas que coloque vendor no equivalen a sesión app.

Reserva explícita aceptada: aislamiento por HOST después de redirects, NO garantía de reinspección de cada FULL URL redirigida. Headers continue se propagan en redirects según documentación verificada por Build. Destinos fuera de tres hosts siguen bloqueados por proxy. Sin abrir CONNECT, downloader, request replay, mock, proveedor nuevo o política pública ampliada.

settlePhotos ahora desplaza naturalmente la primera foto presentada de cada sección y espera sólo esa foto dentro del viewport: complete + naturalWidth>0 o placeholder real del renderer. No muta loading/DOM/URL ni espera todos los lazy img offscreen del historial. Subfases, comparación frozen, sanitización y telemetry siguen. Al final, antes de layout, exige external CONNECT rejections0 y propuesta retail photos_loaded>0; demoP01/P06 puede seguir con placeholder honesto. Un fallo de layout ya conocido sigue siendo fallo, no aceptación visual. Evidencia anterior inmutable; nuevos directorios exclusivos.

Build único runner, desde frontend, foco de transporte/historia1440:
```powershell
npm run typecheck
npm run lint
node .\node_modules\vitest\vitest.mjs run tests/unit/image-evidence-policy.test.ts tests/unit/socket-proxy.test.ts
node .\node_modules\@playwright\test\cli.js test --config=playwright.central38.config.ts integral38-central.spec.ts --grep "@central38.*1440"
```
No ejecutados por escritor, no códigos de salida nuevos. Config central ya hereda ambos servidores reales/cache local y no cambió. Sólo tests/helper/doc: no rebuild producto por este delta salvo cambios ajenos que Build deba considerar. Si transporte/historia falla, escalar causa focal sin retries cíclicos ni aumento de30s. Tras demostrar fotos/historia, bloque visual central ya autorizado; no iniciar layout antes de ese resultado.

## Inspección real central NO aprobada — bloque diagnóstico coherente antes de producto
Revisión de12 PNG transmitida por coordinación:390 overflowfalse hasta02b, true desde02c hasta04 y checkbox03e recortado; desktop no overflow. Propuesta con evidencia visual publicada queda sin foto en ambas (0loaded/1placeholder); demoP01/P06 sin recurso puede ser legítima. Raw códigos/benefit inglés/acciones técnicas no cumplen UI de decisión en español. Esta evidencia autoriza siguiente bloque central, no landing/account/legacy.

Skill frontend-design cargada de nuevo y CSS pertinente leído. Sospecha estática a medir, NO causa demostrada: grid `.stack` sin minmax explícito combinado con hijos/evidencia `break-words` puede mantener mínimos intrínsecos de tokens al abrir cobertura; no usar overflow-x:hidden ni cortar códigos para ocultarlo. El test ahora registra únicamente geometría/classes/computed min_width/white_space/overflow_wrap de12 nodos desbordados, sin textos/valores/IDs. Esto preserva evidencia del fallo antes de cualquier cambio de layout que pueda confundir el diagnóstico de historia.

Bloque de captura ya coherente: subfases y errores sanitizados de historia (sin mensaje/stack/DTO),99failure viewport de plan propio y eventos imagen de hosts/raster ya permitidos (requested/finished/failed/status; fallo sólo código net allowlisted). Metadatos se observan de las respuestas GET-ID REALES ya hechas por la app: nombre de producto público + booleans de evidencia/variante/bytes/política/coincidencia, nunca URLs/sourcebody ni peticiones adicionales. Cuenta también rechazos CONNECT del transporte fixture. Fuente del socket-proxy previamente leída permite sólo appOrigin y rechaza CONNECT: posible impedimento de transporte para TODAS las fotos HTTPS externas, no evidencia de bug retail. Confirmar con eventos antes de atribuir fallo; no alterar fixture/TLS/URL ni sustituir variante.

READY diagnóstico / NEEDS-DIAGNOSTIC causa histórica / NEED-BLOCK fotos si se confirma restricción de transporte. Una sola ejecución1440 (comando del bloque siguiente), no ambas anchuras ni suites aprobadas. Producto/CSS/labels aún intactos deliberadamente para reproducir el tramo post04 con el mismo flujo. Luego bloque visual propio: PC compacta9categorías/cantidades/unknown explícitos; columnas desktop y pila móvil con min-width0/wrap dirigido medido; nombres españoles cerrados para acciones/faltantes conocidos y etiqueta de beneficio curado, RAW completo en avanzado; plan bloqueado/presupuesto/subtotal/total desconocido jerárquicos y cotización histórica sin refrescar. No transformaciones de engine/precios/unknown. Nuevos PNG posteriores sólo en directorios nuevos y relectura independiente; ningún gate visual aprobado por preparar esto.

## Diagnóstico gate de captura: historial, causa todavía NO determinada
Build reportó type/lint0 y dos journeys1440/390 fallidos a10.4/10.5s, ambos con13 PNG incluidos04-plan-guardado-snapshot,81rejected/0recommended, plan_posts1/PCwrites0/cleanup completo. La fase capture-saved-plan abarcaba no sólo fill/click/GET/comparación sino también await-region y espera de META/fotos, así que el índice anterior no localiza causa. No se atribuye aún defecto al producto/TTL/locator/transporte. Lectura exacta autorizada de PNG1440 devolvió Permission denied; no se reintentó por otra vía. Build puede mostrar ese PNG para inspección permitida.

Sólo test de captura modificado: subfases antes de fill, comprobación de valor1, registro de observer, click, esperaHTTP, status, JSON, comparación, region, META y fotos; luego captura/quotes. Catch sólo conserva error_class allowlisted, known_code allowlisted y matcher allowlisted, nunca message/stack/actual/expected/body/UUID/email/tokens. Índice añade conteo GET historia, respuesta vista y status numérico. Si vuelve a fallar en historia,99-diagnostic-history-failure.png guarda el viewport real únicamente si sigue en la ruta/origen del plan de esta cuenta sintética, antes de cerrar contexto; no CSS/mascarado ni baseline regenerada. Directorios previos inmutables, nuevos wx y journey incomplete conservados. Observer pendiente sin rechazo tardío no manejado; aserción principal sigue esperando respuesta real, sin mocks/retries/timeouts ampliados.

NEEDS-DIAGNOSTIC: Build ejecutar SÓLO1440, no repetir390/Groq/META/@tower07 ya aprobados:
```powershell
npm run typecheck
npm run lint
node .\node_modules\@playwright\test\cli.js test --config=playwright.central38.config.ts integral38-central.spec.ts --grep "@central38.*1440"
```
Escritor no ejecutó. Esperar nueva subfase/clase/matcher/código/status antes de corrección diagnosticada; si no alcanza, escalar sin ciclos. Photos_loaded0/placeholder1 informado es fallback honesto, NO aprobación de fotos reales ni cierre visual. Producto/config/loader/historial sin cambios.

## Preparación gate visual central REAL — antes del runner
CU07 consumidor local/3P2 aceptados según ambos reviewers y Build8unit/tipos/lint/build0 + nuevo browserrepreparePASS; no certificación física. Este incremento SÓLO prepara captura/config focal, sin rediseño ni cambios de producto. Inspección independiente debe ver los PNG reales después de ejecutar Build, no código ni el control sintético META.

Dos tests `@central38` aislados con transporte/browser fixture real y login sintético propio:1440×900 y390×844. PC guardada P01/P06/resto unknown, objetivo gaming/presupuesto pequeño, propuesta REAL del servidor (rejected/borrador, no recomendación verde), fotos según allowlist existente o fallback honesto, META resuelto. Preparar dos etapas (segunda storage declarada y cantidad explícita1, material sin confirmar), capturar editor antes de guardar, confirmación201 y lectura congelada real sin recálculo. Sin Groq, cuenta personal, interceptación de red/respuestas, SDK o TLS flags.

Evidencia en `.local/integral38/central-final-{width}/<timestamp-uuid>/` (subdirectorio nuevo/exclusivo, nunca sobrescribir referencias). PNGs viewport y secciones acotadas: PC/criterios separados si la altura real lo exige; primera propuesta con quote/faltantes en detalle; etapas del editor y confirmación antes de save; resumen guardado/histórico. No fullpage gigante de81 propuestas ni expansión de todas las reglas/JSON. Índice JSON sólo viewport/nombres de archivo/counts/status agregados/versión de referencia; sin emails/PC UUID/notes/cookies/tokens/raw DTO. No ocultar contenido por CSS para embellecer; scroll/foco nativos verificables y overflow visible como hallazgo de gate, no corregir UI antes de inspección.

Config focal nueva heredará objeto portable integral38 (evidence dir, ambos webServers reales, cache browser existente) y sólo seleccionará central spec. Tests conservan30s por journey, sin aumento ciego. Cleanup específico de plan/PC propios con try/finally; no borrado amplio ni promesa de borrar físicamente historial privado de plan. Build único runner; capturas y revisión/píxeles todavía PENDIENTES, no aceptación visual por este plan.

Preparado: `tests/evidence/integral38-central.spec.ts`, dos tests `@central38` (1440/390), y `playwright.central38.config.ts`. Config original de entrada intacta; no producto/estilos cambiados. Capturas PNG viewport15 pasos acotados por ancho (PC/criterios/CTA; propuesta/quote/cobertura/límites; borrador/etapas/consentimiento; snapshot/historia/quotes). Las imágenes remotas terminan o usan fallback real del renderer: no cambiar transporte/TLS ni forzar descarga para ocultar un límite. Índice nuevo incluye counts de fotos/placeholder, estado META/plan y overflow por captura; jamás DTO privado ni IDs de entidades. Falla de layout se declara DESPUÉS de guardar evidencia, no se corrige producto dentro del test. Comparaciones profundas booleanas no imprimen snapshots/notes si fallan.

Build, desde frontend (escritor NO ejecutó):
```powershell
npm run typecheck
npm run lint
node .\node_modules\@playwright\test\cli.js test --config=playwright.central38.config.ts integral38-central.spec.ts --grep "@central38"
```
Build de producto anterior válido porque sólo se añadieron captura/config/doc; si el checkout tiene otros cambios, Build decide recompilación pertinente. Salidas nuevas `.local/integral38/central-final-1440/<timestamp-uuid>/` y `central-final-390/<timestamp-uuid>/` con PNGs e `index.json`, runner en `.local/integral38/central-runner/`. Sin proveedor/Groq ni control sintético, sin repetir suites aprobadas. Próximo: Build genera evidencia real y revisión independiente INSPECCIONA píxeles antes de cualquier rediseño/resto38. Este checkpoint no acredita captura realizada ni aprobación visual.

## Tercer P2 CU07: preparación explícita repetida (antes del patch)
Revisión funcional confirmó que key sólo id/revisión de plan mantiene useState(seed) antiguo al preparar de nuevo con PC/catálogo frescos: puede mezclar pc nuevo con draft/revisión/materiales/consentimiento viejos. Corrección acotada adicional autorizada: contador local monotónico por preparación EXITOSA; publicar `{draft,pc,preparation}` atómicamente tras ambos GET y generación válida, key incluye preparation. Falla de red/normalización preserva editor anterior completo. Texto de acción advierte que un NUEVO borrador reemplaza el no guardado. Remount sólo por preparación explícita, no renders aleatorios/useEffect que pisotee cambios. Nuevo test real `@tower07-reprepare` prepara, modifica sólo su PC sintética por API, prepara otra vez y observa revision nueva/materiales/consentimiento vacíos antes del POST explícito. Sin Groq/timeouts aumentados; sigue pendiente gate/relectura de los TRES P2, no aceptación final.

### Tres P2: patch listo para gate focal, NO ejecutado por escritor
- Baja: formulario real extraído `components/tower-plan-deactivation.tsx`, copy de baja lógica/historial conservado y privado, checkbox required sin default checked, CAS sin cambios. SSR `tests/unit/tower-plan-deactivation.test.tsx` cubre texto/confirmación/busy; caso central existente agrega comprobación DOM del label y cancelación, preparado pero no requiere rerun rutinario de todo@tower07.
- UUID: `lib/tower-plans-proxy.ts` regex lowercase LOCAL y rama towerPlanRoot de `lib/gateway.ts` lowercase. Sin normalize/toLowerCase ni cambio de towerUUID compartida/otros CU. Fixture canónica corregida a lower; GETitem/DELETE/POSTrecalculate/GEThistory con uppercase devuelven422 antes de fetch y signer null. Bounds/query/método/rawpath/int32 permanecen iguales.
- Reprepare: `workspace.tsx` guarda preparación monotónica junto a draft+pc y la incluye en key de editor. Ambos GET y normalizador completan antes del único setEdit; fallo mantiene la pareja vieja. Cada preparación exitosa remonta draft/materiales/consentimiento/controller idempotente. Nuevo@tower07-reprepare en `tests/e2e/tower-plans38.spec.ts`: plan/PC propios reales con declarados sin evidencia; primer borrador editado/materiales+consentimientos marcados, PUT explícito de esa PC, segunda preparación limpia ambos y envía expected_pc_revision nueva sólo después de consentimiento nuevo. Verifica única escritura PC intencional del test y cero autoguardado; limpieza sólo de sus IDs.

Build desde frontend, comandos separados:
```powershell
.\node_modules\.bin\vitest.cmd run tests/unit/tower-plan-deactivation.test.tsx tests/unit/tower-plans-proxy.test.ts
npm run typecheck
npm run lint
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.config.ts tower-plans38.spec.ts --grep "@tower07-reprepare"
```
Pendientes nuevos resultados/relectura focal general y seguridad. No repetir whole@tower07/Groq/META por rutina, sin fotografías/capturas ni features adicionales. Historial conservado no se vuelve público y no se inventó restauración. No se tocó el cleanup de holder estable ya aprobado. Código de esta corrección todavía no demuestra un gate ni aceptación final.

## CU07 dos P2 de seguridad — causas y corrección semántica aceptada (previo al patch)
Estado recibido: último gate focal8unit/tipos/lint/build0 y browser@tower07PASS; no equivale a25full ni aceptación frontend final. Relectura de seguridad detectó dos P2: (1) copy prometía borrar plan/historial definitivamente aunque DELETE hace baja lógica y conserva historial privado; (2) proxy/gateway de tower-plans permitían UUIDuppercase pese al contrato backend sólo lowercase. No se borra la evidencia previa del fallo line_id ni se declara cerrado este delta antes de Build/relectura.

Corrección acotada autorizada: copy «Dar de baja el plan», aviso «El historial se conserva; no es borrado físico», checkbox requerido/CAS conservados, sin promesa de supresión/restore ni acceso público. Extraer formulario de confirmación para prueba SSR del renderer real. Rutas PLAN: regex local lowercase en proxy y rama específica gateway, rechazo explícito antes de firma/fetch, sin toLowerCase ni normalización silenciosa. Otras rutas/towerUUID compartida intactas; método/path literales y revisiones/int32 resueltos por backend como antes. Guía Next local Route Handlers consultada antes de editar. Sin runners/SDK/backend/deps/commits ni nuevas features; visual central pendiente aceptación.

## CU07 delta focal: canonical omission / cleanup / diagnóstico
Build previo: tipos/build0, unit25PASS, lint0errores/1warning; browser@tower07 falló antes de POST con mensaje del validador line_id. Lectura focal confirma rechazo `item.line_id !== null` para replace_category/add_line aunque el serializador canónico omita None. Reproducción unitaria añadida sin inventar datos reales; la presencia de campos de la respuesta real se anotará como booleans action/category en el próximo browser, sin IDs privados, cookies ni contexto/credenciales. No se afirma lectura de un payload privado no disponible.

Corregido lector/normalizador: CanonicalPlanAction permite omisión en entrada de lectura; salida de acción no dirigida lleva null explícito. PlanStageRead y preparación de recálculo consumen ese mismo lector. Replace/remove_line siguen requiriendo stringUUID; null/undefined/inválido se rechazan. XOR, cantidad explícita, RAM whole y BIOS null/explícita sin herencia intactos. Tests cubren omisión realJSON hacia create/recalculate y origen inmutable.

Workspace usa ref a holder estable `{active,generation}`, nunca reasignado: cleanup captura holder, incrementa generación y aborta controlador inicial Y el último activo. Asíncronos antiguos no limpian busy de la nueva carga; StrictMode cleanup/setup mantiene tickets distintos. Sin lint-disable ni captura obsoleta de sólo un controlador.

Browser ahora observa POST real con diagnóstico de contador/alerta local acotado al expect.poll existente (sin subir5s/30s). No queda esperando una respuesta inexistente hasta timeout total si falla validador. Luego sí espera respuesta real; sin interceptar proveedor/precios ni ocultar mutaciones. Cleanup sigue acotado a plan/PC de esta invocación. No se intentó borrar la posible PC sintética de la corrida anterior: faltan sus referencias verificadas y no hay permiso de borrado amplio.

Archivos: `lib/tower-plans.ts`, `app/tower-plans/workspace.tsx`, `tests/unit/tower-plans.test.tsx`, `tests/e2e/tower-plans38.spec.ts`, este checkpoint. Guía Next local use-client consultada antes del delta. NO runners ejecutados por escritor. Build focal desde frontend:
```powershell
.\node_modules\.bin\vitest.cmd run tests/unit/tower-plans.test.tsx
npm run typecheck
npm run lint
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.config.ts tower-plans38.spec.ts --grep "@tower07"
```
No repetir Groq/META/Google aprobados. Una corrección diagnosticada preparada; si persiste el fallo, escalar evidencia, no retry/correcciones cíclicos. Pendiente gate/relectura CU07 y visual central, sin nuevas funciones/capturas/commits.

## CU07 contrato completo recibido — antes de implementación
Create exacto `{kind:'tower_plan',schema_version:2,client_request_id:UUID,name,pc_id:UUID,expected_pc_revision:int>=1,expected_catalog_version:string1..200trim/noNUL,objective,workload:null|'blender-cpu',budget_ars:decimalstring>0dosdecimales,price_condition,stages:[{name,budget_ars,materials:TowerMaterial[],actions:TowerAction[]} ]}`. Workload no null sólo productividad.1..12 etapas,1..36 acciones/etapa,<=96 total; materiales0..1 por etapa, sólo confirmación explícita, sin arrastre automático a siguiente etapa. Recalculate POST `/{id}/recalculate` mismo cuerpo completo +expected_plan_revision; nueva UUID por operación distinta, misma UUID/cuerpo sólo retry explícito de operación incierta. DELETE CAS `{expected_plan_revision}`. Nombre limpio/trim/requerido sin inventar mínimo. Catálogo esperado explícito, ningún owner cliente.

List `{kind,schema_version,items,total,page,page_size}`; read `{kind,schema_version,id,name,revision,pc_id:null|UUID,created_at,updated_at,snapshot}`. Historial GET `/{id}/revisions/{revision}`. Snapshot `{kind,schema_version,name,generated_at,pc_revision,base_configuration:Tower,objective,workload,budget_ars,currency:'ARS',price_condition,versions:{catalog,rules,policy,inventory,scope,references,identity,calculation},stages,cost,benefit,status:'blocked'|'ready'|'requires_verification',label,missing_fields,limitations}`. StageRead `{position,name,budget_ars,actions,materials,evaluated_configuration,evaluation,benefit,dependencies,offers,cost,cumulative_cost,status,missing_fields,warnings}`. Reusar shapes exactos Cost/Benefit/Dependencies/Offer de CU06, sin sumas/beneficios ni decisiones de compatibilidad locales.

Guardado nunca aplica la PC. GET/historia no recotizan ni recalculan TTL; ofertas congeladas con fecha/vencimiento original y aviso de no vigencia/reserva. Fotos/nombres sólo si guard público de catálogo coincide con snapshot.versions.catalog, reutilizando META; si cambió, IDs/fallback sin variante actual atribuida a historia. Status ready sólo servidor y alcance explícito, sin certificado físico ni verde por datos parciales. Sin API/share CTA ficticio ni nuevas herramientas MCP.

Plan de incremento: tipos/payload cerrado + BFF37 (262144bytes/5s, upstream15s) → borrador desde propuesta/actions explícitas → editor de etapas con candidatas sin cantidad1 inferida/RAM conjunto/BIOS limpio → save idempotente/cuerpo retenido y CAS → detalle/historial congelados con recálculo explícito.409 conserva input, no autoGET+save. Modificación de input invalida operation UUID/cuerpo anterior; retry incierto sólo explícito con cuerpo congelado original. Tests unitarios y browser propio `@tower07` sin Groq; gate visual1440/390/revisión independiente siguiente, no afirmado por tests. No lectores privados/runners/deps/backend/commits/delegación.

### CU07 consumidor implementado para gate Build (sin ejecución)
Tipos Create/Recalculate/Read/Snapshot/Stage y aliases exactos de coste/beneficio/dependencias/materiales CU06, sin duplicar sus shapes ni inventar cálculos. Acciones se proyectan cerradas; cantidades nuevas desconocidas y explícitas, RAM whole, BIOSnull al reemplazar/editar identidad de placa. Etapas se agregan/reordenan/retiran con claves UI locales no enviadas; ninguna etapa nueva hereda materiales. Recálculo exige reconfirmar materiales por etapa.

Propuesta central → «Preparar plan por etapas (no guardar)» incluso rejected/partial con aviso de borrador no apto para compra → editor → confirmación explícita de guardado. Otra preparación se bloquea mientras ese borrador está abierto para no descartar silenciosamente una operación incierta. El controller retiene UUID+JSON exactos sólo durante la pantalla; retry manual repite ambos. Editar invalida pareja previa y advierte si pudo persistir.409/422 no limpian borrador ni recargan/guardan automáticamente. Cancelación/unmount ignora tardías, no afirma rollback. Operación incierta tras abandonar pantalla requiere revisar planes antes de crear otra. Replay200 se reconoce sin inventar nombre de header no retransmitido.

`/tower-plans` y `/tower-plans/[id]`: lista paginada privada, detalle congelado, consulta de revisión explícita, recálculo con PC/catálogo actuales sólo bajo acción nominal y POSTCAS posterior; borrado con revisión y checkbox. GET/historia no reprecian. Vista estructurada por etapas/coste acumulado/beneficio/fuentes/cobertura, no JSON-blob. Ofertas muestran status original, fechas, stock no reservado y advertencia actual de vencimiento sin modificar snapshot. META existente sólo para nombres/fotos de etapas abiertas, guard por versión guardada y cap4/contexto; mismatch conserva IDs, nunca variante actual por quote vieja. Base/notes son de propietario, no se comparten.

Archivos nuevos: `lib/tower-plans.ts`, `lib/tower-plans-proxy.ts`, cuatro handlers `app/api/tower-plans/**/route.ts`, `components/tower-plan-{action-editor,editor,view}.tsx`, `app/tower-plans/{page,workspace}.tsx` y `[id]/page.tsx`, `tests/unit/tower-plans.test.tsx`, `tower-plans-proxy.test.ts`, `tests/e2e/tower-plans38.spec.ts`. Cambios focales: gateway, integración de propuestas/PC, export de renderers fuente/META ya existentes y CSS de workbench. Legacy `/api/plans` intacta, sin SDK/auth/provider/MCP/CU09.

Build desde frontend, comandos separados; escritor NO ejecutó:
```powershell
npm run typecheck
npm run lint
.\node_modules\.bin\vitest.cmd run tests/unit/tower-plans.test.tsx tests/unit/tower-plans-proxy.test.ts tests/unit/tower-recommendations.test.tsx tests/unit/gateway.test.ts
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.config.ts tower-plans38.spec.ts --grep "@tower07"
```
Preparado browser contra PG/API reales: PC propia P01/P06 con resto desconocido, propuesta real gaming, agregar etapa declarada con cantidad vacía→explícita/materiales sin default, save201 una vez, PC unchanged, recálculo200 nueva revisión y GET histórica snapshot original idéntico, cleanup propio plan CAS y PC. Ningún Groq/fake positivo; no timeout aumentado. Unitarios cubren decimales estrictos/revisiones/limits/XOR/BIOS/RAM/cuerpo cerrado, UUID/cuerpo retry, edición tras incierto,409, aborto, historial sin recotizar y BFF body/firma/queries/métodos. Aún NO comprobados ni frontend aceptado por este incremento. Próximo tras gates: lectura independiente y recorrido/capturas1440/390 central real; no repetir Groq/META aprobados por rutina ni declarar cierre38.

## CU07 torre — preguntas de contrato ANTES de implementar
Autorizado sólo este checkpoint/preguntas hasta retransmisión nested DTO por Build. No implementación ni lectura de contrato privado/denegado. Control sintético META cerrado según Build1PASS y relectura; no repetir Groq/META real ni presentar ese control como evidencia visual.

Recibido: API nueva `/api/tower-plans`, legacy `/api/plans` intacta. TowerPlanRead `{kind:'tower_plan',schema_version:2,id,name,revision,pc_id:null|UUID,created_at,updated_at,snapshot:dict}`; listado `{items,total,page,page_size}`; historial GET `/{id}/revisions/{revision}`; creación/recalcular POST; borrado CAS `{expected_plan_revision}`. Ownership/CSRF/HMAC servidor, lector262144/5s, snapshot máximo1MiB. Listado bounds10000/50; revisión hasta9 dígitos en ruta, servidor404 por exceso int32 después de ownership. Crear usa client_request_id UUID ligado a cuerpo; replay200/header true frente a201. GET/historial no recotizan ni reinterpretan TTL; recálculo propio CAS crea revisión. Guardar jamás aplica cambios a PC. Preview no positivo sigue borrador/requiere verificación, sin compra/compatibilidad ficticia.

### DTO pendiente de retransmitir
1. Rutas y métodos exactos: colección/create, detalle/update si existe, recalculate (identificador/segmento y cuerpo), history/listado de revisiones si existe; respuesta exacta del GET de revisión y DELETE. Nombre exacto del header de replay y en qué respuestas aparece. Confirmar nombre de query paginada y forma de cada item (TowerPlanRead o resumen).
2. Create: todas las claves/tipos/nullabilidad/defaults y extras rechazados; expected_pc_revision, pc_id nullable, nombre, objective/budget/price_condition/workload/materials, origen de propuesta (actions o key/preview completo/otro vínculo), client_request_id y cualquier confirmación requerida. Cuándo conservar/regenerar idempotency UUID tras editar,409/422, timeout o replay; qué se compara como mismo cuerpo.
3. Recalculate: payload exacto de CAS/idempotencia si aplica, expected_pc_revision, edición de etapas/cambio de PC/objetivo/presupuesto/materiales; si reemplaza completo o usa parches. Semántica de conflicto409 y diferencias con crear nueva planificación. Sin inventar PUT ni compatibilidad legacy.
4. snapshot: estructura completa, claves y tipos del contexto/PC base normalizado, revisiones/versiones/alcance, objetivo/budget/condición/workload y materiales; estado global, faltantes/limitations y coste/beneficio global. Identificador de snapshot y relación con PC vigente, si existen.
5. Etapas: identificación/orden, nombre, actions TowerAction canónicas, evaluaciones antes/después/acumuladas, pc_revision significado, gasto por etapa/acumulado/restante (null vs0), dependencias, materiales disponibles/consumidos/reutilizables, ofertas/quotes/caducidad/precios históricos, beneficio/metric references y estados. Qué se envía editable frente a qué devuelve sólo servidor; límites de etapas/acciones/cantidades y validación de presupuesto por etapa/global. RAM conjunto completo y limpieza BIOS al cambiar identificación, sin cantidad1 inferida.
6. Snapshot de nombre/foto/variante: campos de evidencia congelada si existen y fallback aceptado. No reutilizar GET-ID actual como si fuera metadata histórica; si no hay media snapshot/version guard demostrable, conservar IDs/fallback. Precio/stock de quote congelada no son vigencia ni reserva actual.
7. Errores:422 estructurado permitido para UI,413/size snapshot,429/RetryAfter,409/CAS o request_id distinto/cuerpo alterado,404 ownership/historia, fallos de recálculo y cancelación/guardado incierto. Qué operaciones son idempotentes y cuáles no; nunca reintento silencioso ni invalidación del borrador por error.

### Plan de consumidor condicionado al contrato completo
Primero DTOs/validación cerrada y proxies/routes con límites37, sin flags/autorización cliente. Después conexión explícita propuesta→borrador de plan, editor de etapas acumuladas con cantidades/materiales declarados y evaluación sólo servidor; guardar una vez con cuerpo+UUID estables y recuperación incierta explícita. Finalmente listado/detalle/historial inmutable separados de edición/recálculo versionado, CAS y borrado confirmado. No aplicar a PC, no añadir herramienta MCP de guardado ni botón Compartir ficticio (CU09 posterior). Legacy permanece separado.

Checks futuros focales: contratos/idempotencia/cuerpo estable/CAS/historial sin recotización, etapas acumuladas/RAM/BIOS/materiales/null, cancelación y tardías; navegador contra PG real propio sin proveedor innecesario. Sólo tras implementación real y gates: recorrido central fotos→objetivo→propuesta→plan1440/390 y revisión independiente de píxeles. API aceptada no acredita UI ni ese gate. Sin shell/runners/deps/SDK/backend/commits/delegación.

## Delta focal CU06: META por preview y visibilidad6
Estado previo transmitido: CU06 tipos/lint/build0, unit26PASS, browser2PASS y revisiones función/seguridad aceptadas LOCALMENTE. Nueva reserva concreta: GET-ID repetido por aparición de SKU y metadatos del catálogo actual no asociados a versión de la quote. No se atribuye el tiempo29.1s gaming al backend ni se afirma mejora de latencia sin medición.

Implementado loader sin caché global, instanciado y descartado por objeto de preview/contexto. Dedupe ID+versions.catalog, incluyendo errores sin reintentos; lote serial por versión con hasta4 workers ID simultáneos. Una consulta pública `?page=1&page_size=1` antes y otra después de cada lote (no por ID); sólo publicar nombres/fotos si ambas coinciden con versión esperada. Si difiere o no puede probarse, se invalidan también metadatos previos del contexto, IDs conservados y fallback «Catálogo cambió; volvé a consultar»/verificación no disponible, sin mostrar una variante nueva como snapshot. Sin header/DSparam inventado, downloader ni fuente privada. Guard usa dataset_version público existente.

Tarjetas iniciales6; «Mostrar6más» mantiene todos los resultados en memoria, claves, orden y total del servidor sin alterar búsqueda/status/beneficio/coste. Únicamente candidatas visibles solicitan metadata; cacheadas no vuelven a consultar. Cotizaciones originales se mantienen intactas, nunca sustituidas por offers del GET-ID. Cancel/unmount/cambio de preview aborta el contexto y descarta tardías. No aborts por tarjeta que maten consumidores hermanos. Ningún campo nuevo enviado al servidor.

Archivos: nuevo `lib/preview-metadata.ts`, adaptación focal `app/pcs/tower-recommendation-view.tsx`, nuevo `tests/unit/preview-metadata.test.ts`, este checkpoint. No cambios BIOS/auth/extract/SDK/backend/deps/runners. No nuevas funciones de producto ni capturas finales.

Tests puros preparados: SKU compartido una consulta, contextos/revisiones sin cache compartida, cap4, staging antes de bracket, mismatch antes/después (incluye invalidación previa), versión no demostrable, aborto/tardía y paginación128 sin pérdida/lectura anticipada. Suite payload estricta existente sigue seleccionada para delta; NO ejecutado por escritor.

Build desde frontend, comandos separados:
```powershell
npm run typecheck
npm run lint
.\node_modules\.bin\vitest.cmd run tests/unit/preview-metadata.test.ts tests/unit/tower-recommendations.test.tsx
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.config.ts tower-recommendations38.spec.ts --grep "@tower06"
```
Pendientes comprobaciones y relectura del delta. No repetir Groq/Google/CU05/entrada por rutina; diagnóstico TLS/TPM de extracción queda en backend sin cambios frontend. Política futura de fotos/quotes persistentes de planes requiere snapshots backend propios: este guard sólo asocia metadata de lectura durante preview. Visual central final sigue pendiente planes reales; unitarios no son aprobación visual ni prueba de latencia.

## CU06 central — contrato y diseño antes de implementar
Contrato nestedC recibido completo por coordinación después de lectura exacta de handoff denegada (sin retry/otra vía). DTO request: expected_pc_revision, objective, budget_ars decimalstring>0, price_condition, mode, workload nullable, materials explícitos y alternatives; automatic envía alternatives[]. Respuesta conserva items/actions/evaluation/benefit/cost/dependencies/offers/versions/status/missing_fields, faltantes globales y limitations. Se usan exactamente `benefit.source`, `score`, coste total nullable y subtotal conocido, no claves inventadas ni algoritmos/porcentajes locales. Evidencia RAM y métrica CPU/GPU se renderiza por campos conocidos. No recomendación verde por cobertura parcial; fotos no validan hardware. Búsqueda bounded_not_exhaustive se conserva como limitación. No plan API definido: no CTA fingiendo guardado.

Skill frontend-design cargada efectivamente para este bloque. Plan visual: conservar chasis #101419, bandeja #181F28, texto #F4F7FB, ayuda #A9B5C5, acción #5B94FF y revisión #E6B96A. Segoe UI/Tahoma/Arial local, cuerpo16px, sección24px, títulos20px, texto<80ch. Alineación izquierda. Composición específica «mesa de decisión»: objetivo/presupuesto arriba; luego por propuesta, cambio con foto pequeña → beneficio respaldado → coste/condiciones → requisitos pendientes. Sin cards de métricas decorativas ni muro de warnings. En390 se apila sin cambiar orden de lectura.
```text
PC guardada → objetivo + presupuesto + condición
              [Buscar propuestas]
Propuesta: cambio y fotografía exacta disponible | total / subtotal
           antes → después (sin % calculado)    | dependencias
           faltantes + rechazo visible; evidencia y quotes en detalle
```
Autocrítica previa: descartar matriz genérica de productos y cifra ARS gigante que sugiera coste completo. Precio desconocido se presenta como incompleto con subtotal explícito; rejected/verification no usan badge verde. Prioridad automática; comparación manual permanece en simulación CU05 existente para no abrir otro editor complejo. Inputs cambian → resultado previo se retira e ignoran respuestas tardías; ninguna consulta escribe PC/plan. Confirmación de pasta térmica sin default. Preservar legacy/separación de scopes. Capturas1440/390 y revisión visual se difieren al contrato/flujo de planes real; no se sustituye ese gate con unitarios.

### Checkpoint CU06 implementación preparada
Implementados tipo request/respuesta nested exacto, BFF/handler POST path literal/query vacío/firmaIP/OriginCSRF/lector262144/5s y upstream15s como proxy de recomendaciones existente. Sin GET recotizador ni escritura PC/plan. Presupuesto decimal string validado positivo, sin Number monetario. Materials sólo por checkbox explícito; automatic alternatives[]. Comparación manual avanzada permanece en CU05, no se etiqueta como recomendación automática. Controller aborta/invalida al cambiar cualquier criterio, protege generación, conserva criterios ante409/429 y no reintenta. Respuesta ligada a id/revisión/objetivo/mode antes de mostrar.

Vista central: fotos exactas permitidas reutilizan renderer existente y GETporID (no primeras50), sin mostrar ofertas del GET como si fueran quotes del preview. Beneficio `source`/`score`, before/after strings sin porcentaje calculado; capacidad/referencia no FPS ni mejora garantizada. Dependencias requeridas/estado/motivo visibles, source_refs estructurados o URLs sólo enlaces HTTP(S) públicos sin credenciales/IP/puertos. Total null se mantiene incompleto y distinto de subtotal, con within_budget nullable. Quote condition/stock/fechas/vencimiento visibles, sin reserva ni actualización silenciosa. Falta de evidencia técnica/alcance parcial bloquea cabecera positiva incluso si status inconsistente; estado original se conserva en detalle. No plan CTA clickable ficticio. No claim positivo real.

Archivos nuevos: `lib/tower-recommendations.ts`, `lib/tower-recommendations-proxy.ts`, `app/api/towers/[id]/recommendations/preview/route.ts`, `app/pcs/tower-recommendations.tsx`, `app/pcs/tower-recommendation-view.tsx`, `tests/unit/tower-recommendations{,-proxy}.test.tsx` (proxy usa extensión `.ts`), `tests/e2e/tower-recommendations38.spec.ts`. Modificados: integración mínima `pcs.tsx`, gateway, CSS acotado, test de allowlist `towers38.test.ts`, checkpoint. Legacy/auth/SDK/extracción no cambiados.

Build desde frontend, comandos separados; NO ejecutados por escritor:
```powershell
npm run typecheck
npm run lint
.\node_modules\.bin\vitest.cmd run tests/unit/tower-recommendations.test.tsx tests/unit/tower-recommendations-proxy.test.ts tests/unit/towers38.test.ts tests/unit/gateway.test.ts
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.config.ts tower-recommendations38.spec.ts --grep "@tower06"
```
Browser preparado sólo contra backend/PG REAL, sin Groq/proveedor ni mocks: PC propia con referencias curadas CPU/GPU y resto desconocido; general parcial y gaming presupuesto0.01. Insuficiencia sólo se afirma cuando servicio entrega cotización completa no cero; sin precios, se conserva unknown/limitaciones. Comprueba cero autowrites, materials vacío por defecto, consulta automática y resultado retirado al editar presupuesto. Unitarios cubren precisión/enum/decimal/null/quoted stale/fuentes/generaciones/409/lector/firma, no reemplazan ese gate.
Ejemplo de servicio retransmitido por Build (CPU5600→5700X, beneficio respaldado y coste completo, resto desconocido) se tomó como evidencia de shape, NO como precio actual, whitelist, ficha técnica ni recomendación física positiva. CU02 live502 se conserva diagnosticado como conexión, sin retry/ajustes. CU06 pendiente checks/revisión y plan persistente aún sin contrato; captura final/aceptación visual y cierre integral pendientes. No se repiten Google84/entrada/CU05 aprobados por rutina. Si falla, una corrección diagnosticada y después escalada sin ciclo.

## CU02 torre — contrato consumidor previo al código
Autorizado preparar consumidores, NO activar gate proveedor hasta READY: backend reportado41pure/6PGPASS, revisión con dos P1 (deduplicación de ocurrencias/variante base PLUS) aún en corrección. No se declara backend aceptado. Contrato completo transmitido por coordinación:
- POST `/api/towers/extract` `{text:1..12000}` → `{proposal:TowerCreate,evidence:[9 categorías]{category,status,absence_excerpt,lines:[{proposal_line_index,component_id,declared_model,quantity:int|null,excerpt,quantity_excerpt,candidate_ids,resolution:catalog|declared|needs_review}]},missing_fields,warnings,catalog_revision,requires_confirmation:true}`.
- POST `/api/towers/extract/confirm` `{confirmed:true,proposal:TowerCreate,catalog_revision}` →201Tower. Identidad/CSRF/Origin/IP servidor; lector extract65536 bytes/5s, timeout BFF adecuado al proveedor30s, sin ampliar deadline de lectura. Rutas exactas POST, sin query ni conflicto con UUID dinámico.
- Preview nunca persiste. Cantidad null de evidencia sigue por confirmar; no crear módulo/disco/cantidad1 a partir de ella. Nueve estados, XOR catálogo/declarado, cotas schema2 y UUID asignado servidor. Texto/fragments escapados, no atributos/compatibilidad inferidos.
- Confirmación explícita «Confirmar y guardar mi torre», bloqueo síncrono doble submit, no retries automáticos.409 conserva borrador y exige revisar catálogo actualizado. Error de red/timeout de confirmación es incierto: mirar PCs antes de nuevo intento explícito; cancelar no revierte guardado servidor. Generaciones/aborto ignoran respuestas tardías y conservan texto ante errores de proveedor.
- `/pcs/import` pasa a extracción nueve categorías; flujo seis categorías se conserva aislado y rotulado si requiere ruta legacy. Reusar selector remoto/GETID completo y helpers de validación; sin copiar workspace entero, archivos arbitrarios, URLs de usuario ni detección de hardware.
Implementado para gate: DTO/proxy/routes cerrados; editor de propuesta controlado sin persistencia implícita; controller extracción/confirmación con estados seguros; tests puros y navegador `@tower02` preparado sin ejecución proveedor. Scope no incluye recomendaciones/planes/Google ni captura central final. P2BIOS cerrado según seguridad y Build3unit/2browser/tipos/lint/build0: no repetir por rutina.

### Checkpoint implementación CU02 (sin ejecución)
`/pcs/import` usa torre; editor controlado independiente y acotado, sin copiar workspace. Nueva línea empieza con quantity:null, incluso singular: usuario debe completarla. Una cantidad null de evidencia vinculada nunca se convierte en1 en el borrador; candidato unresolved sin índice no se inserta automáticamente. Confirm payload pasa por validación schema2/XOR/cotas, sin evidencia/owner ni UUID candidato. Fragmentos se presentan escapados. Cambio de identificación de placa limpia BIOS, no cantidad. Selector y nombres GETID completos reutilizados.

Controller con bloqueo síncrono/generaciones/AbortSignal: preview no guarda; confirmación requiere click+checkbox,409 conserva borrador editable pero bloquea envío hasta refrescar/revisar mediante nueva extracción explícita. Respuesta de guardado incierta bloquea reenvío y pide ver Mis PCs; desbloqueo sólo por acción explícita y confirmación nueva. Cancelación no afirma rollback. Texto controlado se conserva en errores/cancelación. Éxito201 válido sólo se acepta una vez. Ninguna repetición automática. BFF extracción35s (proveedor30s) y confirmación15s; lectores mantienen5s/65536 o262144.

Legacy original sin cambiar DTO/API en `import/legacy-proposal.tsx`, accesible y rotulado en `/pcs/legacy/import`. Su enlace de gestión histórica apunta allí. Auditor de entrada preparado cuenta ahora ambas rutas antiguas/nuevas; no se repite gate de entrada aprobado.

Archivos nuevos: `lib/tower-extraction{,-proxy}.ts`, `components/editable-tower-proposal.tsx`, `components/tower-extraction-evidence.tsx`, handlers `api/towers/extract/**`, ruta legacy, unitarios `tower-extraction.test.tsx`/`tower-extraction-proxy.test.ts` y navegador `tower-extraction38.spec.ts`. Cambios: página/propuesta import, traslado renderer legacy, enlace legacy, gateway, observer de evidencia de entrada y checkpoint. Sin tocar backend/dependencias/SDK/auth.

Build desde frontend, comandos separados; escritor NO ejecutó:
```powershell
npm run typecheck
npm run lint
.\node_modules\.bin\vitest.cmd run tests/unit/tower-extraction.test.tsx tests/unit/tower-extraction-proxy.test.ts tests/unit/gateway.test.ts
npm run build
```
HOLD navegador hasta correcciones/revisión backend CU02 READY y gate Groq TEST explícito de coordinación:
```powershell
node .\node_modules\@playwright\test\cli.js test --config=playwright.config.ts tower-extraction38.spec.ts --grep "@tower02"
```
E2E requiere proveedor REAL (una extracción, sin mocks); prueba preview sin persistencia, edición explícita nueve estados/cantidad vacía, confirmación201 única y cleanup sólo de su torre propia.90s cubre proveedor30s más auth/edición/cleanup, no reintentos. No se ejecutó ni se afirma Groq activo/backend aceptado. P1backend pendientes según último aviso. No frontend integral aceptado ni capturas centrales finales. Una corrección diagnosticada si falla, después escalada sin ciclos.

## Delta P2 BIOS candidata — corrección pendiente de relectura
Build informó CU05 anterior tipos/lint/build0, unitarios24PASS y dos browser `@tower05`PASS. No era aceptación frontend completa: revisión detectó BIOS A reutilizada al seleccionar B y al preparar siguiente acción. Corregido únicamente borrador de simulación: `updateSimulationCandidate` devuelve BIOS vacía si cambia component_id/declaración de motherboard; conserva BIOS por cambio de cantidad o selección idéntica. Se limpia además al cambiar tipo de acción y al agregar a secuencia (categoría ya la limpiaba). Acciones encoladas mantienen su BIOS explícita original; las siguientes empiezan sin contexto heredado. El estado se actualiza antes de onDirty, sin esperar callback/red.

Archivos: `app/pcs/tower-simulation.tsx`, nuevo `lib/tower-simulation-state.ts`, nuevo `tests/unit/tower-simulation-state.test.ts`, casos nuevos `@tower05-bios` en `tests/e2e/towers38.spec.ts`, checkpoint. Sin cambios a SDK/auth, retail, backend ni motor.

Browser REAL preparado con dos referencias de placa distintas consultadas del catálogo público existente sobre PCs propias: A+BIOS → B envía null; acciónA+BIOS encolada conserva contexto y siguienteB envía null. Observa requests sin interceptar/modificar respuestas del backend, exige200 y snapshot PC sin cambios. Comprueba también que reseleccionar misma placa/cantidad no borra BIOS. Metadatos unitarios sintéticos no se publican. No usa SSR como sustituto de interacción real.

Build, desde frontend, comandos separados; NO ejecutados por escritor:
```powershell
npm run typecheck
npm run lint
.\node_modules\.bin\vitest.cmd run tests/unit/tower-simulation-state.test.ts
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.config.ts towers38.spec.ts --grep "@tower05-bios"
```
Los dos browser anteriores se seleccionan con `@tower05 ` (espacio) si un fallo diagnosticado justifica regresión; no repetirlos por rutina. Nuevo delta pendiente de Build/relectura independiente. Si falla, escalar sin nuevas correcciones cíclicas. Sigue pendiente propuesta central BackendC y cierre integral.

## Checkpoint CU05 torre: evaluate/simulate
Servidor declarado READY por coordinación (69 pure/5 PG API aprobados, revisión funcional aceptada); contrato §4 leído y DTO/actions completos transmitidos usados sin acceso a HTTP models privados. Tipos nuevos separados de legacy; ninguna ampliación de B01–B07 ni relabel de histórico como torre completa.

Implementado en PC guardada: acción «Comprobar mi PC», resultado friendly con alcance stock/12 obligaciones del servidor, cobertura necesaria/evaluada/pendiente, fallos conocidos Y faltantes simultáneos; evidencia/versiones/copia evaluada progresivos. Límites avanzados visibles, fotos/ofertas no evidencia técnica. Cabecera no presenta verde si respuesta compatible contradice cobertura/faltantes. No se infiere un veredicto nuevo ni se envían evidencia/scopeflags cliente.

Simulación opt-in expresamente manual, secuencia acumulada sobre copia y sin persistencia. RAM reemplaza conjunto completo (hasta4 grupos/16 módulos), storage/fans admiten líneas/cantidades, targeting sólo UUID propio de categoría, candidates sin IDs de línea. BIOS candidata nullable explícita, no heredada. Reutiliza selector remoto/GETID sin universo primeras50. Si se prepara secuencia, sólo acciones agregadas se ejecutan; aviso visible. Errores/revisión409 no limpian propuesta; cancel/unmount abortan e ignoran respuestas tardías. Cambio de candidata tras simular marca resultado anterior desactualizado. Entrar a editar PC desmonta el panel: no muestra resultado de snapshot guardado como resultado del borrador sin guardar. Sin autoguardado ni PUT desde consultas.

Archivos nuevos: `lib/tower-compatibility.ts`, `lib/tower-compatibility-proxy.ts`, dos handlers `app/api/towers/[id]/{evaluate,simulate}/route.ts`, `app/pcs/{tower-compatibility,tower-simulation,tower-evaluation-view}.tsx`, `tests/unit/tower-compatibility.test.tsx`. Modificados: gateway POST cerrado con UUID literal (sin lowercase para firma), detalle `pcs.tsx`, tests `towers38.test.ts`, `towers38.spec.ts`, checkpoint. Renderer reutiliza únicamente `EvidenceValue` genérico; resumen/estados legacy intactos. Guía local Next Route Handlers previamente consultada se mantiene aplicable a los wrappers con params Promise.

Pruebas preparadas NO ejecutadas por este escritor. Nuevos casos unitarios: XOR/cotas/RAM entero, targeting propio/secuencial, BIOSnull, fail+missing/cobertura/exclusiones, firma path/método/query, límites262144/5s, payload consulta sin PUT y conservación ante409. E2E `@tower05`: torre desconocida y simulación declarada sin persistencia/marca desactualizada; negativo usa CPU/placa originales y BIOS P1.20 documentados en test legacy existente, sin fabricar atributos/medidas GPU. No positivo físico demostrado.

Build desde frontend, comandos separados:
```powershell
npm run typecheck
npm run lint
.\node_modules\.bin\vitest.cmd run tests/unit/tower-compatibility.test.tsx tests/unit/towers38.test.ts tests/unit/gateway.test.ts
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.config.ts towers38.spec.ts --grep "@tower05"
```
Browser sólo runner TEST real de Build autorizado, sin mocks/capturas de credenciales. Fotos/capturas centrales finales cuando propuesta completa esté lista. No repetir entrada, retail, Google84 ni auth browser aprobados por rutina. P2 Venex cerrado7PASS y Google aceptado local según coordinación; login Google humano sigue sin acreditarse. BackendC/recomendaciones y cierre integral pendientes. Ante fallo, una corrección diagnosticada y luego escalada, no retry cíclico.

## Checkpoint Google frontend38B1
Autorización B1/semántica estable recibida; contrato §6 leído en rango pertinente y referencia local Next Script (`onReady`/remontaje cliente) consultada. SDK/flujo oficial según verificación C7 transmitida por coordinación; no se afirma consulta externa propia ni login humano.

Implementado acceso mínimo en `/account`, sin rediseñar otras pantallas. Mantiene formulario local y enlace explícito fijo `/pcs` tras sesión. Antes de Google se explica separación de cuentas aunque coincida email. Config sólo API pública; SDK fijo `https://accounts.google.com/gsi/client` con Next Script, sin One Tap/prompt automático, logo falso ni secretos. Intento/nonce sólo en acción explícita preparar; botón lo renderiza GIS oficial. No nonce en renders. Google activo deshabilita formulario local; cambio de modo/desmontaje cancela e invalida callbacks, nuevo intento siempre explícito. Expiración retira botón sin reemitir. No reutilización de credential; sólo callback/request efímero, nunca estado/storage/logs/artifacts. Cancelar no revierte una operación que ya haya confirmado el servidor.

Controller puro probado con SDK mock; generación + aborto ignoran respuestas tardías y bloquean doble callback/preparación. Éxito: cookie servidor → renovar GETcsrf → evento de sesión/rol → perfil escapado con email nullable → navegación sólo por enlace explícito. PublicUser se proyecta cerrado para local `{id,email}` o Google `{id,email,auth_provider,display_name}`, sin roles autorizantes ni merges. Session proxy conserva perfil Google; servidor sigue siendo autoridad.

Tres rutas Google cerradas, método/query/cuerpo exactos, misma firma IP/Origin literal/CSRF/cookies de37 y lector8192/5s; errores sanitizados y Retry-After conservado. Sin nuevo servicio/proveedor/instalación/secret. Config Next existente no declara CSP; no se añadió allowlist wildcard ni se reconfiguró el entorno.

Archivos nuevos: `lib/public-user.ts`, `lib/google-proxy.ts`, `lib/google-signin.ts`, `components/google-signin.tsx`, `components/account-profile.tsx`, tres `app/api/auth/google/**/route.ts`, `tests/unit/google-signin.test.tsx`, `google-proxy.test.ts`. Cambios: `lib/auth.ts`, `lib/gateway.ts`, `app/api/auth/[action]/route.ts`, `app/account/page.tsx`, `tests/e2e/auth.spec.ts` y este checkpoint. Browser local existente ahora identifica estado de cuenta por nombre y exige cero POSTGoogle durante registro/login/logout local; no simula proveedor real.

Build, desde frontend, comandos separados; NO ejecutados por escritor:
```powershell
npm run typecheck
npm run lint
.\node_modules\.bin\vitest.cmd run tests/unit/google-signin.test.tsx tests/unit/google-proxy.test.ts tests/unit/auth.test.ts tests/unit/gateway.test.ts tests/unit/request-body-proxies.test.ts
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.config.ts auth.spec.ts --grep "registro no autentica"
```
Browser sólo cuando coordinación habilite API estable para runner. No cuenta Google real, contraseñas/códigos humanos, capturas de credenciales ni prueba de origen autorizado127. Consola/orígenes GIS localhost y login humano siguen pendientes; no los acredita crypto/PG ni unitarios. Gate central PC→objetivo→propuesta→plan/fotos, CRUD rerun y >50 real pendientes según coordinación. No repetir entrada/retail aprobados por rutina. Una corrección diagnosticada ante fallo; luego escalar sin ciclos.

## Delta independiente: presentación retail §3
Contrato §3 consultado en su rango pertinente; tipos centrales ampliados con `image`, `image_evidence` y `offers` opcionales. Campos antiguos de precios/fuentes intactos; ninguna nueva API ni cotización cliente. Sólo selector/resumen/detalle de `/pcs`; entrada aprobada y resto de pantallas sin rediseño.

`retail-presentation.ts` aplica allowlist HTTPS de raster en `imagenes.compragamer.com/productos/` y `venex.com.ar/products_images/`, sin SVG/data/credenciales/puertos/rutas arbitrarias. Foto sólo si image coincide con evidencia verified + exact_variant; bytes no verificados NO se muestran como foto comprobada. `<img>` directo al proveedor, sin optimizador/descargador servidor; fallo mantiene fallback72px y alt honesto. La comprobación de ruta no pretende validar bytes ni contenido de red. Guía Next local Image consultada antes del renderer.

Resumen progresivo: fuente/fecha/derechos; atributos vacíos explícitamente pendientes de evidencia técnica. Ofertas separan contado/lista, consulta vigente/vencida/no disponible, stock desconocido y cantidades null. Decimales string se formatean sin Number/redondeo; fechas de observación/vencimiento visibles. El reloj sólo invalida visualmente ofertas vencidas: no recotiza ni suma presupuesto, no habilita compatibilidad ni infiere PSU. Sin ofertas publicadas se muestra desconocido, no cero. Gastos excluidos visibles.

Archivos: `lib/tower-catalog.ts`, `lib/retail-presentation.ts`, `components/tower-product-summary.tsx`, `components/remote-product-selector.tsx`, detalle central `app/pcs/pcs.tsx`, CSS acotado y `tests/unit/retail-presentation.test.tsx` (metadatos sintéticos sólo para pruebas puras, no catálogo publicado).

Build, comandos separados desde frontend; escritor NO los ejecutó:
```powershell
npm run typecheck
npm run lint
.\node_modules\.bin\vitest.cmd run tests/unit/retail-presentation.test.tsx tests/unit/tower-status-labels.test.ts
npm run build
```
Sin navegador ni runner dependiente backend hasta READY B1/retail publicado. CRUD fallido tiene una corrección preparada y rerun pendiente; revisión funcional independiente favorable no lo convierte en PASS. >50 real sigue pendiente; no se fabrican registros. Próximo: Build gates focales, rerun CRUD único y evidencia central con retail publicado cuando coordinación habilite. Google sigue pendiente contrato final y usuario humano, sin endpoint inventado.

## Estado y alcance
Revisión de las primeras cuatro capturas: entrada todavía NO aprobada. Corregido el delta solicitado: “Necesito ayuda” como acción primaria explícita para principiantes, alternativas con contorno/foco/indicador y privacidad adyacente a pegar. Las anclas apuntan a destinos enfocables; el skip link enfocado ocupa fila propia, no una capa flotante. La navegación de la entrada pública permanece al inicio del documento, sin alterar la sidebar sticky de los espacios de producto.

Gate delta, sólo entrada/guía (no destinos/API): `node .\node_modules\@playwright\test\cli.js test --config=playwright.integral38.config.ts beginner-entry.spec.ts --grep "@entry38-ui"`. Unitario nuevo: `.\node_modules\.bin\vitest.cmd run tests/unit/beginner-actions.test.tsx tests/unit/hardware-guide.test.tsx`. Build ejecuta tipos/lint/build fresco antes del navegador. Capturas nuevas en `.local/evidence/integral38/entry-delta/<timestamp-uuid>/`; primeras imágenes intactas. Pendiente inspección del delta antes de expandir UI.

37 aceptado según coordinación. Skill `frontend-design` cargada mediante herramienta y aplicada; guía local Next de accesibilidad leída completa antes del código. La obligación adicional de leer el handoff externo fue levantada por coordinación después de un permiso denegado: no se reintentó ni se cambiaron permisos. El brief transmitido es la autorización efectiva.

Entrada/guía independientes implementadas; Build informó tipos/lint/build0 y cuatro unitarios aprobados. Referencia inicial real en `entry-first-20261026`, revisión visual independiente en curso; central completo con fotos/propuesta todavía no aprobado.

Bloqueo de lectura RESUELTO: contrato revisión2 leído tras autorización específica; handoff público38A leído. Sus §1–2 son la única API de torre activada en este incremento. Guía local Next de Route Handlers consultada antes de rutas. 38A sólo CRUD; no se invoca simulate/evaluate/recommend/extract38B. Build reportó gate delta entrada tipos/lint/build0, cinco unitarios0 y teclado1440/3900; veredicto visual independiente todavía pendiente.

## Checkpoint consumidores centrales38A
Build informó tipos/lint/build0 y unitarios7/7. Navegador: conversión legacy PASS; CRUD timeout al localizar estado de almacenamiento. Revisión focal de editor, cliente/proxy, shell, account, helper login y transporte A/B: no hay redirección a account en editor ni cliente/proxy. El test tiene otra página abierta en account; la captura final no prueba navegación de la página editora. Defecto comprobable en markup: label envolvente incluye opciones del select, incompatible con texto exacto del locator. Una corrección: label hermano explícito htmlFor/id por categoría. No cambios a auth, cookies, proxy ni helpers de login; sin aumento de timeout.

Test fallido ahora verifica sesiones persistidas A/B (sólo códigos), URL de ambas páginas después del name-fill y asociación exacta antes de selectOption. Esto permite discriminar una sesión/navegación real si aparece, sin imprimir identidad/credenciales. Unitario estático `tower-status-labels.test.ts` protege el markup; la comprobación efectiva del nombre queda en navegador real. Build debe repetir SOLO CRUD fallido tras tipos/lint/unit focal/build fresco. Si falla nuevamente, escalar evidencia al coordinador; no segunda corrección especulativa ni bucle. >50 sigue pendiente publicación real38B, sin fabricar datos.

- `/pcs`: nueve estados explícitos, múltiples discos y grupos de ventiladores/RAM, modelos declarados sin inferencia, cantidades, BIOS nullable explícita, borrado confirmado, revisión servidor. Nuevas líneas con UUID null; servidor asigna. Cambio/quita de placa limpia BIOS del borrador.
- GET histórico no escribe. Primer PUT exige checkbox de conversión a2 con aviso de pérdida de acceso a edición/evaluación legacy; no borra snapshots anteriores.
- Cliente `towers.ts`, proxy cerrado con bounded reader37, IP firmado, Origin literal/CSRF y Retry-After; sin autorización ni owner cliente. Rutas sólo CRUD; ninguna ruta38B habilitada.
- Catálogo público de lectura cerrado; selector remoto q/category/page y resolución GET por ID independiente de primera50. Sin ofertas/fotos inventadas. Categorías legacy no se ensanchan para no alterar sus seis categorías; tipos torre propios.
- Flujo previo conservado en `/pcs/legacy` con alcance histórico explícito, sin proyección de torres. `openBasic` dirige allí para mantener checks básicos en su contrato. No se expandió UI de planes/admin/chat.
- Capacidad RAM desconocida visible, nunca derivada del modelo declarado; no se promete reemplazabilidad notebook/prearmado. No coste ni compatibilidad por CRUD.

### Gate preparado (NO ejecutado por escritor)
Desde `frontend/`, Build como único runner TEST, comandos separados:
```powershell
npm run typecheck
npm run lint
.\node_modules\.bin\vitest.cmd run tests/unit/towers38.test.ts
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.config.ts towers38.spec.ts --grep "@tower38 "
node .\node_modules\@playwright\test\cli.js test --config=playwright.config.ts towers38.spec.ts --grep "@tower38-catalog"
```
Configuración existente hereda dos servidores reales y cache `.local/ms-playwright`; no runners/servicios propios. Browser CRUD/ownership/revisión/discos/declarados y conversión preparados. Gate >50 exige publicación real con >50 componentes y falla explícitamente si falta: no crea piezas ni sustituye datos. Otros tests históricos con `/pcs` hardcodeado necesitarán seleccionar `/pcs/legacy`; no declarar regresión completa aprobada. Una corrección diagnosticada si falla, después escalar, sin bucles. Aún pendientes gates Build, fotos/propuesta central38B y revisión visual; no cierre integral ni commits.

## Dirección: un banco de trabajo acompañado
Una persona empieza diciendo qué sabe de su PC, no buscando IDs de catálogo. El elemento distintivo es la continuidad PC → objetivo → propuesta → plan. Alineación izquierda y textos de hasta72ch; ningún bloque diseñado para superar80 caracteres por línea.

| Color | Hex | Función |
|---|---|---|
| Chasis | `#101419` | Fondo y texto sobre botón azul |
| Bandeja | `#181F28` | Superficie de trabajo |
| Papel técnico | `#F4F7FB` | Texto principal |
| Anotación | `#A9B5C5` | Ayuda legible |
| Acción | `#5B94FF` | Acción/foco, nunca con texto blanco encima |
| Revisión | `#E6B96A` | Atención con texto/icono, no veredicto por color |

Familia local propuesta/empleada en entrada y guía: Segoe UI, Tahoma, Arial, sans-serif; sin descargas. Pesos400/600/700; H1 de36px escritorio/28px móvil, secciones20–24px, cuerpo16px/interlínea1.55, ayudas14px. Las demás vistas mantienen su tipografía aprobada hasta su bloque específico.

```text
1440
┌ navegación ┬ Quiero mejorar mi PC                         ┐
│            │ ¿Cómo querés empezar?                       │
│            │ Necesito ayuda → guía situada (principal)   │
│            │ Conozco mis componentes → elegir/retomar PC │
│            │ Quiero pegar una lista → ejemplo → texto    │
│            │ PC → objetivo → propuesta → plan            │
└────────────┴─────────────────────────────────────────────┘
390
┌ marca / menú ─────────────┐
│ pregunta y tres entradas │
│ ayuda por tarea          │
│ PC                       │
│ objetivo y presupuesto   │
│ propuesta → plan         │
└──────────────────────────┘
```

## Principios y autocrítica
- Descartadas tres cards clónicas: se usan rutas con verbos y resultado explícito, sin métricas decorativas, neón ni gradientes.
- Ayuda junto al dato. Ejemplo de hardware identificado antes del textarea; no se copia, extrae ni guarda automáticamente.
- Windows ofrece pistas, no detección universal: Configuración/Sistema/Información; Administrador de tareas/Rendimiento; msinfo32 si el equipo informa placa/BIOS. Enlaces oficiales fijos suministrados por coordinación; Build verifica las fuentes. CPU-Z opcional, sin instalar ni ejecutar nada.
- “No sé” no significa “no tengo”. No abrir fuente ni cambiar BIOS; no compartir informes con datos personales. Riesgos necesarios nunca se pliegan por estética.
- Fotos/ofertas sólo con variante, derechos, fecha y fuente comprobados; si faltan, ilustración de categoría pequeña. Sin imágenes generadas o URLs del modelo.

El oscuro/azul sería genérico si sólo se recoloreara: la diferencia verificable es el inicio acompañado y la jerarquía de decisión. La guía podría convertirse en pared de texto; por eso cada tarea es un acordeón y no se impone una instalación. La skill aportó esta crítica, la eliminación de mayúsculas decorativas y la composición por decisiones en vez de un kit SaaS.

## Implementación independiente y verificación pendiente
`BeginnerEntry`, `HardwareGuide`, `HardwareExample`, fuentes/ejemplo estáticos, nueva página `/`, marca como retorno al inicio y ayuda reutilizada en editor/importación. Ninguna categoría nueva ni modelo declarado persistido antes del contrato. El ejemplo de nueve rubros expresa información a revisar, no cobertura de extracción o compatibilidad prometida.

Gate preparado: `beginner-entry.spec.ts`, socket firmado y backend real; entrada/guías1440/390, ejemplo anterior al textarea, ninguna extracción/PC guardada por navegar y continuidad central con una PC sintética usando únicamente el contrato vigente. Cleanup propio. No Groq ni capturas de cuenta/credenciales. Directorio nuevo `.local/evidence/integral38/entry/<timestamp-uuid>/`.

Build, desde `frontend/`:
```powershell
npm run typecheck
npm run lint
.\node_modules\.bin\vitest.cmd run tests/unit/hardware-guide.test.tsx tests/unit/entry38-config.test.ts
npm run build
node .\node_modules\@playwright\test\cli.js test --config=playwright.integral38.config.ts beginner-entry.spec.ts
node .\node_modules\@playwright\test\cli.js test --config=playwright.config.ts catalog.spec.ts --grep "raíz, filtros"
```
No ejecutados por este escritor. Inspección independiente de estas capturas antes de extender otras pantallas. Después del contrato READY: nueve categorías, almacenamiento/ventiladores, declarados/parciales, búsqueda remota/resolución fuera de50, contexto de PC en chat, ofertas/fotos y Google GIS real con configuración pública e interacción del usuario. Nada de eso se declara implementado por esta entrada.



<a id="origen-frontend-security37-checkpoint-md"></a>

## Origen: frontend/SECURITY37-CHECKPOINT.md

# Seguridad37 — lector de entrada acotado, pendiente de Build/revisión

Sólo frontend. Sin cambios de estética/producto38, permisos, dependencias, proveedores ni entorno. Sin shell/runners/commits por este escritor.

## Contrato implementado para coordinar backend
- `lib/request-body.ts`: `REQUEST_BODY_LIMITS` cerrado/congelado: JSON general262144 bytes, auth8192, mensaje de asistente32768, extracción de texto65536. Confirmación de extracción y creación de conversación usan el general.
- `REQUEST_BODY_TIMEOUT_MS=5000`: plazo total fijo desde entrada, no renovable por actividad. Chequeo monotónico además del temporizador, también para chunks vacíos/ya disponibles.
- `Content-Length` se valida anticipadamente: sólo dígitos no negativos; exceso413, formato inválido400. No se confía en el valor para el tamaño real.
- Cuenta bytes de `Request.body` sin CL y aun si CL declara menos. Un único buffer de capacidad fija; no copia el chunk que excede el límite. UTF8 fatal, válido con caracteres partidos entre chunks.
- 413 tamaño; 408 lectura vencida o aborto del solicitante; 400 UTF8 inválido/cuerpo ilegible/CL mal formado. Respuestas y razones de cancelación constantes, sin reflejar entradas, razones de aborto ni excepciones.
- Cancela lector/cuerpo al rechazar y libera lock/listener/timer sin esperar un hook cancel potencialmente bloqueante. Una sola carrera de promesas, no un handler de deadline acumulado por chunk.
- Upstream timeout comienza después de la lectura acotada. Se mantienen duraciones existentes, incluyendo SSE105s y `request.signal`; stream upstream se pasa sin buffer ni replay.
- `Retry-After` en429 preservado como segundos o HTTP-date de formato cerrado; nunca texto libre. Asistente/curation muestran límite/cuota de forma normalizada, sin reintentos automáticos.

## Archivos
Helper de cuerpo y Retry-After; auth route; proxies assistant/pcs/compatibility/recommendations/plans/shares/curation; mensajes locales auth/assistant/curation. Firmas, Origin literal, Cookie/CSRF y guards de rutas/métodos/query conservados. Publicación anónima sigue sin credenciales;429 público conserva Retry-After en vez de convertirse en503.

## Checks preparados (NO ejecutados por este escritor)
Desde `frontend/`, Build ejecuta en TEST, mutex habitual:
```powershell
npm run typecheck
npm run lint
.\node_modules\.bin\vitest.cmd run tests/unit/request-body.test.ts tests/unit/request-body-proxies.test.ts tests/unit/auth.test.ts tests/unit/assistant.test.ts tests/unit/curation.test.ts tests/unit/gateway.test.ts tests/unit/pcs.test.ts tests/unit/compatibility.test.ts tests/unit/recommendations.test.ts tests/unit/plans.test.ts tests/unit/shares.test.ts
```
Los tests nuevos son unitarios aislados: límites exactos/+1, multibyte, CL mentiroso/mal formado, falta de CL, timeout no deslizante, cancel que nunca resuelve, abort/reason saneado, no-forward antes de413/408, firmas/cabeceras reales del helper y429. No sustituyen integración contra backend real.

Pendiente: checks de Build, alineación del backend con contrato y revisión independiente de seguridad37. No autoriza iniciar38 ni declarar37 aceptado.



<a id="origen-backend-upgradejusto-assistant-handoff-md"></a>

## Origen: backend/upgradejusto/assistant/HANDOFF.md

# Estado vigente I — funcional local, evidencia final de Build

Actualización exclusivamente documental; **todos los checks/códigos aquí son
informados por Build, ninguno ejecutado por este especialista**. La cronología
previa permanece debajo y sus pendientes históricos no describen el cierre actual.

- Cancelación antes del fix: 3 failed/1 passed, exit1; después: 18 targeted passed,
  exit0. Carrera cancel-after-start corregida; persistencia solo si pending,
  conservando parciales y sin sobrescribir estados terminales.
- WEB LIVE final: 1/1, 11.3s, exit0, PGpost0. Normal: 9/9, 20.4s, exit0, PGpost0.
- Backend FINAL: 323 passed, cero skips, 37.99s, exit0; LIVE opt-in, helper de clave,
  TLS system. Ruff y formato (103 archivos): exit0. Frontend: 68 unitarias y
  tipos/lint/build exit0. Revisión independiente final sin bloqueantes y con
  condiciones satisfechas, según cierre comunicado por Build.
- Pruebas raíz G/H e I con reinicio real: exit0, conservando historial/citas/sesión
  e interrumpiendo pendientes sin nueva generación facturable. Vectores DEV/TEST:
  3 chunks públicos, 9/9 consultas SQL calibradas, umbral final
  `0.43721892096570775`; no garantía universal ni sustituto del motor determinístico.

API/MCP/RAG/historial funcionales localmente; sin SQL arbitrario del LLM ni
user_id cliente/modelo como autorización. Herramientas de lectura/simulación.
Límite operativo: **un worker API por BD local**, recuperación exclusiva al arrancar.
Limpieza postcancel acotada y timeouts PG locales; abandonar un waiter no mata un
thread PG ya iniciado. PG fallido no confirma historial; fallo del proveedor no
produce éxito ficticio, y ninguna prueba promete cuota/disponibilidad futura.
CU05/CU06 globales permanecen incompletos. No nuevos probes, suites ni cambios de
producto en esta edición.

# Checkpoint I — no ejecutado por especialista

## Diagnóstico focal posterior a integración Build

Evidencia recibida de Build (no ejecutada aquí): H+I negativos/PG/MCP/grafo
23passed exit0; RAG real2passed exit0, manifiesto normalizado disponible, ingesta3
chunks idempotente. Live exit1: done completed sin evento citation. No se atribuye
todavía al envoltorio MCP. La lectura del SDK continúa denegada al especialista.

Nuevo `tests/test_assistant_mcp_contract.py` permite aislarlo SIN Groq: modelo
determinista de prueba fuerza query exacta pública, pero grafo/MCP/encoder/PG son
reales. Observa el resultado nativo y solo imprime keys/result_keys/citation_count;
exige que las citas reales recuperadas alcancen emit del grafo. No cambia ni
normaliza resultado en producción. Si cuenta>0 y emit0 con result_keys=citations,
quedará demostrado el desajuste del wrapper; si cuenta0, NO inventar citas ni
relajar umbral. En ese caso investigar recuperación exacta, no aplicar parche del
wrapper por hipótesis. Regresión preparada, ejecución pendiente de Build.

También agrega evaluate_pc/simulate_pc vía protocolo real, comparación con el
mismo CompatibilityService.run(owner, identity, request), negativas ajeno/revisión
y verificación de RAM como reemplazo de conjunto y PC guardada intacta. Firma
del servicio inspeccionada y coincide con llamadas actuales; sin cambio runtime.

Desde backend/, con entorno TEST configurado por wrapper de Build, ejecutar por
separado (no imprimir entorno, no --showlocals):

```
.venv/Scripts/python.exe -m pytest -q -s tests/test_assistant_mcp_contract.py::test_real_mcp_search_structured_output_reaches_graph
.venv/Scripts/python.exe -m pytest -q tests/test_assistant_mcp_contract.py::test_real_mcp_evaluate_simulate_match_service_and_do_not_persist
```

No reejecutar Groq hasta observar diagnóstico y corregir causa demostrada. Si
falla contrato, devolver solo shape/conteo y código individual a coordinador.

Escrituras limitadas a assistant/, api/assistant.py, test_assistant*.py y revisión I.
Shell, instalación y cambios comunes prohibidos. Ningún check/código de salida
disponible; no afirmar CU08 implementado ni gates aprobados.

## Integración exclusiva posterior por Build

- Registrar `upgradejusto.api.assistant.router` en app, sin nuevos escritores paralelos.
- `assistant.tables` comparte metadata; importa las tres tablas propias. La migración
  `32_i_001` depende de `32_h_001`, crea extensión vector y tablas. H es dependencia
  externa a este cambio, no se editó ni se comprobó su disponibilidad.
- Arranque exclusivo de un único worker: invocar
  `Repository(runtime_engine()).interrupt_abandoned()` antes de atender solicitudes.
  NO invocar recuperación global con otro worker generando. Multiworker requiere
  arrendamientos/recuperación por instancia antes de habilitarlo.
- Mantener manejo existente de errores auth/Unavailable y no-store privado. SSE
  declara no-store y X-Accel-Buffering:no. Router usa owner/CSRF existentes.
- Verificar API exacta del SDK mcp2.3.0: Client/StdioServerParameters, list_tools().tools,
  Tool.input_schema, call_tool().is_error/structured_content y MCPServer.run() stdio.
  Se implementó con superficie recibida; no pudo inspeccionarse SDK por permisos.
  Prueba real independiente: test_real_mcp_owner_checks_and_live_revocation.
- Ejecutar Ruff formato/check y pytest por separado con wrapper PG existente.
  Formato/imports/compilación también están NO verificados. No ejecutar comandos
  contra una base distinta de la guardada por wrapper/conftest.

## Contrato HTTP conservado

Rutas y cuerpos de CU08 sin modificaciones. Campos SSE message_id y sequence
por evento; start/delta/tool_status/citation/done/error. Idempotencia409 devuelve
detail `{code:duplicate_request,message_id}`; historial paginado ascendente,
sin replay SSE. Una generación pendiente por conversación mediante lock PG e índice.
Reserva/historial se leen en misma transacción. Roles visibles user/assistant.
Errores posteriores a headers no confirman done; persisten failed/interrupted.
Proveedor30s, turno90s, 4 rondas herramientas/8 llamadas por ronda, salida32000chars.
No se guardan prompts internos, tool arguments, resultados internos ni razonamiento.

MCP es subprocess real por turno con sesión opaca y conversación por entorno privado,
sin clave Groq, no argumentos CLI/logs/schema. Cada tool revalida sesión, conversación
y propiedad de PC/plan a través de servicios. No hay herramientas de escritura/SQL.
Grafo valida argumentos cerrados además de schemas propios de servicios. Probar
rechazo de extras también directamente contra SDK: no asumir su política implícita.

## Gate manifiestos/encoder pendiente — sin fallback

Lectura de tools/embeddings-model.json y tools/public-corpus.json denegada. No se
inventó formato ni nombre del encoder. Build debe proporcionar manifiesto normalizado
compatible con `rag.Manifest` y `UJ_ASSISTANT_RAG_CONFIG` (ruta server-only):

- encoder: model_name exacto, revision, model_path, files_sha256 (rutas relativas).
- sources[1]: source_id,url,title,scope,accessed_at,terms,sha256,byte_length,page_count,
  local_pdf. Extraer procedencia real del manifiesto curado, no inventar estos campos.
- max_cosine_distance numérico y calibration_evidence no vacío: calibrar/registrar
  con pruebas relevantes/no-hit, no elegir un número como garantía de relevancia.

Código valida revisión encoder fija, hashes de archivos, 384 dimensiones finitas,
hash/bytes/páginas exactos de corpus autorizado. Encoder FastEmbed local_files_only,
2threads; sin descarga de modelos/fallback. CLI `python -m
upgradejusto.assistant.ingest --config <manifest>`; --download usa URL exacta del
manifiesto sin redirects y TLS explícito. Ingesta chunks página/900chars con100overlap,
PK determinística, ON CONFLICT DO NOTHING. Consulta cosine pgvector topk<=5 con
umbral explícito, sin hits devuelve citas vacías. No indexa historial/PC/planes.

Gate live opt-in UJ_TEST_ASSISTANT_LIVE=1: test_assistant_live.py usa producto HTTP
real tras integrar router/manifiesto. Su skip NO completa I. Pruebas PG/MCP/RAG
escritas pero NO ejecutadas. Faltan browser, reinicio real, inyección/no-hit calibrado,
cuota401/429, desconexión real y revisión independiente. Escalar fallos diagnosticados
antes de iterar o cambiar pins; no instalar, desactivar TLS ni rotar proveedor.

