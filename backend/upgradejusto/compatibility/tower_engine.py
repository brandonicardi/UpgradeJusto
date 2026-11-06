"""Pure schema2 evaluator. No HTTP, DB, LLM, catalog lookup or mutation."""

import math

from .basic_contract import AdditionalCheck
from .basic_evaluation import evaluate_basic
from .basic_specs import BasicSpecs
from .models import Coverage, PartInstance, ResolvedConfiguration
from .tower_contract import (
    REQUIRED,
    NominalResource,
    SharedLimit,
    TowerEvaluationResult,
    TowerRuleResult,
    TowerScope,
)

EMPTY = BasicSpecs({}, {}, frozenset())
LEGACY = frozenset(("cpu", "motherboard", "ram", "gpu", "psu", "case"))


def _validated_specs(spec):
    """Provenance is not type safety; sanitize before subcomposing basic rules."""
    text_lists = {
        "board_formats",
        "psu_formats",
        "cooler_sockets",
    }
    integer_lists = {"jedec_mts", "fan_supported_sizes_mm"}
    booleans = {"ecc", "buffered", "pcie_backward_compatible", "stock_cooler_included"}
    dimensions = {"length_mm", "gpu_limit_mm", "psu_limit_mm"}
    numbers = {
        "slots",
        "max_total_gb",
        "max_module_gb",
        "capacity_gb",
        "length_mm",
        "gpu_limit_mm",
        "psu_limit_mm",
        "continuous_power_w",
        "recommended_psu_w",
        "nvidia_recommended_psu_w",
        "cpu_tdp_class_w",
        "psu_reference_cpu_tdp_class_w",
        "atx24_count",
        "eps8_count",
        "pcie8_count",
        "native16_count",
        "pcie8_independent_branches",
        "gpu_power_count",
        "adapter_pcie8_inputs",
        "sata_power_count",
        "cooler_height_mm",
        "cooler_height_limit_mm",
        "fan_count",
        "fan_voltage_mv",
        "fan_current_ma",
        "fan_size_mm",
        "fan_positions",
        "fan_total_current_ma",
    }
    texts = {
        "socket",
        "memory_type",
        "module_type",
        "module_type_description",
        "pcie_slot",
        "pcie_interface",
        "cpu_platform",
        "cpu_stock_family",
        "psu_reference_platform",
        "psu_recommendation_basis",
        "psu_reference_system",
        "gpu_power_kind",
        "form_factor",
        "storage_interface",
        "storage_form",
        "cooler_type",
        "fan_connector",
        "tower_port_kind",
        "tower_port_form",
    }
    invalid = set(spec.conflicts)
    fields = dict(spec.fields)
    for key, value in spec.fields.items():
        if value is None:
            continue
        valid = True
        if key in text_lists | integer_lists:
            expected = str if key in text_lists else int
            valid = (
                type(value) in (tuple, list)
                and bool(value)
                and all(
                    type(item) is expected
                    and (bool(item.strip()) if expected is str else item > 0)
                    for item in value
                )
            )
        elif key in booleans:
            valid = type(value) is bool
        elif key in dimensions:
            valid = type(value) in (int, float) and math.isfinite(value) and value > 0
        elif key in numbers:
            valid = type(value) is int and value >= 0
        elif key in texts:
            valid = type(value) is str and bool(value.strip())
        if not valid:
            invalid.add(key)
        elif key in text_lists | integer_lists:
            # Basic Fact serialization supports JSON lists, not raw tuples.
            fields[key] = list(value)
    return BasicSpecs(fields, spec.references, frozenset(invalid), spec.import_digest)


class Check:
    def __init__(self, identity):
        self.identity = identity
        self.missing = []
        self.refs = []
        self.failed = False

    def read(self, spec, key, path):
        value = spec.fact(key)
        self.refs.extend(spec.evidence(key))
        if value is None:
            self.missing.append(path + "." + key)
        return value

    def number(self, spec, key, path, zero=False):
        value = self.read(spec, key, path)
        if value is not None and (type(value) is not int or value < (0 if zero else 1)):
            self.missing.append(path + "." + key + ".valid_integer")
            return None
        return value

    def result(self):
        return TowerRuleResult(
            rule_id=self.identity,
            family=self.identity,
            state="fail" if self.failed else "unknown" if self.missing else "pass",
            missing_fields=tuple(dict.fromkeys(self.missing)),
            evidence=tuple(dict.fromkeys(self.refs)),
            conditions=("Asignación nominal documentada; no instalación medida",),
        )


def _allocate(demands, resources, limits):
    """Deterministic exhaustive matching, including pair exclusions and budgets."""
    if len(demands) > len(resources) or any(not options for _, options in demands):
        return False
    ordered = sorted(demands, key=lambda item: (len(item[1]), item[0]))
    resources = {r.resource_id: r for r in resources}

    def visit(index, chosen, usage):
        if index == len(ordered):
            return True
        for identity in sorted(ordered[index][1]):
            candidate = resources[identity]
            if identity in chosen or any(
                other in candidate.excludes or identity in resources[other].excludes
                for other in chosen
            ):
                continue
            group = candidate.group
            amount = usage.get(group, 0) + candidate.cost
            if group is not None and (group not in limits or amount > limits[group]):
                continue
            if visit(index + 1, chosen | {identity}, {**usage, group: amount}):
                return True
        return False

    return visit(0, set(), {})


def resources(spec, key, owner, check):
    raw = check.read(spec, key, owner)
    if raw is None:
        return None
    try:
        if type(raw) not in (list, tuple):
            raise ValueError("Resource collection required")
        values = tuple(NominalResource.model_validate(value) for value in raw)
        ids = [value.resource_id for value in values]
        if len(ids) != len(set(ids)) or any(
            value.cost < 0
            or not value.accepts
            or any(not item.strip() for item in value.accepts)
            or (value.voltage_mv is not None and value.voltage_mv <= 0)
            or (value.max_current_ma is not None and value.max_current_ma < 0)
            or value.resource_id in value.excludes
            or set(value.excludes) - set(ids)
            for value in values
        ):
            raise ValueError("Invalid resource inventory")
        return values
    except (TypeError, ValueError):
        check.missing.append(owner + "." + key + ".valid_inventory")
        return None


def evaluate_tower(tower, evidence):
    """Tower/TowerCreate duck type; evidence is resolved by a server adapter only."""
    if tower.schema_version != 2 or not evidence.data_revision.strip():
        raise ValueError("Schema2 and pinned evidence revision required")
    groups = {}
    specs = {}
    models = {}
    identification = Check("T11")
    for index, line in enumerate(tower.lines):
        identity = str(line.line_id) if line.line_id is not None else f"line:{index}"
        category = str(line.category)
        # Category is a str Enum: .value also works without importing catalog.
        category = getattr(line.category, "value", category)
        groups.setdefault(category, []).append((identity, line.quantity))
        item = evidence.components.get(line.component_id) if line.component_id else None
        if (
            item is None
            or item.category != category
            or item.data_revision != evidence.data_revision
            or type(item.model) is not str
            or not item.model.strip()
        ):
            identification.missing.append(identity + ".identified_versioned_component")
            specs[identity] = EMPTY
            models[identity] = None
        else:
            specs[identity] = _validated_specs(item.specs)
            models[identity] = item.model
    for category, state in tower.category_status.items():
        category = getattr(category, "value", str(category))
        if state == "unknown":
            identification.missing.append(category + ".presence")
        elif state == "absent" and category in (
            "cpu",
            "motherboard",
            "ram",
            "psu",
            "case",
            "storage",
        ):
            identification.failed = True
    # A declared absence of graphics is not proof of a usable integrated path.
    if not groups.get("gpu"):
        identification.missing.append(
            "gpu.absence_requires_documented_integrated_display_path"
        )

    def one(category):
        selected = groups.get(category, ())
        return specs[selected[0][0]] if selected else EMPTY

    parts = tuple(
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
    )
    support = evidence.cpu_support
    if support is not None:
        # Never carry BIOS from an old motherboard or an evidence record.
        support = support.model_copy(
            update={"installed_bios": tower.context.bios_version}
        )
    config = ResolvedConfiguration(
        pc_revision=str(getattr(tower, "revision", 1)),
        data_revision=evidence.data_revision,
        parts=parts,
        cpu_support=support,
    )
    basic = evaluate_basic(config, specs)
    results = [
        TowerRuleResult(
            **{
                **result.model_dump(),
                "rule_id": f"T{index:02}",
                "family": f"T{index:02}",
            }
        )
        for index, result in enumerate(basic.rule_results, 1)
    ]
    board, case, cpu, psu = map(one, ("motherboard", "case", "cpu", "psu"))
    storage = Check("T08")
    cooling = Check("T09")
    fans = Check("T10")
    shared = Check("T12")

    ports = resources(board, "tower_ports", "motherboard", storage)
    bays = resources(case, "storage_bays", "case", storage)
    headers = resources(board, "fan_headers", "motherboard", fans)
    ports_known, bays_known, headers_known = (
        ports is not None,
        bays is not None,
        headers is not None,
    )
    ports, bays, headers = ports or (), bays or (), headers or ()
    if any(header.group is not None for header in headers):
        fans.missing.append("motherboard.fan_header_group_routing")
    if any(bay.group is not None for bay in bays):
        storage.missing.append("case.storage_bay_group_routing")
    demands = []
    bay_demands = []
    sata_power = 0
    for identity, quantity in groups.get("storage", ()):
        spec = specs[identity]
        interface = storage.read(spec, "storage_interface", identity)
        form = storage.read(spec, "storage_form", identity)
        power = storage.number(spec, "sata_power_count", identity, zero=True)
        if power is not None:
            sata_power += power * quantity
        if interface is not None and form is not None:
            matches = tuple(
                r.resource_id
                for r in ports
                if r.kind == interface and form in r.accepts
            )
            for unit in range(quantity):
                demands.append((f"{identity}:{unit}", matches))
                if interface == "SATA":
                    bay_demands.append(
                        (
                            f"{identity}:{unit}",
                            tuple(r.resource_id for r in bays if form in r.accepts),
                        )
                    )
    if not groups.get("storage"):
        storage.missing.append("storage.required_drive")
    available = storage.number(psu, "sata_power_count", "psu", zero=True)
    if available is not None and sata_power > available:
        storage.failed = True

    cooler = one("cooler")
    if not groups.get("cooler"):
        included = cooling.read(cpu, "stock_cooler_included", "cpu")
        if included is True:
            # CPU evidence must explicitly carry the bundled cooler's full facts.
            cooler = cpu
        elif included is False:
            cooling.failed = True
    socket = cooling.read(cpu, "socket", "cpu")
    mounts = cooling.read(cooler, "cooler_sockets", "cooler")
    kind = cooling.read(cooler, "cooler_type", "cooler")
    if socket is not None and mounts is not None and socket not in mounts:
        cooling.failed = True
    if kind == "air":
        height = cooling.number(cooler, "cooler_height_mm", "cooler")
        limit = cooling.number(case, "cooler_height_limit_mm", "case")
        if height is not None and limit is not None and height > limit:
            cooling.failed = True
    else:
        cooling.missing.append("cooler.documented_non_air_mount_and_pump_route")

    fan_demands = []
    fan_total = 0
    current_total = 0
    cooling_fans = fans.number(cooler, "fan_count", "cooler", zero=True)
    fan_groups = [("cooler", cooler, cooling_fans)] + [
        (identity, specs[identity], quantity)
        for identity, quantity in groups.get("fan", ())
    ]
    case_count = sum(quantity for _, quantity in groups.get("fan", ()))
    fan_positions = fans.number(case, "fan_positions", "case", zero=True)
    if fan_positions is not None and case_count > fan_positions:
        fans.failed = True
    for identity, spec, quantity in fan_groups:
        if quantity is None or quantity == 0:
            continue
        fan_total += quantity
        voltage = fans.number(spec, "fan_voltage_mv", identity)
        current = fans.number(spec, "fan_current_ma", identity)
        pins = fans.read(spec, "fan_connector", identity)
        if identity != "cooler":
            size = fans.number(spec, "fan_size_mm", identity)
            accepted = fans.read(case, "fan_supported_sizes_mm", "case")
            if size is not None and accepted is not None and size not in accepted:
                fans.failed = True
        if voltage is None or current is None or pins is None:
            continue
        current_total += current * quantity
        candidates = tuple(
            r.resource_id
            for r in headers
            if pins in r.accepts
            and r.voltage_mv == voltage
            and r.max_current_ma is not None
            and current <= r.max_current_ma
        )
        if any(r.voltage_mv is None or r.max_current_ma is None for r in headers):
            fans.missing.append("motherboard.fan_header_electrical_limits")
        elif headers_known and not candidates:
            fans.failed = True
        for unit in range(quantity):
            fan_demands.append((f"{identity}:fan:{unit}", candidates))
    current_limit = fans.number(board, "fan_total_current_ma", "motherboard", zero=True)
    if current_limit is not None and current_total > current_limit:
        fans.failed = True
    header_matching_known = headers_known and all(
        r.voltage_mv is not None and r.max_current_ma is not None for r in headers
    )
    # Only matching inputs gate matching: size/current-budget unknowns are unrelated.
    ungrouped_headers = tuple(r.model_copy(update={"group": None}) for r in headers)
    if (
        header_matching_known and not _allocate(fan_demands, ungrouped_headers, {})
    ) or (headers_known and cooling_fans is not None and fan_total > len(headers)):
        fans.failed = True

    # T12 includes GPU demand, so an M.2 allocation cannot silently disable it.
    gpu = one("gpu")
    if groups.get("gpu"):
        interface = shared.read(gpu, "tower_port_kind", "gpu")
        form = shared.read(gpu, "tower_port_form", "gpu")
        if interface is not None and form is not None:
            demands.append(
                (
                    "gpu",
                    tuple(
                        r.resource_id
                        for r in ports
                        if r.kind == interface and form in r.accepts
                    ),
                )
            )
    raw_limits = shared.read(board, "shared_limits", "motherboard")
    limits = {}
    if raw_limits is not None:
        try:
            if type(raw_limits) not in (list, tuple):
                raise ValueError("Shared-limit collection required")
            parsed = tuple(SharedLimit.model_validate(value) for value in raw_limits)
            limits = {value.group: value.capacity for value in parsed}
            if len(limits) != len(parsed) or any(
                value < 0 for value in limits.values()
            ):
                raise ValueError("Invalid shared budget")
        except (ValueError, TypeError):
            limits = {}
            shared.missing.append("motherboard.shared_limits.valid_inventory")
    if any(r.group is not None and r.group not in limits for r in ports):
        shared.missing.append("motherboard.shared_limits.exhaustive")
    # Missing sharing evidence does not erase independent port/bay exhaustion.
    unshared = tuple(r.model_copy(update={"group": None}) for r in ports)
    if ports_known and not _allocate(demands, unshared, {}):
        storage.failed = True
        shared.failed = True
    if (
        bay_demands
        and bays_known
        and not _allocate(
            bay_demands,
            tuple(r.model_copy(update={"group": None}) for r in bays),
            {},
        )
    ):
        storage.failed = True
    # A known subset's impossibility proves failure even with other missing fields.
    # Unknown budgets are relaxed, never interpreted as zero or an exhausted group.
    constrained = tuple(
        r if r.group in limits else r.model_copy(update={"group": None}) for r in ports
    )
    if ports_known and not _allocate(demands, constrained, limits):
        shared.failed = True
    # Reused stock policy is NOT valid for arbitrary new loads. No invented watts.
    disks = sum(quantity for _, quantity in groups.get("storage", ()))
    if (
        disks != 1
        or fan_total > 4
        or any(
            specs[identity].fact("storage_interface") != "M2-NVMe"
            for identity, _ in groups.get("storage", ())
        )
    ):
        shared.missing.append("psu.expanded_loads_stock_policy_applicability")
    results.extend(
        (
            storage.result(),
            cooling.result(),
            fans.result(),
            identification.result(),
            shared.result(),
        )
    )
    missing = tuple(dict.fromkeys(path for r in results for path in r.missing_fields))

    def ids(state):
        return tuple(r.rule_id for r in results if r.state == state)

    complete = not missing and not ids("unknown")
    notices = tuple(
        AdditionalCheck(
            id=f"tower_scope_{index}", status="outside_scope", reason=reason
        )
        for index, reason in enumerate(TowerScope().excludes)
    )
    return TowerEvaluationResult(
        verdict="incompatible"
        if ids("fail")
        else "compatible"
        if complete
        else "requiere_verificacion",
        rule_results=tuple(results),
        missing_fields=missing,
        pc_revision=config.pc_revision,
        data_revision=evidence.data_revision,
        coverage=Coverage(
            required=REQUIRED,
            implemented=REQUIRED,
            evaluated=REQUIRED,
            passed=ids("pass"),
            failed=ids("fail"),
            unknown=ids("unknown"),
            not_applicable=(),
            not_implemented=(),
            complete=complete,
        ),
        additional_checks=notices,
        warnings=tuple(notice.reason for notice in notices),
    )
