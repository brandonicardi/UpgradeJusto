"""Add line-based tower schema2 without rewriting legacy groups/snapshots."""

from alembic import op

revision = "38_a_001"
down_revision = "37_001"
branch_labels = None
depends_on = None


def upgrade():
    from upgradejusto.pcs.tower_tables import configurations, lines

    op.drop_constraint("ck_catalog_category", "catalog_components", type_="check")
    op.create_check_constraint(
        "ck_catalog_category",
        "catalog_components",
        "category IN ('cpu','motherboard','ram','gpu','psu','case','storage','cooler','fan')",
    )
    configurations.create(op.get_bind())
    lines.create(op.get_bind())


def downgrade():
    import sqlalchemy as sa

    from upgradejusto.pcs.tower_tables import configurations, lines

    if not op.get_context().as_sql:
        if op.get_bind().scalar(sa.select(sa.func.count()).select_from(configurations)):
            raise RuntimeError("Refusing downgrade with persisted towers")
    # PG deliberately refuses restoring six-category constraint while new data
    # exists. Never delete catalog/user rows merely to make downgrade succeed.
    lines.drop(op.get_bind())
    configurations.drop(op.get_bind())
    op.drop_constraint("ck_catalog_category", "catalog_components", type_="check")
    op.create_check_constraint(
        "ck_catalog_category",
        "catalog_components",
        "category IN ('cpu','motherboard','ram','gpu','psu','case')",
    )
