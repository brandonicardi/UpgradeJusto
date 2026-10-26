"""Additive retail tables; legacy component image column stays NULL."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from upgradejusto.persistence.schema import metadata

publications = sa.Table(
    "retail_publications",
    metadata,
    sa.Column("batch_key", sa.String(64), primary_key=True),
    sa.Column(
        "dataset_version",
        sa.Text,
        sa.ForeignKey("catalog_revisions.id"),
        nullable=False,
    ),
    sa.Column("store", sa.Text, nullable=False),
    sa.Column("source_version", sa.Text, nullable=False),
    sa.Column("raw_sha256", sa.String(64), nullable=False),
    sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("partial_batch", sa.Boolean, nullable=False),
    sa.Column("pagination_complete", sa.Boolean, nullable=False),
    sa.Column("quarantine", JSONB, nullable=False),
    sa.UniqueConstraint("store", "source_version", name="uq_retail_source_version"),
    sa.CheckConstraint("store IN ('compragamer','venex')", name="ck_retail_store"),
)
resources = sa.Table(
    "retail_resources",
    metadata,
    sa.Column("dataset_version", sa.Text, primary_key=True),
    sa.Column("component_id", sa.Text, primary_key=True),
    sa.Column("identity", JSONB, nullable=False),
    sa.Column("image_evidence", JSONB, nullable=True),
    sa.Column("offers", JSONB, nullable=False),
    sa.ForeignKeyConstraint(
        ["dataset_version", "component_id"],
        ["catalog_components.dataset_version", "catalog_components.id"],
    ),
)
