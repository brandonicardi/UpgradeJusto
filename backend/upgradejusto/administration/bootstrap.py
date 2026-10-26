"""Explicit local CLI; never creates accounts or grants roles through HTTP."""

import argparse
import os

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError

from upgradejusto.administration.tables import roles
from upgradejusto.persistence.runtime import Unavailable, runtime_engine
from upgradejusto.persistence.schema import users


def grant(engine, email, confirmed):
    mode = os.environ.get("UJ_ENV")
    if not confirmed or mode not in {"dev", "test"}:
        raise ValueError("Explicit dev/test confirmation required")
    if (
        email != email.strip().lower()
        or not email.endswith("@example.test")
        or email.count("@") != 1
        or not email.split("@")[0]
    ):
        raise ValueError("Explicit project test account required")
    url = engine.url
    if not (
        engine.dialect.name == "postgresql"
        and engine.dialect.driver == "psycopg"
        and url.drivername == "postgresql+psycopg"
        and url.host == "127.0.0.1"
        and url.port == 55433
        and url.database == f"upgradejusto_{mode}"
        and url.username == f"upgradejusto_{mode}_app"
        and not url.query
    ):
        raise ValueError("Exact project dev/test PostgreSQL target required")
    with engine.begin() as conn:
        identity = conn.scalar(
            sa.select(users.c.id).where(users.c.email == email).with_for_update()
        )
        if identity is None:
            raise ValueError("Designated account must already exist")
        conn.execute(
            insert(roles)
            .values(user_id=identity, role="admin")
            .on_conflict_do_nothing()
        )


def main():
    parser = argparse.ArgumentParser(
        description="Grant admin to explicitly designated NEW project test account"
    )
    parser.add_argument("--email", required=True)
    parser.add_argument(
        "--confirm-project-test-account", action="store_true", required=True
    )
    args = parser.parse_args()
    try:
        grant(runtime_engine(), args.email, args.confirm_project_test_account)
    except (ValueError, SQLAlchemyError, Unavailable):
        print("Bootstrap refused; check local test designation and migration")
        return 1
    print("Project test administrator designated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
