"""Additive explicit PC assembly declaration; existing PCs stay undeclared."""

import sqlalchemy as sa

from alembic import op

revision = "39_002"
down_revision = "39_001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("pcs", sa.Column("assembly_state", sa.Text(), nullable=True))
    op.create_check_constraint(
        "ck_pc_assembly_state",
        "pcs",
        "assembly_state IS NULL OR assembly_state IN ('assembled', 'new')",
    )


def downgrade():
    op.drop_constraint("ck_pc_assembly_state", "pcs", type_="check")
    op.drop_column("pcs", "assembly_state")
