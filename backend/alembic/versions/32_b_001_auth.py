"""CU01 additive identity, sessions and shared attempt counters."""

import sqlalchemy as sa

from alembic import op

revision = "32_b_001"
down_revision = "31b_a_001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "auth_users",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("password_hash", sa.Text, nullable=False),
    )
    op.create_table(
        "auth_sessions",
        sa.Column("digest", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.Uuid, sa.ForeignKey("auth_users.id"), nullable=True),
        sa.Column("csrf_token", sa.String(43), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("expires_at > created_at", name="ck_auth_session_expiry"),
    )
    op.create_table(
        "auth_attempts",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("count", sa.Integer, nullable=False),
        sa.CheckConstraint("count > 0", name="ck_auth_attempt_positive"),
    )


def downgrade():
    raise RuntimeError("Destructive downgrade not authorized")
