"""Essential household-PC policy: what can stop a common build from working.

Covers documented CPU/board model support (socket alone is not enough), memory
generation and limits, GPU interface and length, PSU against published
recommendations, power connectors, formats and storage. BIOS, cooling, fans,
memory speeds and ECC are declared out of scope, never approved: a missing or
earlier BIOS neither blocks nor fails a new evaluation. An unknown in-scope fact
stays unknown; a documented failure always dominates.
"""

from .basic_contract import AdditionalCheck
from .basic_evaluation import Check as BasicCheck
from .basic_evaluation import _basic_cpu_support
from .models import Coverage, Fact, PartInstance, ResolvedConfiguration
from .reference_knowledge import is_reference_ref
from .tower_contract import (
    ESSENTIAL_REQUIRED,
    ESSENTIAL_RULES_VERSION,
    EssentialScopeV2,
    TowerEvaluationResult,
    TowerRuleResult,
)
from .tower_engine import EMPTY, LEGACY, Check, _allocate, _validated_specs, resources

OUT_OF_SCOPE = frozenset(("cooler", "fan"))
GPU_INTERFACES = ("PCIe x16", "PCIe x8", "PCIe")
# Required textual reason: not evaluated, never approved, because the build is
# declared already assembled and its case was not identified.
ASSEMBLED_CASE_UNCHECKED = (
    "No se comprobó porque la PC ya está armada y el gabinete no se identificó."
)
# Stable public notice for any PC whose physical space could not be checked.
PHYSICAL_SPACE_NOT_EVALUATED = (
    "Espacio físico no evaluado: faltan medidas. Chequeá que entre en tu gabinete."
)
PHYSICAL_SPACE_CHECK_ID = "tower_physical_space_not_evaluated"
# What varies between models of the same chip or chipset: disclosed, not approved.
CONNECTORS_NOT_EVALUATED = (
    "Conectores no evaluados: varían según el modelo. "
    "Chequeá que tu fuente tenga los cables que pide la placa de video."
)
STORAGE_NOT_EVALUATED = (
    "Lugar para discos no evaluado: varía según el modelo. "
    "Chequeá que tu placa y tu gabinete tengan lugar para el disco."
)
MEMORY_LIMITS_NOT_EVALUATED = (
    "Ranuras y memoria máxima no evaluadas: varían según el modelo de placa."
)
BIOS_MAY_BE_NEEDED = (
    "La placa admite esta generación; algunas necesitan BIOS actualizada."
)
REFERENCE_CHECK_ID = "tower_reference_data"
REFERENCE_DATA_NOTICE = (
    "Evaluado según datos de referencia por familia de hardware, "
    "no con la ficha exacta de cada modelo."
)
# Closed list of published attributes these rules read for each category.
# The admin dashboard uses it to flag missing data; no rule logic depends on it.
ESSENTIAL_ATTRIBUTES = {
    "cpu": frozenset({"socket", "memory_type"}),
    "motherboard": frozenset(
        {
            "socket",
            "memory_type",
            "slots",
            "max_total_gb",
            "pcie_slot",
            "form_factor",
            "tower_ports",
        }
    ),
    "ram": frozenset({"memory_type", "capacity_gb"}),
    "gpu": frozenset(
        {
            "length_mm",
            "recommended_psu_w",
            "gpu_power_kind",
            "gpu_power_count",
            "tower_port_kind",
        }
    ),
    "psu": frozenset({"continuous_power_w", "form_factor", "pcie8_count"}),
    "case": frozenset({"gpu_limit_mm", "board_formats", "psu_formats"}),
    "storage": frozenset({"storage_interface", "storage_form"}),
}


def _reference_support(cpu, board):
    """Same socket and a chipset that lists the CPU generation, from sourced tables."""
    check = BasicCheck("B01")
    socket = check.read(cpu, "socket", "cpu.socket")
    board_socket = check.read(board, "socket", "motherboard.socket")
    generation = check.read(cpu, "cpu_generation", "cpu.generation")
    admitted = check.read(
        board, "supported_generations", "motherboard.supported_generations"
    )
    doubtful = board.fact("verify_generations") or ()
    if socket == board_socket and generation in doubtful:
        check.missing.append("cpu_support.depends_on_board_and_bios")
    else:
        check.failed = socket != board_socket or generation not in admitted
    return check.result(("Socket y generación por chipset", BIOS_MAY_BE_NEEDED))


def _support_rule(config, cpu, board):
    """Exact model row first; else the reference table. The BIOS is not judged."""
    if (
        config.cpu_support is None
        and None not in (cpu.fact("socket"), board.fact("socket"))
        and cpu.fact("cpu_generation") is not None
        and board.fact("supported_generations") is not None
    ):
        return _reference_support(cpu, board)
    result = _basic_cpu_support(config, cpu, board, evaluate_bios=False)
    sockets = cpu.fact("socket"), board.fact("socket")
    if None in sockets or sockets[0] == sockets[1]:
        return result
    return result.model_copy(
        update={
            "state": "fail",
            "facts": (
                *result.facts,
                Fact(name="cpu.socket", value=sockets[0]),
                Fact(name="motherboard.socket", value=sockets[1]),
            ),
            "evidence": tuple(
                dict.fromkeys(
                    (
                        *result.evidence,
                        *cpu.evidence("socket"),
                        *board.evidence("socket"),
                    )
                )
            ),
        }
    )


def _memory_rule(cpu, board, modules):
    check = BasicCheck("B02")
    supported = cpu.fact("memory_types_supported")
    types = [
        value
        for value in (
            check.read(
                cpu, "memory_type", "cpu.memory_type", required=supported is None
            ),
            check.read(board, "memory_type", "motherboard.memory_type"),
        )
        if value is not None
    ]
    # A chipset says nothing about slots or maximum: only a model datasheet does.
    by_reference = board.fact("chipset") is not None
    slots = check.read(
        board, "slots", "motherboard.ram_slots", required=not by_reference
    )
    maximum = check.read(
        board, "max_total_gb", "motherboard.max_total_gb", required=not by_reference
    )
    module_max = check.read(
        board, "max_module_gb", "motherboard.max_module_gb", required=False
    )
    board_form = check.read(
        board, "module_type", "motherboard.module_type", required=False
    )
    board_buffered = check.read(
        board, "buffered", "motherboard.admitted_buffered", required=False
    )
    if not modules:
        check.missing.append("ram.modules")
    total = count = 0
    for index, (spec, quantity) in enumerate(modules, 1):
        prefix = f"ram.module_{index}."
        generation = check.read(spec, "memory_type", prefix + "memory_type")
        capacity = check.read(spec, "capacity_gb", prefix + "capacity_gb")
        form = check.read(spec, "module_type", prefix + "module_type", required=False)
        buffered = check.read(spec, "buffered", prefix + "buffered", required=False)
        if generation is not None:
            types.append(generation)
        if form is not None and board_form is not None and form != board_form:
            check.failed = True
        if (
            buffered is not None
            and board_buffered is not None
            and buffered != board_buffered
        ):
            check.failed = True
        # A kit sold as one line brings several sticks.
        sticks = quantity * (spec.fact("kit_modules") or 1)
        count += sticks
        if capacity is not None:
            total += capacity * sticks
            if module_max is not None and capacity > module_max:
                check.failed = True
    if len(set(types)) > 1 or (slots is not None and count > slots):
        check.failed = True
    if supported is not None and any(kind not in supported for kind in types):
        check.failed = True
    if maximum is not None and total > maximum:
        check.failed = True
    notes = ("Generación DDR y límites de la placa; velocidades y ECC no se evalúan",)
    if by_reference and (slots is None or maximum is None):
        notes = (*notes, MEMORY_LIMITS_NOT_EVALUATED)
    return check.result(notes)


def _interface_rule(board, gpu):
    check = BasicCheck("B03")
    slot = check.read(board, "pcie_slot", "motherboard.pcie_slot")
    if gpu.fact("pcie_interface") is not None:
        kind = check.read(gpu, "pcie_interface", "gpu.pcie_interface")
    else:
        kind = check.read(gpu, "tower_port_kind", "gpu.tower_port_kind")
    backward = check.read(
        gpu,
        "pcie_backward_compatible",
        "gpu.pcie_backward_compatible",
        required=False,
    )
    if slot is not None and kind is not None:
        if slot != "PCIe x16" or kind not in GPU_INTERFACES:
            check.missing.append("gpu.interface_applicability")
        if backward is False:
            check.missing.append("gpu.slot_generation_compatibility")
    return check.result(("Ranura física nominal; no certifica ancho de banda",))


def _length_rule(gpu, case):
    check = BasicCheck("B04")
    length = check.read(gpu, "length_mm", "gpu.length_mm")
    limit = check.read(case, "gpu_limit_mm", "case.gpu_limit_mm")
    if length is not None and limit is not None:
        check.failed = length > limit
    return check.result(("Límite nominal publicado por el fabricante",))


def _power_rule(gpu, psu):
    check = BasicCheck("B05")
    rating = check.read(psu, "continuous_power_w", "psu.continuous_power_w")
    recommended = [
        value
        for value in (
            check.read(
                gpu,
                "recommended_psu_w",
                "gpu.manufacturer_system_recommendation_w",
                required=False,
            ),
            check.read(
                gpu,
                "nvidia_recommended_psu_w",
                "gpu.nvidia_system_recommendation_w",
                required=False,
            ),
        )
        if value is not None
    ]
    if not recommended:
        check.missing.append("gpu.manufacturer_system_recommendation_w")
    elif rating is not None:
        check.failed = rating < max(recommended)
    return check.result(
        (
            "Potencia continua de la fuente contra la mayor recomendación publicada "
            "para el sistema completo; no estima ni mide consumo",
        )
    )


def _connector_rule(board, gpu, psu):
    check = BasicCheck("B06")
    for key in ("atx24_count", "eps8_count"):
        available = check.read(psu, key, "psu." + key, required=False)
        required = check.read(board, key, "motherboard." + key, required=False)
        if available is not None and required is not None and available < required:
            check.failed = True
    kind = check.read(gpu, "gpu_power_kind", "gpu.power_kind")
    amount = check.read(gpu, "gpu_power_count", "gpu.power_count")
    if kind == "PCIe8":
        available = check.read(psu, "pcie8_count", "psu.pcie8_count")
        if amount is not None and available is not None and amount > available:
            check.failed = True
    elif kind == "16pin":
        native = check.read(psu, "native16_count", "psu.native16_count", required=False)
        if native is None or amount is None or native < amount:
            inputs = check.read(gpu, "adapter_pcie8_inputs", "gpu.adapter_pcie8_inputs")
            available = check.read(psu, "pcie8_count", "psu.pcie8_count")
            if (
                inputs is not None
                and amount is not None
                and available is not None
                and inputs * amount > available
            ):
                check.failed = True
    elif kind is not None and kind != "none":
        check.missing.append("gpu.supported_power_route")
    return check.result(("Conectores publicados de la fuente y la placa de video",))


def _format_rule(board, psu, case):
    check = BasicCheck("B07")
    for category, spec, formats in (
        ("motherboard", board, "board_formats"),
        ("psu", psu, "psu_formats"),
    ):
        form = check.read(spec, "form_factor", category + ".form_factor")
        accepted = check.read(case, formats, "case." + formats)
        if form is not None and accepted is not None and form not in accepted:
            check.failed = True
    length = check.read(psu, "length_mm", "psu.length_mm", required=False)
    limit = check.read(case, "psu_limit_mm", "case.psu_limit_mm", required=False)
    if length is not None and limit is not None and length > limit:
        check.failed = True
    return check.result(("Formatos y límites nominales; no certifica el montaje",))


def _storage_rule(drives, board, case, psu):
    check = Check("T08")
    if not drives:
        check.missing.append("storage.required_drive")
    ports = resources(board, "tower_ports", "motherboard", check)
    demands, bay_demands, sata_power = [], [], 0
    sata = any(spec.fact("storage_interface") == "SATA" for _, spec, _ in drives)
    bays = resources(case, "storage_bays", "case", check) if sata else None
    for identity, spec, quantity in drives:
        interface = check.read(spec, "storage_interface", identity)
        form = check.read(spec, "storage_form", identity)
        if interface == "SATA":
            # An M.2 drive has no SATA power cable: the fact does not apply to it.
            power = check.number(spec, "sata_power_count", identity, zero=True)
            if power is not None:
                sata_power += power * quantity
        if interface is None or form is None:
            continue
        matches = tuple(
            r.resource_id
            for r in ports or ()
            if r.kind == interface and form in r.accepts
        )
        for unit in range(quantity):
            demands.append((f"{identity}:{unit}", matches))
            if interface == "SATA":
                bay_demands.append(
                    (
                        f"{identity}:{unit}",
                        tuple(r.resource_id for r in bays or () if form in r.accepts),
                    )
                )
    if sata:
        available = check.number(psu, "sata_power_count", "psu", zero=True)
        if available is not None and sata_power > available:
            check.failed = True
    # Pair exclusions stay enforced; shared budgets are outside this policy.
    if ports is not None and not _allocate(
        demands, tuple(r.model_copy(update={"group": None}) for r in ports), {}
    ):
        check.failed = True
    if (
        bays is not None
        and bay_demands
        and not _allocate(
            bay_demands, tuple(r.model_copy(update={"group": None}) for r in bays), {}
        )
    ):
        check.failed = True
    return check.result()


def _tower_rule(result, identity=None):
    identity = identity or result.rule_id
    return TowerRuleResult(
        **{**result.model_dump(), "rule_id": identity, "family": identity}
    )


def _case_dependent(result, assembled):
    """Only an unknown caused exclusively by unproven case data becomes n/a.

    A documented failure is never converted, and unrelated missing facts keep
    the rule unknown instead of hiding them behind the assembled declaration.
    """
    if (
        not assembled
        or result.state != "unknown"
        or not result.missing_fields
        or not all(field.startswith("case.") for field in result.missing_fields)
    ):
        return result
    return result.model_copy(
        update={
            "state": "not_applicable",
            "missing_fields": (),
            "conditions": (*result.conditions, ASSEMBLED_CASE_UNCHECKED),
        }
    )


def _physical_space(result):
    """T04/T07: an unknown physical-space check is disclosed, never approved.

    A documented pass/fail is preserved; only the unknown state becomes
    not_applicable with a stable user-facing reason.
    """
    if result.state != "unknown":
        return result
    return result.model_copy(
        update={
            "state": "not_applicable",
            "missing_fields": (),
            "conditions": (*result.conditions, PHYSICAL_SPACE_NOT_EVALUATED),
        }
    )


def _varies_by_model(result, reason, by_reference, prefixes):
    """Reference data cannot prove it: disclosed, never approved, never a failure."""
    if (
        not by_reference
        or result.state != "unknown"
        or not all(field.startswith(prefixes) for field in result.missing_fields)
    ):
        return result
    return result.model_copy(
        update={
            "state": "not_applicable",
            "missing_fields": (),
            "conditions": (*result.conditions, reason),
        }
    )


def evaluate_tower_essential(tower, evidence):
    """Tower/TowerCreate duck type; evidence is resolved by a server adapter only."""
    if tower.schema_version != 2 or not evidence.data_revision.strip():
        raise ValueError("Schema2 and pinned evidence revision required")
    assembled = getattr(tower.context, "assembly_state", None) == "assembled"
    groups, specs, models = {}, {}, {}
    identification = Check("T11")
    for index, line in enumerate(tower.lines):
        identity = str(line.line_id) if line.line_id is not None else f"line:{index}"
        category = getattr(line.category, "value", str(line.category))
        groups.setdefault(category, []).append((identity, line.quantity))
        key = line.component_id or f"declared:{index}"
        item = evidence.components.get(key)
        if (
            item is None
            or item.category != category
            or item.data_revision != evidence.data_revision
            or type(item.model) is not str
            or not item.model.strip()
        ):
            # The case is never required: physical space is disclosed through
            # T04/T07, not by blocking identification.
            if category not in OUT_OF_SCOPE and category != "case":
                identification.missing.append(
                    identity + ".identified_versioned_component"
                )
            specs[identity], models[identity] = EMPTY, None
        else:
            specs[identity] = _validated_specs(item.specs)
            models[identity] = item.model
    for category, state in tower.category_status.items():
        category = getattr(category, "value", str(category))
        if category in OUT_OF_SCOPE or category == "case":
            continue
        if state == "unknown":
            identification.missing.append(category + ".presence")
        elif state == "absent" and category != "gpu":
            identification.failed = True
    # A declared absence of graphics is not proof of a usable integrated path.
    if not groups.get("gpu"):
        identification.missing.append(
            "gpu.absence_requires_documented_integrated_display_path"
        )

    def one(category):
        selected = groups.get(category, ())
        if len(selected) != 1 or selected[0][1] != 1:
            return EMPTY
        return specs[selected[0][0]]

    # The declared BIOS travels inside the resolved evidence as data; policy 2
    # never reads it to approve, fail or leave a rule unknown.
    support = evidence.cpu_support
    config = ResolvedConfiguration(
        pc_revision=str(getattr(tower, "revision", 1)),
        data_revision=evidence.data_revision,
        parts=tuple(
            PartInstance(
                instance_id=identity,
                part_id=identity,
                category=category,
                model=models[identity],
                quantity=quantity,
            )
            for category, lines in groups.items()
            if category in LEGACY
            for identity, quantity in lines
        ),
        cpu_support=support,
    )
    cpu, board, gpu, psu, case = map(one, ("cpu", "motherboard", "gpu", "psu", "case"))
    results = [_tower_rule(_support_rule(config, cpu, board), "T01")]
    for index, rule in enumerate(
        (
            _memory_rule(
                cpu,
                board,
                [
                    (specs[identity], quantity)
                    for identity, quantity in groups.get("ram", ())
                ],
            ),
            _interface_rule(board, gpu),
            _length_rule(gpu, case),
            _power_rule(gpu, psu),
            _connector_rule(board, gpu, psu),
            _format_rule(board, psu, case),
        ),
        2,
    ):
        identity = f"T{index:02}"
        if identity in ("T04", "T07"):
            rule = _physical_space(rule)
        if identity == "T06":
            rule = _varies_by_model(
                rule,
                CONNECTORS_NOT_EVALUATED,
                gpu.fact("reference_chip") is not None,
                ("gpu.", "psu.", "motherboard."),
            )
        results.append(_tower_rule(rule, identity))
    drives = [
        (identity, specs[identity], quantity)
        for identity, quantity in groups.get("storage", ())
    ]
    results.append(
        _tower_rule(
            _varies_by_model(
                _case_dependent(_storage_rule(drives, board, case, psu), assembled),
                STORAGE_NOT_EVALUATED,
                board.fact("chipset") is not None,
                ("motherboard.", "case.", "psu."),
            )
        )
    )
    results.append(identification.result())
    missing = tuple(dict.fromkeys(path for r in results for path in r.missing_fields))

    def ids(state):
        return tuple(r.rule_id for r in results if r.state == state)

    applicables = (*ids("pass"), *ids("fail"))
    complete = not ids("fail") and not ids("unknown")
    scope = EssentialScopeV2()
    notices = tuple(
        AdditionalCheck(
            id=f"tower_essential_scope_{index}", status="outside_scope", reason=reason
        )
        for index, reason in enumerate(scope.excludes)
    )
    if {"T04", "T07"} & set(ids("not_applicable")):
        notices = (
            *notices,
            AdditionalCheck(
                id=PHYSICAL_SPACE_CHECK_ID,
                status="outside_scope",
                reason=PHYSICAL_SPACE_NOT_EVALUATED,
            ),
        )
    if any(is_reference_ref(ref) for r in results for ref in r.evidence):
        notices = (
            *notices,
            AdditionalCheck(
                id=REFERENCE_CHECK_ID,
                status="outside_scope",
                reason=REFERENCE_DATA_NOTICE,
            ),
        )
    for reason, check_id in (
        (CONNECTORS_NOT_EVALUATED, "tower_connectors_not_evaluated"),
        (STORAGE_NOT_EVALUATED, "tower_storage_not_evaluated"),
    ):
        if any(reason in r.conditions for r in results):
            notices = (
                *notices,
                AdditionalCheck(id=check_id, status="outside_scope", reason=reason),
            )
    return TowerEvaluationResult(
        verdict="incompatible"
        if ids("fail")
        else "compatible"
        if complete
        else "requiere_verificacion",
        rule_results=tuple(results),
        missing_fields=missing,
        rules_version=ESSENTIAL_RULES_VERSION,
        pc_revision=config.pc_revision,
        data_revision=evidence.data_revision,
        scope=scope,
        coverage=Coverage(
            required=ESSENTIAL_REQUIRED,
            implemented=ESSENTIAL_REQUIRED,
            evaluated=applicables,
            passed=ids("pass"),
            failed=ids("fail"),
            unknown=ids("unknown"),
            not_applicable=ids("not_applicable"),
            not_implemented=(),
            complete=complete,
        ),
        additional_checks=notices,
        warnings=tuple(notice.reason for notice in notices),
    )
