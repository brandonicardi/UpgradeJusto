"""One-time import of existing curated evidence; no new hardware assertions."""

import uuid

from upgradejusto.compatibility.curation import (
    BOARD_REF,
    REVISION,
    SUPPORT_ROWS,
    documented,
)


def initial_entries(parts):
    result, seen = [], set()

    def add(collection, data, identity=None):
        result.append(
            {
                "collection": collection,
                "id": identity or "row-" + uuid.uuid4().hex,
                "data": data,
            }
        )

    def source(source_id, url, consulted_on, locator):
        key = (source_id, url)
        if key not in seen:
            seen.add(key)
            add(
                "sources",
                {
                    "source_id": source_id,
                    "url": url,
                    "consulted_on": consulted_on,
                    "locator": locator,
                },
            )

    for part in parts:
        add(
            "components",
            {
                k: v
                for k, v in part.items()
                if k not in {"id", "prices", "image", "dataset_version"}
            },
            part["id"],
        )
        for item in part["sources"]:
            source(
                item["id"],
                item["url"],
                "2026-10-20",
                "Catálogo curado sprint31b-a-v1; referencia conservada",
            )
        for price in part["prices"]:
            add("prices", {"component_id": part["id"], **price})
    for cpu_id, row in zip(("P01", "P02"), SUPPORT_ROWS, strict=True):
        cpu = next(p for p in parts if p["id"] == cpu_id)
        cpu_evidence = tuple(
            BOARD_REF.model_copy(
                update={
                    "source_id": s["id"],
                    "url": s["url"],
                    "locator": "Specifications; catálogo sprint31b-a-v1 / HARDWARE_DEMO F01/F02",
                }
            )
            for s in cpu["sources"]
        )
        data = {
            "cpu_component_id": cpu_id,
            "motherboard_component_id": "P03",
            "cpu_socket": documented(
                cpu["attributes"]["socket"], cpu_evidence
            ).model_dump(mode="json"),
            "motherboard_socket": documented("AM4", (BOARD_REF,)).model_dump(
                mode="json"
            ),
            "applicable_revision": documented(REVISION, (BOARD_REF,)).model_dump(
                mode="json"
            ),
            "row": row.model_dump(mode="json"),
        }
        add("cpu_support", data)
        for evidence in (*row.evidence, BOARD_REF):
            source(
                evidence.source_id,
                evidence.url,
                evidence.consulted_on,
                evidence.locator,
            )
    return result
