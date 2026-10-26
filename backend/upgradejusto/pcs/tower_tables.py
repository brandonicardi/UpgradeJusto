"""Additive line-based tower persistence; old groups remain historical."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from upgradejusto.persistence.schema import metadata

configurations = sa.Table(
    "tower_configurations",
    metadata,
    sa.Column(
        "pc_id", sa.Uuid, sa.ForeignKey("pcs.id", ondelete="CASCADE"), primary_key=True
    ),
    sa.Column("schema_version", sa.Integer, nullable=False),
    sa.Column("category_status", JSONB, nullable=False),
    sa.CheckConstraint("schema_version = 2", name="ck_tower_schema_version"),
    sa.CheckConstraint(
        "jsonb_typeof(category_status) = 'object'", name="ck_tower_states_object"
    ),
    sa.CheckConstraint(
        "category_status ?& ARRAY['cpu','motherboard','ram','gpu','psu','case','storage','cooler','fan'] "
        "AND category_status - ARRAY['cpu','motherboard','ram','gpu','psu','case','storage','cooler','fan'] = '{}'::jsonb",
        name="ck_tower_exact_categories",
    ),
    sa.CheckConstraint(
        " AND ".join(
            f"COALESCE(category_status->>'{category}' IN ('present','unknown','absent'), false)"
            for category in (
                "cpu",
                "motherboard",
                "ram",
                "gpu",
                "psu",
                "case",
                "storage",
                "cooler",
                "fan",
            )
        ),
        name="ck_tower_presence_values",
    ),
)
lines = sa.Table(
    "tower_lines",
    metadata,
    sa.Column(
        "pc_id",
        sa.Uuid,
        sa.ForeignKey("tower_configurations.pc_id", ondelete="CASCADE"),
        primary_key=True,
    ),
    sa.Column("line_id", sa.Uuid, primary_key=True),
    sa.Column("category", sa.Text, nullable=False),
    sa.Column("component_id", sa.Text, nullable=True),
    sa.Column("dataset_version", sa.Text, nullable=True),
    sa.Column("declared_model", sa.Text, nullable=True),
    sa.Column("quantity", sa.Integer, nullable=False),
    sa.Column("position", sa.Integer, nullable=False),
    sa.ForeignKeyConstraint(
        ["dataset_version", "component_id"],
        ["catalog_components.dataset_version", "catalog_components.id"],
    ),
    sa.CheckConstraint(
        "category IN ('cpu','motherboard','ram','gpu','psu','case','storage','cooler','fan')",
        name="ck_tower_line_category",
    ),
    sa.CheckConstraint(
        "(component_id IS NOT NULL AND dataset_version IS NOT NULL AND declared_model IS NULL) OR "
        "(component_id IS NULL AND dataset_version IS NULL AND declared_model IS NOT NULL)",
        name="ck_tower_line_selection",
    ),
    sa.CheckConstraint(
        "quantity BETWEEN 1 AND 32 AND (category IN ('ram','storage','fan') OR quantity = 1)",
        name="ck_tower_line_quantity",
    ),
    sa.CheckConstraint(
        "declared_model IS NULL OR length(declared_model) BETWEEN 1 AND 200",
        name="ck_tower_declared_model",
    ),
    sa.CheckConstraint("position BETWEEN 0 AND 35", name="ck_tower_line_position"),
    sa.UniqueConstraint("pc_id", "position", name="uq_tower_position"),
)
