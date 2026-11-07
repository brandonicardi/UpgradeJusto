"""Additive tower-plan stage progress; snapshots and revisions stay untouched."""

import sqlalchemy as sa

from alembic import op
from upgradejusto.plans.tower_tables import progress

revision = "38_f_001"
down_revision = "38_e_001"
branch_labels = None
depends_on = None


def upgrade():
    progress.create(op.get_bind())


def downgrade():
    if op.get_context().as_sql:
        raise RuntimeError(
            "Tower progress downgrade requires online empty-table verification"
        )
    conn = op.get_bind()
    if conn.scalar(sa.select(sa.func.count()).select_from(progress)):
        raise RuntimeError("Refusing downgrade with tower plan progress")
    progress.drop(conn)
