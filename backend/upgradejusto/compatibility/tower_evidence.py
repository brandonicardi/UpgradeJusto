"""Adapt only immutable published evidence, never names, retail text or fixtures."""

from .basic_manufacturer import MANUFACTURER_VERSION, resolve_stock_specs
from .models import CpuSupportInput
from .tower_contract import TowerComponentEvidence, TowerTechnicalEvidenceDTO
from .tower_technical_resolver import resolve_published_technical

ADAPTER_VERSION = "tower-publication-adapter-1"


def resolve_tower_evidence(tower, catalog, dataset_version):
    resolved = {}
    selected = {}
    technical_revisions = set()
    for line in tower.lines:
        component = catalog.get(line.component_id) if line.component_id else None
        if component is None or component.category != line.category:
            continue
        selected.setdefault(line.category.value, []).append((line, component))
        technical = resolve_published_technical(
            component, catalog, resolve_stock_specs(component, catalog)
        )
        resolved[component.id] = (component, technical.specs)
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
            identity: TowerComponentEvidence(
                component.category.value, component.name, revision, spec
            )
            for identity, (component, spec) in resolved.items()
        },
        cpu_support=support,
    )
