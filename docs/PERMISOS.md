# Permisos locales de desarrollo

Registro técnico, no sandbox del sistema operativo. Política: [ORQUESTACION](ORQUESTACION.md).

## Configuración y evidencia histórica

En OpenCode2.1.1 (2026-10-20), se agregó en configuración local una regla
`external_directory / * / ask`. Se consultó la configuración efectiva del proyecto:
la regla cargaba después de la base y resolvía ask. No cambió configuración global
ni otras reglas. **No se observó el aviso interactivo** ni se accedió a privados
para probarlo. Aprobaciones guardadas y modos de ejecución pueden afectar los avisos.

Los perfiles29 parten de deny y agregan excepciones acotadas. La última regla
coincidente prevalece; los comodines simples no equivalen a globs de shell.
Se contrastaron39 casos con un evaluador local de reglas efectivas: validación de
configuración, no39 ejecuciones reales ni garantía de aislamiento. Hubo denegaciones
reales de lectura y de shell compuesto fuera de allowlist; no se abrieron permisos
para eludirlas. Los códigos de ejecutables se corroboraron por metadatos, no se
inventaron cuando faltaban en la representación textual.

## Alcance31b, no autorización futura

- Coordinador: documentos/specs de CU04/01/03/05 y seguimiento asignado; delegación
  enumerada; sin shell, edición de producto o de sus propios permisos. MCP explícito
  solo según autorización de la tarea, sin acceso administrativo general.
- Backend: fuentes/pruebas/migraciones bajo backend/, excluyendo entorno y secretos;
  comandos exactos de pytest, Ruff y comprobación uv. No instalación general.
- Frontend: fuentes/configuración bajo frontend/, excluyendo dependencias y salidas;
  scripts exactos de tipos, lint, pruebas y build. No instalación general.
- Revisor: lectura de código/specs/evidencia pertinente; sin edición/shell/delegación.
- Especialistas sin escritura de memoria. Build hizo setup local autorizado en31b.
  El cambio de modelo no amplía permisos. Topes32/32/32/20 no son permisos ni cuota.

Las excepciones31b sustituyeron los límites de piloto30 (20/8/8/12); no afirmar que
las políticas actuales solo cubren tooling29 ni que habilitan cualquier CU futuro.
En31c solo se revisan archivos del proyecto y Git alcanzable; no se abre memoria.

## Límites y conservación

Shell ejecuta código con autoridad del usuario; los controles de directorios son
best-effort. Read no controla lecturas internas de un programa. Denegar execute
retira Code Mode; permitirlo no elimina controles de herramientas anidadas.
No utilizar glob/grep como sustituto de restricciones fiables por carpeta.
Credenciales, bases de sesiones, respaldos y binarios no son fuentes de revisión.
Reload puede cancelar operaciones: programarlo solo si hace falta y es seguro.

Perfiles/configuración personal siguen ignorados, no se copian ni activan ejemplos
por defecto. Ver [AGENTES](AGENTES.md), [MCP](MCP.md) y las bitácoras enlazadas allí.
Fuentes históricas: <https://opencode.ai/v2/docs/permissions/>,
<https://opencode.ai/v2/docs/migrate-v1/>, <https://opencode.ai/v2/openapi.json>.
