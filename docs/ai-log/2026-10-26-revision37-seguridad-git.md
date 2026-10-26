# Incremento37 — revisión, seguridad y Git local

## Autorización vigente

Pedido posterior autoriza37 y continuación automática38, sustituyendo detenciones
históricas. Mantener PG/Groq/arquitectura/diez CU y evidencia; prioridad producto
personal utilizable, sin fingir cierre integral al terminar37. Commits locales reales,
no push/force-push/borrado remoto, sin modificar autoría/fechas de los cinco originales.
No importar workspace privado de preparación ni reinstalar herramientas conectadas.

## GitHub MCP usado efectivamente

Consultas de solo lectura realizadas en este turno mediante namespace GitHub MCP:
- `get_me`: identidad `brandonicardi`, correcta. Otros datos de perfil no se copian.
- `search_repositories`, consulta exacta `repo:brandonicardi/UpgradeJusto`: un resultado,
  visibilidad pública, owner correcto, permisos admin/push, size0.
- `list_commits`, owner/repo exactos, límite5, solo campos sha/html_url: rechazo409,
  «Git Repository is empty». No commits remotos ni push inferido.

Git CLI local, separado de esa evidencia MCP: HEAD `c1ced9e`, rama
`codex/base-backend`, origin HTTPS `brandonicardi/UpgradeJusto.git`; cinco commits
originales y numerosos cambios posteriores sin registrar. No se leyó credencial,
token, keyring ni `.env`. No se reinstaló ni pidió autenticación.

## Responsables y plan focal

Coordinadora existente consultiva; backend único escritor `backend/**`; frontend
único escritor `frontend/**`; Build documentos/scripts/verificaciones/Git. Revisora
de seguridad solo lectura de correcciones/evidencia saneada, sin shell ni secretos.
No dos escritores por archivo ni permisos generales por rutina.

Hallazgos37 contrastados por lectura puntual: auth/assistant y demás proxies usan
`request.text()` sin acotación previa; csrf emite nuevas sesiones anónimas sin cuota;
asistente/extracción no comparten presupuesto agregado. No se repite exploración
histórica ni se presenta la revisión previa de Codex como prueba ejecutada nueva.

Contrato de entrada decidido para ambos lados: límite global JSON262144 bytes,
auth8192, mensajes32768 y extracción65536; plazo absoluto5000ms de recepción, separado
del timeout de generación/streaming.413 bytes excedidos y408 recepción lenta,
sin confiar solo en Content-Length ni reflejar payloads. Cancelar lectura y rechazar
antes de reenviar. Front/backend deben verificar coherencia con pruebas focales.

Backend prepara cuotas por IP confiable para nuevas sesiones, retención operativa
conservando válidas y presupuesto PG compartido de proveedor por usuario/global con
concurrencia/liberación ante error/cancelación. Propuesta coordinadora5/min usuario,
20/min global, concurrencia1/4, configurables; no cuotas externas como control único.
Implementación/defaults finales y resultados aún pendientes. Sin pruebas DEV.

## Siguiente checkpoint

### Verificaciones Build posteriores (TEST, sin proveedor)

- ASGI `pytest tests/test_security37_body.py`:11 aprobadas, exit0; aviso de caché
  local no escribible. Invocaciones posteriores usan `-p no:cacheprovider`.
- Primera invocación PG desde raíz: exit4 por importación del paquete; corregida
  ejecutando desde `backend/`, sin modificar código para ocultar el error.
- Wrapper de entorno existente `local-env.ps1 -TestDatabase`, desde backend:
  `pytest -q -p no:cacheprovider tests/test_security37_pg.py`:7 aprobadas, exit0.
- Mismo entorno: auth_security/auth_postgres/assistant_postgres/
  assistant_cancellation/extraction:67 aprobadas, exit0.
- `python -m upgradejusto.auth.maintenance --dry-run`:exit0, `applied:false`;
  candidatos181 sesiones/396 intentos/0 leases, sin aplicar borrado.
- Frontend `npm run typecheck` y `npm run lint`:exit0 cada uno. Vitest focal de
 11 archivos (nuevos request-body y proxies más consumidores afectados):127 tests,
 exit0. No servidor DEV ni llamada real LLM para estas pruebas.
- Ruff check y format focales iniciales:exit1 por imports/formato; devueltos al
  autor backend para corrección. No son aprobaciones finales.

Fixture PG revisado: migra head y comprueba dos veces seed14 append-only, con
conflictos abortados, sin UPDATE/DELETE del catálogo importado. Procesos consultados
sin imprimir argumentos sensibles; no runner pytest/Playwright/Next/Uvicorn detectado.

Revisión independiente frontend37: sin defecto grave comprobado; solicita dos
carreras focales de EOF/deadline y aborto final. Autor prepara pruebas, sin ampliar UI.
Backend todavía pendiente de revisión independiente y Ruff final.

Recheck posterior: Ruff check0 y format17 archivos0; Build completó mecánicamente
cuatro formatos residuales después del READY del autor, sin cambios semánticos.
Frontend3 nuevas carreras EOF/deadline/aborto aprobadas, exit0 (48 omitidas por filtro,
no fallos). Revisora releyó esas pruebas y dio por resuelta su reserva frontend.
Revisión backend encontró P2 en deadline ASGI: falta comprobación monotónica explícita
antes/después de `receive`, incluido EOF cuando el callback aún no se despacha.
Aceptación37 **pendiente**: autor corrige y añade prueba sintética, más contraste de
recepción que demora cancelación. Cuotas, propiedad/UUID, rollback y retención
revisados favorablemente; no certificación integral ni pentest.38 todavía no leído.

### Privacidad e historial

Respaldo completo verificado `.local/revision37/original-five.bundle`, sin reescribir
los cinco originales. Scanner extendido:393 candidatos/97 blobs históricos únicos;
sin tokens proveedor/GitHub ni claves privadas detectados por heurística. Siete hits
de asignaciones y23 correos revisados: fixtures sintéticas de tests/ejemplos, no
credenciales operativas. URL marcada es f-string dinámica (AST), no secreto literal.
Tres rutas históricas son del proyecto sin home personal; no motivan reescritura.
Otros enlaces apuntan a evidencia local ignorada, no publicada. Dos auto-coincidencias
del detector son patrones del propio scanner, no exportaciones de conversación.
Identidad Git configurada coincide con cinco originales; correo no noreply, valor no
copiado. Tres referencias de sesiones internas se retiraron de documentos nuevos,
con copia previa local; roles/evidencia histórica conservados. Esto no certifica
ausencia total de secretos: resta revisar los diffs seleccionados antes del commit.

Revisor-proyecto mantuvo su restricción de cuatro documentos y no inspeccionó los
candidatos solicitados fuera de perfil; no se atribuye esa revisión a archivos que
no pudo leer. Revisión independiente general, solo lectura focal, inspeccionó scripts
de operación, herramientas/corpus, licencias y README: sin secreto operativo/PII/curso
comprobados en lo leído. Halló párrafo33 presentado como estado actual en README:
marcado histórico, junto con conteos32, sin inventar nuevas ejecuciones. Documento de
cierre Git32 también marcado histórico. La atribución legal Doc Oliver se conserva;
el manifiesto advierte NC/SA y la no redistribución de PDFs completos sin permiso.
Plan local generado con nombres explícitos de348 archivos cambiados/nuevos, ocho
lotes por dependencias; aún sin staging/commits. Diffs de archivos seguidos revisados
y `git diff --check`0 (avisos LF/CRLF existentes); no cubre por sí solo los no seguidos.

Revisión saneada de candidatos/seguidos/historial y privacidad; autores entregan
correcciones, Build pruebas TEST y revisión independiente. Luego lotes de commits
por dependencias reales, cada diff preparado revisado; manifiesto previo a cualquier
push.38 se leerá después de aceptar base37 y preparar commits locales, no antes.

## Aceptación37 y registro local

Autor corrigió el deadline monotónico antes/después de recibir, incluido EOF, con
cancelación no bloqueante y drenaje de errores tardíos. Build:15 body PASS, exit0;
Ruff check/format de los dos archivos0. Revisora independiente releyó exclusivamente
delta y pruebas: **aceptable LOCALMENTE37, sin hallazgos verificables pendientes**.
No pentest/certificación integral ni aprobación de Google/38/publicación.
Límite: event loop/send cooperativos; Python no mata un receive que ignore para
siempre cancelación. Puede persistir tarea residual, sin habilitar downstream.

Commits reales nuevos ya creados por nombres exactos, diffs preparados revisados,
sin fechas/autor inventados:9727c34 cuentas/persistencia;9b0abc2 PCs/catálogo/compat;
1393566 recomendaciones/planes/shares;17d28cf asistente/MCP/RAG;a25eaaa extracción/
admin/composición37;e08ec3a contratos/proxies web;3b362b5 UI/recorridos36.
Los lotes intermedios son composición acumulada, no necesariamente ejecutables solos.
Aviso `git diff --cached --check`2 en lote2: línea vacía final de licencia BuildCores
upstream, preservada para no alterar texto legal; resto de checks de diff0. No fallo
funcional ocultado. Datos/licencias revisados y scanner de índice de lotes3–7 sin
secreto real; fixtures de test explican coincidencias. Operación/docs y manifiesto
final todavía en registro. No push, no reescritura de cinco originales.

Lote8 real:22d31d9 operación/docs. Reescaneo post-lotes:394 archivos candidatos,
13 commits,445 blobs únicos, cero tokens proveedor/GitHub/claves privadas y cero
session IDs internos detectados. Hits repetidos worktree/historia ya clasificados.
Árbol limpio tras ocho commits; `merge-base --is-ancestor c1ced9e HEAD`0, originales
conservados. Manifiesto ampliado con hashes completos y listas exactas de348 archivos;
script de contraste contra `diff-tree` de ocho commits0. Primer contraste de lista8
falló por comparación del literal acentuado del parser PowerShell, no por nombres:
corregido parser ASCII, missing/extra vacíos, contraste completo0. No producto alterado.
Ruff lint del nuevo scanner0. Actualización administrativa posterior selecciona solo
manifiesto, continuidad y esta bitácora.37 local aceptado y commits preparados;
siguiente acción inmediata: leer38. Publicación sigue pendiente de revisión humana,
no bloquea38 ni autoriza push. No se declara producto integral terminado.
