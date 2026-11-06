"""Adapt only immutable published evidence, never names, retail text or fixtures."""

from .basic_manufacturer import MANUFACTURER_VERSION, resolve_stock_specs
from .models import CpuSupportInput
from .reference_knowledge import (
    REFERENCE_VERSION,
    merge_reference,
    reference_specs,
)
from .tower_contract import TowerComponentEvidence, TowerTechnicalEvidenceDTO
from .tower_technical_resolver import resolve_published_technical

ADAPTER_VERSION = "tower-publication-adapter-1"


def declared_key(index):
    return f"declared:{index}"


def resolve_tower_evidence(tower, catalog, dataset_version):
    resolved = {}
    selected = {}
    technical_revisions = set()
    declared = {}
    for index, line in enumerate(tower.lines):
        component = catalog.get(line.component_id) if line.component_id else None
        if line.component_id is None and getattr(line, "declared_model", None):
            # A typed model gets reference facts only: it stays a declaration.
            category = getattr(line.category, "value", str(line.category))
            specs = reference_specs(category, line.declared_model)
            if specs.fields:
                declared[declared_key(index)] = (category, line.declared_model, specs)
        if component is None or component.category != line.category:
            continue
        selected.setdefault(line.category.value, []).append((line, component))
        technical = resolve_published_technical(
            component, catalog, resolve_stock_specs(component, catalog)
        )
        source_url = component.sources[0].url if component.sources else None
        reference = reference_specs(
            component.category.value, component.name, source_url
        )
        resolved[component.id] = (
            component,
            merge_reference(technical.specs, reference),
        )
        if technical.revision_token is not None:
            technical_revisions.add(technical.revision_token)
    digests = sorted(
        {spec.import_digest for _, spec in resolved.values() if spec.import_digest}
    )
    revision = "|".join(
        (
            dataset_version,
            MANUFACTURER_VERSION,
            ADAPTER_VERSION,
            REFERENCE_VERSION,
            *digests,
            *sorted(technical_revisions),
        )
    )
    support = None
    cpu = selected.get("cpu", ())
    board = selected.get("motherboard", ())
    if len(cpu) == len(board) == 1:
        cpu_line, cpu_component = cpu[0]
        board_line, board_component = board[0]
        exact = tuple(
            item
            for item in (getattr(catalog, "support_rows", None) or ())
            if item.cpu_component_id == cpu_component.id
            and item.motherboard_component_id == board_component.id
        )
        # No hardcoded fallback, approximate aliases or generic BIOS ordering.
        if len(exact) == 1:
            item = exact[0]
            support = CpuSupportInput(
                cpu_instance_id=str(cpu_line.line_id),
                motherboard_instance_id=str(board_line.line_id),
                cpu_socket=item.cpu_socket,
                motherboard_socket=item.motherboard_socket,
                applicable_revision=item.applicable_revision,
                support_rows=(item.row,),
                installed_bios=tower.context.bios_version,
            )
    return TowerTechnicalEvidenceDTO(
        data_revision=revision,
        components={
            **{
                identity: TowerComponentEvidence(
                    component.category.value, component.name, revision, spec
                )
                for identity, (component, spec) in resolved.items()
            },
            **{
                identity: TowerComponentEvidence(category, model, revision, spec)
                for identity, (category, model, spec) in declared.items()
            },
        },
        cpu_support=support,
    )
