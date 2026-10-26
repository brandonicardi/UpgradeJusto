"""External identity is canonical issuer/sub, never an email link."""

import sqlalchemy as sa

from upgradejusto.persistence.schema import metadata

identities = sa.Table(
    "auth_external_identities",
    metadata,
    sa.Column("issuer", sa.String(100), primary_key=True),
    sa.Column("subject", sa.String(255), primary_key=True),
    sa.Column(
        "user_id", sa.Uuid, sa.ForeignKey("auth_users.id"), nullable=False, unique=True
    ),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint(
        "issuer = 'https://accounts.google.com'", name="ck_google_canonical_issuer"
    ),
    sa.CheckConstraint("length(subject) BETWEEN 1 AND 255", name="ck_google_subject"),
)
attempts = sa.Table(
    "auth_google_attempts",
    metadata,
    sa.Column("id", sa.Uuid, primary_key=True),
    sa.Column(
        "session_digest",
        sa.String(64),
        sa.ForeignKey("auth_sessions.digest"),
        nullable=False,
        index=True,
    ),
    sa.Column("origin", sa.String(300), nullable=False),
    sa.Column("client_id", sa.String(200), nullable=False),
    sa.Column("nonce_hash", sa.String(64), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False, index=True),
    sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
    sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("expires_at > created_at", name="ck_google_attempt_expiry"),
    sa.CheckConstraint(
        "completed_at IS NULL OR claimed_at IS NOT NULL",
        name="ck_google_attempt_completion",
    ),
)
