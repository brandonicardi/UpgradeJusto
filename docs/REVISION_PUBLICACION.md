# Revisión previa a publicación — SOLO LOCAL, pendiente

**No hay autorización de push.** Este manifiesto todavía no habilita publicación.
Los avances acumulados se registrarán con fecha/autor configurados reales, no como
historia diaria retrospectiva. Los cinco commits originales se conservan.

## Destino contrastado

- Repositorio: `https://github.com/brandonicardi/UpgradeJusto`, **público**.
- Origin local: el mismo HTTPS; rama local `codex/base-backend`.
- GitHub MCP real: identidad `brandonicardi`, repositorio owner correcto, permisos
  admin/push; `list_commits` respondió409 repositorio vacío. No se hizo push.
- Antes de publicar: mostrar este manifiesto completado, commits, archivos, destino
  y visibilidad al usuario para su revisión. No force-push ni borrado remoto.

## Historia preservada y lotes previstos

Originales, antiguos primero: `388818d`, `c25ff31`, `ee7248e`, `347a87a`, `c1ced9e`.
Respaldo bundle local verificado. Autor configurado coincide con los cinco; correo
no noreply, no se reproduce su valor aquí. Publicar Git revela metadatos de autor.

Nuevos commits: **todavía ninguno**. Orden propuesto por dependencias reales:

1. Persistencia/cuentas: runtime PG, autenticación, seguridad/cuotas y migraciones.
2. PCs/compatibilidad/catálogo: dominio básico, importador curado y fuentes/licencias.
3. Recomendaciones/planes/shares: servicios, contratos y snapshots versionados.
4. Asistente/MCP/RAG: coordinación, herramientas, streaming e historial.
5. Extracción/admin y composición HTTP: confirmación, roles y wiring compartido.
6. Frontend funcional y rediseño: consumidores, límites de entrada y pruebas.
7. Operación/documentación/herramientas: scripts revisados y evidencia declarada.

Los archivos compartidos no se fraccionarán artificialmente: composición final puede
completar dependencias introducidas antes. La lista por lote y hashes se incorporará
después de revisar diffs preparados; esta lista de áreas no los sustituye.

## Exclusiones y límites de la evidencia

Fuera de Git: `.env`, credenciales, keyring, `.local/`, `.tools/`, `.opencode/`,
workspace privado, material del curso privado, temporales, bases/respaldos, capturas
locales y conversaciones internas. Ignorar no basta: scanner contrasta también los
archivos seguidos y blobs históricos. No leer ni copiar secretos para comprobarlo.

Las capturas referidas mediante rutas locales ignoradas **no están en GitHub**.
Los registros de ejecuciones históricas son evidencia registrada, no pruebas nuevas.
Los nuevos handoffs no prueban aceptación; los tests37 corresponden a Build TEST.

Muestra de hardware: BuildCores OpenDB revisión
`2403cab88630625912cdd2f152f1bb1e27f8ff4d`, CC BY-NC-SA4.0 (no permiso comercial);
docyx pc-part-dataset revisión `c52a04ca9465c83997ed335f7767b09a2005dd26`, MIT.
Licencias y NOTICE conservados en `backend/data/hardware-import/`; raw-sample e
índice seleccionan registros y el importador normaliza/quarantina sin ejecutar
scripts externos. Precios docyx históricos USD no se convierten en ARS actuales.
Si se publican adaptaciones de datos BuildCores sujetas a licencia, mantener
atribución/cambios/ShareAlike aplicables; no atribuir esa licencia al código propio.

Scanner heurístico y revisión manual: sin tokens de proveedor/GitHub ni claves
privadas detectados; hits clasificados de fixtures sintéticas, URL dinámica y rutas
del proyecto/evidencia. No equivale a certificación de ausencia de secretos. Un
secreto real bloqueará publicación; eliminarlo cosméticamente no sanea el historial.
Identificadores internos innecesarios retirados de documentos nuevos con respaldo
local. Cinco originales no reescritos por rutas inocuas.

## Gates pendientes

- Cierre de Ruff backend, carreras focales frontend y revisión seguridad backend.
- Revisión final de archivos nuevos/seguidos, licencias y diffs seleccionados.
- Commits locales reales, lista completa por lote y hashes.
- Mostrar manifiesto final antes de cualquier publicación; esperar no detiene38.

Detalle de herramientas, comandos, resultados y fallos corregidos en
[bitácora37](ai-log/2026-10-26-revision37-seguridad-git.md).
