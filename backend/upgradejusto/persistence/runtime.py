"""Configuración explícita del proceso; sin archivos .env ni fallback."""

import os
from functools import lru_cache
from urllib.parse import urlsplit

from upgradejusto.persistence.database import build_engine


class Unavailable(Exception):
    pass


@lru_cache(maxsize=1)
def runtime_engine():
    value = os.environ.get("DATABASE_URL")
    if not value:
        raise Unavailable
    try:
        return build_engine(value)
    except ValueError:
        raise Unavailable from None


def auth_settings() -> tuple[str, bool]:
    origin = os.environ.get("UJ_ORIGIN", "")
    parsed = urlsplit(origin)
    mode = os.environ.get("UJ_ENV", "production")
    insecure = os.environ.get("UJ_ALLOW_INSECURE_LOOPBACK") == "1"
    if (
        not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.path
        or parsed.query
        or parsed.fragment
        or parsed.scheme not in {"http", "https"}
        or origin != f"{parsed.scheme}://{parsed.netloc}"
    ):
        raise Unavailable
    if insecure and not (
        mode in {"dev", "test"}
        and parsed.scheme == "http"
        and parsed.hostname in {"localhost", "127.0.0.1", "::1"}
    ):
        raise Unavailable
    if parsed.scheme != "https" and not insecure:
        raise Unavailable
    return origin, not insecure
