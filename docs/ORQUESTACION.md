# Orquestación local de desarrollo

Herramientas de desarrollo, no chatbot del producto. Versiones históricamente
comprobadas: OpenCode2.1.1 y Engram3.5.1. Los diez CU siguen como meta; la memoria,
los perfiles y las tareas pendientes no autorizan implementar incrementos nuevos.

## Roles y selección

Build prepara entorno y contrasta evidencia; el coordinador dirige contratos y
seguimiento sin shell ni código producto. Backend/frontend escriben solo sus carpetas;
especialistas no delegan. Revisor independiente no edita ni usa shell.
`revisor-proyecto` conserva su alcance documental previo.

| Tarea/riesgo | Selección30 |
|---|---|
| Mecánica reversible con contrato claro, si delegar aporta | Luna low |
| Implementación/coordinación o corrección localizada | Sol medium |
| Análisis/revisión crítica transversal o de autorización | Astra medium |

Default de los cuatro perfiles editables: Sol medium. Cambiar perfil no cambia
automáticamente la selección almacenada en una sesión. Override nativo model por
llamada probado en30; un cambio de modelo usa hijo nuevo, no una continuación que
retenga el anterior. No invocar todos por rutina, ni inferir disponibilidad de una
entrada de catálogo. Errores de datos, permisos, cuota o proveedor no son incapacidad
del modelo: informar bloqueo, sin rotar cuentas/proveedores ni abrir permisos.

Topes por turno31b: coordinador/backend/frontend32, revisor20. Piloto30 usó20/8/8/12;
no aplicar esos topes históricos como estado vigente. Steps no son tokens, dinero,
garantía de cierre o éxito por agotamiento. No estimar cuota restante.

## Contratos y evidencia mínima

- Antes de delegar: objetivo, riesgo, aceptación, responsable/modelo y criterio de
  salida. Contrato API antes del frontend. Handoff objetivo<=600 palabras, retorno
  <=300 ampliable por evidencia: archivos, comandos/códigos, resultados y pendientes.
- Checkout compartido: no dos escritores por archivo, no revertir ajenos. Lecturas
  por rangos pertinentes; repetir solo por cambio, contradicción o incompletitud.
- Checks durante el bloque y una revisión independiente al final; corrección
  diagnosticada por su dueño y relectura solo del delta, no auditorías duplicadas.
- Registrar rechazo/fallo real, corrección y comprobación posterior. No declarar0
  por salida sin error ni por outcome de sesión. No pipes que oculten fallos.
- CONTINUAR resume estado/próximo punto, bitácoras conservan evidencia técnica, no
  conversaciones. No ejecutar suite ni pilotos otra vez por rutina.

En31b se autorizó CU04→CU01→CU03→CU05, con cortes verificables. CU04 funciona;
CU01 es solo preparación PG, CU03/CU05 web y R01 siguen pendientes. Sin PostgreSQL
no sustituir por SQLite/memoria ni aprobar autenticación/persistencia.

## Memoria, configuración y privacidad

Solo con autorización de tarea: memoria técnica mínima, proyecto explícito,
capture_prompt:false; especialistas retornan hechos, no escriben memoria.
Identidad por cwd no garantiza contexto registrado; el bootstrap histórico usó
sesión real, nunca una ficticia. Guardado y recuperación explícitos29/29b fueron
comprobados; no prueban captura automática, compactación o aislamiento de proyectos.
Lo recuperado puede enviarse al proveedor. **31c no consulta ni modifica memoria.**

Perfiles reales `.opencode/`, `opencode.json`, `.tools/`, `.local/` y respaldos
permanecen ignorados. No leer almacenes privados ni versionar bases/trazas. No
copiar configuración personal para reproducir un caso. El [ejemplo de handoff](../examples/orchestration/handoff.md)
conserva un contrato portable sin activación ni configuración del proveedor.
No se distribuye una configuración completa de agentes/MCP: requeriría revisión
específica de rutas, schema, herramientas y permisos del entorno destino.

En29 se instaló el tag público Engram3.5.1 comprobando SHA256 del ZIP y ejecutable,
entradas del archivo y destino de extracción. Windows sin firma; checksum no equivale
a auditoría. Datos/configuración absolutos quedaron locales, con autosync desactivado.
No reinstalar ni tocar almacenes existentes por estas notas. Para desactivar,
revisar solo la entrada local correspondiente, preservar datos y configuración
ajena; no restaurar respaldos a ciegas. Reload puede cancelar operaciones (ocurrió
en29);29b no lo necesitó. No recargar durante trabajo activo por rutina.

Permisos no son sandbox del SO; shell conserva autoridad del usuario. Code Mode
solo habilita herramientas expresamente permitidas, no acceso administrativo general.
Ver [PERMISOS](PERMISOS.md), [AGENTES](AGENTES.md), [MCP](MCP.md).

## Evidencia histórica

- [29/29b](ai-log/2026-10-20-etapa29-orquestacion-engram.md): motor parcial verificado,
  guardado y recuperación explícitos.
- [30](ai-log/2026-10-20-etapa30-modelos-contexto.md): override real, control sintético
  y revisión, sin afirmar ahorro o superioridad de modelos.
- [31b](ai-log/2026-10-20-sprint31b-web.md): catálogo real y preparación PG.

Fuentes históricas: <https://opencode.ai/v2/docs/agents/>,
<https://opencode.ai/v2/docs/permissions/>, <https://opencode.ai/v2/docs/mcp-servers/>,
<https://github.com/Gentleman-Programming/engram/blob/v3.5.1/docs/AGENT-SETUP.md>.
