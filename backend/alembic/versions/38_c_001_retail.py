"""Immutable retailer publications and evidence; no legacy image mutation."""

from alembic import op
from upgradejusto.retail.tables import publications, resources

revision = "38_c_001"
down_revision = "38_b_001"
branch_labels = None
depends_on = None


def upgrade():
    publications.create(op.get_bind())
    resources.create(op.get_bind())


def downgrade():
    resources.drop(op.get_bind())
    publications.drop(op.get_bind())
