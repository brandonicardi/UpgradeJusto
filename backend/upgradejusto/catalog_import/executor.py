"""Trusted application adapter; all writes and authorization remain CU10-owned."""

from types import SimpleNamespace


def _all(service, owner, identity, collection):
    offset, result = 0, []
    while True:
        page = service.list(owner, identity, collection, 100, offset)
        result.extend(page["items"])
        offset += len(page["items"])
        if offset >= page["total"]:
            return result
        if not page["items"]:
            raise ValueError("Incomplete administration listing")


def active_snapshot(service, owner):
    """owner must be the authenticated server principal, not proposal JSON."""
    versions = _all(service, owner, None, None)
    selected = [v["id"] for v in versions if v["active"]]
    if len(selected) != 1:
        raise ValueError("Exactly one active revision required")
    version = selected[0]
    components = {
        r["id"]: r["data"] for r in _all(service, owner, version, "components")
    }
    sources = _all(service, owner, version, "sources")
    return version, components, sources


class ImportExecutor:
    def __init__(self, administration_service):
        self.service = administration_service

    def publish(self, trusted_owner, expected_version, proposal):
        version, components, sources = active_snapshot(self.service, trusted_owner)
        if version != expected_version:
            raise ValueError("Active revision changed; rebuild proposal")
        # Validate everything before creating a draft. CORE must first admit the
        # agreed attribute; no direct SQL or alternative persistence path.
        from upgradejusto.administration.models import validate_data

        updates = []
        for identity, data in sorted(proposal.components.items()):
            validate_data("components", data)
            if identity not in components:
                raise ValueError("Importer cannot invent component identities")
            if components[identity] != data:
                updates.append((identity, data))
        existing_sources = {r["data"]["source_id"]: r["data"] for r in sources}
        additions = []
        for source in proposal.sources:
            validate_data("sources", source)
            previous = existing_sources.get(source["source_id"])
            if previous is not None and previous != source:
                raise ValueError("Existing provenance identity conflict")
            if previous is None:
                additions.append(source)
        if not updates and not additions:
            return {"dataset_version": version, "status": "unchanged"}
        draft = self.service.create(
            trusted_owner, SimpleNamespace(base_version=version)
        )["id"]
        for source in additions:
            self.service.write(trusted_owner, draft, "sources", data=source)
        for identity, data in updates:
            self.service.write(
                trusted_owner, draft, "components", data=data, row_id=identity
            )
        return self.service.publish(
            trusted_owner, draft, SimpleNamespace(expected_active_version=version)
        )
