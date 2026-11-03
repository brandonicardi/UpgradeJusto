# Servidores MCP

| Servidor | Tipo | Dónde | Para qué |
|---|---|---|---|
| Context7 | Externo (remoto) | `opencode.json` → `https://mcp.context7.com/mcp` | Documentación vigente de FastAPI, LangChain, Next.js, OpenSpec, uv, etc., antes de escribir código. |
| GitHub | Externo (local, solo lectura) | `.opencode/scripts/github-mcp.ps1` | Consultar el repositorio, PRs y Actions con el token de `gh`. |
| Engram | Local | `opencode.json` | Memoria persistente de decisiones entre sesiones de agentes. |
| upgrade-mcp (propio) | Del producto | `backend/upgradejusto/assistant/mcp_server.py` | Herramientas de solo lectura del chat: leer PC, evaluar compatibilidad, simular, catálogo, planes y búsqueda documental. |

## Cómo se usa
- **Desarrollo:** los agentes de `.opencode/agents/` consultan Context7 antes de usar
  una API. Ejemplo verificado: consulta de la estructura de OpenSpec y de `uv.lock`.
- **Producto:** el grafo LangGraph (`assistant/graph.py`) abre el servidor MCP propio
  por stdio en cada turno, lista sus herramientas y las llama mediante el protocolo.
  El subproceso no recibe la clave del LLM y valida la sesión del dueño en cada llamada.

Ningún archivo de configuración contiene secretos: el token de GitHub sale de `gh auth token`
en el momento y la clave de Groq vive solo en `.env` (ignorado por Git).
