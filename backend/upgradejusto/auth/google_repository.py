"""PG GIS challenge admission and atomic identity/session completion.

Claim before external verification prevents repeated crypto/fetch on one attempt.
Completion rechecks session/TTL and atomically creates identity + rotates session.
"""

import hashlib
from datetime import timedelta
from uuid import uuid4

import sqlalchemy as sa

from upgradejusto.auth.google_tables import attempts, identities
from upgradejusto.auth.repository import AuthRepository
from upgradejusto.auth.security import digest
from upgradejusto.auth.service import AuthError
from upgradejusto.persistence.schema import sessions, users


class GoogleRepository:
    def __init__(self, engine):
        self.engine = engine

    @staticmethod
    def bounds(conn):
        conn.exec_driver_sql("SET LOCAL statement_timeout = '3000ms'")
        conn.exec_driver_sql("SET LOCAL lock_timeout = '2000ms'")

    @staticmethod
    def live_session(conn, session_digest, now):
        row = (
            conn.execute(
                sa.select(sessions)
                .where(
                    sessions.c.digest == session_digest,
                    sessions.c.revoked_at.is_(None),
                    sessions.c.expires_at > now,
                )
                .with_for_update()
            )
            .mappings()
            .first()
        )
        if row is None:
            raise AuthError(403, "Forbidden")
        if row["expires_at"] <= conn.scalar(sa.select(sa.func.clock_timestamp())):
            raise AuthError(403, "Forbidden")
        return row

    def issue(self, session_digest, origin, audience, ip, nonce):
        result = None
        with self.engine.begin() as conn:
            self.bounds(conn)
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            self.live_session(conn, session_digest, now)
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            retry = AuthRepository.consume_emission_in(conn, ip, now)
            if not retry:
                result = (
                    conn.execute(
                        attempts.insert()
                        .values(
                            id=uuid4(),
                            session_digest=session_digest,
                            origin=origin,
                            client_id=audience,
                            nonce_hash=digest(nonce),
                            created_at=now,
                            expires_at=now + timedelta(minutes=5),
                        )
                        .returning(attempts.c.id, attempts.c.expires_at)
                    )
                    .mappings()
                    .one()
                )
        return result, retry

    def claim(self, session_digest, attempt_id, origin, audience):
        with self.engine.begin() as conn:
            self.bounds(conn)
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            live = self.live_session(conn, session_digest, now)
            row = (
                conn.execute(
                    sa.select(attempts)
                    .where(attempts.c.id == attempt_id)
                    .with_for_update()
                )
                .mappings()
                .first()
            )
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            if live["expires_at"] <= now:
                raise AuthError(403, "Forbidden")
            if (
                row is None
                or row["claimed_at"] is not None
                or row["expires_at"] <= now
                or row["client_id"] != audience
            ):
                raise AuthError(409, "Google attempt unavailable")
            if row["session_digest"] != session_digest or row["origin"] != origin:
                raise AuthError(403, "Forbidden")
            conn.execute(
                attempts.update()
                .where(attempts.c.id == attempt_id)
                .values(claimed_at=now)
            )
            return dict(row)

    def complete(self, claim, profile, raw, csrf):
        with self.engine.begin() as conn:
            self.bounds(conn)
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            old_digest = claim["session_digest"]
            live = self.live_session(conn, old_digest, now)
            row = (
                conn.execute(
                    sa.select(attempts)
                    .where(attempts.c.id == claim["id"])
                    .with_for_update()
                )
                .mappings()
                .first()
            )
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            if (
                row is None
                or row["claimed_at"] is None
                or row["completed_at"] is not None
                or row["expires_at"] <= now
            ):
                raise AuthError(409, "Google attempt unavailable")
            if any(
                row[key] != claim[key]
                for key in ("session_digest", "origin", "client_id", "nonce_hash")
            ):
                raise AuthError(409, "Google attempt unavailable")
            # Session -> challenge -> subject lock, always this order. Hash
            # collision only serializes unrelated subjects; it cannot link them.
            lock_key = int.from_bytes(
                hashlib.sha256(
                    (profile["issuer"] + "\0" + profile["subject"]).encode()
                ).digest()[:4],
                "big",
                signed=True,
            )
            conn.execute(sa.select(sa.func.pg_advisory_xact_lock(380001, lock_key)))
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            if live["expires_at"] <= now:
                raise AuthError(403, "Forbidden")
            if row["expires_at"] <= now:
                raise AuthError(409, "Google attempt unavailable")
            if now.timestamp() >= profile["expires_at"]:
                raise AuthError(401, "Invalid Google ID token")
            identity = conn.scalar(
                sa.select(identities.c.user_id).where(
                    identities.c.issuer == profile["issuer"],
                    identities.c.subject == profile["subject"],
                )
            )
            if identity is None:
                identity = uuid4()
                user = (
                    conn.execute(
                        users.insert()
                        .values(
                            id=identity,
                            email=None,
                            password_hash=None,
                            profile_email=profile["profile_email"],
                            display_name=profile["display_name"],
                        )
                        .returning(users)
                    )
                    .mappings()
                    .one()
                )
                conn.execute(
                    identities.insert().values(
                        issuer=profile["issuer"],
                        subject=profile["subject"],
                        user_id=identity,
                        created_at=now,
                    )
                )
            else:
                existing = (
                    conn.execute(sa.select(users).where(users.c.id == identity))
                    .mappings()
                    .one()
                )
                if (
                    existing["email"] is not None
                    or existing["password_hash"] is not None
                ):
                    raise AuthError(409, "Google identity conflict")
                user = (
                    conn.execute(
                        users.update()
                        .where(users.c.id == identity)
                        .values(
                            profile_email=profile["profile_email"],
                            display_name=profile["display_name"],
                        )
                        .returning(users)
                    )
                    .mappings()
                    .one()
                )
            conn.execute(
                sessions.update()
                .where(sessions.c.digest == old_digest)
                .values(revoked_at=now)
            )
            conn.execute(
                sessions.insert().values(
                    digest=digest(raw),
                    user_id=identity,
                    csrf_token=csrf,
                    created_at=now,
                    expires_at=now + timedelta(hours=12),
                )
            )
            conn.execute(
                attempts.update()
                .where(attempts.c.id == claim["id"])
                .values(completed_at=now)
            )
            return dict(user)
