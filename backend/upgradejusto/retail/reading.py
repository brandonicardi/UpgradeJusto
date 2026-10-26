"""Version-pinned resource aggregation; reads never recalculate saved quotes."""

import sqlalchemy as sa

from upgradejusto.retail.models import ImageEvidence, Offer, current_offer
from upgradejusto.retail.tables import resources


def aggregate_resources(conn, version, parts):
    indexed = {
        row["component_id"]: row
        for row in conn.execute(
            sa.select(resources).where(resources.c.dataset_version == version)
        ).mappings()
    }
    result = []
    for part in parts:
        row = indexed.get(part.id)
        if row is None:
            result.append(part)
            continue
        image = (
            ImageEvidence.model_validate(row["image_evidence"])
            if row["image_evidence"]
            else None
        )
        result.append(
            part.model_copy(
                update={
                    "image": image.url
                    if image and image.status == "verified" and image.exact_variant
                    else None,
                    "image_evidence": image,
                    "offers": tuple(
                        current_offer(Offer.model_validate(o)) for o in row["offers"]
                    ),
                }
            )
        )
    return tuple(result)
