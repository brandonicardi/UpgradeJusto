# CU06 — recomendaciones, Sprint32 F

## Delta autorizado38 — antes de implementar

`/api/towers/{id}/recommendations/preview`: modo automatic o manual_comparison,
objetivo general/gaming/productivity, ARS/condición cash/list y materiales explícitos;
DTO en [contrato38 §5](../../backend/INTEGRAL38_CONTRACT.md). Automático busca catálogo
completo, beneficio pertinente por índice curado con contexto; no VRAM/núcleos/FPS
inventados. Productividad Blender exige workload blender-cpu, no generalización.
Sin respaldo: faltantes y comparación manual identificada. Coste incremental completo
incluye dependencias materialmente necesarias; included/available_confirmed/priced/
missing, no pasta desconocida universal CPU/placa ni coste inventado. Recommended
exige compatibilidad/cobertura, beneficio, coste y presupuesto; insuficiente rejected.
Aceptar positivos respaldados, negativo, unknown e insuficiente, no whitelist IDs.
Alcance autorizado, aún no probado; básico histórico inferior sigue versionado.

## Estado vigente25/10 — CIERRE LOCAL recomendaciones básicas aprobado

Contrato E/F de [CU05](CU05-compatibilidad.md), scope `cu05-basic-stock-1`, política
`basic-stock-policy-1`, inventario `basic-stock-inventory-1`, motor
`cu05-basic-stock-engine-1`. CU06 cerrado LOCALMENTE en alcance actual, revisión
independiente final aprobada; no certificación exhaustiva ni deploy/permiso comercial.
Dos demos positivas; RAM recommended766.417,98 ARS con presupuesto1.000.000 y rejected
con766.417,97; P15+P08 recomendado1.882.130 ARS dentro2.000.000, P15 sola/PSU550
rejected. Beneficio general de capacidad RAM16→32/VRAM8→12, no FPS/rendimiento gaming.
Precios de evidencia demo, no oferta vigente; dependencias incluidas y envío,
financiación/mano de obra excluidos. Web consumidores4PASS11,5s y LIVE asistente
Groq/PG1PASS10,3s exit0 informados por Build. Scope/advertencias visibles, legacy
preservado. Detalles en [CONTINUAR](../CONTINUAR.md) y
[bitácora Build](../ai-log/2026-10-25-alcance-basico-datasets.md).

HTTP F mantiene petición, identidad/propiedad servidor y simulación sin guardar PC.
Inventario obligatorio `basic-stock-inventory-1`: B01–B07 de CU05. B08 almacenamiento
y B09 frontales son comprobaciones adicionales visibles, no coverage básica ni
ausencias inferidas por el DTO de seis categorías. Unknown adicional no acredita
funcionalidad; fail conocido conserva advertencia severa y dominancia. No prometer
compatibilidad total ni conservación funcional no evaluada al recomendar un cambio.
La evaluación incluida en cada resultado nuevo conserva `scope`, `additional_checks`
y `warnings` del motor. `recommended` requiere compatible **básico stock** explícito,
beneficio sustentado para objetivo y coste ARS completo de piezas/dependencias dentro
del presupuesto; nunca implica certificación física ni FPS inventados. UI, planes,
shares y asistente deben preservar etiqueta/advertencias/versiones sin reinterpretar
snapshots antiguos. Unknown necesario bloquea recomendación; fallo conocido domina.

RAM general16→32 GB es beneficio de capacidad, no prueba gaming/productivity. Conjunto
nuevo reemplaza anterior completo, sin sumar capacidad retirada. Precios requieren
moneda/fecha/procedencia; USD docyx23/07/2025 no es ARS vigente. Presupuesto incluye
componentes y dependencias; excluye envío/financiación/mano de obra, visibles.

Aceptación verificada según cierre informado por Build: dos demos y upgrades con compatible básico/recommended real,
negativo, unknown, fail+missing, beneficio general respaldado, suma ARS completa y
presupuesto insuficiente. Alternativa común solo DEMO documentada ante conflicto,
no autocambios de PCs del usuario ni whitelist por ID. Checks focales, revisión
independiente y recorrido web/PG/proveedor reales; no mocks como entrega final.
Checkpoint: modificación documental únicamente, sin ejecución propia. Formato final,
privacidad/hashes de cierre pendientes de confirmación Build, no acreditados aquí.
Siguiente: registrar esas confirmaciones, sin nuevos bloques. Los estados parciales
inferiores son históricos, no el estado vigente.

## Historia25/10 — recorrido conservador PASS, cierre bloqueado

CU06 parcial; ocho CU funcionales previos con recorrido final reejecutado y05/06
parciales, no diez completos. HTTP F intacto. Web general RAM16→32 GB supported,
coste **766.417,98 ARS**, within_budget al presupuesto exacto, pero NO recommended;
insuficiente rejected, gaming/productivity unknown. Share público conserva beneficio
unknown conservador: límite de proyección, sin cambiar el contrato ni presumir que
el beneficio supported privado se reproduce públicamente.

Motor `cu05-25-resources.1`, data suffix
`|platform-evidence-25.1|resource-evidence-25.1`:12 checks/9 con predicados, familias
actuales partial/unknown y R04 resto/R05/R08 NOT_IMPLEMENTED. Por tanto compatible
global/recommended **NO ACREDITADOS POR IMPLEMENTACIÓN + EVIDENCIA**. Presupuesto
suficiente y capacidad documentada no sustituyen ese gate ni prueban rendimiento.

Normal9 E2E19.6s exit0 y PGpost0; wrapper ignoró intención de7 filtros, no reportar7
ni repetir. Recursos86 unit/40 PG/API/MCP y corrección66 focales exit0, revisión
incremental aprobada, no cierre global. Front77 unit/13 archivos exit0 con filtro
ignorado por alias; tipos/lint finales0.
LIVE asistente final1passed6.8s/11total exit0 con MCP, stream/historial/aislamiento;
helper aprobado incrementalmente, Ruff lint/formato final0.
No acreditar citas RAG nuevas con ese test. Aprobados32/33 preservados.

Próximo: para positivo CU06 completar implementación
R04 restante/R05/R08 y evidencia fabricante/integración calificada de demo, luego
evaluación global completa + beneficio general aplicable + coste/dependencias reales,
revisión y web recommended. No pedir mediciones de A/B inexistentes: son escenarios
demo. Research acotado cerrado, no F26 aceptado ni alternativa mágica. Sin corte por
cuota/50%; bloqueo por criterios reales. Resultados informados por Build/especialistas,
no checks propios; comandos/hashes en [bitácora de Build](../ai-log/2026-10-25-cu05-cu06-evidencia.md).

## Historia25/10 — preparación previa al recorrido

Autorizado completar05/06 y revisión/recorrido final diez CU, incluido asistente;
sin detención automática por cuota/50%. F en curso conservador, gate de cierre
bloqueado por CU05 global. Aprobados32/33 preservados; ocho CU funcionales y dos
parciales05/06, no diez completos. No mocks como resultado final ni suites históricas
repetidas por rutina. Contrato API F inferior se conserva ANTES de cualquier frontend;
no hay nuevos campos, endpoints ni implementación acreditada en este checkpoint.

### Observaciones comerciales25/10 informadas por Build/coordinación

No son reconsultas propias de este escritor ni reemplazan ofertas históricas:

| Pieza / fuente identificada | Importe ARS y condiciones observadas25/10 |
|---|---|
| P05, [RMS](https://rms-enlinea.com.ar/producto/memoria-ddr4-kingston-16gb-3200-mhz-kvr32n22d8-16/) | 383.208,99 por módulo, stock2; 2 módulos=766.417,98; pago/recargos no explicitados |
| P08, [Exxit](https://exxit.com.ar/prod/5715/fuente-750w-corsair-rm750e--2025--cybenetics-gold-platinum-atx-3-1-full-modular-cp-9020295-ar) | 175.898, transferencia, IVA incluido, stock alto; financiación con recargo, envío no cuantificado |

Paquete explícito RAM completa2×P05 + PSU P08 = **942.315,98 ARS**; no incluye ni
conserva capacidad de P04 retirada ni descuenta reventa. No afirma ingreso al catálogo
ni prueba de selección de precios por API. Presupuesto2.000.000 ARS es propuesta de
demo/input de aplicación, **no presupuesto de compra aceptado por usuario**. Aritmética
no implica total de compra final ni disponibilidad futura; envío/financiación/mano de
obra excluidos, dependencias de componentes deben incluirse si son necesarias.

Beneficio documentado: capacidad RAM16→32 GB por F05/modelos exactos. No acredita FPS,
mejora de productividad ni un índice de rendimiento. Foco objetivo **general** y
part numbers KVR32N22S8/8→KVR32N22D8/16, dos módulos; gaming/productivity sin fuente
de rendimiento → beneficio unknown. RAM sola cuesta **766.417,98 ARS** según oferta
25/10, sin inventar condiciones de pago/dependencias. Aunque coste y capacidad estén
sustentados, `recommended` exige compatibilidad
global actual, beneficio aplicable y dependencias completas. R05 eléctrico (§estado
vigente de CU05), geometría y demás faltantes no se convierten en pass.

Usuario25/10 aclaró **«Son escenarios de demo»**, no equipos A/B físicos. Investigación
oficial acotada terminada; no pedir mediciones inexistentes ni seguir investigando
indefinidamente. No positivos globales posibles ahora con estas bases y criterios:
cierre CU06 **bloqueado POR EVIDENCIA**, no por falta de pantalla. Delta backend
autorizado según CU05, HTTP intacto; frontend espera handoff exacto previo a trabajo.
No nuevos componentes ni cambios R05/F26 aceptados. Recorrido diez CU autorizado,
con gates compatible positivo/recommended bloqueados, no aprobados.
Sin comandos/códigos ni checks nuevos propios en este checkpoint documental.

## Evidencia histórica24/10 — flujo verificado PARCIAL

API/web conservadoras implementadas y flujo probado en cierre Build323/0skips,
Ruff0,front68/tiposlintbuild0/E2E9 y revisión incremental sin bloqueantes. CU06
GLOBAL INCOMPLETO: no escenario positivo global, datosE/R05/geometría pendientes.
No elevar unknown a compatible/recomendado. SeisCUfuncionales+dosparciales05/06,
no ocho completos. [Evidencia vigente](../SPRINT32.md),
[cronología y cierre corroborado](../ai-log/2026-10-21-sprint32.md).
Solo estado/evidencia actualizados; contrato y aceptación NO redefinidos.

## Preparación y checkpoints históricos (no estado vigente)

Contrato previo a código/frontend24/10. Estado: implementación EN CURSO, aceptación
pendiente según checkpoint inferior. Gate integradoD ya cerrado por revisión;
no sigue prohibido el trabajo backendF. F no espera cierre globalE ni proveedor IA;
no declara CU05 completo y NO se cierra CU06 sin escenario positivo real trazable.

### Checkpoint histórico implementación24/10 — no aceptación final

GateD cerrado por revisor independiente. BackendF API/servicios/tests implementados
según Build; wrapper256passed/cero skips exit0, Rufflint0, formato1 SOLO5archivos.
Mismo backend corrige formato y continúaG/H; mismo frontend F en paralelo, SIN
checks todavía. No positivo global CU06 ni revisión finalF acreditada. Estos checks
no equivalen a cierreCU06, no fueron ejecutados por coordinadora. Contrato conservado.

## Alcance y dominio

Servicio determinístico recomienda sustituciones para PC propia, sin modificarla.
Objetivos iniciales: `general`, `gaming`, `productivity`. Son etiquetas de intención,
NO prueba de mejora: cada beneficio necesita referencia curada aplicable al objetivo,
configuración y comparación exactas. No inferir FPS, rendimiento o superioridad por
precio/nombre/generación ni inventar benchmarks. Ausencia de evidencia se muestra
como faltante de objetivo; se pueden evaluar candidatos sin recomendarlos.

Entrada identifica PC/revisión, categoría y lista acotada de alternativas explícitas
del catálogo (no búsqueda universal prometida). Una alternativa es conjunto completo
de sustitución: RAM retira TODOS los módulos anteriores, conserva cantidades nuevas;
resto exactamente una pieza quantity1. Excluir alternativa idéntica como mejora
positiva. Dependencias adicionales se especifican como sustituciones por categoría,
nunca se agregan silenciosamente. No recomendar combinaciones con fallo conocido.

Servidor resuelve catálogo, precios, evidencias y motor CU05 actual. Evaluar TODAS
las reglas aplicables sobre copia normalizada; conservar configuración, revisión,
versiones, cobertura, faltantes y fuentes conforme DTO D. Sin cobertura completa no
emitir `compatible`. BIOS placa nueva desconocida si no declarada; no heredarla.
Nada altera PC ni persiste recomendación en F. G guarda snapshots por separado.

Coste = suma de piezas adquiridas × cantidades, incluidas todas las dependencias;
sin descontar reventa/piezas retiradas. Decimal exacto, no float. Solo precios ARS
documentados en catálogo: elegir determinísticamente fecha más reciente, luego menor
importe y source lexicográfico entre registros de igual fecha; devolver TODOS los
registros seleccionados con fecha/fuente y advertencia histórica, no cotización actual.
Si falta precio ARS de una pieza: `total_ars:null`, subtotal conocido separado y
faltantes; NUNCA cero ni conversión implícita. Comparación presupuesto inclusiva.
Excluye envío, financiación y mano de obra. No coste oculto de adaptadores/licencias;
dependencia fuera del catálogo sigue faltante y bloquea total completo.

## API corta congelada para F

POST `/api/pcs/{pc_id}/recommendations/preview`, sin query:
`{expected_pc_revision,objective,budget_ars,alternatives}`.
- revision entero estricto positivo; objective enum anterior; budget_ars decimal
  string positivo, máximo dos decimales, sin exponente, hasta999999999999.99.
- alternatives1..20 objetos `{key,replacements}`; key string1..40 alfanumérico ASCII,
  guion/guion bajo, único. replacements1..6 categorías únicas; cada objeto usa
  `{category,candidates,candidate_context?}` de simulación D, mismas validaciones.
  RAM1..8 referencias, total1..8 módulos. Datos extras rechazados en TODOS los niveles;
  ningún owner, precio, evaluación o beneficio enviado por cliente es confiable.
- Servicio aplica TODO reemplazo antes de una evaluación conjunta, no evalúa cada
  sustitución aisladamente como garantía de la combinación.

200 `{pc_id,pc_revision,objective,budget_ars,currency:"ARS",items,limitations}`.
Cada item `{key,replacements,evaluation,cost,benefit,status,missing_fields}`:
- evaluation DTO D completo, también para incompatibles, sin esconder faltantes.
- cost `{total_ars,known_subtotal_ars,within_budget,lines,missing_fields}`;
  within_budget bool o null; lines `{component_id,quantity,unit_amount,currency,date,source}`
  solo con precio conocido. Desconocidos en missing_fields con component_id/ruta.
- benefit `{status,evidence}`; status `supported`/`unknown`/`not_an_improvement`;
  evidence referencias curadas con URL, fecha si documentada y alcance comparativo.
- status `recommended` SOLO con compatible global, presupuesto completo suficiente,
  beneficio supported y dependencias resueltas; `rejected` ante incompatible,
  presupuesto conocido excedido o ausencia demostrada de mejora; resto
  `requires_verification`. Fallo/rechazo domina conservando todos los faltantes.
- Orden determinístico: recommended, requires_verification, rejected; dentro de cada
  grupo total conocido ascendente, null al final, key lexicográfica. No ranking de
  rendimiento sin índice curado. limitations explicita alcance/datos históricos.

Auth/Origin/CSRF/gateway/no-store iguales a D.401 sin sesión,404 PC ajena/inexistente
antes de409 revisión,422 inválidos/IDs/categoría,503 PG sin secretos/fallback.
Presupuesto insuficiente/faltantes son resultado200, no error422. Gateway agrega SOLO
ruta UUID/POST exacta; ninguna ruta arbitraria ni confianza en XFF/user_id cliente.

## Aceptación y checks

UI desde PC propia: objetivo/presupuesto, alternativas y dependencias explícitas,
costes históricos, fuente/fecha, rechazo/faltantes/cobertura y PC intacta. No etiqueta
«recomendado» para requires_verification ni promesa de compra segura.

Dominio: determinismo, límite presupuestario exacto, cantidades RAM, combinaciones,
precios null/moneda/fechas/empates, dependencia fuera del catálogo, beneficio unknown,
fallo+faltantes y revisión/BIOS. PG/API A/B404/409/422/CSRF/Origin/503, PC idéntica
antes/después; browser real positivo/insuficiente/incompatible/unknown sin mocks finales.
Positivo de CU06 exige mejora real documentada, precio ARS trazable y evaluación
global completa del escenario, no R01pass ni fixtures sintéticas como entrega final.
Si E impide ese positivo, entregar flujo conservador probado y marcar CU06 EN CURSO,
gate de cierre BLOQUEADO con faltantes concretos, sin paralizar G/H independientes.
Backend wrapper/Ruff y frontend tipos/lint/unit/build/E2E según comandos existentes,
ejecuciones secuenciales PG→browser y PGpost0; Build verifica reinicio si persiste
nuevo estado. Revisión crítica del delta/riesgos; comandos/códigos reales a bitácora.
