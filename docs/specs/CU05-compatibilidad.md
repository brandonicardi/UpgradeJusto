# CU05 — contrato documental mínimo de compatibilidad

> Vigencia documental 27/10/2026: esta spec reúne requisitos y contratos por versión. Una frase fechada como «antes de implementar», «pendiente» o un resultado Sprint32/38 describe ese incremento; no acredita ni niega el estado de la entrega actual. Estado y aceptación únicos: [CONTINUAR](../CONTINUAR.md) y [matriz](../ENTREGA38_VISUAL.md). Desarrollo detenido; esta consolidación no autoriza ejecutar órdenes históricas.

## Evidencia técnica38 — representación aceptada antes de implementación

`attributes.tower_stock_v1` aloja JSON cerrado version1, separado de `basic_stock_v1`;
contrato exacto en [Technical38](CU05-compatibilidad.md#origen-backend-integral38-technical-contract-md).
Binding ID/categoría/nombre exactos, observaciones nominales tipadas y procedencia por
campo; referencias ID/URL/fecha/locator registradas en la misma revisión. Omitido o
conflictivo permanece desconocido, no cero/lista vacía ni sobrescritura silenciosa
del básico. Cap24000 bytes/envelope y500 referencias, controles37 sin ampliación.
No cambia política de compatibilidad ni prueba contenido del manual por validarlo.
Integración al motor se verifica por separado; no derivar presupuesto global fans
sumando headers ni publicar dimensiones fraccionarias redondeadas para hacerlas caber.
Esto autoriza representación/publicación, no un positivo real ni cierre de CU05.

Observaciones térmicas nominales38: `thermal_compound_required_on_remount` y
`thermal_compound_included` son booleanos estrictos con procedencia por campo para
cooler o cooler incluido de CPU exacto. Omitido sigue desconocido. Inclusión describe
un paquete nuevo, no pasta restante disponible al reutilizar un cooler instalado.
No impone universalmente material faltante a todo cambio CPU/placa ni certifica
temperaturas. El consumidor debe distinguir compra nueva de remonte y confirmación
explícita de disponibilidad; nunca reutilizar la inclusión como suministro ilimitado.

## Delta autorizado38 — antes de implementar

Torre añade almacenamiento/cooler/fans con interfaces/ranuras/puertos/montaje y
alimentación según evidencia. Inventario fijo T01–T12, scope cu05-tower-stock-1,
policy tower-stock-policy-1 y reglas versionadas, DTO en
[contrato38 §4](CU03-pcs.md#origen-backend-integral38-contract-md). Evaluar todas: fallo conocido
domina conservando faltantes; unknown necesario bloquea verde. Declarado no inventa
atributos; ausente no elimina requisitos. Simulación efímera con acciones explícitas,
RAM sustituye conjunto; motherboard no hereda BIOS. Todas las etapas acumulativas.
Aceptación: positivo documentado dentro de alcance/negativo/unknown y asignación
compartida de discos/fans; no certificación térmica/eléctrica física exhaustiva.
No implementación aprobada por esta nota. cu05-basic-stock-1/B01–B07 y versiones
históricas inferiores intactas, no presentarlas como cobertura de torre completa.

## Estado vigente25/10 — CIERRE LOCAL básico stock aprobado

Decisión más reciente: completar CU05/CU06 bajo alcance **básico stock**, no certificar
físicamente una PC. Sustituye los requisitos exhaustivos de cierre inferiores, no
sus resultados históricos. CU05 cerrado LOCALMENTE en alcance actual: scope
`cu05-basic-stock-1`, política `basic-stock-policy-1`, inventario
`basic-stock-inventory-1`, motor `cu05-basic-stock-engine-1`. Siete B01–B07 fijos
servidor por revisión explícita de alcance; B08/B09 y geometría/certificación avanzada
adicionales visibles, no n/a ficticios. Dos demos compatibles básicas, negativo P16 y
BIOS unknown; fail domina conservando faltantes. Revisión independiente final aprobada
tras corregir conflicto/socket B01;9 focales/PG2,12s exit0 informados por Build.
Diez CU funcionales locales respecto del alcance actual, no certificación exhaustiva.
Publicación autenticada CU10 DEV/TEST e importación idempotente verificadas; revisiones
legacy preservadas. Detalles/checks/capturas en [CONTINUAR](../CONTINUAR.md) y
[bitácora Build](../ai-log/2026-10-25-alcance-basico-datasets.md).
Cooler5700X no registrado/conflicto RM750e12V54,2/62,5 A visibles; sin certificación
física ni permiso comercial/deploy. Las menciones «previo», «pendiente» o «parcial»
de checkpoints inferiores son historia del proceso, no el estado de cierre actual.

### Contrato corto E/F para backend y frontend

- Scope servidor `cu05-basic-stock-1`; política `basic-stock-policy-1`. Inventario
  nuevo versionado y separado del inventario legacy de12 checks. El cliente NO
  selecciona checks, no aporta resultados ni puede desactivar controles.
- Se conservan rutas/cuerpos/autorización/errores D (§9). Para evaluaciones NUEVAS el
  servicio usa el motor básico; agrega `scope`, `additional_checks`, `warnings` a la
  respuesta actual. `scope` = `{id, policy_version, inventory_version, label,
  operating_regime}`; `id` anterior, label «Compatibilidad básica stock; no
  certificación física», régimen `stock_no_oc`. `rules_version` identifica motor
  nuevo y `data_revision` publicación/evidencia efectivamente usada. No reusar versión
  legacy para semántica nueva. Inventario `basic-stock-inventory-1`: B01–B07 fijos;
  backend entrega DTO al
  frontend antes de que este consuma el delta.
- `coverage` y `rule_results` enumeran TODAS las comprobaciones necesarias del
  inventario básico. `additional_checks` enumera controles fuera de alcance con
  `{id,status,reason,evidence_refs}`: status `outside_scope`, `unknown`, `pass` o
  `fail`; ausencia de evidencia jamás se convierte en `not_applicable`. `warnings`
  contiene advertencias visibles, no un sustituto de faltantes dentro del alcance.
- `compatible` significa exclusivamente **compatible en alcance básico stock**:
  todas las comprobaciones básicas aplicables resueltas/aprobadas. Sin fallos y con
  unknown necesario dentro del alcance → `requiere_verificacion`; fallo conocido
  aplicable → `incompatible`, conservando faltantes. Un fallo documentado detectado
  en controles adicionales también bloquea; excluir certificación no oculta hechos.

| Inventario básico obligatorio (servidor, no reducible) | Evidencia/política |
|---|---|
| B01 CPU/placa/BIOS | Socket, CPU exacta y soporte BIOS de variante/revisión aplicable; conservar relación documental de versiones, no inferir por familia |
| B02 RAM documentada | DDR/tipo/formato, ranuras/cantidades, capacidad por módulo/total y restricciones documentadas CPU/placa. Sustituir conjunto completo. MHz nominales solos no rechazan ni prueban compatibilidad |
| B03 GPU/interfaz | Slot/interfaz utilizable con la plataforma documentada |
| B04 GPU/largo nominal | Largo de GPU frente al límite nominal aplicable del gabinete; excederlo es fail dentro del alcance, no advertencia de geometría avanzada |
| B05 PSU/política stock | Recomendación fabricante aplicable y política explícita sustentada, rating/requisitos y condiciones/conflictos relevantes visibles |
| B06 Conectores/cables stock | ATX/EPS/GPU y ramales exigidos documentados, sin duplicar recursos; no certificación milimétrica del recorrido |
| B07 Formatos/límites nominales | Formatos placa/gabinete/PSU y largo nominal PSU frente al límite aplicable |

Revisión explícita del inventario propuesto B01–B09: **B08 almacenamiento** y **B09
frontales/funciones** pasan a `additional_checks`, fuera de coverage básica obligatoria.
Motivo: alcance autorizado centrado en CPU/placa/RAM/GPU/PSU y montaje nominal; DTO PC
actual de seis categorías no representa mapa instalado de discos/puertos/frontales.
Su falta no acredita ausencia, puertos libres, conservación funcional ni aprobación
implícita. Mostrar B08/B09 aun sin mapa, con `outside_scope` y motivo explícito y/o
`unknown` según evidencia; no `not_applicable` ficticio. No se eliminan hechos ni
resultados legacy. Conflicto conocido (por ejemplo pérdida de un frontal al cambiar
gabinete) conserva fail adicional y advertencia severa: no aprobación global total y
se aplica la dominancia de fallos documentados indicada arriba. Si conservar una
función concreta es requisito solicitado, requiere política/alcance versionados que
lo incluyan; no un flag cliente para apagar/encender checks.

`coverage` básica tiene exactamente siete IDs necesarios B01–B07, sin contar B08/B09
ni advertencias como aprobados. Unknown necesario de cualquiera de los siete bloquea;
evidencia/cuerpo técnico ausente sigue unknown, nunca un supuesto favorable de demo.

RAM: régimen servidor explícito `native_jedec_no_oc`; no se interpreta una nota libre
como configuración probada ni se inventa velocidad cero. Un módulo de nominal mayor
no falla por ese dato solo. La evidencia debe sustentar un modo nativo soportado y
las restricciones relevantes de CPU/placa/módulos; dato necesario no sustentado queda
unknown. Población documentada posible que satisface cantidades/restricciones basta
en este alcance; no exigir declaración física A2/B2 instalada si no es necesaria para
el predicado documentado. No exigir QVL universal ni afirmar estabilidad ensayada.

PSU: puede utilizarse recomendación ASUS del modelo GPU exacto como umbral de selección
stock SOLO con registro de fuente, sistema/régimen de referencia, clase CPU y criterio
explícito de aplicabilidad a la configuración evaluada. Clase TDP65/70 W no es demanda
DC máxima. OC/PBO, plataforma mayor o piezas no cubiertas → unknown salvo otra
evidencia/política justificada. Alternativa: estimación con valores fuente, régimen y
margen motivados; prohibidos sumandos arbitrarios placa50 W/RAM10 W. No se requiere
universalmente medición DC por salida ni transitorios para este alcance. Rating
conflictivo relevante no se resuelve eligiendo cifra favorable. No whitelist por ID:
los predicados operan sobre atributos/evidencias y condiciones de aplicabilidad.

Fuera del alcance básico: geometría avanzada/interferencias, curvas de cables y
certificación térmica/eléctrica exhaustiva. Emitir advertencias adicionales visibles;
mantener límites nominales y fallos conocidos, no convertirlos en n/a ficticios ni
pedir mediciones físicas inexistentes de escenarios demo.

Refrigeración: notas adicionales pueden citar soporte documentado stock/boxed o
NH-U12S redux exacto cuando corresponda; no declarar un cooler seleccionado/instalado
que no ingresó al sistema ni prometer validación física/térmica universal. Periféricos,
storage y frontales no cubiertos deben quedar explícitos, no verdes implícitos.

### Versionado, fuentes y aceptación del bloque

Evaluaciones/snapshots previos, planes, shares y chat conservan sus versiones y
semántica. No recalcular ni migrar resultados guardados silenciosamente. Conservar
evaluador legacy para reproducción de revisión anterior; nuevos resultados usan
scope nuevo. Proyecciones/consumidores deben conservar scope y advertencias; si un
snapshot legacy no tiene scope se identifica como legacy, nunca se etiqueta básico.

Ingesta estructurada: BuildCores OpenDB base, revisión
`2403cab88630625912cdd2f152f1bb1e27f8ff4d`, captura24/10/2026, CC BY-NC-SA4.0;
docyx pc-part-dataset complemento, revisión
`c52a04ca9465c83997ed335f7767b09a2005dd26`, fecha23/07/2025, MIT. Preservar licencia,
revisión/fecha/procedencia por registro y atribución; verificar aplicabilidad/licencia
de las muestras antes de publicar. BuildCores no aporta precios ni garantiza CPU/BIOS;
precios USD docyx antiguos NO son ARS vigentes. Importador repetible/idempotente hacia
draft/publicación local inmutable existentes, sin ejecutar scripts de esos repos.

Aceptación pendiente: dos demos y candidatos con positivo básico, negativo sustentado,
unknown y fail+missing; RAM general/beneficio de capacidad, ARS completos/dependencias
y presupuesto insuficiente. Se admite alternativa común DEMO documentada si hay
conflicto irresoluble; nunca cambiar PCs del usuario. Capturas reales actuales antes
de código (frontend asignado), después finales; sin regenerar referencias para tapar
fallos. Checks focales y revisión independiente antes del recorrido final real de
diez CU incluido asistente. No aprobar por pantalla/endpoints ni R01 aislada.

Checkpoint documental: solo esta spec, CU06, CONTINUAR y SPRINT33; contrato definido,
sin comandos/códigos de salida ni ejecución propia. Siguiente: implementación backend
con evidencia ya identificada y handoff DTO; frontend espera contrato, no capturas.

## Historia25/10 — recursos ejecutados, CU05 parcial

Motor `cu05-25-resources.1`; sufijo data_revision
`|platform-evidence-25.1|resource-evidence-25.1`.12 checks,9 con predicados: R01 y
subreglas previas más R02 RAM/R07 montaje/R03 PCIe/R06.otros/R09 storage/R10 frontales.
Nominal público curado exacto, SOURCES/fingerprints e invalidación; no población desde
notas ni «resto comprobado». Contrato HTTP D intacto, sin entrada nueva de medidas.
Familias actuales siguen partial/unknown; R04 resto/R05/R08 NOT_IMPLEMENTED. Cierre
compatible global web **BLOQUEADO POR IMPLEMENTACIÓN + EVIDENCIA**, no solo datos.

Delta recursos aprobado incrementalmente por mismo revisor tras dos hallazgos medios
(SATA power duplicado/cross-inventory contradictorio) corregidos. Recursos86 unit0.26s
exit0,40 PG/API/MCP16.96s exit0 y corrección66 focales0.21s exit0; no sumar primeros
78 unit/3 PG previos como disjuntos. Normal9 E2E19.6s exit0/PGpost0, build0 por wrapper;
wrapper ignoró intención de7 filtros, se reportan9 sin repetir. Web base unknown y
RAM5>4 slots incompatible conservando missing, sin acreditar compatible global.
Snapshots históricos/hashes intactos; catálogo14 activo Published/precios/fuentes como
seed restaurados mediante nueva revisión. Resultados atribuidos a Build/especialistas;
comandos/hashes en bitácora de Build, no checks propios de este escritor.

Ocho CU funcionales recorridos y05/06 parciales. Helper del asistente con LIVE PASS
y aprobación incremental independiente. Build final: Ruff recursos42 archivos0,
helper4 archivos0, tipos/lint frontend0; privacidad252 candidatos sin credenciales
literales, índice vacío/HEADc1ced9e/cinco commits intactos. No declarar diez completos.
Aprobados32/33 preservados; sin corte cuota/50% ni estimar consumo.

Próximo gate global: implementar R04 restante/R05/R08 con contrato/tests focales y
evidencia fabricante DC total/por salida/EPS/ATX/GPU/simultaneidad/transitorios,
resolver Corsair y confirmar cooler/interferencias/envolventes/cables/CP14-E mediante
datos aplicables o integración calificada de demo; luego revisión y positivo web.
Usuario: «Son escenarios de demo», no pedir mediciones inexistentes. Investigación
oficial acotada cerrada; no reabrir indefinidamente, aceptar F26 ni cambiar política
para conseguir pass. Detalle y límites en POSTCIERRE de SPRINT33 y
[bitácora a cargo de Build](../ai-log/2026-10-25-cu05-cu06-evidencia.md).

## Historia25/10 — preparación previa al delta recursos

Autorizado completar CU05/CU06 y revisión/recorrido final de diez CU incluido
asistente. Las restricciones anteriores «no ampliar ahora» son históricas; no hay
corte automático por cuota/50%. CU05 sigue **parcial**: E en curso, delta backend
autorizado; cierre global bloqueado por evidencia. Aprobados32/33 preservados.

Contrato básico conservado: API D (§9), identidad/propiedad servidor, revisión,
evaluación/simulación sobre copia sin persistir, inventario completo R01–R10 y
veredictos/cobertura explícitos. Fail domina y conserva faltantes. Ningún endpoint,
pantalla, R01pass ni flag «resto comprobado» cierra CU05. Ampliación de contexto/DTO
requiere contrato corto previo al frontend; este checkpoint no la define ni implementa.

**Evidencia eléctrica25/10 informada por Build/coordinación**, no reconsulta propia:
F10 manual RPS0215 declara62,5 A/750 W; F11 ficha del mismo modelo54,2 A/750 W.
URLs/localizadores conservados en HARDWARE_DEMO §2/§5 y §10 de este contrato.
Conflicto persistente, sin adoptar número favorable ni aceptar power-policy draft.
R05 necesita cotas de entrada DC de placa/RAM/EPS y GPU exacta, distribución por
salidas, máximo simultáneo y transitorios bajo régimen/temperatura aplicables.
TDP, paquete CPU76 W, vatios de pared y rating750 W no prueban esas demandas.
No ampliar/reducir silenciosamente los criterios de R05 para obtener un positivo.

**Actualización usuario25/10:** «Son escenarios de demo», no A/B físicos. Investigación
oficial acotada terminada según coordinación; no pedir mediciones inexistentes ni
continuar investigación indefinida. Sin cotas R05 no hay positivos globales posibles
ahora con estas bases y criterios vigentes. Cambiar solo fuente no demuestra demanda;
KitGuru/TDP/consumo de pared no sustituyen DC total/por salida/EPS/ATX/GPU,
simultaneidad/transitorios. Tampoco resolver conflicto Corsair con aritmética favorable.

Consultas25/10 informadas por coordinación, URLs/localizadores en HARDWARE_DEMO:
F16 matrices CPU5600/5700X y placas Pro4/Steel Legend devuelven429, sin confirmación
NH-U12S redux; no asumir soporte. F13 FAQ315 mm acredita L con fans delanteros,
no H/panel. Envolventes GPU/PSU/cables y encaje CP14-E siguen unknown. F26 no elimina
adaptador ni envolvente GPU y conserva conflictos USB10/20 y PSU165/200. Ningún
componente nuevo aceptado; power-policy sigue draft. No consultas propias nuevas aquí.

### Delta autorizado y aceptación previa al handoff frontend

Backend único: R02 RAM, R03 PCIe, R07 formatos, R09 storage y R10 headers donde la
evidencia alcance; posible R06 general sujeto a handoff exacto sustentado. No extender
predicados por esta lista: ocupación, geometría y power sin evidencia siguen unknown.
Conservar HTTP D/F, sin nueva entrada de medidas, parseo de notas ni flags de aprobación.
Frontend espera alcance/API exactos del backend antes de trabajo; no hay implementación
ni pruebas nuevas acreditadas en este checkpoint.

Aceptación focal del delta R02/RAM y versionado:
- RAM: generación/formato/capacidad/cantidades con evidencia exacta CPU/placa/módulos;
  sustitución retira conjunto anterior completo, sin sumar módulos retirados.
  Evidencia ausente/conflictiva → unknown; no inferir QVL/estabilidad/ocupación real.
- Tests positivos de predicados sustentados (NO compatibles globales), negativos
  documentados/sintéticos identificados, desconocidos y fail+missing; no mutación y
  regresión R01/R04/R06/inventario necesario completo.
- Cambio de reglas/datos identifica nueva revisión efectivamente usada; preservar
  snapshots y evaluaciones previas, sin reescribirlos ni publicar datos por inferencia.
  Tests focales de versiones, determinismo y preservación de snapshots/revisión PC;
  resultados y comandos/códigos a checkpoint por quien los ejecute.
- Revisión independiente del delta útil; gates positivos globales05/06 bloqueados
  POR EVIDENCIA, aunque aprueben estos tests. No nuevos scopes por esta aceptación.

Aceptación sin rebaja: dos bases/seis sustituciones positivas con cobertura global,
web compatible/incompatible/requiere_verificacion, fail+missing y PC intacta; checks
focales del delta, revisión independiente y recorrido real, no mocks como entrega.
Próximo checkpoint tras delta backend: archivos, contrato, comandos/códigos
efectivos, resultado, límites y siguiente paso. Resto del documento conserva historia
y propuestas; la autorización vigente no convierte propuestas en decisiones aceptadas.

Base documental de 2026-10-20: propuesta `cu05-doc-25.1`, datos `hardware-demo-25.1`, política `power-policy-25.1-draft`, conservada para los pendientes. **Etapa 28: dominio parcial ejecutable `cu05-28.1`, dos subreglas y agregación conservadora con pruebas; sin API CU05 ni motor completo.** El inventario ejecutable reemplaza el nombre de reglas borrador solo para este incremento interno; no implementa ni acepta la política de potencia. Fuentes F01–F25, piezas P01–P18 y ofertas O01–O05: [HARDWARE_DEMO.md](../HARDWARE_DEMO.md). No se reduce V1 ni se acepta stack adicional. Alcance ejecutado en sección 8.

## 1. Decisiones y alcance

Aceptadas tras etapa 23: **veredictos/cobertura explícita**, **RAM como conjunto completo**, **evaluaciones versionadas**. Son coherentes con [AGENTS.md](../../AGENTS.md). Los nombres de campos, catálogo, selección de piezas, predicados, políticas y escenarios nuevos de este documento son **propuestas revisables**, no aceptación del usuario.

Aceptación adicional acotada de etapa 28: contrato interno de datos ya resueltos,
inventario no reducible por el consumidor, agregación conservadora y subreglas
R04.largo/R06.ramales_adaptador, con ejemplos y pruebas. No acepta todo lo propuesto
en etapa 25, ni altera R10/potencia, ni declara PCs compatibles completas.

Objetivo de cierre futuro: dos bases y al menos una sustitución compatible por CPU, motherboard, RAM, GPU, fuente y gabinete, con todas las dependencias aplicables y recorrido fuente→GPU. Tres familias internas no equivalen a cobertura final. En esta etapa se registra expresamente qué falta; `requiere_verificacion` no es una estrategia para declarar terminada la demo.

## 2. Datos mínimos separados

| Concepto | Campos/semántica propuestos |
|---|---|
| Catálogo | `part_id`, categoría, fabricante, modelo, P/N, generación/variante, revisión comercial o “no diferenciada por el fabricante”; atributos sin precio embebido |
| Atributo/evidencia | Valor tipado, unidad y eje si corresponde; estado documentado/declarado/estimado/conflictivo/pendiente; fuente URL/sección/página, fecha, condiciones de validez y revisión de datos. Conservar ambas observaciones de un conflicto y resolución editorial propuesta |
| Instalado | Referencia a pieza, cantidad, posición/ranura/header, cables/ramales utilizados y contexto propio; no modificar ficha global para declarar BIOS instalada o retirar una jaula |
| Contexto | BIOS, población RAM y régimen, slots, discos/puertos, fans/cooler, radiador, jaulas, trayectorias de cable, temperatura/rating; ausencias explícitas distintas de campos desconocidos |
| Precios | Oferta independiente: pieza/cantidad, importe decimal y moneda, fecha, vendedor/URL, stock/condición/pago, envío/impuestos/extras conocidos o desconocidos. Nuevas consultas no sobrescriben observaciones históricas |
| Visuales | Origen, variante representada, tipo de imagen, representatividad y permiso/estado de uso; no acreditan atributos técnicos por estar enlazados |

Normalizar mm, GB, V, A, W y MT/s sin comparar magnitudes de distinto significado. Conservar etiqueta original. No equiparar MHz comercial con MT/s ni fuente wattage con energía/consumo AC. Un `null`/desconocido no vale cero, falso o ausente. La revisión no publicada no bloquea por sí misma todos los atributos.

## 3. Consulta y evaluación

**Entrada pública de sustitución propuesta:** `pc_id`, `expected_pc_revision`, `category`, `candidate` (referencia de catálogo; para RAM lista completa de referencias y cantidades). El servidor autentica y verifica propiedad; identidad no se toma de un `user_id` del modelo ni del cuerpo. Mismos controles en API y MCP. No SQL arbitrario.

**Entrada interna al motor:** snapshot resuelto de PC y contexto; sustitución resuelta; evidencia, revisiones de datos/reglas/política y restricciones relevantes. Dominio independiente de HTTP, BD y LLM; servicios comparten resolución y autorización. No diseñar ahora toda la base ni endpoints.

Semántica:

1. Copiar configuración de revisión solicitada; retirar componente anterior de la categoría. RAM retira **todos** los módulos anteriores, instala cantidades del nuevo conjunto; no suma capacidad vieja.
2. Resolver candidato sin añadir otras piezas implícitas. P15 sola con P07 sigue usando P07. Una propuesta **de paquete** declara explícitamente cambios P08+P15, dependencias y costo propio; no es una consulta de GPU sola.
3. Cambio de fuente retira cableado anterior e instala juego compatible de la nueva. No heredar cables modulares, aunque encajen. Documentar conexiones retiradas, libres y asignadas.
4. Evaluar todas las reglas necesarias aplicables sobre resultado; no cortocircuitar al primer fallo. Las dependencias desconocidas generan faltantes, no se dan por incluidas.
5. Plan: cada etapa parte del resultado acumulado, nunca de la base original. Si la primera falla, no ejecutarla ni omitirla para justificar la siguiente; se puede informar simulación de la configuración final separadamente. Ninguna simulación guarda la PC ni cambia su revisión.

Errores operativos separados: no autenticado, no autorizado/no propietario (sin filtrar datos privados), PC/candidato inexistente según política de exposición, revisión obsoleta, categoría/cantidad/unidad inválida, fallo de resolución. No son veredictos técnicos. Un campo técnico crítico desconocido sí pertenece a evaluación, no se “arregla” con un error genérico.

## 4. Salida y agregación

Campos mínimos: `verdict`, `rule_results`, `missing_fields`, `rules_version`. Agregados propuestos: `pc_revision`, `data_revision`, `policy_version`, identificador/revisión de evaluación y `coverage`.

Cada `rule_result`: ID/versión, aplicabilidad con razón, estado `pass/fail/unknown/not_applicable/not_implemented`, atributos observados, requisito, evidencia y condiciones, faltantes y explicación. Esos estados internos no agregan un cuarto veredicto público. `not_applicable` exige prueba (por ejemplo radiador explícitamente ausente); no significa desconocido.

Cobertura por ID de regla/instancia: necesarias, implementadas, evaluadas, aprobadas, fallidas, con faltantes y pendientes de implementación. No basta un porcentaje ni contar categorías: una regla por disco, rail o conector puede tener varias instancias. Mantener inventario de reglas necesarias aunque no estén implementadas.

- Cualquier fallo demostrado → **incompatible**, conservando otros faltantes y pendientes.
- Sin fallos pero sin evidencia necesaria o con una regla necesaria pendiente → **requiere_verificacion**, explicando si falta dato o implementación; no declarar cierre de demo con reglas faltantes.
- **compatible** requiere todas las reglas necesarias aplicables implementadas, evaluadas y aprobadas; no_aplica solo justificado. No hay nombres de PCs preaprobadas ni flag “resto comprobado”.

Guardar revisiones para reproducibilidad: misma PC con otro catálogo/política puede cambiar evaluación; no reescribir silenciosamente el resultado histórico. Versiones documentales draft no implican que exista persistencia implementada.

## 5. Reglas necesarias propuestas

| ID | Predicado, evidencia y tratamiento de faltantes |
|---|---|
| R01 CPU/soporte/BIOS | Socket coincide **y** lista oficial cubre CPU exacto/placa/revisión aplicable **y** BIOS instalada satisface requisito. F01–F04/F22. Versiones por relación del fabricante, no comparación decimal o lexicográfica. BIOS anterior a mínimo documentado falla requisito de soporte, sin afirmar imposibilidad física de POST; BIOS desconocida → missing |
| R02 RAM/plataforma | Generación y formato UDIMM, tipo/búfer/ECC, población, cantidad, capacidad por módulo/total y régimen base admitidos por CPU/placa; F01–F05/F22. Evaluar conjunto nuevo completo; perfiles OC opcionales no se imponen como velocidad base. Falta QVL no significa automáticamente incompatible; no afirmar estabilidad física ensayada |
| R03 GPU/interfaz | Ranura física/enlace negociable utilizable con CPU/recursos instalados; F03/F06–F08/F22 y evidencia de negociación aplicable. Diferente generación PCIe no es fallo por sí sola. No convertir familia antigua del manual en soporte exacto Vermeer ni garantizar rendimiento del enlace |
| R04 GPU/espacio | L/H/T normalizados, límite efectivo por montaje, slots contiguos, shroud/otras tarjetas, cuerpo del conector, tramo recto/curvatura y panel sin presión. F06–F08/F12/F13/F18/F20. Largo suficiente o siete slots no cierran los otros ejes. Known fail domina unknown |
| R05 Potencia/salidas/térmica | Potencia continua a temperatura aplicable, cargas DC resultantes por salida y total, límites individuales/combinados, requisitos/recomendaciones bajo política explícita, reserva justificada/transitorios cuando correspondan. F09–F11/F15/F17/F23–F25. Datos parciales o margen sin respaldo no aprueban |
| R06 Conectores/cables | Asignación sin duplicaciones de ATX, EPS, GPU y periféricos, tipos eléctricos, ramales independientes si exigidos, corriente headers y alcance/encaje. F03/F07/F09–F11/F15/F19/F22. P15 permite adaptador incluido, pero sus dos entradas requieren dos cables independientes; ausencia nativa no basta para fail |
| R07 Montaje placa/fuente | Formato, posiciones/separadores, dimensiones y espacio efectivo de fuente con conectores/cables/jaulas; F03/F09–F13/F22. No basta dimensión externa del gabinete ni margen nominal de largo |
| R08 Refrigeración | Kit/anclaje, capacidad térmica para CPU/régimen, altura, RAM/VRM/slot y fans con corriente/posición; F03/F12–F16/F22. NSPR no es W, TDP no prueba capacidad real del cooler en cualquier ambiente |
| R09 Almacenamiento/recursos | Protocolo, tamaño/anclaje M.2, ranura, disipación, compartición de puertos y alimentación; F03/F17/F22. M2_2/SATA5-6 vacíos es contexto explícito que evita conflicto, no permiso para agregar discos sin reevaluar |
| R10 Frontal/funciones/dependencias | Headers y pines, conectividad/audio/botones y conservación funcional en sustituciones, velocidad host/adaptador, interferencias físicas; F03/F12/F13/F18/F21/F22. Un header no alimenta dos cables sin dependencia documentada. No desconectar silenciosamente USB/reset |

Precios/objetivos son restricciones de recomendación/plan (CU06/CU07), no convierten una pieza cara en técnicamente incompatible. Su resultado separado informa suma, ofertas/dependencias, exclusiones y faltantes. CPU 6→8 núcleos, RAM16→32 y VRAM8→12 GB son referencias verificables de capacidad, no porcentajes de rendimiento; F23/F24 pueden contextualizar cargas concretas sin inventar índices universales.

### Política de alimentación propuesta

`power-policy-25.1-draft`:

- Adoptar provisionalmente prioridad editorial de F10 técnico del modelo exacto frente a F11; conservar conflicto62,5 A/750 W versus54,2 A/750 W. No usar650,4 W como especificación nueva ni fingir confirmación del fabricante.
- Condiciones: fuentes con cableado propio, CPU stock/no PBO y GPU sin elevar power limit; P07 rating30 °C cumplido como condición a verificar. R05 compara límites totales e individuales/combinados sin duplicar CPU/GPU ni tratar consumo de paquete como entrada de fuente.
- Recomendaciones ASUS550 W/P06 y750 W/P15: umbrales conservadores propuestos de selección, con salvedad ASUS de sistema OC y versión visible. Cumplirlos no basta para aprobar R05; incumplir la política se informa como tal, no consumo medido ni certeza de no arranque.
- Mantener por bloque valor/cota DC, procedencia, régimen, salida utilizada, alcance y reserva motivada. Estimación aceptada como política requiere justificación; ninguna cota numérica completa de estos conjuntos está cerrada hoy. Faltan particularmente placa/RAM, pérdidas de conversión y límite aplicable de P06/transitorios/reserva. Fuente750 W por sí sola no cubre estos vacíos.
- 314,32/474,32 W y reparto de rails del 24 quedan fuera de veredictos; solo aritmética de un borrador retirado. Tampoco se usa TDP×multiplicador ni eficiencia para reducir rating DC. Fans4×1,08=4,32 W y SSD9 W son datos parciales, no total del equipo.

No se implementa todavía esta política. El negativo R06 P07+P15 tiene evidencia independiente de aceptar el umbral de750 W o resolver estimaciones.

## 6. Escenarios documentales esperados

**Tabla documental conservada de etapa 25.** Salvo las ejecuciones parciales de S08/S10 identificadas abajo y en sección 8, no son tests ejecutados. “Fundamentado” refiere a la conclusión documental indicada, no a implementación completa. Para positivos abiertos se distingue objetivo `compatible` de conclusión defendible: sin otro fallo y con esos faltantes sería `requiere_verificacion`; no se implementaron esos escenarios completos. Bloqueos comunes **E**=R05 demanda/reserva; **G**=R04/R06/R07 espacio/recorridos efectivos; **C**=R08 interferencias/capacidad no verificadas; **U**=R10 encaje P14. Los bloqueos nunca se sustituyen por una casilla de “resto validado”.

| ID / entrada o restricción | Objetivo/expectativa | Estado y fundamento exacto |
|---|---|---|
| S01 A original | compatible | **Abierto E/G/C/U**. R01 P2.30 y formatos/conectividad nominal sustentados; falta carga integral, cable lateral P06 y espacio efectivo, cooler/P03 y térmica P01, P14 con header/volumen GPU |
| S02 B original | compatible | **Abierto E/G/C**. Cooler/P02 tiene referencia compatible, pero no interferencia P03/RAM; falta H GPU/cable Meshify y fuente/cableado efectivos |
| S03 A CPU P01→P02 | compatible | **Abierto E/G/C/U** heredados de A; soporte P2.30 y referencia térmica P02 documentados, no interferencia P03; retirar P01, reutilizar P12 con pasta renovada |
| S04 A RAM 2×P04→2×P05 | compatible | **Abierto E/G/C/U** heredados; DDR4 UDIMM2 módulos/32 GB y población base sustentadas, revisar interferencia y régimen exacto; no conservar P04 ni sumar48 GB |
| S05 B placa P03→P18 | compatible | **Abierto E/G/C**; F04 P02/P2.30 documentado en índice histórico. Mapa USB/rear/fans/SSD/power preservado; EPS4 opcional y segundo cable disponible. Falta interferencia P12/P18 y recorrido efectivo; pasta y eventual provisión BIOS sin costo cerrado |
| S06 B gabinete P10→P09 + P14 explícito | incompatible bajo requisito de conservación; sustituto positivo pendiente | **Fallo R10 fundamentado**: pierde un USB-A y reset, cambia audio a jack combinado. P14 solo habilita USB-C, no restaura funciones; además persisten E/G/C/U. Queda abierta la elección del candidato positivo: otro gabinete documentado o dependencias reales, sin incluirlas automáticamente |
| S07 A fuente P07→P08 sola | compatible como etapa intermedia operativa | **Abierto E/G/C/U** de configuración resultante; ATX/EPS/PCIe8 documentados, nuevo juego sustituye viejo; falta potencia integral/recorrido y demás reglas base. No afirmar operatividad comprobada |
| S08 A GPU P06→P15 sola | incompatible | **Fundamentado R06; extracto ejecutado en etapa 28** ([fixture](../../backend/upgradejusto/compatibility/examples.py), [runner](../../backend/upgradejusto/compatibility/demo.py)): P07 solo un ramal PCIe para adaptador que exige dos independientes. Incluye adaptador; fallo no es “sin16-pin” ni watts. Datos ya resueltos, sin implementar sustitución. Resto de cobertura pendiente |
| S09 A tras S07: P06→P15 | compatible | **Abierto E/G/C/U**; P08 nativo y L304<416 sustentados. Falta envolvente enchufe/cable y regla R03 negociación aplicable; no usar49 mm nominales como certificación |
| S10 B GPU P06→P16 | incompatible | **Fundamentado R04; extracto ejecutado en etapa 28** ([fixture](../../backend/upgradejusto/compatibility/examples.py), [runner](../../backend/upgradejusto/compatibility/demo.py)): L329>315 con front fans, exceso14 mm. No oculta faltantes eléctricos/laterales/cooler ni implementa sustitución |
| S11 A con P03 BIOS P1.20 explícita, P01 | incompatible por soporte | **Fundamentado R01** requisito oficial desdeP2.30 incumplido; P1.20 es condición alternativa del fixture, no BIOS observada. No afirmar imposibilidad física de POST; demás faltantes se mantienen |
| S12 A con BIOS instalada omitida intencionalmente | requiere_verificacion | **Fundamentado como falta R01**, sin fallos conocidos en otros datos; además E/G/C/U aún no cerrados. Resolver BIOS con registro verificable de versión, no asumir última. Para aislar solo esta falta en aceptación, cerrar antes positivos base |
| S13 S10 con BIOS desconocida | incompatible y missing BIOS | **Fundamentado**: falla largo domina; se conserva missing R01 y todos los otros faltantes |
| S14 plan A GPU primero, luego fuente | orden bloqueado | **Fundamentado bloqueo primera etapa** como S08. Fuente posterior no vuelve válida retroactivamente instalación inicial; tampoco guarda PC |
| S15 plan A fuente→GPU (S07, S09) | dos etapas compatibles | **Abierto** por bloqueos S07/S09. Orden resuelve topología conocida y la recomendación de watts propuesta, no todas las reglas; validar acumulado P08+P06 y luego P08+P15 |
| S16 costo paquete/plan P08+P15 O02+O01 | dentro2.000.000 ARS componentes | **Fundamentada aritmética histórica**1.882.130, margen117.870; compatibilidad S15 abierta. Sin envío/mano de obra/financiación; dependencias nuevas obligan recalcular |
| S17 mismo hardware, O02+O03 | fuera de presupuesto | **Fundamentado**2.070.197>2.000.000 por70.197, antes de envío; no es una mejora distinta de S16 |
| S18 costo conjunto RAM 2×O04 | dentro componentes | **Fundamentada suma histórica**766.417,98; pago/extras no explicitados limitan total final; compatibilidad S04 abierta |

CPU/RAM negativo de referencia se cubre por soporte/BIOS S11, no se inventa una RAM DDR5 mal etiquetada como DDR4. Un negativo de socket/RAM adicional puede curarse en otro incremento, no necesario para sustituir este caso documentado. Los seis positivos exigidos están representados como objetivos, **ninguno se declara globalmente cerrado** con evidencia parcial.

## 7. Criterio de cierre y verificación futura

1. Cerrar bloqueos técnicos con cotas/listas/datos públicos aplicables o cambiar candidatos; sustitución de gabinete debe conservar funciones. Elegir y justificar una política numérica DC reproducible sin reservas arbitrarias. No contactar terceros en esta etapa.
2. Revisar propuestas y acordar especificación ejecutable/stack en incremento separado. Implementar todas las reglas necesarias, sin sobreentender autorizaciones por esta lista.
3. En ese incremento futuro: probar límites/unidades, desconocidos y dominancia sin cortocircuito; retirada real de componentes, RAM completa, asignación única de cables, stock/OC/BIOS, paquete versus pieza sola, planes acumulados, propiedad/revisión y simulación sin guardado. Fixtures sintéticos complementan, no reemplazan hardware real.

La etapa25 solo verifica documentación/aritmética. Pendientes visuales y nuevas cotizaciones pueden avanzar junto con la base técnica; faltantes de compatibilidad impiden etiquetar positivos y cerrar demo, no autorizan a implementar nada ahora.

## 8. Incremento interno ejecutado — etapa 28

Fecha 2026-10-20. [Código de dominio](../../backend/upgradejusto/compatibility/)
con Pydantic ya instalado y biblioteca estándar; sin FastAPI/BD/LLM/red dentro del
dominio. No crea endpoint, persistencia, UUID, resolución pc_id/propiedad/catálogo,
sustituciones ni planes. `evaluate(configuration)` acepta solo datos resueltos;
no hay parámetros públicos para aportar resultados, omitir reglas o preaprobar PCs.

### Contrato ejecutable

- `ResolvedConfiguration`: `pc_revision`, `data_revision`, instancias con ID/categoría/
  cantidad y condiciones declaradas, datos opcionales de largo y ruta adaptada.
  Las revisiones de ejemplos son etiquetas documentales, no revisiones persistidas
  inventadas. Modelos estrictos, congelados y sin campos extra; colecciones en tuplas,
  sin mutar entradas. El evaluador revalida instancias recibidas.
- Medición positiva finita, mm/eje longitudinal; bool, strings, cero/negativos,
  NaN/infinito y unidades/ejes inválidos producen errores de validación, no veredictos.
  Cantidades enteras positivas; cada ID referenciado designa una instancia física.
  Referencias de instancia/categoría incorrectas, IDs duplicados y asignar un conector
  o entrada más de una vez son errores de entrada separados.
- Evidencia: ID de fuente, URL, sección/localizador y fecha. Sin consultar red para
  evaluar. El productor de datos resueltos debe marcar conflictos como `conflict`;
  el motor no los resuelve ni elige una observación. Datos/procedencia/condiciones
  indispensables ausentes o conflictivos → `unknown` con ruta concreta de faltante.
  Pass/fail no admiten referencias vacías; no_aplica necesita evidencia y justificación.
- Resultado de subregla: `rule_id`, `family`, `state`, `facts`, `evidence`, `conditions`,
  `missing_fields`. Salida de evaluación: `verdict`, `rule_results`, `missing_fields`,
  `rules_version`, `data_revision`, `pc_revision`, `coverage`.

### Inventario y cobertura

Versión fija `cu05-28.1`: **12 comprobaciones**, mostrando las diez familias:

| Comprobación | Estado de implementación |
|---|---|
| R01, R02, R03 | Pendientes |
| R04.largo | Implementada; compara solo largo efectivo bajo montaje documentado |
| R04.altura_espesor_slots_cable_interferencias | Pendiente; largo aprobado no cierra geometría |
| R05 | Pendiente; fuente/potencia sigue en alcance, no aprobada por ramales |
| R06.ramales_adaptador | Implementada solo para la ruta descrita abajo |
| R06.otros_conectores | Pendiente; ATX/EPS/periféricos, alcance y resto de alimentación |
| R07, R08, R09, R10 | Pendientes; sin cambios de políticas |

Lo pendiente se emite como `not_implemented` y `implementation.<ID>`, no no_aplica.
Cobertura enumera necesarias, implementadas, evaluadas, pass/fail/unknown/no_aplica/
pendientes. `coverage.complete` significa todas necesarias resueltas con evidencia
(pass/fail/no_aplica); no significa compatible si alguna falla. Las dos subreglas se
evalúan siempre; fail domina y conserva desconocidos/pendientes. Sin fail pero con
faltantes → requiere_verificacion. Inventario vacío/incompleto no produce compatible.
La rama compatible se prueba únicamente en el agregador privado con inventario
sintético completo creado en tests; no hay modo de producción para retirar pendientes.

### Semántica precisa de las subreglas

- **R04.largo:** GPU mayor al límite efectivo aplicable → fail; menor o igual → pass
  de esta subregla únicamente. El límite identifica montaje y condiciones; montaje
  distinto/desconocido o evidencia faltante no habilita comparación concluyente.
- **R06.ramales_adaptador:** alcance actual: dos entradas PCIe8 con exigencia documentada
  de cables independientes, inventario PCIe8/6+2 completo y asignación explícita.
  Dos puntas del mismo ramal cuentan una vez; ocupados no están disponibles y
  topología/ocupación desconocidas no se toman por libres. Lista desconocida es
  distinta de inventario completo vacío. No se hace asignación automática.
- Un déficit documentado con inventario completo y exclusión documentada de otras
  rutas permite fail. Sin esa exclusión se informa unknown: una ruta fallida no
  demuestra que no exista otra. Si hay capacidad pero la asignación es incompleta o
  no usa ramales distintos, queda unknown; no se elige cableado alternativo en silencio.
  Ruta nativa, otro tipo/cantidad de entradas o requisito de independencia no soportado
  queda `not_implemented`, no rechazo por parecerse poco al fixture. La exigencia
  de independencia desconocida es unknown, distinta de False explícito.

### Evidencia de ejecución, no cierre de demo

`python -m upgradejusto.compatibility.demo`, desde backend, emite JSON con el mismo
evaluador probado. Extracto de datos `hardware-demo-25.1/extract-28.1`, fuentes y
condiciones transcritas del registro, sin nueva investigación:

| Ejemplo | Resultado ejecutado | Cobertura que permanece |
|---|---|---|
| S08 P15/P07, F07/F09/F19 | incompatible; 2 entradas, 2 conectores en 1 ramal | R04.largo unknown; 10 pendientes |
| S10 P16/P10, F08/F13 | incompatible; 329−315=14 mm | R06.ramales_adaptador unknown; 10 pendientes |
| D01-S10-omitted-length | requiere_verificacion; largo omitido intencionalmente, sin fallos conocidos | 2 unknown y 10 pendientes |

D01 es un derivado de S10, no tercera PC real ni medición alterada presentada como
real. Los extractos no duplican la configuración completa ni aseguran el resto de reglas.
Pruebas ejecutadas: **66 aprobadas incluyendo salud**, Ruff lint/formato y
sincronización desde lock aprobados; demo código0. Casos sintéticos separados de los
ejemplos documentales: límites, validación, evidencia, ocupación/ramales, dominancia,
inventarios vacíos/incompletos, determinismo y no mutación. Proceso rojo/verde y
resultados en [bitácora28](../ai-log/2026-10-20-etapa28-dominio-compatibilidad.md).
Positivos globales de las seis categorías siguen abiertos. No se implementó R10
ni la política de potencia; la demo final/CU05 completo no están terminados.

## 9. Sprint32 D — contrato R01/web previo a código24/10

Estado24/10: D VERIFICADO con alcance parcial, NO CU05 completo. PG234/cero skips,
Ruff0, frontend tipos/lint/build0/Vitest40, browser6 y PGposterior0, revisión Astra
sin bloqueantes. Ejecuciones atribuidas a especialistas, no revisor/coordinador.
El DTO aditivo conserva pc_revision como string del dominio28 (revisión fuente
serializada); expected_pc_revision en petición sigue entero estricto positivo.
E requiere evidencia/decisión propia antes de ampliar reglas, no aprobación global.

C aceptado tras proofPC/revisión y postgres verify postE2E exit0 por Build. D
autoriza SOLO R01 y API/web/sustitución sobre copia; E global no se implementa.
Conservar R04.largo y R06.ramales_adaptador, inventario completo no reducible y
agregación del dominio28. No aceptar power-policy-25.1-draft ni declarar CU05 completo.

### Evidencia y dominio

R01 exige socket documentado coincidente, soporte CPU EXACTA/placa/variante y
revisión aplicable, más BIOS declarada satisfaciendo relación documentada.
Soporte D curado: P01/P02 en P03 original (no Pro SE), F01/F02/F03/F04, mínimoP2.30;
revisión no diferenciada por fabricante no se inventa. Identidad de variante no
resuelta/conflictiva o revisión relevante ausente exige faltante. Otras parejas
sin tabla curada aplicable no se presumen compatibles por socket o familia.
P2.30 exacta satisface requisito; P1.20 documentada anterior falla requisito de
soporte SIN afirmar POST físicamente imposible. BIOS null, P2.31 o cualquier
versión sin relación documental explícita:unknown, nunca comparación decimal,
lexicográfica ni supuesto de futuras versiones. Relación adicional requiere evidencia.
Evaluar todos los requisitos R01: fallo conocido domina sin perder faltantes.
Fuentes históricas de HARDWARE_DEMO, no reconsulta ni medición realizada en D.

R04/R06 reciben solo datos/contexto realmente resueltos. No trasplantar condiciones
de instalación del ejemplo documental a una PC arbitraria ni inferir cableado,
ramales libres o montaje de un nombre. Falta contexto del esquema C debe quedar
unknown, no desactivar reglas ni inventar ausencia. Motor independiente de HTTP,
BD/LLM; servidor resuelve catálogo, piezas, evidencias y versiones, no cliente.

### API fija para frontend D

POST `/api/pcs/{pc_id}/compatibility/evaluate`:
JSON `{expected_pc_revision}` entero estricto positivo; evalúa snapshot guardado.
POST `/api/pcs/{pc_id}/compatibility/simulate`:
JSON `{expected_pc_revision,category,candidates,candidate_context?}`.
category CPU/motherboard/RAM/GPU/PSU/case según enums CU03 en minúsculas;
candidates lista no vacía de `{component_id,quantity}`. IDs únicos/resueltos por
catálogo y categoría coincidente. NoRAM exactamente1 candidato quantity1; RAM
conjunto COMPLETO de1..8 referencias distintas, cantidades enteras estrictas1..8,
total máximo8 módulos. Retirar TODO grupo previo de categoría, RAM completa incluida,
sin sumar capacidad anterior; no agregar otras dependencias implícitas.
candidate_context solo para motherboard, objeto exactamente `{bios_version}` string
strip1..100 sinNUL o null; ausente implica BIOS desconocida de NUEVAplaca. No hereda
BIOS de placa retirada, aun si referencia coincidente; explícito permite declarar
BIOS para candidata. Para otra categoría contexto extra422, BIOS actual se conserva.
No notas,owner_id,user_id,results,coverage ni flags de aprobación en entradas;
propiedades extras rechazadas en todos niveles. No persistir simulación/evaluación
ni mutar componentes/contexto/revisión; GETPC posterior idéntico, incluso tras error.

Ambos responden200 evaluación `{verdict,rule_results,missing_fields,rules_version,
data_revision,pc_revision,coverage,evaluated_configuration}`. Primeros siete campos
conservan semántica/modelos28; nueva versión reglas `cu05-32d.1` distingue R01.
data_revision identifica snapshot curado/dataset efectivamente usado, no etiqueta
inventada sin referencia. pc_revision es revisión fuente comprobada. Campo
evaluated_configuration contiene `{components,context}` con grupos CU03, salvo RAM
simulada puede incluir referencias distintas, y contexto BIOS resultante explícito.
rule_results incluye hechos/evidencia/fuentes/condiciones y faltantes concretos
según contrato interno28; coverage necesaria/evaluada/pendiente no se reduce.
Sin fallo y con pendientes:requiere_verificacion. Con fallo:incompatible conservando
unknowns/pendientes. D nunca produce compatible global por R01pass.

Autenticación/propiedad sesión servidor:401 no autenticado; IDajeno/inexistente404
`{detail:"PC not found"}`.409 `{detail:"PC revision conflict"}` tras resolver dueño;
422 datos operativos inválidos/candidato inexistente/categoría/UUID, no veredictos
técnicos.503 genérico sin SQL/secretos, sin fallback. Origin3000/CSRF obligatorio
POST y no-store privados. Gateway actual HMAC socketIP extiende allowlist SOLO a
estas dos rutas UUID/accionesPOST, sin query; sin XFF ni autorización cliente.
Cliente directo legítimo sin headers gateway conserva controles sesión/CSRF/Origin.

### UI y pruebas de aceptación D

Desde PC propia, evaluar revisión visible y simular sustitución categoría/candidatos
con cantidades RAM explícitas y BIOS nueva placa declarada/desconocida. Mostrar
«alcance parcial R01 + subreglas previas, CU05 no completo», reglas/fuentes/hechos,
faltantes/cobertura/versión y configuración simulada sin botón guardar automático.
No badges compatible por cobertura parcial; controles accesibles/carga/errores409.

Tests: determinismo/no mutación/retiro conjuntoRAM/BIOSmotherboard no heredada;
R01 P2.30pass/P1.20fail/nullunknown/incomparableunknown, CPUexacta/variante/socket,
fallo domina y mantiene faltantes, regresión subreglas28/inventario no reducible.
PG/API real A/B propietario404, revisión409, validación422/auth/CSRF/Origin/HMAC,
catálogo servidor no inputs preaprobados, GETPC revisión/contexto/componentes antes/
después idénticos. Browser real eval/simulación con faltantes y persistencia intacta.
Backend PGsuite primero, luego browser, jamás concurrentes. Mismo Astra revisión
deltaD/riesgos con código+checks; Build raíz/deps, ninguna dependencia nueva prevista.
D verificado no cierra CU05: E requiere evidencia/decisión propia R02–R10, R05,
geometría/cooler y candidato gabinete conservando R10, no inventar aprobación.

## 10. E — evidencia previa a código24/10 (incremento documental)

CU05 global BLOQUEADO; E no implementado. No se rebaja cierre dos bases/seis
positivos. API D/inventario12/fail+missing conservados. Frontend quieto; mismo
backend Sol medium inspeccionó dominio/dataset sin editar/ejecutar tests. Contrato
de implementación E todavía pendiente, no aceptar powerdraft ni unknown como cierre.

### Consultas públicas efectivas (HTML, no PDFs ni mediciones físicas)

- F10 https://www.corsair.com/us/en/explorer/diy-builder/power-supply-units/corsair-rme-series-2025/
  HTTP20024/10, RM750e Specifications/Max Load: RPS0215, CP-9020295/CP-9020292,
  +12V62.5A/750W, +3.3/+5V combinados110W. Rating fuente, no demanda del sistema.
- F11 https://www.corsair.com/us/en/p/psu/cp-9020295-na/rme-series-rm750e-fully-modular-low-noise-atx-power-supply-cp-9020295-na
  HTTP20024/10, POWER TABLE: RPS0215, CP-9020295-NA, +12V54.2A/750W. Conflicto
  F10/F11 persiste en ambas páginas actuales; no resolución editorial aceptada.
- F05 https://www.kingston.com/en/memory/client/ddr4-3200mts-non_ecc-unbuffered-dimm
  HTTP20024/10, tabla Part Number: KVR32N22S8/8=8GB/x8/1R y KVR32N22D8/16=16GB/x8/2R;
  tabla Non-ECC Unbuffered DIMM3200MT/s. PDFs enlazados no leídos. No prueba
  población/régimen CPU-placa, estabilidad ni ausencia de interferencias.
- Candidato F26 https://www.fractal-design.com/products/cases/define-series/define-7-compact/define-7-compact-black-solid/
  HTTP20024/10, Specifications/Front interface/Compatibility/Other: Define7Compact
  BlackSolid SKU FD-C-DEF7C-01; 2USB-A5Gbps,2USB-A2.0,USB-C anunciado20Gbps,
  audio/mic separados,power/reset; ATX/mATX/ITX,GPU341mm,PSU200mm,cooler169mm
  nominales. No velocidad host P03/encaje/cable certificado. Manual/product sheet
  enlazados pero NO leídos. Candidato propuesto, no Pxx/catálogo/precio aceptado.
- F16 https://www.noctua.at/en/compatibility/by-components/motherboards/asrock-b550m-pro4
  HTTP42924/10 Vercel Security Checkpoint, sin datos útiles. NO implica ausencia
  del producto/incompatibilidad; no eludir bloqueo mediante cuentas/proveedores.
- Búsqueda directa DefineC BlackSolid redirigió al listado general de gabinetes
  HTTP200, no ficha verificable. No se presenta segunda alternativa validada.
  Segunda lectura F26 completó SKU/enlaces omitidos en primera extracción, no
  reconsulta rutinaria. No fuentes secundarias ni precios nuevos este incremento.

### Campos y predicados viables (propuesta, NO código autorizado todavía)

| Regla | Viable con evidencia nominal | Qué falta para cierre |
|---|---|---|
| R02 | DDR4/UDIMM/capacidad y cantidades | Régimen CPU-placa, población/slots reales y propiedades aplicables; no QVL como veto |
| R03 | Interfaces/recursos documentados | Negociación CPU-placa y ocupación; generación PCIe distinta no es fallo |
| R04 | Largo28 y exclusiones nominales condicionadas | Montaje/H-T/enchufe-curvatura-panel/slots e interferencias |
| R05 | Comparador solo con cotas DC justificadas | Demanda por salida/total/pérdidas/temperatura/reserva-transitorios, conflicto PSU |
| R06 | Tipos/asignación única/ramales/corriente | Inventario instalado completo, ocupación, alcance/encaje |
| R07 | Formatos y exclusiones nominales | Separadores/jaulas/envolventePSU-cables; dimensiones externas no bastan |
| R08 | Anclaje/altura/corriente documentados | Cooler-fans instalados, CPU/régimen térmico e interferencias placa/RAM |
| R09 | Protocolo/tamaño/compartición | Discos/ranuras/puertos ocupados/refrigeración; ausente del esquema no es libre |
| R10 | Comparación funciones requeridas | Requisito/headers/asignaciones/encaje; P10→P09 pierdeUSB-A/reset, P14 no restaura |

PC actual: seis categorías/cantidades/BIOS-notas, no cooler/SSD/fans/adaptadores
ni contexto instalado tipado. Requiere contrato separado de contexto/procedencia;
no instalar piezas de las bases documentales en PC arbitraria. Propuesta mínima
siguiente: R02/R07 nominales con faltantes exactos; no familias completas ni CU05.

### Bloqueos y decisiones mínimas para elevar por Build

Ambas bases y CPU/RAM/placa/fuente/GPU positivas siguen abiertas por R05,
envolventes/cooler. Gabinete positivo además falla conservaciónR10. No314/474W,
TDP×margen ni rating/recomendación como cotaDC. NSPR/alturaCPUcooler no certifican
capacidad ni encaje de cableGPU.
1. ¿Evaluar F26 para sustituir gabinete desde B, sin cambiar bases/catálogo todavía?
   Conserva nominalmente USB-A/audio/reset, pero USB-C/USB2 adicionales requieren
   mapa/dependencias/velocidad efectiva y geometría; P14 no se da por instalado.
   Sin precio investigado, compras ni sustitución aceptada.
2. ¿Obtener cotas públicas/mediciones aplicables y definir política reproducible
   por salida/reserva, o mantener cierre global bloqueado? Elegir F10 NO completa
   demanda. No solicitar aceptación de un porcentaje arbitrario.
3. Obtener compatibilidad/dibujo exactos o medición declarada con unidades/ejes/
   montaje/procedencia para geometría/cooler; sin evidencia conservar bloqueo.

Separar implementación conservadora futura de cierre global bloqueado. F/G/H
pueden continuar solo con alcance explícito independiente consumiendo fail/unknown
sin llamarlos planes compatibles; no se autorizan por este documento. No esperar
Groq para ese análisis; Ireal continúa bloqueado por clave pospuesta. Checks de
este incremento: consultas HTTP/lecturas/registro, sin suites ni código.


<a id="origen-backend-integral38-technical-contract-md"></a>

## Contrato de referencia consolidado: INTEGRAL38_TECHNICAL_CONTRACT.md

Los detalles técnicos siguientes se conservan desde el contrato de esa etapa. Sus frases de preparación, autorización, implementación pendiente y órdenes de trabajo son HISTÓRICAS, no el estado vigente ni autorización de ejecución. Prevalecen los deltas posteriores de esta spec para su alcance y CONTINUAR/matriz para los resultados comprobados. No se certificó de nuevo el código al consolidar.

<details>
<summary>Detalle contractual y contexto original</summary>

# Technical38 — contrato propuesto para aceptación antes de código

Estado: CONTRATO2 ACEPTADO por Build26/10/2026; delta CU05/CU10 aplicado por Build
ANTES de autorizar implementación. Representación/publicación únicamente. Sin datos técnicos nuevos,
pruebas ejecutadas, adaptación del motor ni compatibilidad aprobada por este documento.

## 1. Transporte y ownership

`Component.attributes.tower_stock_v1` es JSON serializado como string, no objeto HTTP.
Se conserva `basic_stock_v1` sin modificación. No migración: JSONB existente.
Esquema cerrado `version:1`; no extensiones, reglas, resultados, flags para desactivar
comprobaciones, expresiones, SQL ni código. Cada objeto rechaza claves duplicadas y
extras; listas son arrays JSON reales, no strings separadas por comas/substrings.
Fotos, ofertas, títulos retail y atributos de presentación no generan estos hechos.

Futuros únicos archivos de implementación de este bloque: retail/technical_*.py,
administration/models.py, administration/validation.py,
administration/repository.py (conservación de procedencia, §6) y nuevos tests
test_tower38_technical*.py. B3 conserva compatibility/tower_* y decide adaptación.
No se modifican políticas stock/eléctricas, HTTP, identidad, sesiones ni límites37.

## 2. Envelope cerrado

Claves EXACTAS: `version,identity,data,fields,conflicts,import_digest`.

- version: entero estricto1; bool no es entero.
- import_digest: SHA256 hexadecimal minúsculas64 del artefacto técnico de adquisición
  congelado; no hash de foto ni contraseña. Es trazabilidad declarada, no certificación.
- identity: `{component_id,category,name,manufacturer_part_number,source_refs}`.
  component_id1..200, name1..200 canonical strip únicamente, category exacta del
  componente; manufacturer_part_number texto1..200 o null, sin alias/UPC como MPN.
  source_refs:1..30 referencias de identidad. ID/categoría/nombre deben coincidir
  exactamente con la fila materializada (nombre tras strip solamente). Una edición
  real de identidad exige renovar/revisar envelope: nunca trasladar por similitud.
  MPN es afirmación curada ligada a esas referencias; no crea crosswalk ni fusiona IDs.
  MPN null no identifica otra variante ni permite heredar especificaciones por nombre.
- data: objeto solo con valores documentados, tipados por categoría, nunca null.
  Campo omitido = desconocido; no default cero/false/lista vacía.
- fields: EXACTAMENTE las claves presentes en data. Cada valor es array1..30 de
  SourceRef. Todo el valor compuesto de un campo queda respaldado por sus referencias;
  una lista parcial no se puede declarar inventario completo.
- conflicts: objeto por campo permitido; cada valor array2..8 de
  `{value:<tipo del campo>,source_refs:[SourceRef,...]}`. Debe contener al menos dos
  valores distintos y documentados. Ese campo no aparece en data/fields: queda
  desconocido para el adaptador. No resolución por orden, mayoría o fuente reciente.

`SourceRef={source_id,url,consulted_on,locator}`; strings estrictos no vacíos,
source_id1..200, URL1..2000, locator1..2000, consulted_on fecha ISO YYYY-MM-DD.
No descarga, DNS ni acceso de archivos. Se usa validador de procedencia SourceData
existente: esta publicación no es un downloader ni amplía protocolos de adquisición.

En materialize, CADA referencia (identidad, datos, conflictos) debe resolver UNA
SourceData de esa misma revisión por source_id/url/fecha/locator exactos, y su par
(source_id,url) debe estar en component.sources. Referencias ausentes, ambiguas o
discrepantes:422, publicación completa rollback, puntero sin cambios. Máximo30 fuentes
del componente existente se conserva; un mismo documento puede respaldar varios campos.
La procedencia acredita la afirmación curada; validación estructural no lee/verifica
automáticamente el contenido de un manual ni prueba equivalencia de variantes.

## 3. Campos y tipos nominales

Todos los números de esta versión son enteros JSON estrictos y finitos, sin floats,
booleanos, texto numérico o unidades embebidas. No conversiones de texto fabricante.
Medidas fraccionarias no representables exactamente como mm enteros quedan fuera
de versión1: no redondear ni truncar para publicar; omitir conserva desconocido.
Positivo =1..1000000000; Count=0..1000000. Cero SOLO es válido en Count y debe tener
evidencia explícita de cero; ausencia de evidencia nunca lo genera. Strings1..100,
strip sin casefold, sin controles. Colecciones sin duplicados, máximo64 elementos.

| Categoría | Claves permitidas y tipos |
|---|---|
| motherboard | tower_ports:NominalResource[]; fan_headers:NominalResource[]; shared_limits:SharedLimit[]; fan_total_current_ma:Count |
| case | storage_bays:NominalResource[]; cooler_height_limit_mm:Positivo; fan_positions:Count; fan_supported_sizes_mm:Positivo[] |
| storage | storage_interface:enum; storage_form:enum; sata_power_count:Count |
| cooler | cooler_sockets:string[]; cooler_type:air\|liquid\|passive; cooler_height_mm:Positivo; fan_count:Count; fan_voltage_mv:Positivo; fan_current_ma:Positivo; fan_connector:enum; thermal_compound_required_on_remount:bool; thermal_compound_included:bool |
| fan | fan_size_mm:Positivo; fan_voltage_mv:Positivo; fan_current_ma:Positivo; fan_connector:enum |
| gpu | tower_port_kind:enum; tower_port_form:enum |
| psu | sata_power_count:Count |
| cpu | stock_cooler_included:bool estricto; cooler_sockets/cooler_type/cooler_height_mm/fan_count/fan_voltage_mv/fan_current_ma/fan_connector/thermal_compound_required_on_remount/thermal_compound_included con tipos cooler, SOLO del cooler incluido exacto documentado |

RAM: sin campos tower en versión1 (no envelope RAM); mantiene contrato básico.
CPU stock_cooler_included:false no autoriza inventar detalles del cooler; detalles
de cooler incluido requieren stock_cooler_included:true con evidencia. Un false
aislado es ausencia explícitamente documentada, no default.

Steering autorizado26/10, documentado ANTES de implementar esos dos campos:
thermal_compound_required_on_remount y thermal_compound_included son bool estrictos
con SourceRef como cualquier otro hecho, solo cooler/CPU con cooler incluido
documentado. Omitidos siguen desconocidos. required_on_remount requiere fabricante
o instalación documentada; no inferir necesidad universal por cambiar CPU/placa.
included describe el PAQUETE NUEVO documentado, no remanente en cooler usado,
disponibilidad del usuario ni pasta reutilizable ilimitadamente. El consumidor CU06
debe distinguir operación/producto nuevo y confirmación explícita de materiales.
Build actualizará la aclaración en specs antes de habilitar consumidor. AG400 no
recibe valores aquí: inclusión actualmente desconocida según comunicación Build.

Vocabulario exacto inicial de publicación; su consumo exige adaptación explícita B3,
no se afirma que estos objetos ya estén conectados al motor existente:
- storage_interface: SATA|M2-NVMe|M2-SATA.
- storage_form: 2.5-inch|3.5-inch|2242|2260|2280|22110.
- tower_port_kind: PCIe; tower_port_form: x1|x4|x8|x16.
- fan_connector: 3pin|4pin. Es conector nominal, no prueba de regulación PWM/DC.
  Se conservan estos tokens exactos también en accepts de fan_headers; no aliases
  fan3/fan4 ni traducciones implícitas. Cualquier traducción de DTO futuro debe ser
  explícita/versionada por B3, nunca matching aproximado.
- cooler_sockets: identificadores exactos documentados (ejemplo sintético AM4 no
  se transforma en AM5); no substring ni alias aproximado.

`NominalResource={resource_id,kind,accepts,voltage_mv,max_current_ma,excludes,group,cost}`
con TODAS las claves requeridas, igual forma JSON que DTO nominal del dominio:
- resource_id1..100 único en todas las colecciones de recursos del componente.
- kind según contexto: tower_ports=SATA|M2-NVMe|M2-SATA|PCIe;
  fan_headers=fan; storage_bays=storage-bay. El kind fan es etiqueta nominal de
  publicación: no introduce validación eléctrica ni exige al motor un hardcode nuevo.
- accepts array1..16, valores del vocabulario correspondiente: storage_form para
  puertos storage/bahías; tower_port_form para PCIe; fan_connector para headers.
- voltage_mv/max_current_ma:Positivo|null; null mantiene límite desconocido,
  no cero. Solo fan_headers admite valores no null en versión1.
- excludes:array0..64 de resource_id distintos existentes en la misma colección;
  sin autorreferencia. Exclusión declarada no exige inventar relación simétrica.
- group:string1..100|null; cost:Positivo (sin coste monetario, unidad de recurso).
  Grupo no null exige SharedLimit del mismo componente. No fórmulas ni prioridades.

`SharedLimit={group:string1..100,capacity:Count}`; grupos únicos, máximo64.
Las listas tower_ports/fan_headers/storage_bays/shared_limits pueden ser [] SOLO
cuando la fuente acredita inventario completo vacío o ausencia de restricciones
compartidas aplicables. No completar inventarios con defaults. Si la lista no es
exhaustiva, se omite el campo entero: versión1 no expresa subconjuntos como completos.

Estos límites representan observaciones; no fijan política eléctrica. En especial,
fan_total_current_ma solo puede publicarse si la fuente acredita ESE límite global;
no se deriva sumando headers. Si falta, se omite. Tratamiento de su necesidad y
alcance eléctrico global queda a resolución explícita B3/coordinación, no a B2.

## 4. Conflictos, límites y coexistencia

No sobrescribir semánticamente basic_stock_v1. Para claves solapadas actualmente
(case.cooler_height_limit_mm), un valor tower distinto del básico documentado provoca
422 salvo representación explícita en conflicts con ambos valores y referencias
registradas. Nunca se elimina/edita envelope básico automáticamente. Adaptador futuro
debe dominar con desconocido en ese campo; no seleccionar silenciosamente un envelope.
Duplicados JSON, recursos/grupos repetidos o dos valores conocidos competidores en
data se rechazan. Observaciones divergentes se publican solo como conflicto explícito.
No probar resolución del conflicto ni cobertura completa en este bloque.

Límites: tower_stock_v1 máximo24000 BYTES UTF8; solo esta clave obtiene excepción al
límite2000 caracteres de atributos legacy. Máximo500 ocurrencias SourceRef en total
por envelope (incluye identidad/conflictos),30 por lista,64 recursos por colección,
64 grupos,8 observaciones por conflicto; envelope de categoría limita claves al
cuadro. Más de500 referencias es422. Cap de cuerpo37 existente conserva prioridad:
el JSON exterior/escaping también cuenta; se conserva el cap37 aplicable a la ruta,
sin ampliarlo. No confundir CU10/general (262144) con extracción (65536).
No recepción masiva sin cota, reconfiguración de cuotas ni nuevo proveedor.

## 5. Ejemplo exclusivamente SINTÉTICO, no evidencia de hardware

Valor string de attributes.tower_stock_v1 (aquí mostrado como JSON para legibilidad):

```json
{
  "version": 1,
  "identity": {
    "component_id": "synthetic-storage-38",
    "category": "storage",
    "name": "SYNTHETIC TEST DRIVE",
    "manufacturer_part_number": null,
    "source_refs": [{"source_id":"synthetic-manual","url":"https://example.com/synthetic-manual","consulted_on":"2026-10-26","locator":"SYNTHETIC fixture section"}]
  },
  "data": {"storage_interface":"M2-NVMe","storage_form":"2280","sata_power_count":0},
  "fields": {
    "storage_interface":[{"source_id":"synthetic-manual","url":"https://example.com/synthetic-manual","consulted_on":"2026-10-26","locator":"SYNTHETIC fixture section"}],
    "storage_form":[{"source_id":"synthetic-manual","url":"https://example.com/synthetic-manual","consulted_on":"2026-10-26","locator":"SYNTHETIC fixture section"}],
    "sata_power_count":[{"source_id":"synthetic-manual","url":"https://example.com/synthetic-manual","consulted_on":"2026-10-26","locator":"SYNTHETIC fixture section"}]
  },
  "conflicts": {},
  "import_digest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
```

Este ejemplo no acredita socket, consumo, rendimiento, precio ni compatibilidad.

## 6. Operaciones CU10 existentes, sin endpoint nuevo

1. POST /api/admin/revisions `{base_version:ACTIVE}` crea draft por identidad servidor.
2. POST /api/admin/revisions/DRAFT/sources `{data:{source_id,url,consulted_on,locator}}`
   registra referencias (o usa filas existentes exactas). El row_id de colección
   no sustituye source_id; no permitir ambigüedad de source_id al publicar tower.
3. PATCH /api/admin/revisions/DRAFT/components/COMPONENT_ROW_ID
   `{data:{attributes:<objeto COMPLETO preservando atributos previos y añadiendo
   tower_stock_v1:string>,sources:<lista COMPLETA preservando fuentes y agregando las
   técnicas necesarias>}}`. PATCH de attributes sustituye objeto, no deep-merge:
   cliente conserva explícitamente basic_stock_v1 y otros valores existentes.
   COMPONENT_ROW_ID es el ID materializado que identity.component_id debe reproducir.
4. POST /api/admin/revisions/DRAFT/publish `{expected_active_version:ACTIVE}` valida
   lote completo y referencias, publica atómicamente con rol fresco PG. Fallos422,
   conflicto revisión409, rol403. Sesión/CSRF/cuotas37 permanecen como están.

No user_id/owner del modelo autorizante. Política de conservación de procedencia
para implementar tras aceptación (NO comportamiento ya implementado):

- Mismo component_id; nombre idéntico tras strip únicamente y categoría idéntica.
- El conjunto nuevo de component.sources contiene TODAS las parejas (source_id,url)
  anteriores, intactas. Se permite exclusivamente añadir fuentes técnicas; no
  eliminar una previa ni cambiar su URL bajo el mismo ID. Cambiar nombre real,
  categoría o retirar/cambiar parejas mantiene el guard conservador: no heredar.
- Antes de conservar cada recurso, identity.store/product_id/variant_key/mpn/gtin
  permanecen exactamente como estaban ligados a ese component_id; no reasignar un
  recurso ni reconciliar otra pieza. identity.source_url debe seguir en las fuentes
  nuevas del componente y los SourceRef técnicos deben pasar materialize por separado.
  Para IDs vendor, comprobar además correspondencia determinística store/product_id
  con component_id. No deducir igualdad de MPN desde GTIN, nombre o envelope ajeno.
- Agregar fuentes no modifica identity retail, imagen ni offers: se copia el recurso
  completo solo a la NUEVA revisión. Las publicaciones y quotes previas no cambian.
  component.sources solo contiene id/url: fechas/locators de SourceData se validan
  por los SourceRef técnicos, pero no se usan para rejuvenecer ni reescribir registros
  de adquisición/ofertas ya congelados. La conservación de fuentes id/url no afirma
  por sí sola que un manual describa la variante: sigue obligatorio el binding exacto
  identity del envelope a ID/categoría/nombre materializados; discrepancia es422.

Esto permite, por ejemplo conceptual, añadir fuente AMD a cg-13355 sin perder su
oferta si cumple todas esas condiciones. No publica aquí datos AMD ni MPN/atributos
de ese producto. Es conservación de identidad/procedencia, NO regla de compatibilidad.
La futura implementación se limita a administration/repository.py y tests propios;
retail/repository.py no requiere cambio para este supuesto de superset conservado.
No existe recuperación automática de recursos retirados: el refresh retail actual
pone en cuarentena un ID existente sin previous_identity. No prometer que un refresh
comercial reponga recursos después de incumplir el guard ni eludir esa cuarentena.

## 7. Aceptación antes de integración del motor

- Pure: forma cerrada/duplicados; tipos estrictos/NaN/Infinity/bools como números;
  campos por categoría, inventarios, grupos/exclusiones y enums exactos; byte cap,
  501 refs rechazadas; ausencia preservada como unknown; conflictos no defaults.
- PG TEST real: rol fresco/revocación; referencias ID/URL/fecha/locator y fuentes
  del componente exactas; identidad incorrecta y solapamiento básico conflictivo422;
  atomicidad, puntero intacto al fallar, revisión anterior inmutable y reproducible.
- Publicación/republish: conserva basic_stock_v1; refresh comercial conserva técnica;
  recursos/quotes previos inmutables; conservación retail con fuentes sin cambios y
  con superset técnico documentado que satisface §6. Verificar oferta/foto intactas
  y no rejuvenecidas; misma identidad, origen retail retenido y recursos anteriores
  inmutables. Retirada/cambio de fuente previa, nombre/categoría distintos o identidad
  retail inconsistente no heredan; binding técnico incorrecto rechaza publicación.
- No fetch/SQL/proveedor desde datos; rutas existentes conservan controles37.
- B3 integra resolver separado después de READY y con versión/digest en evaluación;
  debe mantener fail dominante/faltantes y unknown para evidencia ausente/conflictiva.
  Este bloque solo habilita publicar observaciones: NO demuestra verde ni cierre CU05.


</details>
