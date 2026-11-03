# Arquitectura

```
Navegador ──► Next.js (frontend/, :3000)
                 │  app/api/** reenvía con sesión + CSRF + firma HMAC del proxy
                 ▼
              FastAPI (backend/, :8000) ── monolito modular
                 │
   ┌─────────────┼───────────────────────────────┐
   auth   pcs   catalog   compatibility   recommendations   plans   shares   administration
                 │                 ▲
                 │                 │ (solo lectura, verifica propiedad)
              assistant ── LangGraph ──► servidor MCP propio (stdio) ──► servicios
                 │
              Groq / Ollama (LLM)          PostgreSQL 18 + pgvector (datos y RAG)
```

## Decisiones principales
| Decisión | Por qué |
|---|---|
| Monolito modular en lugar de microservicios | Un solo despliegue; cada módulo es dueño de sus tablas y expone un servicio. |
| Motor de compatibilidad determinístico y puro | El veredicto tiene que ser reproducible y testeable; el LLM solo explica. |
| Tres veredictos (`compatible`, `incompatible`, `requiere_verificacion`) | Un dato desconocido no puede volverse «encaja». |
| El chat usa herramientas vía MCP propio | El modelo no accede a la base: llama a los mismos servicios que la web, con los mismos controles. |
| Identidad resuelta en el servidor | Ni el navegador ni el modelo pueden pedir datos de otra persona. |
| Next.js como proxy del backend | El backend no se expone al navegador; la cookie de sesión queda en el mismo origen. |
| OpenSpec para cada cambio | Cada requisito tiene spec, tareas y pruebas antes del código. |

Detalle de cada caso de uso: [`openspec/specs/`](../openspec/specs/).
