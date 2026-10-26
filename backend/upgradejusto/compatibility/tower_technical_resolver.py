"""Publication-only technical adapter; no HTTP, persistence, fetch or policy."""

import hashlib
from dataclasses import dataclass

from upgradejusto.retail.technical_models import NominalResource as PublishedResource
from upgradejusto.retail.technical_models import SharedLimit as PublishedLimit
from upgradejusto.retail.technical_parser import MAX_BYTES
from upgradejusto.retail.technical_validation import validate_technical_binding

from .basic_specs import BasicSpecs
from .observations import EvidenceRef
from .tower_contract import NominalResource, SharedLimit

RESOLVER_VERSION = "tower-technical-publication-adapter-1"


@dataclass(frozen=True)
class ResolvedTechnicalSpecs:
    specs: BasicSpecs
    revision_token: str | None


def revision_token(component_id, raw, status):
    # Rejected oversized/malformed input must not produce unbounded diagnostics.
    # Valid envelopes are fully fingerprinted, including their import digest/refs.
    if type(raw) is str:
        payload = raw[:MAX_BYTES].encode("utf-8", errors="surrogatepass")
        payload += b":" + str(len(raw)).encode("ascii")
    else:
        payload = type(raw).__name__.encode("ascii")
    digest = hashlib.sha256(
        component_id.encode("utf-8", errors="surrogatepass") + b":" + payload
    ).hexdigest()
    return f"{RESOLVER_VERSION}:{status}:{digest}"


def domain_value(value):
    if isinstance(value, PublishedResource):
        # JSON-mode strict validation converts publication arrays to domain tuples.
        return NominalResource.model_validate_json(value.model_dump_json())
    if isinstance(value, PublishedLimit):
        return SharedLimit.model_validate_json(value.model_dump_json())
    if type(value) is list:
        return [domain_value(item) for item in value]
    return value


def evidence(refs):
    return tuple(EvidenceRef.model_validate(ref.model_dump()) for ref in refs)


def resolve_published_technical(
    component, catalog, basic: BasicSpecs
) -> ResolvedTechnicalSpecs:
    """Return basic unchanged on absence/rejection; merge only bound observations.

    Call with the SAME pinned catalog used to resolve basic evidence. Invalid
    technical evidence grants no facts, never suppresses independently known basic
    failures, and has an explicit bounded invalid revision token, not raw errors.
    """
    raw = component.attributes.get("tower_stock_v1")
    if raw is None:
        return ResolvedTechnicalSpecs(basic, None)
    try:
        rows = getattr(catalog, "source_rows", None)
        if type(rows) not in (list, tuple):
            raise ValueError("Published technical sources required")
        envelope = validate_technical_binding(
            raw, component.id, component.model_dump(mode="json"), rows
        )
        fields = dict(basic.fields)
        references = dict(basic.references)
        conflicts = set(basic.conflicts)
        for key, value in envelope.data.items():
            incoming = domain_value(value)
            refs = evidence(envelope.fields[key])
            prior = basic.fact(key)
            references[key] = tuple(dict.fromkeys((*references.get(key, ()), *refs)))
            if key in conflicts or (prior is not None and prior != incoming):
                conflicts.add(key)
                fields.pop(key, None)
            else:
                fields[key] = incoming
        for key, observations in envelope.conflicts.items():
            conflicts.add(key)
            fields.pop(key, None)
            refs = evidence(
                tuple(ref for item in observations for ref in item.source_refs)
            )
            references[key] = tuple(dict.fromkeys((*references.get(key, ()), *refs)))
        merged = BasicSpecs(
            fields, references, frozenset(conflicts), basic.import_digest
        )
        return ResolvedTechnicalSpecs(
            merged, revision_token(component.id, raw, "valid")
        )
    except (ValueError, TypeError, KeyError, AttributeError, RecursionError):
        return ResolvedTechnicalSpecs(
            basic, revision_token(component.id, raw, "invalid")
        )
