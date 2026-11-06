"""Manual published prices: append-only audit of administrator price loads."""

from alembic import op
from upgradejusto.administration.tables import manual_price_changes

revision = "39_001"
down_revision = "38_f_001"
branch_labels = None
depends_on = None


def upgrade():
    manual_price_changes.create(op.get_bind())


def downgrade():
    manual_price_changes.drop(op.get_bind())
