"""New capability records and operational budget, no legacy/auth table writes."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from upgradejusto.persistence.schema import metadata
from upgradejusto.plans.tower_tables import revisions

shares = sa.Table(
    "tower_plan_shares",
    metadata,
    sa.Column("id", sa.Uuid, primary_key=True),
    sa.Column("plan_id", sa.Uuid, nullable=False, index=True),
    sa.Column("plan_revision", sa.Integer, nullable=False),
    sa.Column("token_digest", sa.String(64), nullable=False, unique=True),
    sa.Column("title", sa.Text, nullable=False),
    sa.Column("projection_version", sa.Text, nullable=False),
    sa.Column("snapshot", JSONB, nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("revoked_at", sa.DateTime(timezone=True)),
    sa.ForeignKeyConstraint(
        ["plan_id", "plan_revision"],
        [revisions.c.plan_id, revisions.c.revision],
        ondelete="CASCADE",
    ),
    sa.CheckConstraint("plan_revision >= 1", name="ck_tower_share_revision"),
    sa.CheckConstraint("token_digest ~ '^[0-9a-f]{64}$'", name="ck_tower_share_digest"),
    sa.CheckConstraint(
        "title IN ('Plan de mejora de torre','Plan de mejora por etapas')",
        name="ck_tower_share_title",
    ),
    sa.CheckConstraint(
        "jsonb_typeof(snapshot) = 'object' AND "
        "COALESCE(snapshot->>'kind' = 'shared_tower_plan', false) AND "
        "COALESCE(snapshot->'schema_version' = '2'::jsonb, false)",
        name="ck_tower_share_snapshot",
    ),
)
budgets = sa.Table(
    "tower_share_read_budgets",
    metadata,
    sa.Column("key_digest", sa.String(64), primary_key=True),
    sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("count", sa.Integer, nullable=False),
    sa.CheckConstraint(
        "key_digest ~ '^[0-9a-f]{64}$'", name="ck_tower_share_budget_key"
    ),
    sa.CheckConstraint("count BETWEEN 1 AND 61", name="ck_tower_share_budget_count"),
)
