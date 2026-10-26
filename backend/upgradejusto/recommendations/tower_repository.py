"""Read-only owned preview under header/publication locks; no active fallback."""

import sqlalchemy as sa

from upgradejusto.catalog.postgres import published_catalog_snapshot
from upgradejusto.catalog.service import ResolvedCatalog
from upgradejusto.pcs.service import PCError
from upgradejusto.pcs.tower_repository import TowerRepository
from upgradejusto.retail.tables import resources


def published_identities(conn, version, components):
    """Inputs are the server snapshot, never model/user SQL or selection claims."""
    identities = tuple(component.id for component in components)
    if not identities:
        return {}
    return {
        row["component_id"]: row["identity"]
        for row in conn.execute(
            sa.select(resources.c.component_id, resources.c.identity).where(
                resources.c.dataset_version == version,
                resources.c.component_id.in_(identities),
            )
        ).mappings()
    }


class TowerRecommendationCatalog(ResolvedCatalog):
    """Internal snapshot-only identities, never technical request-body fields."""

    def __init__(self, snapshot, identities):
        super().__init__(
            snapshot.components, snapshot.support_rows, snapshot.source_rows
        )
        self.retail_identities = identities


class TowerRecommendationRepository(TowerRepository):
    def preview(self, owner, identity, expected_revision, operation):
        with self.engine.begin() as conn:
            row = self._header(conn, owner, identity)
            if row is None:
                raise PCError(404, "PC not found")
            if row["revision"] != expected_revision:
                raise PCError(409, "PC revision conflict")
            self._catalog_lock(conn)
            snapshot = published_catalog_snapshot(conn, self.dataset_version)
            catalog = TowerRecommendationCatalog(
                snapshot,
                published_identities(
                    conn, snapshot.dataset_version, snapshot.components
                ),
            )
            tower = self._public(conn, row)
            if any(
                line.component_id is not None
                and (
                    line.component_id not in catalog
                    or catalog[line.component_id].category != line.category
                )
                for line in tower.lines
            ):
                raise PCError(409, "Catalog revision conflict; review selection")
            return operation(tower, catalog, snapshot.dataset_version)
