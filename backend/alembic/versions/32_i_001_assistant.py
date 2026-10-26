"""CU08 private history and public vectors; requires H and installed pgvector."""

from alembic import op

revision = "32_i_001"
down_revision = "32_h_001"
branch_labels = None
depends_on = None


def upgrade():
    from upgradejusto.assistant.tables import chunks, conversations, messages

    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    bind = op.get_bind()
    for table in (conversations, messages, chunks):
        table.create(bind)


def downgrade():
    from upgradejusto.assistant.tables import chunks, conversations, messages

    bind = op.get_bind()
    for table in (chunks, messages, conversations):
        table.drop(bind)
