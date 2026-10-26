"""Add GIS attempts/identities and explicit nullable Google-only credentials."""

import sqlalchemy as sa

from alembic import op

revision = "38_b_001"
down_revision = "38_a_001"
branch_labels = None
depends_on = None


def upgrade():
    from upgradejusto.auth.google_tables import attempts, identities

    op.alter_column("auth_users", "email", existing_type=sa.String(254), nullable=True)
    op.alter_column(
        "auth_users", "password_hash", existing_type=sa.Text(), nullable=True
    )
    op.add_column(
        "auth_users", sa.Column("profile_email", sa.String(254), nullable=True)
    )
    op.add_column(
        "auth_users", sa.Column("display_name", sa.String(200), nullable=True)
    )
    op.create_check_constraint(
        "ck_auth_local_credentials_pair",
        "auth_users",
        "(email IS NULL AND password_hash IS NULL) OR (email IS NOT NULL AND password_hash IS NOT NULL)",
    )
    identities.create(op.get_bind())
    attempts.create(op.get_bind())


def downgrade():
    from upgradejusto.auth.google_tables import attempts, identities
    from upgradejusto.persistence.schema import users

    if not op.get_context().as_sql:
        bind = op.get_bind()
        if bind.scalar(
            sa.select(sa.func.count()).select_from(identities)
        ) or bind.scalar(
            sa.select(sa.func.count()).select_from(users).where(users.c.email.is_(None))
        ):
            raise RuntimeError("Refusing downgrade with Google-only accounts")
    attempts.drop(op.get_bind())
    identities.drop(op.get_bind())
    op.drop_constraint("ck_auth_local_credentials_pair", "auth_users", type_="check")
    op.drop_column("auth_users", "display_name")
    op.drop_column("auth_users", "profile_email")
    op.alter_column(
        "auth_users", "password_hash", existing_type=sa.Text(), nullable=False
    )
    op.alter_column("auth_users", "email", existing_type=sa.String(254), nullable=False)
