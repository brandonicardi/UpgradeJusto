# MCP de desarrollo: evidencia y límites

No es el asistente del producto ni prueba CU08. Configuración real `opencode.json`
local ignorada; no contiene ejemplos activados desde el repositorio.

## Evidencia histórica (2026-10-20)

- Context7 se configuró inicialmente en OpenCode1.19.3 y luego se verificó con
  OpenCode2.1.1: conexión y consulta real se registraron por separado. En V2 se
  invocaron resolve-library-id y query-docs mediante Code Mode, con biblioteca
  `/astral-sh/uv`, sin enviar archivos locales ni credenciales. Resultado:
  pyproject declara requisitos; uv.lock conserva resolución exacta y lo administra
  uv, no se edita manualmente. No se hizo login ni se agregó clave para esa prueba.
- Etapa29 migró la estructura MCP local a V2: Engram3.5.1 por stdio, Context7
  remoto en <https://mcp.context7.com/mcp>, sin duplicación de servidor ni cambios
  de proveedor/autenticación. Consulta real Pydantic strict/frozen realizada;
  frozen no implica inmutabilidad recursiva.
- Engram: el primer guardado falló unknown_project aun con identidad detectada por
  cwd. Tras registrar explícitamente la sesión real y el directorio se logró guardar
  una observación técnica mínima. En29b otra primaria buscó con proyecto explícito
  y leyó el resultado, contrastado con el original. No se suministró la respuesta
  ni se importó historial al encargo. Una búsqueda con proyecto desconocido fue
  rechazada: no es una prueba de aislamiento entre proyectos existentes.
- Etapa30 y31b registraron cada una una decisión técnica final mínima, sin captura
  de prompts.31c no abre ni consulta ese almacén ni repite estos circuitos.

## Privacidad y operación

Memoria explícita local no equivale a captura automática, restauración de
compactaciones o aislamiento. Lo recuperado puede enviarse al proveedor del modelo.
Buscar por proyecto no es barrera de seguridad y obtener por ID no prueba propiedad.
Guardar solo hechos técnicos comprobados con alcance y pendientes,
`capture_prompt:false`, sin prompts, conversaciones, personas ni secretos.
No inventar IDs de sesiones o tokens de recuperación para superar errores.

Mantener binarios en `.tools/`, datos en `.local/` y configuración real fuera de Git.
La configuración histórica desactivó autosync explícitamente; eso no es auditoría
de red. Conexión no prueba uso, y uso de MCP no certifica producto o publicación.
No repetir `mcp --help` como ayuda: en el tag usado inicia stdio y puede abrir el
almacén por defecto sin entorno explícito. No activar o instalar durante31c.

Fuentes públicas históricas:
- <https://github.com/astral-sh/uv/blob/main/docs/guides/projects.md>
- <https://github.com/astral-sh/uv/blob/main/docs/concepts/projects/layout.md>
- <https://github.com/astral-sh/uv/blob/main/docs/concepts/resolution.md>
- <https://opencode.ai/v2/docs/mcp-servers/>
- <https://github.com/Gentleman-Programming/engram/releases/tag/v3.5.1>

Evidencia resumida: [29/29b](ai-log/2026-10-20-etapa29-orquestacion-engram.md).
Operación y límites: [ORQUESTACION](ORQUESTACION.md).
