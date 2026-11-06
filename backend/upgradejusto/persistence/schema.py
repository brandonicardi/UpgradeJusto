"""Catálogo versionado en PostgreSQL; JSONB conserva el contrato CU04."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

metadata = sa.MetaData()

datasets = sa.Table(
    "catalog_datasets",
    metadata,
    sa.Column("version", sa.Text, primary_key=True),
    sa.CheckConstraint("length(version) > 0", name="ck_catalog_dataset_version"),
)

components = sa.Table(
    "catalog_components",
    metadata,
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
        "category IN ('cpu', 'motherboard', 'ram', 'gpu', 'psu', 'case', 'storage', 'cooler', 'fan')",
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

users = sa.Table(
    "auth_users",
    metadata,
    sa.Column("id", sa.Uuid, primary_key=True),
    sa.Column("email", sa.String(254), nullable=True, unique=True),
    sa.Column("password_hash", sa.Text, nullable=True),
    sa.Column("profile_email", sa.String(254), nullable=True),
    sa.Column("display_name", sa.String(200), nullable=True),
    sa.CheckConstraint(
        "(email IS NULL AND password_hash IS NULL) OR "
        "(email IS NOT NULL AND password_hash IS NOT NULL)",
        name="ck_auth_local_credentials_pair",
    ),
)

sessions = sa.Table(
    "auth_sessions",
    metadata,
    sa.Column("digest", sa.String(64), primary_key=True),
    sa.Column("user_id", sa.Uuid, sa.ForeignKey("auth_users.id"), nullable=True),
    sa.Column("csrf_token", sa.String(43), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("expires_at > created_at", name="ck_auth_session_expiry"),
)

attempts = sa.Table(
    "auth_attempts",
    metadata,
    sa.Column("key", sa.String(64), primary_key=True),
    sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("count", sa.Integer, nullable=False),
    sa.CheckConstraint("count > 0", name="ck_auth_attempt_positive"),
)

pcs = sa.Table(
    "pcs",
    metadata,
    sa.Column("id", sa.Uuid, primary_key=True),
    sa.Column(
        "owner_id", sa.Uuid, sa.ForeignKey("auth_users.id"), nullable=False, index=True
    ),
    sa.Column("name", sa.Text, nullable=False),
    sa.Column("revision", sa.Integer, nullable=False),
    sa.Column("bios_version", sa.Text, nullable=True),
    sa.Column("notes", sa.Text, nullable=True),
    sa.Column("assembly_state", sa.Text, nullable=True),
    sa.CheckConstraint("revision > 0", name="ck_pc_revision"),
    sa.CheckConstraint("length(name) BETWEEN 1 AND 100", name="ck_pc_name"),
    sa.CheckConstraint(
        "bios_version IS NULL OR length(bios_version) BETWEEN 1 AND 100",
        name="ck_pc_bios",
    ),
    sa.CheckConstraint(
        "notes IS NULL OR length(notes) BETWEEN 1 AND 1000", name="ck_pc_notes"
    ),
    sa.CheckConstraint(
        "assembly_state IS NULL OR assembly_state IN ('assembled', 'new')",
        name="ck_pc_assembly_state",
    ),
)

pc_groups = sa.Table(
    "pc_component_groups",
    metadata,
    sa.Column(
        "pc_id", sa.Uuid, sa.ForeignKey("pcs.id", ondelete="CASCADE"), primary_key=True
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

plans = sa.Table(
    "plans",
    metadata,
    sa.Column("id", sa.Uuid, primary_key=True),
    sa.Column(
        "owner_id", sa.Uuid, sa.ForeignKey("auth_users.id"), nullable=False, index=True
    ),
    sa.Column(
        "pc_id", sa.Uuid, sa.ForeignKey("pcs.id", ondelete="SET NULL"), nullable=True
    ),
    sa.Column("name", sa.Text, nullable=False),
    sa.Column("revision", sa.Integer, nullable=False),
    sa.Column("snapshot", JSONB, nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("revision > 0", name="ck_plan_revision"),
    sa.CheckConstraint("length(name) BETWEEN 1 AND 100", name="ck_plan_name"),
    sa.CheckConstraint(
        "jsonb_typeof(snapshot) = 'object'", name="ck_plan_snapshot_object"
    ),
)

shares = sa.Table(
    "plan_shares",
    metadata,
    sa.Column("id", sa.Uuid, primary_key=True),
    sa.Column(
        "plan_id",
        sa.Uuid,
        sa.ForeignKey("plans.id", ondelete="CASCADE"),
        nullable=False,
    ),
    sa.Column("owner_id", sa.Uuid, sa.ForeignKey("auth_users.id"), nullable=False),
    sa.Column("digest", sa.String(64), nullable=False, unique=True),
    sa.Column("plan_revision", sa.Integer, nullable=False),
    sa.Column("title", sa.Text, nullable=False),
    sa.Column("snapshot", JSONB, nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("plan_revision > 0", name="ck_share_plan_revision"),
    sa.CheckConstraint("length(title) BETWEEN 1 AND 100", name="ck_share_title"),
    sa.CheckConstraint("digest ~ '^[0-9a-f]{64}$'", name="ck_share_digest"),
    sa.CheckConstraint(
        "jsonb_typeof(snapshot) = 'object'", name="ck_share_snapshot_object"
    ),
    sa.Index("ix_plan_shares_plan_owner", "plan_id", "owner_id"),
)
