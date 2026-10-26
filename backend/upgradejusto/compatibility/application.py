"""Orquestación D: propiedad/snapshot servidor; motor puro y simulación efímera."""

from upgradejusto.pcs.models import ComponentGroup
from upgradejusto.pcs.service import PCError

from .basic_evaluation import evaluate_basic
from .basic_manufacturer import MANUFACTURER_VERSION, resolve_stock_specs
from .curation import (
    BOARD_MODEL,
    BOARD_REF,
    EXTRACT_REVISION,
    REVISION,
    SUPPORT_ROWS,
    documented,
    ref,
)
from .http_models import EvaluatedConfiguration, EvaluationResponse
from .models import CpuSupportInput, PartInstance, ResolvedConfiguration
from .platform_curation import EXTRACT_VERSION, resolve_platform
from .resource_curation import RESOURCE_EXTRACT_VERSION, resolve_resources


def apply_replacements(base, replacements, catalog):
    """Normalización compartida D/F/G: retirar grupos completos, nunca persistir."""
    result = base.model_copy(deep=True)
    for replacement in replacements:
        for candidate in replacement.candidates:
            part = catalog.get(candidate.component_id)
            if part is None or part.category != replacement.category:
                raise PCError(422, "Invalid component selection")
        result.components = [
            group
            for group in result.components
            if group.category != replacement.category
        ] + [
            ComponentGroup(category=replacement.category, **candidate.model_dump())
            for candidate in replacement.candidates
        ]
        if replacement.category == "motherboard":
            result.context.bios_version = (
                replacement.candidate_context.bios_version
                if replacement.candidate_context
                else None
            )
    if any(group.component_id not in catalog for group in result.components):
        raise PCError(422, "Invalid component selection")
    return result


def resolve_configuration(configuration, catalog, revision, dataset_version):
    parts = tuple(
        PartInstance(
            instance_id=f"{group.category.value}:{group.component_id}",
            part_id=group.component_id,
            category=group.category.value,
            model=catalog[group.component_id].name,
            quantity=group.quantity,
        )
        for group in configuration.components
    )
    cpu = next((part for part in parts if part.category == "cpu"), None)
    board = next((part for part in parts if part.category == "motherboard"), None)
    support = None
    if cpu and board:
        component = catalog[cpu.part_id]
        cpu_refs = tuple(
            ref(
                s.id,
                str(s.url),
                "Specifications; catálogo sprint31b-a-v1 / HARDWARE_DEMO F01/F02",
            )
            for s in component.sources
            if s.id in {"F01", "F02"}
        )
        exact_board = board.part_id == "P03" and board.model == BOARD_MODEL
        support = CpuSupportInput(
            cpu_instance_id=cpu.instance_id,
            motherboard_instance_id=board.instance_id,
            cpu_socket=documented(component.attributes.get("socket"), cpu_refs),
            motherboard_socket=documented("AM4", (BOARD_REF,)) if exact_board else None,
            applicable_revision=documented(REVISION, (BOARD_REF,))
            if exact_board
            else None,
            support_rows=SUPPORT_ROWS if exact_board else (),
            installed_bios=configuration.context.bios_version,
        )
        # PG revisions own their parameters; an empty published collection stays unknown.
        curated = getattr(catalog, "support_rows", None)
        if curated is not None:
            exact = next(
                (
                    item
                    for item in curated
                    if item.cpu_component_id == cpu.part_id
                    and item.motherboard_component_id == board.part_id
                ),
                None,
            )
            support = CpuSupportInput(
                cpu_instance_id=cpu.instance_id,
                motherboard_instance_id=board.instance_id,
                cpu_socket=exact.cpu_socket if exact else None,
                motherboard_socket=exact.motherboard_socket if exact else None,
                applicable_revision=exact.applicable_revision if exact else None,
                support_rows=(exact.row,) if exact else (),
                installed_bios=configuration.context.bios_version,
            )
    ram, mounting = resolve_platform(parts, catalog)
    # C no tiene montaje ni cableado instalado: jamás trasplantar fixtures28.
    return ResolvedConfiguration(
        pc_revision=str(revision),
        data_revision=f"{dataset_version}|{EXTRACT_REVISION}|{EXTRACT_VERSION}|{RESOURCE_EXTRACT_VERSION}",
        parts=parts,
        cpu_support=support,
        ram=ram,
        mounting=mounting,
        resources=resolve_resources(parts, catalog),
    )


class CompatibilityService:
    def __init__(self, pcs, catalog):
        self.pcs, self.catalog = pcs, catalog

    def run(self, owner, identity, request):
        pc = self.pcs.get(owner, identity)
        if pc.revision != request.expected_pc_revision:
            raise PCError(409, "PC revision conflict")
        catalog = self.catalog.resolution_snapshot()
        configuration = EvaluatedConfiguration(
            components=[group.model_copy(deep=True) for group in pc.components],
            context=pc.context.model_copy(deep=True),
        )
        configuration = apply_replacements(
            configuration, [request] if hasattr(request, "candidates") else [], catalog
        )
        result = evaluate_current(
            configuration,
            catalog,
            pc.revision,
            self.catalog.repository.dataset_version,
        )
        return EvaluationResponse(
            **result.model_dump(),
            evaluated_configuration=configuration,
        )


def evaluate_current(configuration, catalog, revision, dataset_version):
    """Default for NEW calculations only; never reinterpret stored snapshots."""
    resolved = resolve_configuration(configuration, catalog, revision, dataset_version)
    specs = {
        part.instance_id: resolve_stock_specs(catalog[part.part_id], catalog)
        for part in resolved.parts
    }
    digests = sorted(
        {spec.import_digest for spec in specs.values() if spec.import_digest}
    )
    resolved = resolved.model_copy(
        update={
            "cpu_support": resolved.cpu_support
            if getattr(catalog, "support_rows", None) is not None
            else None,
            "data_revision": "|".join(
                (dataset_version, MANUFACTURER_VERSION, *digests)
            ),
        }
    )
    return evaluate_basic(resolved, specs)
