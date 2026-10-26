"""Real TEST PG/MCP, synthetic owned frozen plans; never live retail evidence."""

import asyncio
import json
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
import sqlalchemy as sa
from mcp import Client
from test_assistant_mcp_contract import child_params
from test_pcs_postgres import actors as actors
from test_plans_postgres import save as save_legacy
from test_tower38_plan_pg import body
from test_tower38_plan_pg import plan_context as plan_context

from upgradejusto.assistant.repository import Repository
from upgradejusto.assistant.tables import conversations as conversation_rows
from upgradejusto.assistant.tool_projection import project_tool_result
from upgradejusto.auth.repository import AuthRepository
from upgradejusto.auth.security import digest
from upgradejusto.catalog.models import Category
from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.catalog.service import CatalogService
from upgradejusto.pcs.service import PCError
from upgradejusto.pcs.tower_models import TowerCreate
from upgradejusto.pcs.tower_repository import TowerRepository
from upgradejusto.pcs.tower_service import TowerService
from upgradejusto.persistence.schema import plans as legacy_plans
from upgradejusto.plans.tower_models import TowerPlanCreate, TowerPlanRead
from upgradejusto.plans.tower_tables import headers, revisions

PRIVATE = "SYNTHETIC_PRIVATE_NOTE_NEVER_MODEL"


@pytest.fixture
def assistant_plan_context(plan_context, pg_engine):
    try:
        yield plan_context
    finally:
        owners = [plan_context.a[2], plan_context.b[2]]
        with pg_engine.begin() as conn:
            conn.execute(
                conversation_rows.delete().where(
                    conversation_rows.c.owner_id.in_(owners)
                )
            )
            conn.execute(
                legacy_plans.delete().where(legacy_plans.c.owner_id.in_(owners))
            )


def own_tower(ctx, pg_engine, actor):
    catalog = CatalogService(PostgresCatalogRepository(pg_engine))
    service = TowerService(TowerRepository(pg_engine, ctx.version), catalog)
    return service.create(
        actor[2],
        TowerCreate.model_validate(
            {
                "schema_version": 2,
                "name": "SYNTHETIC private plan PC",
                "category_status": {category.value: "unknown" for category in Category},
                "lines": [],
                "context": {"bios_version": None, "notes": PRIVATE},
            }
        ),
    )


def insert_owned_history(conn, owner, pc_id, identity, snapshot, then):
    """Approved fixture pattern: INSERT own rows, never UPDATE frozen revisions."""
    conn.execute(
        headers.insert().values(
            id=identity,
            owner_id=owner,
            pc_id=pc_id,
            current_revision=1,
            create_request_id=uuid4(),
            create_request_hash="c" * 64,
            created_at=then,
            updated_at=then,
        )
    )
    conn.execute(
        revisions.insert().values(
            plan_id=identity,
            revision=1,
            operation_id=uuid4(),
            request_hash="d" * 64,
            snapshot=snapshot,
            created_at=then,
        )
    )


def test_real_seventh_mcp_plan_formats_owner_frozen_privacy_collision_and_revocation(
    assistant_plan_context, pg_engine
):
    ctx = assistant_plan_context
    a, b = ctx.a, ctx.b
    own_pc, foreign_pc = own_tower(ctx, pg_engine, a), own_tower(ctx, pg_engine, b)
    payload = body(ctx, pc_id=str(own_pc.id), expected_pc_revision=own_pc.revision)
    raw, replayed = ctx.svc.save(a[2], TowerPlanCreate.model_validate(payload))
    assert not replayed
    wire = TowerPlanRead.model_validate(raw).model_dump(mode="json")
    assert wire["snapshot"]["status"] == "requires_verification"
    other_payload = body(
        ctx, pc_id=str(foreign_pc.id), expected_pc_revision=foreign_pc.revision
    )
    foreign, _ = ctx.svc.save(b[2], TowerPlanCreate.model_validate(other_payload))
    legacy = save_legacy(a, ctx.saved)
    conversations = Repository(pg_engine)
    cid = conversations.create(a[2], "SYNTHETIC frozen plan MCP")["id"]
    historical_id, collision_id = uuid4(), UUID(legacy["id"])
    then = datetime.now(UTC) - timedelta(days=2)
    document = deepcopy(wire["snapshot"])
    quote = {
        "offer_id": "SYNTHETIC-EXPIRED-HISTORY",
        "amount": "12.00",
        "currency": "ARS",
        "status": "fresh",
        "availability": "in_stock",
        "observed_at": then.isoformat(),
        "expires_at": (then + timedelta(hours=24)).isoformat(),
        "source_url": "https://example.test/synthetic-history-only",
    }
    document["generated_at"] = then.isoformat()
    document["stages"][0]["offers"] = [quote]
    document["base_configuration"]["context"]["notes"] = PRIVATE
    document["stages"][0]["evaluated_configuration"]["context"]["notes"] = PRIVATE
    document["stages"][0]["evaluation"]["evaluated_configuration"]["context"][
        "notes"
    ] = PRIVATE
    document["synthetic_private_future_field"] = PRIVATE
    document["stages"][0]["private_future_field"] = PRIVATE
    with pg_engine.begin() as conn:
        # More than a page of other own synthetic history, never an actual user.
        for _ in range(51):
            insert_owned_history(
                conn, a[2], own_pc.id, uuid4(), document, then + timedelta(seconds=1)
            )
        insert_owned_history(conn, a[2], own_pc.id, historical_id, document, then)
        insert_owned_history(conn, a[2], own_pc.id, collision_id, document, then)
        first50 = conn.scalars(
            sa.select(headers.c.id)
            .where(headers.c.owner_id == a[2])
            .order_by(headers.c.updated_at.desc(), headers.c.id)
            .limit(50)
        ).all()
        assert historical_id not in first50
    frozen = deepcopy(ctx.svc.get(a[2], historical_id, revision=None))
    assert ctx.svc.get(a[2], historical_id, revision=1) == frozen
    with pytest.raises(PCError) as absent_history:
        ctx.svc.get(a[2], historical_id, revision=99)
    assert absent_history.value.status == 404

    async def probe():
        async with Client(child_params(a, cid)) as client:
            listing = await client.list_tools()
            assert len(listing.tools) == 7
            current = await client.call_tool("get_plan", {"plan_id": str(wire["id"])})
            assert not current.is_error
            assert current.structured_content["configuration_schema"] == 2
            projected = project_tool_result("get_plan", current)
            assert PRIVATE not in projected.text
            current_data = json.loads(projected.text)
            assert current_data["data"]["snapshot"]["status"] == "requires_verification"
            assert current_data["data"]["snapshot"]["stages"][0]["evaluation"][
                "missing_fields"
            ]
            historical = await client.call_tool(
                "get_plan", {"plan_id": str(historical_id)}
            )
            assert not historical.is_error
            assert historical.structured_content["data"]["snapshot"] == document
            projected_history = project_tool_result("get_plan", historical)
            history_data = json.loads(projected_history.text)["data"]["snapshot"]
            assert PRIVATE not in projected_history.text
            assert "normalized_input" not in history_data
            assert "synthetic_private_future_field" not in history_data
            assert "private_future_field" not in history_data["stages"][0]
            assert history_data["stages"][0]["offers"] == [quote]
            assert history_data["versions"] == {
                k: v
                for k, v in document["versions"].items()
                if k
                in {
                    "catalog",
                    "rules",
                    "policy",
                    "inventory",
                    "scope",
                    "references",
                    "identity",
                    "calculation",
                }
            }
            assert (
                history_data["stages"][0]["actions"] == document["stages"][0]["actions"]
            )
            assert (
                history_data["stages"][0]["evaluation"]["coverage"]
                == document["stages"][0]["evaluation"]["coverage"]
            )
            # Collision must never silently select either format or truncate v2.
            ambiguous = await client.call_tool(
                "get_plan", {"plan_id": str(collision_id)}
            )
            assert ambiguous.is_error
            denied = await client.call_tool("get_plan", {"plan_id": str(foreign["id"])})
            assert denied.is_error
            forged = await client.call_tool(
                "get_plan", {"plan_id": str(foreign["id"]), "user_id": str(b[2])}
            )
            assert forged.is_error
            unexpected_revision = await client.call_tool(
                "get_plan", {"plan_id": str(historical_id), "revision": 99}
            )
            assert unexpected_revision.is_error
            # A distinct own legacy plan proves version1 remains readable.
            legacy_only = save_legacy(a, ctx.saved)
            try:
                legacy_result = await client.call_tool(
                    "get_plan", {"plan_id": legacy_only["id"]}
                )
                assert not legacy_result.is_error
                assert "configuration_schema" not in legacy_result.structured_content
                assert (
                    json.loads(project_tool_result("get_plan", legacy_result).text)[
                        "projection_version"
                    ]
                    == "1"
                )
            finally:
                with pg_engine.begin() as conn:
                    conn.execute(
                        legacy_plans.delete().where(
                            legacy_plans.c.id == UUID(legacy_only["id"]),
                            legacy_plans.c.owner_id == a[2],
                        )
                    )
            deleted = ctx.clients[0].request(
                "DELETE",
                "/api/tower-plans/" + str(wire["id"]),
                headers=a[1],
                json={"expected_plan_revision": 1},
            )
            assert deleted.status_code == 204
            gone = await client.call_tool("get_plan", {"plan_id": str(wire["id"])})
            assert gone.is_error
            assert ctx.svc.get(a[2], historical_id, revision=None) == frozen
            AuthRepository(pg_engine).revoke(digest(a[0].cookies.get("uj_session")))
            revoked = await client.call_tool(
                "get_plan", {"plan_id": str(historical_id)}
            )
            assert revoked.is_error

    try:
        asyncio.run(probe())
    finally:
        conversations.delete(a[2], cid)
        with pg_engine.begin() as conn:
            conn.execute(
                legacy_plans.delete().where(
                    legacy_plans.c.id == collision_id, legacy_plans.c.owner_id == a[2]
                )
            )
