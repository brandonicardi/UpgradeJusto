"""Additive cross-worker shared provider leases; no historical migration edits."""

from alembic import op

revision = "37_001"
down_revision = "33_001"
branch_labels = None
depends_on = None


def upgrade():
    from upgradejusto.auth.provider_budget import leases

    leases.create(op.get_bind())
    op.create_index(
        "ix_auth_sessions_retention_expiry", "auth_sessions", ["expires_at"]
    )
    op.create_index(
        "ix_auth_sessions_retention_revoked", "auth_sessions", ["revoked_at"]
    )
    op.create_index(
        "ix_auth_attempts_retention_started", "auth_attempts", ["started_at"]
    )


def downgrade():
    from upgradejusto.auth.provider_budget import leases

    op.drop_index("ix_auth_attempts_retention_started", table_name="auth_attempts")
    op.drop_index("ix_auth_sessions_retention_revoked", table_name="auth_sessions")
    op.drop_index("ix_auth_sessions_retention_expiry", table_name="auth_sessions")
    leases.drop(op.get_bind())
