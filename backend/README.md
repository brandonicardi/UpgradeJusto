# Backend de UpgradeJusto

API FastAPI (Python 3.12) con PostgreSQL + pgvector. Reglas y mapa de módulos:
[AGENTS.md](AGENTS.md). Requisitos por caso de uso: [`../openspec/specs/`](../openspec/specs/).

## Levantar
La forma recomendada es Docker Compose desde la raíz del repo (ver README principal).

Sin Docker:
```powershell
uv sync --locked --group dev          # crea .venv con versiones fijas
.\.venv\Scripts\python.exe -m alembic -c alembic.ini upgrade head
.\.venv\Scripts\python.exe -m upgradejusto.persistence.seed
.\.venv\Scripts\python.exe -m uvicorn upgradejusto.main:app --port 8000
```

## Pruebas
```powershell
$env:UJ_TEST_POSTGRES="0"; .\.venv\Scripts\python.exe -m pytest -q   # unitarias
.\.venv\Scripts\ruff.exe check . ; .\.venv\Scripts\ruff.exe format --check .
```
