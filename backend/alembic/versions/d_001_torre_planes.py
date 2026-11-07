"""Private tower plan headers and append-only application history, additive."""

import sqlalchemy as sa

from alembic import op
from upgradejusto.plans.tower_tables import headers, revisions

revision = "38_d_001"
down_revision = "38_c_001"
branch_labels = None
depends_on = None


def upgrade():
    headers.create(op.get_bind())
    revisions.create(op.get_bind())


def downgrade():
    if op.get_context().as_sql:
        raise RuntimeError(
            "Tower plan downgrade requires online empty-table verification"
        )
    conn = op.get_bind()
    if conn.scalar(sa.select(sa.func.count()).select_from(headers)) or conn.scalar(
        sa.select(sa.func.count()).select_from(revisions)
    ):
        raise RuntimeError("Refusing downgrade with tower plan history")
    revisions.drop(conn)
    headers.drop(conn)
