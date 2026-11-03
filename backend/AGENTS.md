# Backend — reglas para agentes

Complementa el `AGENTS.md` de la raíz. Leé también la spec del cambio activo
en `openspec/changes/` y la capacidad afectada en `openspec/specs/`.

## Estructura (`upgradejusto/`)
| Módulo | Responsabilidad | Spec |
|---|---|---|
| `auth/` | Cuentas, sesiones, roles, Google | `cuentas` |
| `extraction/` | Texto → propuesta de PC editable | `extraccion-pc` |
| `pcs/` | PCs (torre de 9 categorías) por dueño | `pcs` |
| `catalog/`, `retail/`, `catalog_import/` | Componentes, ofertas, fotos | `catalogo` |
| `compatibility/` | Motor determinístico (dominio puro) | `compatibilidad` |
| `recommendations/` | Mejoras por objetivo y presupuesto | `recomendaciones` |
| `plans/` | Planes por etapas | `planes` |
| `shares/` | Enlaces públicos de solo lectura | `compartir-planes` |
| `administration/` | Catálogo y reglas (rol admin) | `administracion` |
| `assistant/` | Chat LangGraph + servidor MCP propio | `asistente` |
| `api/` | Routers FastAPI; `main.py` los monta | — |
| `persistence/` | Engine, seed, base | — |

Capas: `api/` (router) → `service.py` → `repository.py` → tablas. Un módulo no
escribe tablas de otro: llama a su servicio.

## Reglas
- `compatibility/` no importa FastAPI, SQLAlchemy ni LangChain.
- El usuario sale de la sesión (`auth`), nunca del body ni de la query.
- Las herramientas MCP del asistente son de solo lectura y verifican propiedad.
- Cambios de esquema: nueva migración en `alembic/versions/`, nunca editar una vieja.
- Dinero con `Decimal` y moneda; nunca `float`.
- Proveedores externos (Groq, Ollama, Google) con timeout y error controlado.

## Pruebas (desde `backend/`)
```powershell
$env:UJ_TEST_POSTGRES="0"; .\.venv\Scripts\python.exe -m pytest -q   # sin base
.\.venv\Scripts\ruff.exe check . ; .\.venv\Scripts\ruff.exe format --check .
```
Con la base de Docker levantada, las pruebas de integración usan
`UJ_TEST_POSTGRES=1`, `UJ_ENV=test` y la base de test en `127.0.0.1:55433`
(ver `scripts/test-backend.ps1`).

Toda lógica nueva lleva prueba en `tests/test_<modulo>_*.py`.
