# Preparación del cierre Git — sin ejecución de staging/commit/push

> Registro histórico32, no estado vigente. La autorización posterior37/38 permite
> commits locales y exige revisión/manifiesto; no push automático. Estado actual en
> [CONTINUAR](CONTINUAR.md) y [REVISION_PUBLICACION](REVISION_PUBLICACION.md).

## Conservación comprobada

Los cinco commits previos permanecen: `388818d`, `c25ff31`, `ee7248e`, `347a87a`,
`c1ced9e`. No se reescribió historia ni se descartaron cambios del Sprint32.
Antes del futuro cierre, volver a contrastar HEAD, índice y contenido completo.

## Avances para agrupar y seleccionar por nombre

- Backend: cuentas/sesiones y catálogo PostgreSQL; PCs por propietario; CU05 R01 y
  simulación; previews conservadoras; planes acumulados; publicaciones revocables;
  asistente, MCP propio y pipeline vectorial. Migraciones aditivas y tests asociados.
- Frontend: cuenta/PCs/evaluación/previews/planes/compartir/chat, gateways cerrados,
  fixtures de sockets y pruebas separadas CLI/LIVE.
- Setup raíz: PostgreSQL/pgvector local, helpers, migración/seed, TLS/proveedor,
  modelos/corpus públicos fijados, proofs de reinicio y MCP externo opcional.
- Documentación: contratos, README, matriz, continuidad breve, demo y cronología.
- Dependencias nuevas: revisar expresamente `backend/pyproject.toml`,
  `backend/uv.lock`, `tools/browser-mcp/{package.json,package-lock.json,config.json}`
  y manifiestos públicos `tools/{embeddings-model,public-corpus}.json`.

No seleccionar por directorio a ciegas. Los resultados de cada gate y sus fallos
diagnosticados están en la bitácora; esta lista no aprueba el producto completo.
CU05/CU06 no tienen positivos globales; CU02/CU10 siguen pendientes.

## Privacidad y publicación pendiente

Revisión focal actual: ningún path prohibido seguido ni literal de clave Groq/ID
de sesión en candidatos públicos; `.env` ignorado. No equivale a auditoría exhaustiva.
La clave cargada se comparó también en memoria contra los candidatos públicos sin
imprimirla: cero coincidencias. Índice vacío y HEAD `c1ced9e` corroborados al cierre.
`git diff --check` terminó en0 con avisos LF→CRLF de la configuración existente;
no se cambió normalización global ni se presenta como auditoría de archivos no seguidos.
No incluir `.local/`, `.tools/`, `.opencode/`, `opencode.json`, `.env`, bases/modelos
descargados, PDFs completos, logs, chats, cookies o IDs operativos.

El historial anterior aún contiene rutas locales absolutas en documentos:
`ee7248e` tres, `c25ff31` dos y `388818d` uno. Los snapshots saneados posteriores
no borran esos blobs. No se autorizó su reescritura ni publicación.

Antes de cualquier push: revisión con el usuario de commits, archivos, contenido,
destino y visibilidad. No configurar remotos ni publicar para completar un compromiso
de GitHub MCP; ese MCP no estuvo expuesto en el catálogo de esta ejecución.
