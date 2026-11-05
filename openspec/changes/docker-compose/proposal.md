# Proposal

## Why

Los docentes corrigen descargando el repositorio y levantándolo con el README. Hoy la app
depende de un PostgreSQL portable con permisos de una instalación anterior, de scripts
PowerShell y de datos en `.local/` que no están en Git: nadie más puede levantarla.

## What Changes

- `docker-compose.yml` en la raíz con tres servicios: `db` (PostgreSQL 18 + pgvector),
  `backend` (FastAPI) y `frontend` (Next.js), con healthchecks y orden de arranque.
- `backend/Dockerfile` y `frontend/Dockerfile` multi-stage con versiones fijas, más
  `.dockerignore` en cada uno.
- Arranque idempotente del backend: migraciones Alembic, seed del catálogo, publicación
  de los datos técnicos y de los 677 productos de `data/catalogo/lotes/`.
- `.env.example` con todas las variables necesarias y sin secretos; el secreto del
  proxy interno se genera solo en el primer arranque.
- El servidor del frontend acepta un host de escucha configurable (`UJ_WEB_HOST`),
  manteniendo `127.0.0.1` por defecto.
- Fuera de alcance: Ollama dentro de Docker, RAG/embeddings, despliegue en la nube,
  CI. El login con Google queda deshabilitado si no se configura su client id.

## Capabilities

### New Capabilities
- `entorno-ejecucion`: cómo se levanta la aplicación completa en una máquina nueva,
  con datos de demostración y sin exponer secretos.

### Modified Capabilities
(ninguna)

## Impact

- Nuevos: `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`,
  `.dockerignore` ×2, `scripts/docker/` (entrypoints), `data/catalogo/`.
- Modificados: `frontend/server.mjs` (host configurable), `.env.example`.
- Backend: un módulo de carga de datos de demostración invocable por línea de comandos.
- Requiere Docker Desktop instalado para verificar.
