# UpgradeJusto — reglas para agentes

Web para mejorar una PC existente o armar una desde cero según compatibilidad,
objetivo de uso y presupuesto. Trabajo final del curso de Arquitectura de Agentes
(UNLa). Los requisitos de cada caso de uso viven en `openspec/specs/`, no acá.

## Stack y estructura
- `backend/`: FastAPI + SQLAlchemy + Alembic (Python 3.12, `uv`). Monolito modular:
  `auth`, `pcs`, `catalog`, `compatibility`, `recommendations`, `plans`, `shares`,
  `administration`, `extraction`, `assistant`. Capas: router → servicio → repositorio;
  dominio puro sin HTTP/BD/LLM.
- `frontend/`: Next.js 16 + React 19 + Tailwind 4. Leer `frontend/AGENTS.md`.
- PostgreSQL 18 + pgvector. Docker Compose levanta todo (`docker compose up`).
- Chat (CU08): LangChain + LangGraph, proveedor Groq (por defecto) u Ollama, con
  herramientas expuestas por un servidor MCP propio (`assistant/mcp_server.py`).

## Reglas del producto (no negociables)
1. Solo el motor determinístico (`backend/upgradejusto/compatibility`) decide
   compatibilidad. El LLM interpreta y explica; nunca emite el veredicto.
2. Veredictos: `compatible`, `incompatible`, `requiere_verificacion`. Una
   incompatibilidad domina; sin evidencia suficiente → `requiere_verificacion`.
   Desconocido nunca equivale a cero, falso ni compatible. Una referencia por
   familia con fuente cuenta como evidencia y se rotula «según datos de referencia»;
   lo que varía por modelo exacto se avisa («Chequeá…») y no bloquea.
3. Identidad y propiedad se resuelven en el servidor (también en herramientas MCP).
   Nunca aceptar un `user_id` enviado por el cliente o el modelo.
4. Simular no modifica la PC guardada. Una extracción es una propuesta editable que
   requiere confirmación explícita antes de guardarse.
5. No inventar precios, FPS ni datos de fabricante. Precios con moneda, fecha y fuente.
6. Nada de SQL generado por el modelo. Secretos solo por variables de entorno.

## Cómo se trabaja (OpenSpec)
Todo cambio sigue el ciclo: `/opsx-propose` → revisión humana → `/opsx-apply` →
pruebas + revisor → aprobación de Brandon → `/opsx-archive` → commit.
- Un cambio = un objetivo chico y verificable. Si crece, partirlo.
- No implementar nada que no esté en `tasks.md` del cambio activo.
- Marcar una tarea como hecha solo con la prueba correspondiente en verde.
- Ningún agente archiva ni hace commit sin el OK explícito de Brandon.
- Explicar qué se cambió y por qué; no inventar resultados de pruebas.

## Agentes (`.opencode/agents/`)
| Agente | Rol | Modelo |
|---|---|---|
| `orquestador` | Lee el cambio, delega tareas, corre pruebas, reporta | DeepSeek V4.1 Flash |
| `backend` | `backend/` salvo el asistente | DeepSeek V4.1 Flash |
| `asistente-ia` | `backend/upgradejusto/assistant/` (LangChain, LangGraph, MCP, RAG) | Kimi K2.7 Code |
| `frontend` | `frontend/` (fidelidad al sistema de diseño) | Claude Sonnet |
| `infra` | Docker, compose, `scripts/`, `.env.example`, `data/` | Qwen3.8 Flash |
| `documentador` | `README.md` y `docs/` | GLM-5.3 Flash |
| `revisor` | Solo lectura; compara cambio vs. spec y reglas | GPT-6 Luna |

Cada rol usa el modelo más barato que rinde para su tarea; el revisor es de otra
familia que los implementadores a propósito. La planificación (propuestas de
OpenSpec y aprobación final) la hacen Brandon y un modelo de mayor capacidad.

Un solo agente escribe en cada carpeta a la vez. No revertir trabajo ajeno.

## Comandos de verificación
```powershell
# Backend (desde backend/)
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\ruff.exe check . ; .\.venv\Scripts\ruff.exe format --check .
# Frontend (desde frontend/)
npm test ; npm run typecheck ; npm run lint
```
Las pruebas de PostgreSQL necesitan la base levantada (`docker compose up -d db`).

## Git
- Commits chicos, en español, formato `tipo(alcance): descripción`.
- Revisar `git status` y el diff antes de commitear; agregar archivos por nombre.
- Nunca subir `.env`, `material-privado/`, `.local/`, `.tools/` ni credenciales.
- Nada de `git push` sin confirmación de Brandon.
