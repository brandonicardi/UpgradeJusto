"""G: snapshots propios de planes; borrar PC solo anula referencia fuente."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "32_g_001"
down_revision = "32_c_001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "plans",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("owner_id", sa.Uuid, sa.ForeignKey("auth_users.id"), nullable=False),
        sa.Column(
            "pc_id",
            sa.Uuid,
            sa.ForeignKey("pcs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("revision", sa.Integer, nullable=False),
        sa.Column("snapshot", JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("revision > 0", name="ck_plan_revision"),
        sa.CheckConstraint("length(name) BETWEEN 1 AND 100", name="ck_plan_name"),
        sa.CheckConstraint(
            "jsonb_typeof(snapshot) = 'object'", name="ck_plan_snapshot_object"
        ),
    )
    op.create_index("ix_plans_owner_id", "plans", ["owner_id"])


def downgrade():
    raise RuntimeError("Destructive downgrade not authorized")
