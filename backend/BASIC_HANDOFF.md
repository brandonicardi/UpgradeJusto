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
