# CU09 — compartir y revocar, Sprint32 H

## Delta autorizado38 — antes de implementar

Compartir torre conserva snapshot versionado de quotes/scope/evidencia/advertencias,
sin notas privadas ni recálculo GET. Revocación y control de propiedad iguales; enlaces
históricos legibles sin reescribirlos. Contrato
[§7](../../backend/INTEGRAL38_CONTRACT.md). Aceptación: proyección pública de líneas/
declaraciones filtrada, sin datos privados, revocación A/B, costes/fuentes con fecha
y respuesta legacy preservada. Autorización no equivale a prueba ejecutada38.

## Estado vigente24/10 — FUNCIONAL LOCAL VERIFICADO

Snapshot público/revocación PG/API/web probados: proofHTTPS/reinicioREAL0,
revocaciónpersistente/PGdownpublic503nocache/planDELETEpublic404 y cierreBuild
323/0skips/Ruff0/front68/tiposlintbuild0/E2E9. Revisión incremental favorable.
No compartir aprobación de compatibilidad inexistente, no certificación despliegue.
[Evidencia vigente](../SPRINT32.md), [bitácora](../ai-log/2026-10-21-sprint32.md).
Solo estado/evidencia, sin modificar contratos ni aceptación.

## Preparación histórica (pendiente de implementación era estado previo)

Contrato previo a código/frontend24/10, implementación pendiente. G persistente
es dependencia técnica; no exige CU05 global, plan ready ni Groq. Publicar borrador
unknown/blocked conserva advertencias y NUNCA lo convierte en plan compatible.

## Publicación mínima

Dueño publica SNAPSHOT inmutable de revisión concreta del plan con confirmación
UI del contenido que será público. Ediciones posteriores no cambian publicación;
generar enlace nuevo exige publicación explícita de nueva revisión. El enlace es
capacidad bearer de solo lectura, no concede sesión/propiedad ni acceso a PC original.

Token aleatorio criptográfico32bytes, base64url sin padding,43caracteres; guardar
SOLO digest SHA256, id de enlace UUID, plan/owner/revisión snapshot, created_at y
revoked_at. Valor bruto aparece solo en respuesta201 y URL compartida, nunca logs,
trazas, analítica, listados o localStorage. No derivarlo de UUID/email ni aceptarlo
elegido por cliente. Sin expiración implícita prometida; revocación permanente.

Snapshot público por allowlist: título explícito de publicación y objetivo, presupuesto/
moneda/costes con fuentes históricas, etapas normalizadas/componentes públicos,
evaluaciones/reglas/cobertura/faltantes/beneficio/advertencias y versiones. NO nombre
de cuenta, email, owner_id, pc_id/plan_id privados, notas de PC, conversación ni
contexto libre. Solo contexto técnico requerido por evaluación (p.ej.BIOS) con aviso
en confirmación. Construir proyección pública también dentro de resultados anidados:
no serializar modelo privado completo ni citar notas como evidencia. Citas de
catálogo únicamente públicas; nunca URLs privadas/credenciales. Sin fetch de URLtoken.

## HTTP para H

- POST `/api/plans/{plan_id}/shares` JSON `{expected_plan_revision,title}`:
  title strip1..100 sinNUL;201 `{id,plan_revision,title,created_at,path}` donde path
  `/shared/{token}` relativo al origen configurado. No host arbitrario de request.
- GET `/api/plans/{plan_id}/shares`:200 `{items}` solo dueño; metadatos id/revisión/
  título/created_at/revoked_at, SIN token/path recuperable. Orden id estable.
- DELETE `/api/plans/{plan_id}/shares/{share_id}`:204 revoca en PG atómicamente;
  idempotente si ya revocado por mismo dueño,404 ajeno/inexistente/plan equivocado.
- GET `/api/shared-plans/{token}`:200 snapshot público + published_at/plan_revision;
  sin sesión ni CSRF. Token inválido, inexistente, revocado o plan eliminado:
 404 idéntico `{detail:"Shared plan not found"}`. Sin distinguir estados/existencia.
  No otros métodos;405 no muta. Token válido no sirve en rutas privadas.

Privados requieren sesión/propiedad antes de409 revisión;401/403 Origin-CSRF/422/503
seguros y no-store como G; GET privado sin query. Extras rechazados. Público no-store
también en errores y sin caché estática/ISR/serviceworker/precarga de contenido; cada
lectura consulta PG para revocación (no caché de token). PG indisponible503 sin servir
snapshot cacheado. Revocación garantiza requests iniciados después del commit denegados;
no borra copias ya vistas ni cancela respuestas iniciadas antes. Advertir al compartir.
Gateway solo rutas cerradas correspondientes; mantener auth de rutas privadas intacta.

Página `/shared/{token}` pública de solo lectura, sin botones mutantes ni carga de
PC privada, sin recursos terceros/analítica; Referrer-Policy:no-referrer, noindex,
no-store y título genérico sin token. No registrar URLtoken en accesos/errores.
Build verifica lanzadores/logging raíz sin especialistas editarlos. No abrir permisos.

## Aceptación

PG/API: A publica su plan, B no publica/lista/revoca enlaces de A; token no autoriza
CRUD privado; proyección sin PII/contexto libre en niveles anidados; revisión stale409;
snapshot estable tras editar; revocación/deleteplan→404, reinicio conserva revocación,
token aleatorio/no bruto en DB y errores503 seguros. Sin endpoint admin/SQL del LLM.
Browser real anónimo ve snapshot y advertencias, no acciones; A revoca y siguiente
GET/refresco anónimo404 sin caché. Plan unknown/blocked sigue tal; no greenwashing.
Checks comunes secuenciales + PGpost0 y revisión Astra crítica de capacidad bearer,
aislamiento, redacción y caché; hallazgo bloqueante impide cerrar H. Sin mocks finales.
