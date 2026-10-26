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
