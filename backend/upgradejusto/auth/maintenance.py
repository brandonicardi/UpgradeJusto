"""Explicit, dry-run-first retention; never deletes users/PCs/conversations.

Only old terminal sessions, old counters and expired leases; SQL foreign keys
remain restrictive and unexpected references cause rollback, never cascade.
"""

import argparse
import json
import os
from datetime import timedelta

import sqlalchemy as sa

from upgradejusto.auth.provider_budget import ProviderBudget, leases
from upgradejusto.persistence.runtime import runtime_engine
from upgradejusto.persistence.schema import attempts, sessions


class AuthMaintenance:
    def __init__(self, engine):
        self.engine = engine

    def retain(self, *, apply=False, age_hours=24):
        if type(age_hours) is not int or not 24 <= age_hours <= 8760:
            raise ValueError("Retention age must be24..8760hours")
        with self.engine.begin() as conn:
            ProviderBudget.lock(conn)
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            cutoff = now - timedelta(hours=age_hours)
            targets = (
                (
                    sessions,
                    sa.or_(
                        sessions.c.expires_at <= cutoff, sessions.c.revoked_at <= cutoff
                    ),
                ),
                (attempts, attempts.c.started_at <= cutoff),
                (leases, leases.c.expires_at <= cutoff),
            )
            counts = {}
            for table, condition in targets:
                if apply:
                    counts[table.name] = conn.execute(
                        table.delete().where(condition)
                    ).rowcount
                else:
                    counts[table.name] = conn.scalar(
                        sa.select(sa.func.count()).select_from(table).where(condition)
                    )
            return {"applied": apply, "age_hours": age_hours, "rows": counts}


def main():
    parser = argparse.ArgumentParser(
        description="Explicit local auth retention; dry-run by default"
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true")
    mode.add_argument("--dry-run", action="store_true")
    parser.add_argument("--age-hours", type=int, default=24)
    args = parser.parse_args()
    if os.environ.get("UJ_ENV") != "test":
        parser.error(
            "Security37 maintenance CLI is restricted to explicit TEST configuration"
        )
    print(
        json.dumps(
            AuthMaintenance(runtime_engine()).retain(
                apply=args.apply, age_hours=args.age_hours
            )
        )
    )


if __name__ == "__main__":
    main()
