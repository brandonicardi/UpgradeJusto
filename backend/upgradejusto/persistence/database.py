"""Construcción explícita de engine; importar no lee entorno ni conecta."""

from sqlalchemy import create_engine
from sqlalchemy.engine import URL, Engine, make_url
from sqlalchemy.exc import ArgumentError


def validate_database_url(value: str) -> URL:
    try:
        url = make_url(value)
    except (ArgumentError, TypeError, ValueError):
        raise ValueError("DATABASE_URL must be a PostgreSQL psycopg URL") from None
    if url.drivername != "postgresql+psycopg":
        raise ValueError("Only postgresql+psycopg is supported")
    if not url.host or not url.database:
        raise ValueError("DATABASE_URL requires an explicit host and database")
    return url


def build_engine(value: str) -> Engine:
    # create_engine no abre una conexión; ésta se solicita al usar begin/connect.
    return create_engine(
        validate_database_url(value),
        pool_pre_ping=True,
        hide_parameters=True,
        connect_args={"connect_timeout": 5},
    )
