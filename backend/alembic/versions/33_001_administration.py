"""CU02/CU10 active catalog revisions and server administration role."""

import json

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert

from alembic import context, op

revision = "33_001"
down_revision = "32_i_001"
branch_labels = None
depends_on = None


def upgrade():
    from upgradejusto.administration.initial import initial_entries
    from upgradejusto.administration.tables import active, revisions, roles, rows
    from upgradejusto.administration.validation import materialize
    from upgradejusto.catalog.dataset import DATASET_VERSION
    from upgradejusto.persistence.schema import components, datasets
    from upgradejusto.persistence.seed import assert_existing_matches, component_rows

    bind = op.get_bind()
    # Initial seed is explicit migration input, not an HTTP fallback.
    expected = component_rows()
    offline = context.is_offline_mode()
    if offline:
        # Offline is SQL generation only, never PostgreSQL integration evidence.
        parts = expected
    else:
        bind.execute(
            insert(datasets).values(version=DATASET_VERSION).on_conflict_do_nothing()
        )
        bind.execute(insert(components).values(expected).on_conflict_do_nothing())
        parts = [
            dict(r)
            for r in bind.execute(
                sa.select(components).where(
                    components.c.dataset_version == DATASET_VERSION
                )
            ).mappings()
        ]
        actual = {r["id"]: r for r in parts}
        for item in expected:
            assert_existing_matches(item, actual[item["id"]])
    for table in (roles, revisions, active, rows):
        table.create(bind)
    entries = initial_entries(parts)
    materialize(entries)
    if offline:

        def literal(value):
            if value is None:
                return "NULL"
            if isinstance(value, int):
                return str(value)
            if isinstance(value, (dict, list)):
                return "'" + json.dumps(value).replace("'", "''") + "'::jsonb"
            return "'" + str(value).replace("'", "''") + "'"

        def emit(table, values, conflict=False):
            # Only fixed migration-owned table/column names and curated constants.
            columns = ",".join(values)
            data = ",".join(literal(v) for v in values.values())
            suffix = " ON CONFLICT DO NOTHING" if conflict else ""
            op.execute(
                sa.text(f"INSERT INTO {table} ({columns}) VALUES ({data}){suffix}")
            )

        emit("catalog_datasets", {"version": DATASET_VERSION}, True)
        for part in expected:
            emit("catalog_components", part, True)
        emit(
            "catalog_revisions",
            {"id": DATASET_VERSION, "base_version": None, "status": "published"},
        )
        for entry in entries:
            emit("catalog_revision_rows", {"revision_id": DATASET_VERSION, **entry})
        emit("catalog_active", {"singleton": 1, "version": DATASET_VERSION})
    else:
        bind.execute(
            revisions.insert().values(
                id=DATASET_VERSION, base_version=None, status="published"
            )
        )
        bind.execute(
            rows.insert(),
            [{"revision_id": DATASET_VERSION, **entry} for entry in entries],
        )
        bind.execute(active.insert().values(singleton=1, version=DATASET_VERSION))
    op.execute("""
        CREATE FUNCTION uj_immutable_revision() RETURNS trigger LANGUAGE plpgsql AS $$
        DECLARE version_id text;
        BEGIN
          IF TG_TABLE_NAME = 'catalog_revisions' THEN
            IF OLD.status = 'published' THEN RAISE EXCEPTION 'Published revision is immutable'; END IF;
          ELSE
            IF TG_OP = 'UPDATE' AND EXISTS (SELECT 1 FROM catalog_revisions WHERE id = OLD.revision_id AND status = 'published') THEN
              RAISE EXCEPTION 'Published revision is immutable';
            END IF;
            IF TG_OP = 'DELETE' THEN version_id := OLD.revision_id; ELSE version_id := NEW.revision_id; END IF;
            IF EXISTS (SELECT 1 FROM catalog_revisions WHERE id = version_id AND status = 'published') THEN
              RAISE EXCEPTION 'Published revision is immutable';
            END IF;
          END IF;
          IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
          RETURN NEW;
        END $$;
        CREATE TRIGGER immutable_catalog_revision BEFORE UPDATE OR DELETE ON catalog_revisions
          FOR EACH ROW EXECUTE FUNCTION uj_immutable_revision();
        CREATE TRIGGER immutable_catalog_rows BEFORE INSERT OR UPDATE OR DELETE ON catalog_revision_rows
          FOR EACH ROW EXECUTE FUNCTION uj_immutable_revision();
        CREATE FUNCTION uj_immutable_components() RETURNS trigger LANGUAGE plpgsql AS $$
        DECLARE version_id text;
        BEGIN
          IF TG_OP = 'INSERT' THEN version_id := NEW.dataset_version; ELSE version_id := OLD.dataset_version; END IF;
          IF EXISTS (SELECT 1 FROM catalog_revisions WHERE id = version_id AND status = 'published') THEN
            RAISE EXCEPTION 'Published catalog is immutable';
          END IF;
          IF TG_OP = 'UPDATE' AND EXISTS (SELECT 1 FROM catalog_revisions WHERE id = NEW.dataset_version AND status = 'published') THEN
            RAISE EXCEPTION 'Published catalog is immutable';
          END IF;
          IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
          RETURN NEW;
        END $$;
        CREATE TRIGGER immutable_catalog_components AFTER INSERT OR UPDATE OR DELETE ON catalog_components
          FOR EACH ROW EXECUTE FUNCTION uj_immutable_components();
    """)


def downgrade():
    raise RuntimeError("Destructive revision downgrade is not authorized")
