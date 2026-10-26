"""Security37 real TEST-PG gates. Controlled runners only; no provider calls."""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
import sqlalchemy as sa
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError
from test_assistant_postgres import assistant_actors as assistant_actors
from test_pcs_postgres import ORIGIN
from test_pcs_postgres import actors as actors

from upgradejusto.assistant.models import MessageCreate
from upgradejusto.assistant.repository import Repository
from upgradejusto.assistant.service import AssistantService
from upgradejusto.assistant.tables import conversations
from upgradejusto.auth.maintenance import AuthMaintenance
from upgradejusto.auth.provider_budget import ProviderBudget, leases
from upgradejusto.auth.repository import AuthRepository
from upgradejusto.auth.security import digest, token
from upgradejusto.auth.service import AuthError
from upgradejusto.extraction.models import ExtractInput
from upgradejusto.extraction.service import ExtractionService
from upgradejusto.main import app
from upgradejusto.persistence.schema import attempts, sessions, users


@pytest.fixture
def budget_state(assistant_actors, pg_engine, monkeypatch):
    a, b = assistant_actors
    monkeypatch.setenv("UJ_PROVIDER_USER_PER_MINUTE", "5")
    monkeypatch.setenv("UJ_PROVIDER_GLOBAL_PER_MINUTE", "300")
    monkeypatch.setenv("UJ_PROVIDER_USER_CONCURRENT", "1")
    monkeypatch.setenv("UJ_PROVIDER_GLOBAL_CONCURRENT", "4")
    key = digest("provider-global")
    # conftest enforces exact TEST cluster. Build runs this gate exclusively.
    with pg_engine.begin() as conn:
        ProviderBudget.lock(conn)
        assert (
            conn.scalar(
                sa.select(sa.func.count())
                .select_from(leases)
                .where(leases.c.expires_at > sa.func.clock_timestamp())
            )
            == 0
        ), "Requires exclusive idle TEST provider gate"
        previous = (
            conn.execute(sa.select(attempts).where(attempts.c.key == key))
            .mappings()
            .first()
        )
        previous = dict(previous) if previous else None
        conn.execute(attempts.delete().where(attempts.c.key == key))
    try:
        yield a, b, ProviderBudget(pg_engine)
    finally:
        with pg_engine.begin() as conn:
            ProviderBudget.lock(conn)
            conn.execute(leases.delete().where(leases.c.owner_id.in_([a[2], b[2]])))
            conn.execute(
                attempts.delete().where(
                    attempts.c.key.in_(
                        [
                            key,
                            digest("provider-user:" + str(a[2])),
                            digest("provider-user:" + str(b[2])),
                        ]
                    )
                )
            )
            if previous:
                conn.execute(attempts.insert().values(**previous))


def test_anonymous_csrf_atomic_ip_limit_reuse_and_no_extra_write(
    assistant_actors, pg_engine, monkeypatch
):
    a, _ = assistant_actors
    monkeypatch.setenv("UJ_CSRF_ISSUES_PER_15M", "2")
    ip = "127." + ".".join(str(value) for value in uuid4().bytes[:3])
    repository = AuthRepository(pg_engine)
    tokens = [(token(), token()) for _ in range(8)]
    key = digest("csrf-issue:" + ip)
    try:
        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(
                pool.map(lambda pair: repository.create_session(*pair, ip), tokens)
            )
        assert results.count(0) == 2
        assert all(value > 0 for value in results if value != 0)
        with pg_engine.connect() as conn:
            assert (
                conn.scalar(sa.select(attempts.c.count).where(attempts.c.key == key))
                == 3
            )
            assert (
                conn.scalar(
                    sa.select(sa.func.count())
                    .select_from(sessions)
                    .where(sessions.c.digest.in_([digest(raw) for raw, _ in tokens]))
                )
                == 2
            )
        existing = repository.session(a[0].cookies.get("uj_session"))
        assert a[0].get("/api/auth/csrf").status_code == 200
        assert dict(repository.session(a[0].cookies.get("uj_session"))) == dict(
            existing
        )
        with TestClient(app, base_url=ORIGIN, client=(ip, 50000)) as client:
            denied = client.get("/api/auth/csrf")
            assert denied.status_code == 429 and int(denied.headers["retry-after"]) > 0
    finally:
        with pg_engine.begin() as conn:
            conn.execute(
                sessions.delete().where(
                    sessions.c.digest.in_([digest(raw) for raw, _ in tokens])
                )
            )
            conn.execute(attempts.delete().where(attempts.c.key == key))


def test_shared_user_and_global_concurrency_atomic_and_rate_windows(
    budget_state, pg_engine, monkeypatch
):
    a, b, budget = budget_state
    ids = [uuid4() for _ in range(8)]

    def admit(identity):
        try:
            budget.acquire(a[2], identity)
            return identity
        except AuthError as exc:
            assert exc.status == 429 and exc.retry
            return None

    with ThreadPoolExecutor(max_workers=8) as pool:
        admitted = [identity for identity in pool.map(admit, ids) if identity]
    assert len(admitted) == 1
    monkeypatch.setenv("UJ_PROVIDER_GLOBAL_CONCURRENT", "1")
    with pytest.raises(AuthError) as busy:
        budget.acquire(b[2], uuid4())
    assert busy.value.status == 429
    budget.release(a[2], admitted[0])
    monkeypatch.setenv("UJ_PROVIDER_USER_PER_MINUTE", "1")
    with pytest.raises(AuthError) as limited:
        budget.acquire(a[2], uuid4())
    assert limited.value.status == 429 and limited.value.retry
    identity = uuid4()
    budget.acquire(b[2], identity)
    budget.release(b[2], identity)
    monkeypatch.setenv("UJ_PROVIDER_GLOBAL_PER_MINUTE", "2")
    with pytest.raises(AuthError):
        budget.acquire(b[2], uuid4())
    with pg_engine.connect() as conn:
        assert (
            conn.scalar(
                sa.select(attempts.c.count).where(
                    attempts.c.key == digest("provider-global")
                )
            )
            == 2
        )


def test_uuid_duplicate_and_owner_denial_precede_budget_and_cancel_releases(
    budget_state, pg_engine
):
    a, b, budget = budget_state
    repo = Repository(pg_engine)
    cid = repo.create(a[2], "Security37 synthetic")["id"]
    data = MessageCreate(content="Synthetic cancellation", client_request_id=uuid4())
    with pytest.raises(HTTPException) as foreign:
        repo.begin(b[2], cid, data, True, True)
    assert foreign.value.status_code == 404
    mid, history = repo.begin(a[2], cid, data, True, True)
    with pytest.raises(HTTPException) as duplicate:
        repo.begin(a[2], cid, data, True, True)
    assert duplicate.value.status_code == 409
    with pg_engine.connect() as conn:
        assert (
            conn.scalar(
                sa.select(attempts.c.count).where(
                    attempts.c.key == digest("provider-user:" + str(a[2]))
                )
            )
            == 1
        )

    async def exercise():
        class ForbiddenProvider:
            async def extract(self, *args):
                pytest.fail("Assistant lease failed to block extraction")

        extraction = ExtractionService(
            SimpleNamespace(catalog=SimpleNamespace(snapshot=lambda: ())),
            ForbiddenProvider(),
            budget,
        )
        with pytest.raises(AuthError):
            await extraction.preview(
                ExtractInput(text="Synthetic shared-budget pasted configuration"),
                owner=a[2],
            )

        async def runner(*args):
            await asyncio.sleep(60)

        stream = AssistantService(repo, runner).stream(
            a[2], cid, mid, "synthetic", history
        )
        await anext(stream)
        await stream.aclose()

    asyncio.run(exercise())
    with pg_engine.connect() as conn:
        assert (
            conn.scalar(
                sa.select(sa.func.count()).select_from(leases).where(leases.c.id == mid)
            )
            == 0
        )
    assert repo.page(a[2], 1, 50, cid)["items"][-1]["status"] == "interrupted"
    # Cancellation releases concurrency, but never refunds a counted request.
    identity = uuid4()
    budget.acquire(a[2], identity)
    budget.release(a[2], identity)


def test_extraction_shares_budget_releases_provider_error_and_cancel(budget_state):
    a, _, budget = budget_state
    entered = []

    class ControlledProvider:
        async def extract(self, *args):
            entered.append(True)
            raise RuntimeError("synthetic provider failure")

    pcs = SimpleNamespace(catalog=SimpleNamespace(snapshot=lambda: ()))
    service = ExtractionService(pcs, ControlledProvider(), budget)
    data = ExtractInput(text="Synthetic shared-budget pasted configuration")

    async def exercise():
        identity = uuid4()
        budget.acquire(a[2], identity)
        with pytest.raises(AuthError):
            await service.preview(data, owner=a[2])
        assert not entered
        budget.release(a[2], identity)
        with pytest.raises(RuntimeError):
            await service.preview(data, owner=a[2])
        async with budget.execution(a[2]):
            pass
        with pytest.raises(asyncio.CancelledError):
            async with budget.execution(a[2]):
                raise asyncio.CancelledError
        async with budget.execution(a[2]):
            pass

    asyncio.run(exercise())


def test_expired_lease_recovery_and_generation_error_release(budget_state, pg_engine):
    a, _, budget = budget_state
    expired, fresh = uuid4(), uuid4()
    budget.acquire(a[2], expired)
    with pg_engine.begin() as conn:
        conn.execute(
            leases.update()
            .where(leases.c.id == expired)
            .values(expires_at=sa.func.clock_timestamp() - timedelta(seconds=1))
        )
    budget.acquire(a[2], fresh)
    budget.release(a[2], fresh)
    repo = Repository(pg_engine)
    cid = repo.create(a[2], "Synthetic failed generation")["id"]
    mid, history = repo.begin(
        a[2],
        cid,
        MessageCreate(content="Synthetic error", client_request_id=uuid4()),
        True,
        True,
    )

    async def exercise():
        async def failed(*args):
            raise RuntimeError("Synthetic failure, no external provider")

        return [
            event
            async for event in AssistantService(repo, failed).stream(
                a[2], cid, mid, "synthetic", history
            )
        ]

    assert any("generation_failed" in event for event in asyncio.run(exercise()))
    with pg_engine.connect() as conn:
        assert conn.scalar(sa.select(leases.c.id).where(leases.c.id == mid)) is None
    assert repo.page(a[2], 1, 50, cid)["items"][-1]["status"] == "failed"


def test_db_failure_is_fail_closed_before_provider(budget_state, pg_engine):
    a, _, _ = budget_state
    broken = pg_engine.execution_options(
        schema_translate_map={None: "security37_missing_" + uuid4().hex}
    )

    class ForbiddenProvider:
        async def extract(self, *args):
            pytest.fail("DB failure invoked provider")

    service = ExtractionService(
        SimpleNamespace(catalog=SimpleNamespace(snapshot=lambda: ())),
        ForbiddenProvider(),
        ProviderBudget(broken),
    )
    with pytest.raises(SQLAlchemyError):
        asyncio.run(
            service.preview(
                ExtractInput(text="Synthetic fail-closed pasted configuration"),
                owner=a[2],
            )
        )


def test_retention_dry_run_and_apply_preserve_valid_sessions_users_and_conversations(
    assistant_actors, pg_engine
):
    a, _ = assistant_actors
    # Real PG outer rollback: even unrelated old TEST rows inspected by the
    # maintenance operation cannot be permanently removed by this proof.
    with pg_engine.connect() as conn:
        transaction = conn.begin()
        try:
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            raws = [token() for _ in range(3)]
            for index, raw in enumerate(raws):
                conn.execute(
                    sessions.insert().values(
                        digest=digest(raw),
                        user_id=a[2],
                        csrf_token=token(),
                        created_at=now - timedelta(days=3),
                        expires_at=now - timedelta(days=2)
                        if index == 0
                        else now + timedelta(hours=1),
                        revoked_at=now - timedelta(days=2) if index == 1 else None,
                    )
                )
            old_key, fresh_key = (
                digest("maintenance-old:" + token()),
                digest("maintenance-fresh:" + token()),
            )
            conn.execute(
                attempts.insert(),
                [
                    {"key": old_key, "started_at": now - timedelta(days=2), "count": 1},
                    {"key": fresh_key, "started_at": now, "count": 1},
                ],
            )
            old_lease, valid_lease = uuid4(), uuid4()
            conn.execute(
                leases.insert(),
                [
                    {
                        "id": old_lease,
                        "owner_id": a[2],
                        "expires_at": now - timedelta(days=2),
                    },
                    {
                        "id": valid_lease,
                        "owner_id": a[2],
                        "expires_at": now + timedelta(minutes=3),
                    },
                ],
            )
            cid = uuid4()
            conn.execute(
                conversations.insert().values(
                    id=cid,
                    owner_id=a[2],
                    title="Retention FK",
                    created_at=now,
                    updated_at=now,
                )
            )

            class PinnedTransaction:
                @contextmanager
                def begin(self):
                    yield conn

            maintenance = AuthMaintenance(PinnedTransaction())
            assert maintenance.retain()["applied"] is False
            assert (
                conn.scalar(
                    sa.select(sa.func.count())
                    .select_from(sessions)
                    .where(sessions.c.digest.in_([digest(raw) for raw in raws]))
                )
                == 3
            )
            assert maintenance.retain(apply=True)["applied"] is True
            assert conn.scalar(
                sa.select(sessions.c.digest).where(sessions.c.digest == digest(raws[2]))
            )
            assert (
                conn.scalar(
                    sa.select(sa.func.count())
                    .select_from(sessions)
                    .where(sessions.c.digest.in_([digest(raw) for raw in raws[:2]]))
                )
                == 0
            )
            assert (
                conn.scalar(sa.select(attempts.c.key).where(attempts.c.key == old_key))
                is None
            )
            assert (
                conn.scalar(
                    sa.select(attempts.c.key).where(attempts.c.key == fresh_key)
                )
                == fresh_key
            )
            assert (
                conn.scalar(sa.select(leases.c.id).where(leases.c.id == old_lease))
                is None
            )
            assert (
                conn.scalar(sa.select(leases.c.id).where(leases.c.id == valid_lease))
                == valid_lease
            )
            assert conn.scalar(sa.select(users.c.id).where(users.c.id == a[2])) == a[2]
            assert (
                conn.scalar(
                    sa.select(conversations.c.id).where(conversations.c.id == cid)
                )
                == cid
            )
        finally:
            transaction.rollback()
