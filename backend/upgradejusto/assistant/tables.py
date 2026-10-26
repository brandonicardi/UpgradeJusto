"""Tablas propias sobre metadata compartida; importar antes de Alembic/tests."""

import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import JSONB

from upgradejusto.persistence.schema import metadata

conversations = sa.Table(
    "assistant_conversations",
    metadata,
    sa.Column("id", sa.Uuid, primary_key=True),
    sa.Column(
        "owner_id", sa.Uuid, sa.ForeignKey("auth_users.id"), nullable=False, index=True
    ),
    sa.Column("title", sa.Text, nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint("length(title) BETWEEN 1 AND 100", name="ck_assistant_title"),
)
messages = sa.Table(
    "assistant_messages",
    metadata,
    sa.Column("id", sa.Uuid, primary_key=True),
    sa.Column(
        "conversation_id",
        sa.Uuid,
        sa.ForeignKey("assistant_conversations.id", ondelete="CASCADE"),
        nullable=False,
    ),
    sa.Column("sequence", sa.Integer, nullable=False),
    sa.Column("request_id", sa.Uuid, nullable=False),
    sa.Column("role", sa.Text, nullable=False),
    sa.Column("content", sa.Text, nullable=False),
    sa.Column("status", sa.Text, nullable=False),
    sa.Column("citations", JSONB, nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.UniqueConstraint("conversation_id", "sequence"),
    sa.UniqueConstraint("conversation_id", "request_id", "role"),
    sa.CheckConstraint("role IN ('user','assistant')", name="ck_assistant_role"),
    sa.CheckConstraint(
        "status IN ('pending','completed','failed','interrupted')",
        name="ck_assistant_status",
    ),
    sa.CheckConstraint("sequence > 0", name="ck_assistant_sequence"),
    sa.CheckConstraint("length(content) <= 32000", name="ck_assistant_content"),
    sa.CheckConstraint(
        "jsonb_typeof(citations) = 'array'", name="ck_assistant_citations"
    ),
)
sa.Index(
    "uq_assistant_pending",
    messages.c.conversation_id,
    unique=True,
    postgresql_where=messages.c.status == "pending",
)
chunks = sa.Table(
    "assistant_public_chunks",
    metadata,
    sa.Column("id", sa.Text, primary_key=True),
    sa.Column("source_id", sa.Text, nullable=False),
    sa.Column("revision", sa.String(64), nullable=False),
    sa.Column("encoder_revision", sa.Text, nullable=False),
    sa.Column("url", sa.Text, nullable=False),
    sa.Column("title", sa.Text, nullable=False),
    sa.Column("locator", sa.Text, nullable=False),
    sa.Column("content", sa.Text, nullable=False),
    sa.Column("embedding", Vector(384), nullable=False),
)
