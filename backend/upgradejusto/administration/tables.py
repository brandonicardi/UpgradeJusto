"""Persistencia PG de roles, puntero y borradores/publicaciones."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from upgradejusto.persistence.schema import metadata

roles = sa.Table(
    "administration_roles",
    metadata,
    sa.Column(
        "user_id",
        sa.Uuid,
        sa.ForeignKey("auth_users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    sa.Column("role", sa.Text, nullable=False),
    sa.CheckConstraint("role = 'admin'", name="ck_administration_role"),
)
revisions = sa.Table(
    "catalog_revisions",
    metadata,
    sa.Column("id", sa.Text, primary_key=True),
    sa.Column("base_version", sa.Text, nullable=True),
    sa.Column("status", sa.Text, nullable=False),
    sa.CheckConstraint("status IN ('draft', 'published')", name="ck_revision_status"),
)
active = sa.Table(
    "catalog_active",
    metadata,
    sa.Column("singleton", sa.Integer, primary_key=True),
    sa.Column(
        "version", sa.Text, sa.ForeignKey("catalog_revisions.id"), nullable=False
    ),
    sa.CheckConstraint("singleton = 1", name="ck_catalog_singleton"),
)
rows = sa.Table(
    "catalog_revision_rows",
    metadata,
    sa.Column(
        "revision_id", sa.Text, sa.ForeignKey("catalog_revisions.id"), primary_key=True
    ),
    sa.Column("collection", sa.Text, primary_key=True),
    sa.Column("id", sa.Text, primary_key=True),
    sa.Column("data", JSONB, nullable=False),
    sa.CheckConstraint(
        "collection IN ('components','prices','sources','cpu_support')",
        name="ck_revision_collection",
    ),
)
manual_price_changes = sa.Table(
    "manual_price_changes",
    metadata,
    sa.Column("id", sa.Uuid, primary_key=True),
    sa.Column(
        "admin_id",
        sa.Uuid,
        sa.ForeignKey("auth_users.id", ondelete="CASCADE"),
        nullable=False,
    ),
    sa.Column("component_id", sa.Text, nullable=False),
    sa.Column("amount", sa.Numeric(14, 2), nullable=False),
    sa.Column("currency", sa.Text, nullable=False),
    sa.Column("observed_on", sa.Date, nullable=False),
    sa.Column("source_url", sa.Text, nullable=False),
    sa.Column(
        "dataset_version",
        sa.Text,
        sa.ForeignKey("catalog_revisions.id"),
        nullable=False,
    ),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("amount > 0", name="ck_manual_price_positive"),
    sa.CheckConstraint("currency = 'ARS'", name="ck_manual_price_currency"),
    sa.CheckConstraint("length(component_id) > 0", name="ck_manual_price_component"),
    sa.CheckConstraint("length(source_url) > 0", name="ck_manual_price_url"),
)
