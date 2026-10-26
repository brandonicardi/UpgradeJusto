"""Escrituras CU01 exclusivamente PostgreSQL; transacciones explícitas."""

from datetime import timedelta

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert

from upgradejusto.auth.limits import setting
from upgradejusto.auth.security import digest
from upgradejusto.persistence.schema import attempts, sessions, users


class AuthRepository:
    def __init__(self, engine):
        self.engine = engine

    def session(self, raw):
        if not raw:
            return None
        with self.engine.connect() as conn:
            return (
                conn.execute(
                    sa.select(sessions).where(
                        sessions.c.digest == digest(raw),
                        sessions.c.revoked_at.is_(None),
                        sessions.c.expires_at > sa.func.now(),
                    )
                )
                .mappings()
                .first()
            )

    def create_session(self, raw, csrf, ip):
        retry = 0
        limit = setting("UJ_CSRF_ISSUES_PER_15M", 30, 1, 300)
        with self.engine.begin() as conn:
            conn.exec_driver_sql("SET LOCAL statement_timeout = '3000ms'")
            conn.exec_driver_sql("SET LOCAL lock_timeout = '2000ms'")
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            key = digest("csrf-issue:" + ip)
            expired = attempts.c.started_at <= now - timedelta(minutes=15)
            statement = insert(attempts).values(key=key, started_at=now, count=1)
            row = (
                conn.execute(
                    statement.on_conflict_do_update(
                        index_elements=[attempts.c.key],
                        set_={
                            "started_at": sa.case(
                                (expired, now), else_=attempts.c.started_at
                            ),
                            "count": sa.case(
                                (expired, 1),
                                else_=sa.func.least(attempts.c.count + 1, limit + 1),
                            ),
                        },
                    ).returning(attempts.c.started_at, attempts.c.count)
                )
                .mappings()
                .one()
            )
            if row["count"] > limit:
                retry = max(
                    1,
                    int(
                        (
                            row["started_at"] + timedelta(minutes=15) - now
                        ).total_seconds()
                    )
                    + 1,
                )
            else:
                conn.execute(
                    sessions.insert().values(
                        digest=digest(raw),
                        csrf_token=csrf,
                        user_id=None,
                        created_at=now,
                        expires_at=now + timedelta(minutes=30),
                    )
                )
        return retry

    def user_by_email(self, email):
        with self.engine.connect() as conn:
            return (
                conn.execute(sa.select(users).where(users.c.email == email))
                .mappings()
                .first()
            )

    def user_by_id(self, identity):
        with self.engine.connect() as conn:
            return (
                conn.execute(sa.select(users).where(users.c.id == identity))
                .mappings()
                .first()
            )

    def register(self, identity, email, encoded):
        with self.engine.begin() as conn:
            return conn.scalar(
                insert(users)
                .values(
                    id=identity,
                    email=email,
                    password_hash=encoded,
                )
                .on_conflict_do_nothing(index_elements=[users.c.email])
                .returning(users.c.id)
            )

    def rotate(self, old_digest, raw, csrf, identity, encoded=None):
        with self.engine.begin() as conn:
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            revoked = conn.scalar(
                sessions.update()
                .where(
                    sessions.c.digest == old_digest,
                    sessions.c.revoked_at.is_(None),
                    sessions.c.expires_at > now,
                )
                .values(revoked_at=now)
                .returning(sessions.c.digest)
            )
            if not revoked:
                return False
            conn.execute(
                sessions.insert().values(
                    digest=digest(raw),
                    user_id=identity,
                    csrf_token=csrf,
                    created_at=now,
                    expires_at=now + timedelta(hours=12),
                )
            )
            if encoded:
                conn.execute(
                    users.update()
                    .where(users.c.id == identity)
                    .values(password_hash=encoded)
                )
            return True

    def revoke(self, session_digest):
        with self.engine.begin() as conn:
            conn.execute(
                sessions.update()
                .where(
                    sessions.c.digest == session_digest,
                )
                .values(revoked_at=sa.func.now())
            )

    def consume_attempt(self, email, ip):
        """UPSERT locks serialize each shared counter; commit even on denial."""
        remaining = 0
        with self.engine.begin() as conn:
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            cutoff = now - timedelta(minutes=15)
            # Orden único de claves evita inversión de locks entre procesos.
            for key, limit in sorted(
                [(digest("email:" + email), 5), (digest("ip:" + ip), 20)]
            ):
                expired = attempts.c.started_at <= cutoff
                statement = insert(attempts).values(key=key, started_at=now, count=1)
                row = (
                    conn.execute(
                        statement.on_conflict_do_update(
                            index_elements=[attempts.c.key],
                            set_={
                                "started_at": sa.case(
                                    (expired, now), else_=attempts.c.started_at
                                ),
                                "count": sa.case(
                                    (expired, 1), else_=attempts.c.count + 1
                                ),
                            },
                        ).returning(attempts.c.started_at, attempts.c.count)
                    )
                    .mappings()
                    .one()
                )
                if row["count"] > limit:
                    remaining = max(
                        remaining,
                        max(
                            1,
                            int(
                                (
                                    row["started_at"] + timedelta(minutes=15) - now
                                ).total_seconds()
                            )
                            + 1,
                        ),
                    )
        return remaining
