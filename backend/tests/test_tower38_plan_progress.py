"""Additive stage progress table: isolated migration plus empty progress reads."""

import importlib.util
import json
import re
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import unquote
from uuid import UUID, uuid4

import pytest
import sqlalchemy as sa
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.operations import Operations
from alembic.script import ScriptDirectory
from fastapi import Request
from test_pcs_postgres import actors as actors
from test_tower38_plan_pg import body
from test_tower38_plan_pg import plan_context as plan_context

from upgradejusto.api.proxy_ip import permitted_tower_plan_request
from upgradejusto.api.tower_plans import ingress
from upgradejusto.auth.service import AuthError
from upgradejusto.pcs.service import PCError
from upgradejusto.persistence.schema import users
from upgradejusto.plans.tower_progress import snapshot_keys, stage_key
from upgradejusto.plans.tower_repository import TowerPlanRepository
from upgradejusto.plans.tower_tables import headers, progress, revisions

COMPONENT = "00000000-0000-0000-0000-000000000001"


def stage(name="Install CPU", **changes):
    return {
        "position": 1,
        "name": name,
        "budget_ars": "1000.00",
        "actions": [
            {
                "action": "replace_category",
                "category": "cpu",
                "candidates": [{"component_id": COMPONENT, "quantity": 1}],
            }
        ],
        "materials": [],
        "evaluated_configuration": {"revision": 1},
        "evaluation": {"verdict": "compatible"},
        "benefit": {"status": "supported"},
        "offers": [{"amount": "10.00"}],
        "cost": {"total_ars": "10.00"},
        "cumulative_cost": {"total_ars": "10.00"},
        "status": "ready",
        "missing_fields": [],
        "warnings": [],
        **changes,
    }


def snapshot(*stages):
    return {
        "kind": "tower_plan",
        "schema_version": 2,
        "name": "Synthetic progress plan",
        "status": "ready",
        "label": "Supported",
        "objective": "productivity",
        "budget_ars": "1000.00",
        "cost": {"total_ars": "10.00"},
        "stages": list(stages),
    }


def seed_plan(engine, owner, document, revision=1):
    plan = uuid4()
    with engine.begin() as conn:
        now = conn.scalar(sa.select(sa.func.clock_timestamp()))
        conn.execute(
            headers.insert().values(
                id=plan,
                owner_id=owner,
                current_revision=revision,
                create_request_id=uuid4(),
                create_request_hash="a" * 64,
                created_at=now,
                updated_at=now,
            )
        )
        conn.execute(
            revisions.insert().values(
                plan_id=plan,
                revision=revision,
                operation_id=uuid4(),
                request_hash="b" * 64,
                snapshot=document,
                created_at=now,
            )
        )
    return plan


@pytest.fixture
def progress_context(actors, pg_engine):
    a, b = actors
    repo = TowerPlanRepository(pg_engine)
    try:
        yield SimpleNamespace(a=a, b=b, repo=repo)
    finally:
        with pg_engine.begin() as conn:
            conn.execute(headers.delete().where(headers.c.owner_id.in_([a[2], b[2]])))


def replace_current(engine, plan, document, revision=2):
    """Append a revision and make it current, as a recalculation would."""
    with engine.begin() as conn:
        now = conn.scalar(sa.select(sa.func.clock_timestamp()))
        conn.execute(
            revisions.insert().values(
                plan_id=plan,
                revision=revision,
                operation_id=uuid4(),
                request_hash=uuid4().hex + uuid4().hex,
                snapshot=document,
                created_at=now,
            )
        )
        conn.execute(
            headers.update()
            .where(headers.c.id == plan)
            .values(current_revision=revision, updated_at=now)
        )


def marks(engine, plan):
    with engine.connect() as conn:
        return dict(
            conn.execute(
                sa.select(progress.c.stage_key, progress.c.completed_at).where(
                    progress.c.plan_id == plan
                )
            ).all()
        )


def test_snapshot_keys_distinguish_repeated_stages():
    first = stage(name="Install CPU", position=1)
    repeated = stage(name="Install RAM", position=2)
    last = stage(name="Install GPU", position=4)
    keys = snapshot_keys(snapshot(first, repeated, repeated, last))

    assert len(keys) == 4
    assert keys[stage_key(first)] == 1
    assert keys[stage_key(repeated, occurrence=0, count=2)] == 2
    assert keys[stage_key(repeated, occurrence=1, count=2)] == 2
    assert keys[stage_key(last)] == 4
    assert stage_key(repeated, occurrence=0, count=2) != stage_key(
        repeated, occurrence=1, count=2
    )
    # The size of the identical group is part of the identity: a snapshot with a
    # different number of copies must not reuse the old keys.
    assert stage_key(repeated) not in keys


def test_stage_key_uses_semantic_content_only():
    document = stage()
    key = stage_key(document)
    assert re.fullmatch(r"[0-9a-f]{64}", key)
    assert key == stage_key(stage())
    assert key != stage_key(stage(name="Install GPU"))
    assert stage_key(document, occurrence=1) != key
    # Prices, offers, verdicts, timestamps and positions change every
    # recalculation; none of them may mint a different stage identity.
    assert (
        stage_key(
            stage(
                position=7,
                budget_ars="99.00",
                offers=[],
                cost={},
                cumulative_cost={},
                evaluation={"verdict": "incompatible"},
                generated_at="2026-01-01T00:00:00Z",
            )
        )
        == key
    )


def test_head_is_the_new_additive_progress_migration(pg_engine):
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    assert ScriptDirectory.from_config(config).get_current_head() == "39_001"
    assert "tower_plan_stage_progress" in sa.inspect(pg_engine).get_table_names()
    inspector = sa.inspect(pg_engine)
    columns = {
        column["name"]: column
        for column in inspector.get_columns("tower_plan_stage_progress")
    }
    assert set(columns) == {"plan_id", "stage_key", "completed_at"}
    assert columns["completed_at"]["nullable"] is False
    assert columns["stage_key"]["type"].length == 64
    primary = inspector.get_pk_constraint("tower_plan_stage_progress")
    assert set(primary["constrained_columns"]) == {"plan_id", "stage_key"}
    foreign = inspector.get_foreign_keys("tower_plan_stage_progress")
    assert len(foreign) == 1
    assert foreign[0]["constrained_columns"] == ["plan_id"]
    assert foreign[0]["referred_table"] == "tower_plans"
    assert foreign[0]["options"]["ondelete"] == "CASCADE"


def test_new_plan_has_no_progress_rows(pg_engine):
    owner, plan = uuid4(), uuid4()
    with pg_engine.begin() as conn:
        conn.execute(users.insert().values(id=owner))
        now = conn.scalar(sa.select(sa.func.clock_timestamp()))
        conn.execute(
            headers.insert().values(
                id=plan,
                owner_id=owner,
                current_revision=1,
                create_request_id=uuid4(),
                create_request_hash="a" * 64,
                created_at=now,
                updated_at=now,
            )
        )
        conn.execute(
            revisions.insert().values(
                plan_id=plan,
                revision=1,
                operation_id=uuid4(),
                request_hash="b" * 64,
                snapshot={
                    "kind": "tower_plan",
                    "schema_version": 2,
                    "name": "Synthetic progress plan",
                },
                created_at=now,
            )
        )
    try:
        saved = TowerPlanRepository(pg_engine).get(owner, plan)
        assert saved["id"] == plan and saved["revision"] == 1
        with pg_engine.connect() as conn:
            assert (
                conn.scalar(
                    sa.select(sa.func.count())
                    .select_from(progress)
                    .where(progress.c.plan_id == plan)
                )
                == 0
            )
    finally:
        with pg_engine.begin() as conn:
            conn.execute(headers.delete().where(headers.c.id == plan))
            conn.execute(users.delete().where(users.c.id == owner))


def test_f_additive_progress_migration_from_empty_schema(pg_engine):
    schema = "synthetic_progress38_" + uuid4().hex
    path = (
        Path(__file__).resolve().parents[1]
        / "alembic/versions/38_f_001_tower_plan_progress.py"
    )
    spec = importlib.util.spec_from_file_location(
        "synthetic_progress38_migration", path
    )
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    assert migration.revision == "38_f_001"
    assert migration.down_revision == "38_e_001"
    try:
        with pg_engine.begin() as base:
            base.execute(sa.schema.CreateSchema(schema))
            conn = base.execution_options(schema_translate_map={None: schema})
            local = sa.MetaData()
            users_table = sa.Table(
                "auth_users", local, sa.Column("id", sa.Uuid, primary_key=True)
            )
            sa.Table("pcs", local, sa.Column("id", sa.Uuid, primary_key=True))
            local.create_all(conn)
            headers.create(conn)
            revisions.create(conn)
            assert "tower_plan_stage_progress" not in sa.inspect(base).get_table_names(
                schema=schema
            )
            migration.op = Operations(MigrationContext.configure(conn))
            migration.upgrade()
            assert "tower_plan_stage_progress" in sa.inspect(base).get_table_names(
                schema=schema
            )
            owner, plan = uuid4(), uuid4()
            now = conn.scalar(sa.select(sa.func.clock_timestamp()))
            conn.execute(users_table.insert().values(id=owner))
            conn.execute(
                headers.insert().values(
                    id=plan,
                    owner_id=owner,
                    current_revision=1,
                    create_request_id=uuid4(),
                    create_request_hash="c" * 64,
                    created_at=now,
                    updated_at=now,
                )
            )
            conn.execute(
                revisions.insert().values(
                    plan_id=plan,
                    revision=1,
                    operation_id=uuid4(),
                    request_hash="d" * 64,
                    snapshot={"kind": "tower_plan", "schema_version": 2},
                    created_at=now,
                )
            )
            conn.execute(
                progress.insert().values(
                    plan_id=plan, stage_key="e" * 64, completed_at=now
                )
            )
            with pytest.raises(RuntimeError, match="Refusing downgrade"):
                migration.downgrade()
            conn.execute(progress.delete().where(progress.c.plan_id == plan))
            migration.downgrade()
            assert "tower_plan_stage_progress" not in sa.inspect(base).get_table_names(
                schema=schema
            )
    finally:
        with pg_engine.begin() as conn:
            conn.execute(sa.schema.DropSchema(schema, cascade=True, if_exists=True))


def test_marking_twice_keeps_one_mark_without_touching_the_plan(progress_context):
    ctx = progress_context
    document = snapshot(stage())
    plan = seed_plan(ctx.repo.engine, ctx.a[2], document)
    key = stage_key(stage())
    before = ctx.repo.get(ctx.a[2], plan)
    with ctx.repo.engine.connect() as conn:
        header_before = conn.execute(
            sa.select(headers.c.current_revision, headers.c.updated_at).where(
                headers.c.id == plan
            )
        ).one()
        revisions_before = conn.scalar(
            sa.select(sa.func.count())
            .select_from(revisions)
            .where(revisions.c.plan_id == plan)
        )

    assert key in ctx.repo.set_progress(ctx.a[2], plan, key, True)["progress"]
    assert key in ctx.repo.set_progress(ctx.a[2], plan, key, True)["progress"]

    after = ctx.repo.get(ctx.a[2], plan)
    assert after["snapshot"] == before["snapshot"]
    assert json.dumps(after["snapshot"]) == json.dumps(before["snapshot"])
    assert before["progress"] == {}
    assert list(after["progress"]) == [key]
    with ctx.repo.engine.connect() as conn:
        assert (
            conn.scalar(
                sa.select(sa.func.count())
                .select_from(progress)
                .where(progress.c.plan_id == plan)
            )
            == 1
        )
        assert (
            conn.execute(
                sa.select(headers.c.current_revision, headers.c.updated_at).where(
                    headers.c.id == plan
                )
            ).one()
            == header_before
        )
        assert (
            conn.scalar(
                sa.select(sa.func.count())
                .select_from(revisions)
                .where(revisions.c.plan_id == plan)
            )
            == revisions_before
        )


def test_unmarking_twice_leaves_no_rows(progress_context):
    ctx = progress_context
    plan = seed_plan(ctx.repo.engine, ctx.a[2], snapshot(stage()))
    key = stage_key(stage())
    ctx.repo.set_progress(ctx.a[2], plan, key, True)

    # The repository reports the revision it actually wrote under, together
    # with the live marks, so the response cannot name a different revision.
    result = ctx.repo.set_progress(ctx.a[2], plan, key, False)
    assert result["revision"] == 1 and result["progress"] == {}
    assert ctx.repo.set_progress(ctx.a[2], plan, key, False)["progress"] == {}
    assert marks(ctx.repo.engine, plan) == {}


def test_foreign_plan_is_not_found_and_writes_nothing(progress_context):
    ctx = progress_context
    plan = seed_plan(ctx.repo.engine, ctx.a[2], snapshot(stage()))
    key = stage_key(stage())

    with pytest.raises(PCError) as error:
        ctx.repo.set_progress(ctx.b[2], plan, key, True)
    assert error.value.status == 404
    assert error.value.detail == "Plan not found"
    assert marks(ctx.repo.engine, plan) == {}


def test_unknown_stage_key_is_not_found_and_writes_nothing(progress_context):
    ctx = progress_context
    plan = seed_plan(ctx.repo.engine, ctx.a[2], snapshot(stage()))

    with pytest.raises(PCError) as error:
        ctx.repo.set_progress(ctx.a[2], plan, "f" * 64, True)
    assert error.value.status == 404
    assert error.value.detail == "Plan stage not found"
    assert marks(ctx.repo.engine, plan) == {}


def test_recalculation_keeps_the_mark_of_the_surviving_stage(progress_context):
    ctx = progress_context
    surviving, removed = (
        stage(name="Install CPU", position=1),
        stage(name="Install GPU", position=2),
    )
    plan = seed_plan(ctx.repo.engine, ctx.a[2], snapshot(surviving, removed))
    survivor_key = stage_key(surviving)
    removed_key = stage_key(removed)
    ctx.repo.set_progress(ctx.a[2], plan, survivor_key, True)
    ctx.repo.set_progress(ctx.a[2], plan, removed_key, True)

    recalculated = snapshot(stage(name="Install CPU", position=3))
    with ctx.repo.engine.begin() as conn:
        conn.execute(
            revisions.insert().values(
                plan_id=plan,
                revision=2,
                operation_id=uuid4(),
                request_hash="e" * 64,
                snapshot=recalculated,
                created_at=conn.scalar(sa.select(sa.func.clock_timestamp())),
            )
        )
        conn.execute(
            headers.update().where(headers.c.id == plan).values(current_revision=2)
        )

    with ctx.repo.engine.connect() as conn:
        live = TowerPlanRepository.progress_for(conn, plan, recalculated)
    assert set(live) == {survivor_key}
    # Orphan rows stay stored for history; they are only filtered when read.
    assert set(marks(ctx.repo.engine, plan)) == {survivor_key, removed_key}
    assert ctx.repo.set_progress(ctx.a[2], plan, survivor_key, True)["progress"] == live


def test_duplicate_stages_keep_the_mark_when_recalculation_changes_nothing(
    progress_context,
):
    ctx = progress_context
    first, second = (
        stage(name="Install RAM", position=1),
        stage(name="Install RAM", position=2),
    )
    document = snapshot(first, second)
    plan = seed_plan(ctx.repo.engine, ctx.a[2], document)
    keys = list(snapshot_keys(document))
    assert len(keys) == len(set(keys)) == 2
    ctx.repo.set_progress(ctx.a[2], plan, keys[0], True)
    marked_at = marks(ctx.repo.engine, plan)[keys[0]]

    # Same stages, same order: nothing about the group changed.
    replace_current(ctx.repo.engine, plan, document)

    read = ctx.repo.get(ctx.a[2], plan)
    assert read["revision"] == 2
    assert read["stage_keys"] == keys
    assert list(read["progress"]) == [keys[0]]
    assert datetime.fromisoformat(read["progress"][keys[0]]) == marked_at
    # The stored snapshot is untouched and still holds both copies.
    assert read["snapshot"] == document
    assert read["snapshot"]["stages"] == [first, second]
    assert marks(ctx.repo.engine, plan) == {keys[0]: marked_at}


def test_removing_the_first_duplicate_does_not_transfer_its_mark(progress_context):
    ctx = progress_context
    first, second = (
        stage(name="Install RAM", position=1),
        stage(name="Install RAM", position=2),
    )
    plan = seed_plan(ctx.repo.engine, ctx.a[2], snapshot(first, second))
    first_key, second_key = list(snapshot_keys(snapshot(first, second)))
    assert first_key != second_key
    ctx.repo.set_progress(ctx.a[2], plan, first_key, True)

    # The recalculation drops the first copy from the request: only the second
    # survives, and it becomes the only stage of that signature.
    replace_current(ctx.repo.engine, plan, snapshot(second))

    read = ctx.repo.get(ctx.a[2], plan)
    survivor_key = stage_key(second, count=1)
    assert read["stage_keys"] == [survivor_key]
    # Not shown, not transferred, not invented.
    assert read["progress"] == {}
    assert list(marks(ctx.repo.engine, plan)) == [first_key]
    assert survivor_key not in marks(ctx.repo.engine, plan)


def test_removing_the_first_duplicate_does_not_transfer_the_second_marks(
    progress_context,
):
    ctx = progress_context
    first, second = (
        stage(name="Install RAM", position=1),
        stage(name="Install RAM", position=2),
    )
    plan = seed_plan(ctx.repo.engine, ctx.a[2], snapshot(first, second))
    _, second_key = list(snapshot_keys(snapshot(first, second)))
    ctx.repo.set_progress(ctx.a[2], plan, second_key, True)

    # The survivor is the stage that was marked, but the group shrank: its key
    # changed, so the old mark is not shown either.
    replace_current(ctx.repo.engine, plan, snapshot(second))

    read = ctx.repo.get(ctx.a[2], plan)
    assert read["stage_keys"] == [stage_key(second, count=1)]
    assert read["progress"] == {}
    assert set(marks(ctx.repo.engine, plan)) == {second_key}


def test_unique_stages_keep_their_marks_across_reordering_and_rebudgeting(
    progress_context,
):
    ctx = progress_context
    first, second = (
        stage(name="Install CPU", position=1),
        stage(name="Install RAM", position=2),
    )
    plan = seed_plan(ctx.repo.engine, ctx.a[2], snapshot(first, second))
    first_key, second_key = stage_key(first), stage_key(second)
    ctx.repo.set_progress(ctx.a[2], plan, first_key, True)
    marked_at = marks(ctx.repo.engine, plan)[first_key]

    # Unique stages: swapping their order and changing prices keeps both keys,
    # and the mark travels with its stage, not with the position.
    replace_current(
        ctx.repo.engine,
        plan,
        snapshot(
            {**second, "position": 1, "budget_ars": "3000.00"},
            {**first, "position": 2, "budget_ars": "2000.00"},
        ),
    )

    read = ctx.repo.get(ctx.a[2], plan)
    assert read["stage_keys"] == [second_key, first_key]
    assert list(read["progress"]) == [first_key]
    assert datetime.fromisoformat(read["progress"][first_key]) == marked_at
    assert marks(ctx.repo.engine, plan) == {first_key: marked_at}


def test_adding_a_duplicate_hides_the_previous_marks_of_that_group(progress_context):
    ctx = progress_context
    first, second = (
        stage(name="Install RAM", position=1),
        stage(name="Install RAM", position=2),
    )
    plan = seed_plan(ctx.repo.engine, ctx.a[2], snapshot(first))
    key = stage_key(first, count=1)
    ctx.repo.set_progress(ctx.a[2], plan, key, True)

    # The group grows from one copy to two: every key in it changes, so the
    # previous mark is hidden instead of being handed to one of the copies.
    replace_current(ctx.repo.engine, plan, snapshot(first, second))

    read = ctx.repo.get(ctx.a[2], plan)
    assert read["stage_keys"] == list(snapshot_keys(snapshot(first, second)))
    assert read["progress"] == {}
    assert set(marks(ctx.repo.engine, plan)) == {key}


def test_plan_without_marks_returns_empty_progress_and_one_key_per_stage(
    progress_context,
):
    ctx = progress_context
    first, second = (
        stage(name="Install CPU", position=1),
        stage(name="Install RAM", position=2),
    )
    document = snapshot(first, second)
    plan = seed_plan(ctx.repo.engine, ctx.a[2], document)

    read = ctx.repo.get(ctx.a[2], plan)

    # A plan without marks looks exactly as before: no stage is done.
    assert read["progress"] == {}
    assert read["stage_keys"] == list(snapshot_keys(document))
    assert len(read["stage_keys"]) == len(document["stages"]) == 2
    assert read["stage_keys"] == [stage_key(first), stage_key(second)]
    assert all(re.fullmatch(r"[0-9a-f]{64}", key) for key in read["stage_keys"])
    # The stored snapshot is untouched; the mapping is derived at read time.
    assert read["snapshot"] == document


def test_plan_read_reports_the_marked_stage_by_its_aligned_key(progress_context):
    ctx = progress_context
    first, second = (
        stage(name="Install CPU", position=1),
        stage(name="Install RAM", position=2),
    )
    document = snapshot(first, second)
    plan = seed_plan(ctx.repo.engine, ctx.a[2], document)
    key = stage_key(first)

    ctx.repo.set_progress(ctx.a[2], plan, key, True)
    read = ctx.repo.get(ctx.a[2], plan)

    assert list(read["progress"]) == [key]
    assert set(read["progress"]) <= set(read["stage_keys"])
    index = read["stage_keys"].index(key)
    assert read["snapshot"]["stages"][index]["name"] == "Install CPU"
    completed_at = datetime.fromisoformat(read["progress"][key])
    assert completed_at.utcoffset() is not None
    assert read["snapshot"] == document


def test_historical_revision_does_not_invent_progress_for_its_absent_stages(
    progress_context,
):
    ctx = progress_context
    old = stage(name="Install CPU", position=1)
    new = stage(name="Upgrade GPU", position=1)
    plan = seed_plan(ctx.repo.engine, ctx.a[2], snapshot(old))
    replace_current(ctx.repo.engine, plan, snapshot(new))

    ctx.repo.set_progress(ctx.a[2], plan, stage_key(new), True)
    current = ctx.repo.get(ctx.a[2], plan)
    assert list(current["progress"]) == [stage_key(new)]
    assert current["stage_keys"] == [stage_key(new)]

    historical = ctx.repo.get(ctx.a[2], plan, revision=1)
    assert historical["revision"] == 1
    assert historical["stage_keys"] == [stage_key(old)]
    assert historical["progress"] == {}


def test_recalculation_keeps_the_surviving_mark_in_the_plan_read(progress_context):
    ctx = progress_context
    first, second = (
        stage(name="Install CPU", position=1),
        stage(name="Install RAM", position=2),
    )
    plan = seed_plan(ctx.repo.engine, ctx.a[2], snapshot(first, second))
    first_key, second_key = stage_key(first), stage_key(second)
    ctx.repo.set_progress(ctx.a[2], plan, first_key, True)
    marked_at = marks(ctx.repo.engine, plan)[first_key]

    # Recalculation changes prices, offers and positions only: both stages
    # survive semantically, so their keys and the mark of the first one stay.
    replace_current(
        ctx.repo.engine,
        plan,
        snapshot(
            {**first, "position": 3, "budget_ars": "2000.00", "offers": []},
            {**second, "position": 4, "budget_ars": "3000.00"},
        ),
    )

    read = ctx.repo.get(ctx.a[2], plan)
    assert read["revision"] == 2
    assert read["stage_keys"] == [first_key, second_key]
    assert list(read["progress"]) == [first_key]
    assert datetime.fromisoformat(read["progress"][first_key]) == marked_at
    # No duplicate row and no invented mark for the unmarked stage.
    assert marks(ctx.repo.engine, plan) == {first_key: marked_at}


def test_orphan_mark_hides_after_a_stage_changes_without_inventing_one(
    progress_context,
):
    ctx = progress_context
    old, changed = (
        stage(name="Install CPU", position=1),
        stage(name="Install GPU", position=1),
    )
    plan = seed_plan(ctx.repo.engine, ctx.a[2], snapshot(old))
    old_key, new_key = stage_key(old), stage_key(changed)
    assert old_key != new_key
    ctx.repo.set_progress(ctx.a[2], plan, old_key, True)
    assert list(ctx.repo.get(ctx.a[2], plan)["progress"]) == [old_key]

    replace_current(ctx.repo.engine, plan, snapshot(changed))

    read = ctx.repo.get(ctx.a[2], plan)
    assert read["revision"] == 2
    # The old key belongs to a stage that no longer exists in this snapshot.
    assert old_key not in read["stage_keys"]
    assert read["progress"] == {}
    assert read["stage_keys"] == [new_key]
    # The stale row stays stored for history, but is never surfaced, and the
    # changed stage does not inherit it as a brand-new mark.
    assert set(marks(ctx.repo.engine, plan)) == {old_key}
    assert new_key not in marks(ctx.repo.engine, plan)


ROOT = "/api/tower-plans"


def http_plan(ctx):
    """Create one real PG plan through the router and its only stage route."""
    client = ctx.clients[0]
    created = client.post(ROOT, headers=ctx.a[1], json=body(ctx))
    assert created.status_code == 201, created.text
    plan = created.json()
    key = next(iter(snapshot_keys(plan["snapshot"])))
    return plan, key, f"{ROOT}/{plan['id']}/stages/{key}/progress"


def test_http_mark_and_unmark_are_idempotent_and_leave_the_plan_frozen(plan_context):
    ctx = plan_context
    client = ctx.clients[0]
    plan, key, path = http_plan(ctx)
    assert re.fullmatch(r"[0-9a-f]{64}", key)

    first = client.put(path, headers=ctx.a[1])
    assert first.status_code == 200, first.text
    marked = first.json()
    assert marked["kind"] == "tower_plan_progress"
    assert marked["plan_id"] == plan["id"] and marked["revision"] == 1
    assert list(marked["progress"]) == [key]
    assert client.put(path, headers=ctx.a[1]).json() == marked
    assert len(marks(ctx.repo.engine, UUID(plan["id"]))) == 1
    # Marking never rewrites the plan revision, its prices or its verdicts.
    read = client.get(f"{ROOT}/{plan['id']}").json()
    assert read["snapshot"] == plan["snapshot"]
    assert read["revision"] == plan["revision"]
    assert read["updated_at"] == plan["updated_at"]
    assert list(read["progress"]) == [key]

    unmarked = client.delete(path, headers=ctx.a[1])
    assert unmarked.status_code == 200, unmarked.text
    assert unmarked.json()["progress"] == {}
    assert client.delete(path, headers=ctx.a[1]).json() == unmarked.json()
    assert client.get(f"{ROOT}/{plan['id']}").json()["progress"] == {}
    assert marks(ctx.repo.engine, UUID(plan["id"])) == {}


def test_http_post_put_and_get_agree_on_progress_and_stage_keys(plan_context):
    ctx = plan_context
    client = ctx.clients[0]
    plan, key, path = http_plan(ctx)

    # POST already ships the derived mapping: one key per snapshot stage.
    assert plan["progress"] == {}
    assert plan["stage_keys"] == list(snapshot_keys(plan["snapshot"]))
    assert len(plan["stage_keys"]) == len(plan["snapshot"]["stages"])

    put = client.put(path, headers=ctx.a[1]).json()
    read = client.get(f"{ROOT}/{plan['id']}").json()
    assert read["progress"] == put["progress"]
    assert set(read["progress"]) == {key}
    assert read["stage_keys"] == plan["stage_keys"]
    assert read["revision"] == put["revision"] == plan["revision"]
    assert datetime.fromisoformat(read["progress"][key]).utcoffset() is not None
    # The stored snapshot never changes when marking progress.
    assert read["snapshot"] == plan["snapshot"]


def test_http_progress_mutations_require_csrf_header_and_origin(plan_context):
    ctx = plan_context
    client = ctx.clients[0]
    plan, _, path = http_plan(ctx)
    without_csrf = {
        name: value
        for name, value in ctx.a[1].items()
        if name.lower() != "x-csrf-token"
    }
    bad_origin = {**ctx.a[1], "Origin": "https://evil.example.test"}

    for variant in (without_csrf, bad_origin):
        assert client.put(path, headers=variant).status_code == 403
        assert client.delete(path, headers=variant).status_code == 403
    assert marks(ctx.repo.engine, UUID(plan["id"])) == {}


def test_http_foreign_plan_is_byte_identical_to_a_missing_one(plan_context):
    ctx = plan_context
    plan, key, own_path = http_plan(ctx)
    other = ctx.clients[1]
    missing_path = f"{ROOT}/{uuid4()}/stages/{key}/progress"

    foreign = other.put(own_path, headers=ctx.b[1])
    missing = other.put(missing_path, headers=ctx.b[1])
    assert foreign.status_code == missing.status_code == 404
    assert foreign.json() == missing.json() == {"detail": "Plan not found"}
    assert other.delete(own_path, headers=ctx.b[1]).json() == foreign.json()
    assert marks(ctx.repo.engine, UUID(plan["id"])) == {}


def test_http_progress_refuses_non_hex_keys_queries_and_unlisted_shapes(
    plan_context,
):
    ctx = plan_context
    client = ctx.clients[0]
    plan, key, path = http_plan(ctx)
    root = f"{ROOT}/{plan['id']}"
    # Same real behaviour as the existing /revisions/abc route: the 403 comes
    # from the ingress dependency, which runs before path-parameter validation.
    assert client.get(root + "/revisions/abc").status_code == 403
    for bad in ("abc", "A" * 64, key[:-1], key + "0"):
        assert (
            client.put(f"{root}/stages/{bad}/progress", headers=ctx.a[1]).status_code
            == 403
        )
        assert (
            client.delete(f"{root}/stages/{bad}/progress", headers=ctx.a[1]).status_code
            == 403
        )
    assert client.put(path + "?page=1", headers=ctx.a[1]).status_code == 403
    assert client.delete(path + "?owner_id=x", headers=ctx.a[1]).status_code == 403
    # No route matches these shapes, so Starlette answers before the router
    # dependency: 404 for an unlisted path, 405 for an unlisted method on a
    # listed one. The closed ingress/proxy lists are asserted unit-wise below.
    assert client.put(f"{root}/stages/{key}/other", headers=ctx.a[1]).status_code == 404
    assert client.patch(path, headers=ctx.a[1]).status_code == 405
    assert client.put(root, headers=ctx.a[1]).status_code == 405
    assert client.delete(ROOT, headers=ctx.a[1]).status_code == 405
    assert marks(ctx.repo.engine, UUID(plan["id"])) == {}


def probe(method, raw_path, query=b""):
    return Request(
        {
            "type": "http",
            "method": method,
            "scheme": "http",
            "headers": [],
            "server": ("127.0.0.1", 8000),
            "client": ("127.0.0.1", 50000),
            "path": unquote(raw_path.decode("ascii")),
            "raw_path": raw_path,
            "query_string": query,
        }
    )


def test_ingress_closed_list_adds_only_the_two_progress_methods():
    uid = b"12345678-1234-1234-1234-123456789abc"
    key = b"a" * 64
    good = ROOT.encode() + b"/" + uid + b"/stages/" + key + b"/progress"
    short = ROOT.encode() + b"/" + uid + b"/stages/" + key[:-1] + b"/progress"
    for method, path in (
        ("PUT", good),
        ("DELETE", good),
        ("DELETE", ROOT.encode() + b"/" + uid),
        ("GET", ROOT.encode() + b"/" + uid),
        ("POST", ROOT.encode() + b"/" + uid + b"/recalculate"),
    ):
        ingress(probe(method, path))
    for method, path in (
        ("PATCH", good),
        ("POST", good),
        ("GET", good),
        ("PUT", ROOT.encode() + b"/" + uid),
        ("PUT", ROOT.encode() + b"/" + uid + b"/stages/" + key + b"/other"),
        ("PUT", short),
        ("DELETE", short),
        ("PUT", ROOT.encode()),
        ("DELETE", ROOT.encode()),
    ):
        with pytest.raises(AuthError) as error:
            ingress(probe(method, path))
        assert error.value.status == 403
    with pytest.raises(AuthError) as error:
        ingress(probe("PUT", good, b"page=1"))
    assert error.value.status == 403


def test_proxy_policy_closed_list_adds_only_the_two_progress_methods():
    uid = b"12345678-1234-1234-1234-123456789abc"
    key = b"a" * 64
    good = ROOT.encode() + b"/" + uid + b"/stages/" + key + b"/progress"
    short = ROOT.encode() + b"/" + uid + b"/stages/" + key[:-1] + b"/progress"
    assert permitted_tower_plan_request(probe("PUT", good))
    assert permitted_tower_plan_request(probe("DELETE", good))
    # Existing share/plan shapes survive untouched.
    assert permitted_tower_plan_request(probe("DELETE", ROOT.encode() + b"/" + uid))
    assert permitted_tower_plan_request(
        probe("DELETE", ROOT.encode() + b"/" + uid + b"/shares/" + uid)
    )
    assert not permitted_tower_plan_request(probe("PUT", short))
    assert not permitted_tower_plan_request(probe("DELETE", short))
    assert not permitted_tower_plan_request(probe("PUT", ROOT.encode() + b"/" + uid))
    assert not permitted_tower_plan_request(probe("GET", good))
    assert not permitted_tower_plan_request(probe("POST", good))
    assert not permitted_tower_plan_request(probe("PUT", good, b"page=1"))
    assert not permitted_tower_plan_request(
        probe(
            "DELETE",
            ROOT.encode()
            + b"/"
            + uid
            + b"/shares/"
            + uid
            + b"/stages/"
            + key
            + b"/progress",
        )
    )
