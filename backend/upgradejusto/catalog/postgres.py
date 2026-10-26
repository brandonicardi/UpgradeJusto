"""Repositorio CU04 PG; nunca sustituye un fallo por el snapshot curado."""

import json
from dataclasses import dataclass

import sqlalchemy as sa

from upgradejusto.administration.models import SupportData
from upgradejusto.administration.tables import active, revisions
from upgradejusto.administration.tables import rows as revision_rows
from upgradejusto.catalog.models import Component
from upgradejusto.persistence.runtime import Unavailable, runtime_engine
from upgradejusto.persistence.schema import components
from upgradejusto.retail.models import current_offer
from upgradejusto.retail.reading import aggregate_resources


@dataclass(frozen=True)
class PublishedCatalogSnapshot:
    dataset_version: str
    components: tuple
    support_rows: tuple
    source_rows: tuple = ()


def published_catalog_snapshot(conn, version):
    """Internal server lookup of one immutable revision, never the active pointer."""
    if not conn.scalar(
        sa.select(revisions.c.id).where(
            revisions.c.id == version, revisions.c.status == "published"
        )
    ):
        raise Unavailable
    parts = (
        conn.execute(
            sa.select(components).where(components.c.dataset_version == version)
        )
        .mappings()
        .all()
    )
    support = conn.scalars(
        sa.select(revision_rows.c.data).where(
            revision_rows.c.revision_id == version,
            revision_rows.c.collection == "cpu_support",
        )
    ).all()
    parts = tuple(
        Component.model_validate(
            {k: v for k, v in row.items() if k != "dataset_version"}
        )
        for row in parts
    )
    return PublishedCatalogSnapshot(
        dataset_version=version,
        components=aggregate_resources(conn, version, parts),
        support_rows=tuple(
            SupportData.model_validate_json(json.dumps(item)) for item in support
        ),
        source_rows=tuple(
            conn.scalars(
                sa.select(revision_rows.c.data).where(
                    revision_rows.c.revision_id == version,
                    revision_rows.c.collection == "sources",
                )
            ).all()
        ),
    )


class PostgresCatalogRepository:
    def __init__(self, engine=None):
        self.engine = engine if engine is not None else runtime_engine()
        with self.engine.begin() as conn:
            self.dataset_version = conn.scalar(
                sa.select(active.c.version)
                .where(active.c.singleton == 1)
                .with_for_update(read=True)
            )
            if not self.dataset_version:
                raise Unavailable
            snapshot = published_catalog_snapshot(conn, self.dataset_version)
        self.support_rows = snapshot.support_rows
        self.source_rows = snapshot.source_rows
        self._snapshot = snapshot.components

    def all(self):
        return tuple(
            part.model_copy(
                deep=True,
                update={"offers": tuple(current_offer(o) for o in part.offers)},
            )
            for part in self._snapshot
        )

    def get(self, component_id):
        return next((item for item in self.all() if item.id == component_id), None)
