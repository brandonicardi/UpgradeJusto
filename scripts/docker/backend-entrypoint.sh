#!/bin/sh
# Entrypoint del backend: secreto del proxy interno, carga de demo y uvicorn.
# Invariante de seguridad: uvicorn solo escucha en loopback; el frontend comparte
# este network namespace (network_mode: service:backend) y firma por HMAC.
set -eu

# 64 caracteres hexaleatorios (>=32 que exige proxy_ip.py), creados una sola vez.
if [ ! -s /secretos/proxy ]; then
    python -c 'import secrets; print(secrets.token_hex(32), end="")' > /secretos/proxy
    chmod 600 /secretos/proxy
fi
export UJ_PROXY_SECRET="$(cat /secretos/proxy)"

: "${DATABASE_URL:?DATABASE_URL debe inyectarla docker-compose}"

# Idempotente: migraciones + seed + datos técnicos + lotes; sale 0 si ya estaban.
python -m upgradejusto.demo_seed

exec uvicorn upgradejusto.main:app --host 127.0.0.1 --port 8000
