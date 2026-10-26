# CU07 — planes acumulados, Sprint32 G

## Delta autorizado38 — antes de implementar

Planes torre acumulan acciones versionadas y validan cada resultado, guardando quotes,
materiales/scope/evidencia. RAM sustituye conjunto completo; cambio de placa no hereda
BIOS. Recalcular/cotizar requiere acción explícita, GET no altera snapshot ni PC.
Contrato [§1/5](../../backend/INTEGRAL38_CONTRACT.md); preservar planes previos y enlaces.
Aceptación: varios discos/fans, dependencia/coste incremental y acumulado, revisión/
propiedad A/B, fallo en etapa posterior y sin modificación implícita de PC.
Esta definición no acredita implementación38; cierre histórico inferior conservado.

## Estado vigente24/10 — FUNCIONAL LOCAL VERIFICADO

Planes PG/etapas acumuladas/API/web probados: proofHTTPS/reinicioREAL0 y cierre
Build323/0skips/Ruff0/front68/tiposlintbuild0/E2E9. Revisión incremental favorable;
snapshots/costnull/nulos/revisiones persisten; PCdelete conserva plan. Borradores
unknown/blocked NO se convierten en compatibles ni cierran CU05/CU06.
[Evidencia vigente](../SPRINT32.md), [bitácora](../ai-log/2026-10-21-sprint32.md).
Solo estado/evidencia, contrato y criterios conservados.

## Preparación histórica (implementación pendiente era estado previo)

Contrato previo a código/frontend24/10. Implementación pendiente. Después del gate
integradoD puede implementarse independiente del cierre globalE/F, reutilizando
evaluación/coste F sin exigir recomendación positiva. Un borrador con unknown es
útil, pero NO es plan compatible/listo para comprar. Sin Groq ni extracción CU02.

## Semántica y persistencia

Plan PG pertenece a sesión servidor; snapshot inicial de PC propia y su revisión,
objetivo/presupuesto ARS, etapas ordenadas1..12 con nombre1..100 y replacements
del contrato F. Validar etapa N sobre resultado de N−1, no sobre PC original.
RAM reemplaza conjunto completo; motherboard no hereda BIOS. No compra/guarda PC.
Etapas no vacías; no categorías duplicadas por etapa ni componentes/dependencias
implícitos. Evaluación completa por etapa, fail domina conservando faltantes.

Coste total acumulado de adquisiciones, incluso una pieza comprada y sustituida
en otra etapa; sin reventa. Cada etapa conserva coste propio y acumulado, fuentes,
fecha y faltantes. Total desconocido jamás cero; presupuesto global incluye todas
las etapas/dependencias, exclusiones F. No sumar subtotales como total completo.

Persistir entrada normalizada, snapshot base, configuración resultante y DTO
evaluación/coste/beneficio de cada etapa, revisiones de datos/reglas y fecha servidor.
`status`: `ready` solo si TODAS las etapas compatibles, beneficio final supported,
coste completo dentro del presupuesto; `blocked` ante cualquier incompatible,
exceso conocido o ausencia demostrada de mejora; demás `requires_verification`.
Estados blocked/unknown se pueden guardar como BORRADOR visible. Rechazo técnico
422 no guarda parcialmente. Lectura nunca reevalúa ni altera snapshot por cambios
posteriores de catálogo/PC. Mostrar si PC cambió o fue eliminada, sin heredar cambios.
FK/relación de PC no puede borrar plan silenciosamente; guardar snapshot propio y
referencia nullable con dueño verificado al crear/recalcular. CU03 delete preserva plan.

## HTTP para frontend G

- POST `/api/plans`: `{name,pc_id,expected_pc_revision,objective,budget_ars,stages}`;
  stage `{name,replacements}` de F.201 plan completo calculado servidor.
- GET `/api/plans?page=1&page_size=20`:200 `{items,total,page,page_size}`; límites
  CU03, solo dueño, orden id ascendente estable; items resumen id/name/revision/status/
  objective/budget_ars/total_ars/updated_at, sin snapshots de otros usuarios.
- GET `/api/plans/{plan_id}`:200 plan completo.
- PUT `/api/plans/{plan_id}`: `{revision,name,pc_id,expected_pc_revision,objective,
  budget_ars,stages}`; reemplazo completo y recálculo explícito desde PC actual
  propia verificada,200 revisión+1 atómica. No conservar veredicto obsoleto. UI avisa
  que recalcular cambia snapshot; no refresh silencioso ni PATCH.
- DELETE `/api/plans/{plan_id}`:204, confirmación UI; futuras publicaciones H deben
  quedar inaccesibles en la misma transacción. No cascadas a PCs/conversaciones.

Plan completo `{id,name,revision,pc_id,pc_revision,base_snapshot,objective,budget_ars,
currency:"ARS",stages,status,cost,benefit,missing_fields,created_at,updated_at}`.
revision entero positivo; pc_revision string fuente conforme D. stages añade a
entrada `position,evaluated_configuration,evaluation,cost,cumulative_cost`;
snapshots/cost/benefit siguen DTO D/F, tiempos ISO8601 UTC servidor. Respuesta no
incluye owner/token. Peticiones extras rechazadas en todo nivel; parámetros exactos.

401 sin sesión;404 plan/PC ajeno o inexistente antes de409;409 revisión plan o PC
obsoleta con detalles genéricos diferenciados `Plan revision conflict`/`PC revision
conflict`;422 validación;503 genérico sin éxito parcial. PUT resuelve propiedad del
plan y PC antes de conflictos. Mutaciones Origin/CSRF; no-store, gateway allowlist
cerrada rutas/métodos/query de lista, identidad B exclusivamente servidor.

## Gate y checks

Backend transacción plan+etapas, concurrencia revision200/409 sin pérdida, rollback,
reinicio REAL conservando snapshots/cantidades/null/fuentes; cleanup solo fixtures.
A/B ni lista ni GET/PUT/DELETE ni referencias PC cruzadas, owner injection rechazado.
Casos acumulados: etapa2 solo viable tras etapa1, etapa2 inválida pese a etapas
aisladas aparentemente válidas, fallo+faltantes, coste acumulado/doble adquisición,
RAM y BIOS, PC editada/eliminada conservando snapshot; regla/dataset nuevo no altera
GET previo. Ningún test sintético declara compatibilidad real del hardware.
Browser real crear/guardar/leer tras reload, editar/recalcular con confirmación,
409, borrado, unknown/rechazo legibles y PC intacta. Checks comunes reales PG primero,
frontend después/PGpost0 y revisión de aislamiento/delta. G funcional puede cerrarse
como planificación conservadora persistente; no equivale a CU06 positivo ni CU05
global ni demuestra plan ready real si no hay evidencia. Registrar esa limitación.
