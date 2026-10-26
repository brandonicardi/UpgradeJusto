"""CU03 additive PCs and full component groups, no existing data changes."""

import sqlalchemy as sa

from alembic import op

revision = "32_c_001"
down_revision = "32_b_001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "pcs",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("owner_id", sa.Uuid, sa.ForeignKey("auth_users.id"), nullable=False),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("revision", sa.Integer, nullable=False),
        sa.Column("bios_version", sa.Text, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.CheckConstraint("revision > 0", name="ck_pc_revision"),
        sa.CheckConstraint("length(name) BETWEEN 1 AND 100", name="ck_pc_name"),
        sa.CheckConstraint(
            "bios_version IS NULL OR length(bios_version) BETWEEN 1 AND 100",
            name="ck_pc_bios",
        ),
        sa.CheckConstraint(
            "notes IS NULL OR length(notes) BETWEEN 1 AND 1000", name="ck_pc_notes"
        ),
    )
    op.create_index("ix_pcs_owner_id", "pcs", ["owner_id"])
    op.create_table(
        "pc_component_groups",
        sa.Column(
            "pc_id",
            sa.Uuid,
            sa.ForeignKey("pcs.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("category", sa.Text, primary_key=True),
        sa.Column("dataset_version", sa.Text, nullable=False),
        sa.Column("component_id", sa.Text, nullable=False),
        sa.Column("quantity", sa.Integer, nullable=False),
        sa.ForeignKeyConstraint(
            ["dataset_version", "component_id"],
            ["catalog_components.dataset_version", "catalog_components.id"],
        ),
        sa.CheckConstraint(
            "category IN ('cpu', 'motherboard', 'ram', 'gpu', 'psu', 'case')",
            name="ck_pc_group_category",
        ),
        sa.CheckConstraint(
            "quantity BETWEEN 1 AND 8 AND (category = 'ram' OR quantity = 1)",
            name="ck_pc_group_quantity",
        ),
    )


def downgrade():
    raise RuntimeError("Destructive downgrade not authorized")
