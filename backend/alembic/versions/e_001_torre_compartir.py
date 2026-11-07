"""Add tower capabilities and PG read budget; no legacy/publication mutation."""

import sqlalchemy as sa

from alembic import op
from upgradejusto.shares.tower_tables import budgets, shares

revision = "38_e_001"
down_revision = "38_d_001"
branch_labels = None
depends_on = None


def upgrade():
    shares.create(op.get_bind())
    budgets.create(op.get_bind())


def downgrade():
    if op.get_context().as_sql:
        raise RuntimeError(
            "Tower share downgrade requires online empty-table verification"
        )
    conn = op.get_bind()
    if conn.scalar(sa.select(sa.func.count()).select_from(shares)) or conn.scalar(
        sa.select(sa.func.count()).select_from(budgets)
    ):
        raise RuntimeError("Refusing downgrade with tower shares or read budgets")
    budgets.drop(conn)
    shares.drop(conn)
