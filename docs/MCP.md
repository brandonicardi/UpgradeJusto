# Servidores MCP

| Servidor | Tipo | Dónde | Para qué |
|---|---|---|---|
| Context7 | Externo (remoto) | `.mcp.json` (y `opencode.json`) → `https://mcp.context7.com/mcp` | Documentación vigente de FastAPI, LangChain, Next.js, OpenSpec, uv, etc., antes de escribir código. |
| GitHub | Externo (local, solo lectura) | `.mcp.json` → `.opencode/scripts/github-mcp.ps1` | Consultar el repositorio, PRs y Actions con el token de `gh`. |
| Engram | Local | `opencode.json` (ignorado por Git) | Memoria persistente de decisiones entre sesiones de agentes. |
| upgradejusto (upgrade-mcp, propio) | Del producto | `.mcp.json` → `backend/upgradejusto/assistant/mcp_server.py` | Herramientas de solo lectura del chat: leer PC, evaluar compatibilidad, simular, catálogo, planes, recomendaciones y búsqueda documental. |

`.mcp.json` (raíz, versionado) lista los tres servidores del proyecto. `opencode.json` es local:
agrega Engram y tiene rutas propias de cada máquina.

## Cómo se usa
- **Desarrollo:** los agentes de `.opencode/agents/` consultan Context7 antes de usar
  una API. Ejemplo verificado: consulta de la estructura de OpenSpec y de `uv.lock`.
- **Producto:** el grafo LangGraph (`assistant/graph.py`) abre el servidor MCP propio
  por stdio en cada turno, lista sus herramientas y las llama mediante el protocolo.
  El subproceso no recibe la clave del LLM y valida la sesión del dueño en cada llamada.

Ningún archivo de configuración contiene secretos: el token de GitHub sale de `gh auth token`
en el momento y la clave de Groq vive solo en `.env` (ignorado por Git).
