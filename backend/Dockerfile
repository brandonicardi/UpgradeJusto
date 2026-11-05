# syntax=docker/dockerfile:1

# Etapa 1: resuelve solo dependencias de producción con uv (sin pytest/ruff).
# python:3.12.13-slim y uv==0.11.16 se corresponden con backend/.python-version,
# backend/.venv/pyvenv.cfg (version_info 3.12.13, uv 0.11.16) y uv.lock revision 3.
FROM python:3.12.13-slim AS deps
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1
RUN pip install uv==0.11.16
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev

# Etapa 2: imagen final con el venv, la app, Alembic y los datos técnicos.
FROM python:3.12.13-slim
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    VIRTUAL_ENV=/app/.venv \
    PATH="/app/.venv/bin:${PATH}"
WORKDIR /app
COPY --from=deps /app/.venv /app/.venv
COPY alembic.ini ./
COPY alembic ./alembic
COPY upgradejusto ./upgradejusto
COPY data ./data
# El entrypoint real (secretos + demo_seed + uvicorn) se monta desde ./scripts/docker;
# se invoca con "sh <script>" desde compose, por eso no depende del bit de ejecución.
# Solo loopback: el frontend comparte este network namespace y el 8000 no se publica.
CMD ["uvicorn", "upgradejusto.main:app", "--host", "127.0.0.1", "--port", "8000"]
