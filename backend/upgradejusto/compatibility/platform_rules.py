"""R02/R07 pure predicates. Partial evidence never approves the whole family."""

from .models import Fact, ResolvedConfiguration
from .rules import _result


class Checks:
    def __init__(self, config, family):
        self.config, self.family = config, family
        self.facts, self.refs, self.missing = [], [], []
        self.failed = False

    def field(self, spec, name, path):
        if spec is None:
            self.missing.append(path)
            return None
        self.refs.extend(spec.evidence)
        value = getattr(spec, name)
        if spec.status != "documented" or not spec.evidence or value is None:
            self.missing.append(path)
            return None
        return value

    def compare(self, name, left, right, predicate):
        if left is not None and right is not None:
            passed = predicate(left, right)
            self.failed |= not passed
            self.facts.append(Fact(name=name, value=passed))

    def result(self):
        return _result(
            self.family,
            "fail" if self.failed else "unknown" if self.missing else "pass",
            self.facts,
            self.refs,
            (),
            self.missing,
        )


def ram_platform(config: ResolvedConfiguration):
    c = Checks(config, "R02")
    data = config.ram
    if data is None:
        c.missing.append("ram")
        return c.result()
    parts = {p.instance_id: p for p in config.parts if p.category == "ram"}
    supplied = {m.instance_id for m in data.modules}
    if not parts or supplied != set(parts):
        c.missing.append("ram.complete_module_set")
    cpu, board = data.cpu, data.motherboard
    generation = c.field(cpu, "generation", "ram.cpu.generation")
    board_generation = c.field(board, "generation", "ram.motherboard.generation")
    c.compare(
        "ram_platform_generation", generation, board_generation, lambda a, b: a == b
    )
    slots = c.field(board, "slots", "ram.motherboard.slots")
    total = 0
    capacities_known = bool(parts) and supplied == set(parts)
    count = sum(p.quantity for p in parts.values())
    c.facts.append(Fact(name="ram_module_count", value=count))
    c.compare("ram_slot_capacity", count, slots, lambda a, b: a <= b)
    for module in data.modules:
        path = f"ram.modules.{module.instance_id.replace(':', '_')}"
        module_generation = c.field(module, "generation", path + ".generation")
        c.compare(
            "ram_cpu_generation", module_generation, generation, lambda a, b: a == b
        )
        c.compare(
            "ram_board_generation",
            module_generation,
            board_generation,
            lambda a, b: a == b,
        )
        for field in ("module_type", "ecc", "buffered"):
            value = c.field(module, field, path + "." + field)
            for name, platform in (("cpu", cpu), ("motherboard", board)):
                accepted = c.field(platform, field, f"ram.{name}." + field)
                c.compare("ram_" + field, value, accepted, lambda a, b: a == b)
        capacity = c.field(module, "capacity_gb", path + ".capacity_gb")
        capacities_known &= capacity is not None
        if capacity is not None:
            total += capacity * parts[module.instance_id].quantity
        for name, platform in (("cpu", cpu), ("motherboard", board)):
            limit = c.field(platform, "max_module_gb", f"ram.{name}.max_module_gb")
            c.compare("ram_per_module_capacity", capacity, limit, lambda a, b: a <= b)
        rank = c.field(module, "rank", path + ".rank")
        for name, platform in (("cpu", cpu), ("motherboard", board)):
            ranks = c.field(platform, "supported_ranks", f"ram.{name}.supported_ranks")
            c.compare("ram_rank", rank, ranks, lambda a, b: a in b)
        rate = c.field(module, "jedec_mts", path + ".jedec_mts")
        voltage = c.field(module, "voltage_mv", path + ".voltage_mv")
        if data.regime_evidence:
            # One documented JEDEC point is not a continuous interval of support.
            c.compare("ram_jedec_rate", data.operating_mts, rate, lambda a, b: a == b)
            c.compare(
                "ram_voltage", data.operating_voltage_mv, voltage, lambda a, b: a == b
            )
    for name, platform in (("cpu", cpu), ("motherboard", board)):
        maximum = c.field(platform, "max_total_gb", f"ram.{name}.max_total_gb")
        if capacities_known:
            c.compare("ram_total_capacity", total, maximum, lambda a, b: a <= b)
        platform_rate = c.field(platform, "jedec_mts", f"ram.{name}.jedec_mts")
        platform_voltage = c.field(platform, "voltage_mv", f"ram.{name}.voltage_mv")
        if data.regime_evidence:
            c.compare(
                "ram_platform_rate",
                data.operating_mts,
                platform_rate,
                lambda a, b: a == b,
            )
            c.compare(
                "ram_voltage",
                data.operating_voltage_mv,
                platform_voltage,
                lambda a, b: a == b,
            )
    if capacities_known:
        c.facts.append(Fact(name="ram_total_gb", value=total, unit="GB"))
    for name in (
        "installed_slots",
        "supported_populations",
        "operating_mts",
        "operating_voltage_mv",
        "regime_evidence",
    ):
        if not getattr(data, name):
            c.missing.append("ram." + name)
    if data.regime_evidence:
        c.refs.extend(data.regime_evidence)
        if data.installed_slots is not None:
            c.compare(
                "ram_population_count",
                len(data.installed_slots),
                count,
                lambda a, b: a == b,
            )
            c.compare(
                "ram_unique_slots",
                len(set(data.installed_slots)),
                count,
                lambda a, b: a == b,
            )
        c.compare(
            "ram_population",
            data.installed_slots,
            data.supported_populations,
            lambda a, b: a in b,
        )
    return c.result()


def mounting(config: ResolvedConfiguration):
    c = Checks(config, "R07")
    data = config.mounting
    if data is None:
        c.missing.append("mounting")
        return c.result()
    board_form = c.field(
        data.motherboard, "form_factor", "mounting.motherboard.form_factor"
    )
    board_formats = c.field(data.case, "board_formats", "mounting.case.board_formats")
    c.compare("mounting_board_format", board_form, board_formats, lambda a, b: a in b)
    psu_form = c.field(data.psu, "form_factor", "mounting.psu.form_factor")
    psu_formats = c.field(data.case, "psu_formats", "mounting.case.psu_formats")
    c.compare("mounting_psu_format", psu_form, psu_formats, lambda a, b: a in b)
    length = c.field(data.psu, "length_mm", "mounting.psu.length_mm")
    nominal = c.field(
        data.case, "nominal_psu_limit_mm", "mounting.case.nominal_psu_limit_mm"
    )
    c.compare("mounting_psu_nominal_length", length, nominal, lambda a, b: a <= b)
    limit = data.effective_psu_limit
    if (
        limit is None
        or limit.value is None
        or limit.status != "documented"
        or not limit.evidence
        or not limit.conditions
        or not data.mounting_id
        or limit.mounting_id != data.mounting_id
    ):
        c.missing.append("mounting.effective_psu_limit")
    else:
        c.refs.extend(limit.evidence)
        c.compare(
            "mounting_psu_effective_length", length, limit.value, lambda a, b: a <= b
        )
    for name in ("required_standoffs", "installed_standoffs", "mounting_evidence"):
        if not getattr(data, name):
            c.missing.append("mounting." + name)
    if data.mounting_evidence:
        c.refs.extend(data.mounting_evidence)
        c.compare(
            "mounting_standoffs",
            data.installed_standoffs,
            data.required_standoffs,
            lambda a, b: len(a) == len(set(a)) and set(a) == set(b),
        )
    return c.result()
