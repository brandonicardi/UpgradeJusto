"""Additive private plan headers/history registered on the existing metadata."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from upgradejusto.persistence.schema import metadata

headers = sa.Table(
    "tower_plans",
    metadata,
    sa.Column("id", sa.Uuid, primary_key=True),
    sa.Column(
        "owner_id", sa.Uuid, sa.ForeignKey("auth_users.id"), nullable=False, index=True
    ),
    sa.Column("pc_id", sa.Uuid, sa.ForeignKey("pcs.id", ondelete="SET NULL")),
    sa.Column("current_revision", sa.Integer, nullable=False),
    sa.Column("create_request_id", sa.Uuid, nullable=False),
    sa.Column("create_request_hash", sa.String(64), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("deleted_at", sa.DateTime(timezone=True)),
    sa.UniqueConstraint("owner_id", "create_request_id", name="uq_tower_plan_create"),
    sa.CheckConstraint("current_revision >= 1", name="ck_tower_plan_revision"),
    sa.CheckConstraint(
        "create_request_hash ~ '^[0-9a-f]{64}$'", name="ck_tower_plan_hash"
    ),
)
revisions = sa.Table(
    "tower_plan_revisions",
    metadata,
    sa.Column(
        "plan_id",
        sa.Uuid,
        sa.ForeignKey("tower_plans.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    sa.Column("revision", sa.Integer, primary_key=True),
    sa.Column("operation_id", sa.Uuid, nullable=False),
    sa.Column("request_hash", sa.String(64), nullable=False),
    sa.Column("snapshot", JSONB, nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.UniqueConstraint("plan_id", "operation_id", name="uq_tower_plan_operation"),
    sa.CheckConstraint("revision >= 1", name="ck_tower_plan_history_revision"),
    sa.CheckConstraint(
        "request_hash ~ '^[0-9a-f]{64}$'", name="ck_tower_plan_history_hash"
    ),
    sa.CheckConstraint(
        "jsonb_typeof(snapshot) = 'object' AND "
        "COALESCE(snapshot->>'kind' = 'tower_plan', false) AND "
        "COALESCE(snapshot->'schema_version' = '2'::jsonb, false)",
        name="ck_tower_plan_snapshot_v2",
    ),
)
