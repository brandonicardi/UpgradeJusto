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

## Resultado posterior atribuido a Build y revisión independiente

Build ejecutó pytest focal tras corregir ambos P1:52 PASS, exit0; Ruff check0.
Después del READY del autor completó wrapping mecánico residual, sin cambio lógico;
Ruff format de contrato/motor/tests confirmó0. La revisora funcional independiente
releyó los dos defectos y regresiones: aceptación LOCAL del motor puro, sin otros
defectos demostrables en ese delta. No ejecutó pruebas ni aprobó hardware real,
adapter/API, cargas ampliadas fuera de política ni producto38 integral.
