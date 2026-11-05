#!/bin/sh
# Entrypoint del frontend: lee el secreto compartido y arranca el server de Next.
set -eu

# El backend crea /secretos/proxy en el primer arranque; sin él las firmas HMAC
# del gateway fallarían igual, así que se aborta temprano (fail closed).
if [ ! -s /secretos/proxy ]; then
    echo "Falta /secretos/proxy: el servicio backend debe arrancar primero" >&2
    exit 1
fi
export UJ_PROXY_SECRET="$(cat /secretos/proxy)"

exec node server.mjs
