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
