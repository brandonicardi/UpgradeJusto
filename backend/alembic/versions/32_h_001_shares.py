"""H: publicaciones inmutables, token solo digest, revocación persistente."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "32_h_001"
down_revision = "32_g_001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "plan_shares",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column(
            "plan_id",
            sa.Uuid,
            sa.ForeignKey("plans.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("owner_id", sa.Uuid, sa.ForeignKey("auth_users.id"), nullable=False),
        sa.Column("digest", sa.String(64), nullable=False, unique=True),
        sa.Column("plan_revision", sa.Integer, nullable=False),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("snapshot", JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("plan_revision > 0", name="ck_share_plan_revision"),
        sa.CheckConstraint("length(title) BETWEEN 1 AND 100", name="ck_share_title"),
        sa.CheckConstraint("digest ~ '^[0-9a-f]{64}$'", name="ck_share_digest"),
        sa.CheckConstraint(
            "jsonb_typeof(snapshot) = 'object'", name="ck_share_snapshot_object"
        ),
    )
    op.create_index("ix_plan_shares_plan_owner", "plan_shares", ["plan_id", "owner_id"])


def downgrade():
    raise RuntimeError("Destructive downgrade not authorized")
