"""Initial versioned catalog only; no identity/session tables.

Revision ID: 31b_a_001
Revises: None
"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "31b_a_001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "catalog_datasets",
        sa.Column("version", sa.Text, primary_key=True),
        sa.CheckConstraint("length(version) > 0", name="ck_catalog_dataset_version"),
    )
    op.create_table(
        "catalog_components",
        sa.Column(
            "dataset_version",
            sa.Text,
            sa.ForeignKey("catalog_datasets.version"),
            primary_key=True,
        ),
        sa.Column("id", sa.Text, primary_key=True),
        sa.Column("category", sa.Text, nullable=False),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("attributes", JSONB, nullable=False),
        sa.Column("sources", JSONB, nullable=False),
        sa.Column("prices", JSONB, nullable=False),
        sa.Column("image", sa.Text, nullable=True),
        sa.CheckConstraint(
            "category IN ('cpu', 'motherboard', 'ram', 'gpu', 'psu', 'case')",
            name="ck_catalog_category",
        ),
        sa.CheckConstraint("length(id) > 0", name="ck_catalog_component_id"),
        sa.CheckConstraint("length(name) > 0", name="ck_catalog_component_name"),
        sa.CheckConstraint(
            "jsonb_typeof(attributes) = 'object'",
            name="ck_catalog_attributes_object",
        ),
        sa.CheckConstraint(
            "jsonb_typeof(sources) = 'array'",
            name="ck_catalog_sources_array",
        ),
        sa.CheckConstraint(
            "jsonb_typeof(prices) = 'array'",
            name="ck_catalog_prices_array",
        ),
        sa.CheckConstraint("image IS NULL", name="ck_catalog_image_unknown"),
    )


def downgrade() -> None:
    raise RuntimeError("Destructive catalog downgrade is not authorized")
