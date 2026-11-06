"""Pure basic-stock inventory, independent of HTTP, persistence and LLM.

PSU applicability without decisive manufacturer evidence remains unknown,
never a demo-specific pass.
"""

from .basic_contract import RULES_VERSION, AdditionalCheck, BasicScope, scope_notices
from .basic_policy import stock_power
from .basic_specs import BasicSpecs
from .cpu_rule import cpu_support, cpu_support_documented
from .models import Coverage, EvaluationResult, Fact, RuleResult
from .resource_rules import front_functions, storage

REQUIRED = tuple(f"B{i:02}" for i in range(1, 8))
_EMPTY = BasicSpecs({}, {}, frozenset())


class Check:
    def __init__(self, identity):
        self.identity = identity
        self.missing, self.refs, self.facts = [], [], []
        self.failed = False

    def read(self, spec, key, path, required=True):
        value = spec.fact(key)
        if key == "module_type" and value in ("DIMM", "288-PIN DIMM"):
            # Mechanical descriptor alone cannot prove UDIMM or contradict it.
            value = None
        if (
            value is not None
            and key
            in {
                "capacity_gb",
                "slots",
                "max_total_gb",
                "max_module_gb",
                "length_mm",
                "gpu_limit_mm",
                "psu_limit_mm",
                "continuous_power_w",
                "recommended_psu_w",
            }
            and (type(value) not in (int, float) or value <= 0)
        ):
            value = None
        self.refs.extend(spec.evidence(key))
        self.facts.append(
            Fact(
                name=path,
                value=value if type(value) is not list else ",".join(map(str, value)),
            )
        )
        if value is None and required:
            self.missing.append(path)
        return value

    def result(self, conditions=()):
        return RuleResult(
            rule_id=self.identity,
            family=self.identity,
            state="fail" if self.failed else "unknown" if self.missing else "pass",
            facts=tuple(self.facts),
            evidence=tuple(dict.fromkeys(self.refs)),
            conditions=conditions,
            missing_fields=tuple(dict.fromkeys(self.missing)),
        )


def _remap(result, identity):
    return RuleResult(
        **{
            **result.model_dump(),
            "rule_id": identity,
            "family": identity,
        }
    )


def _basic_cpu_support(config, cpu, board, *, evaluate_bios=True):
    """Reconcile independent published socket evidence without masking BIOS fail."""
    original = cpu_support(config) if evaluate_bios else cpu_support_documented(config)
    facts, refs, missing = (
        list(original.facts),
        list(original.evidence),
        list(original.missing_fields),
    )
    data = config.cpu_support
    for label, spec, observation in (
        ("cpu", cpu, data.cpu_socket if data is not None else None),
        ("motherboard", board, data.motherboard_socket if data is not None else None),
    ):
        conflict = "socket" in spec.conflicts
        value = spec.fact("socket")
        if conflict or value is not None:
            refs.extend(spec.evidence("socket"))
            facts.append(Fact(name=label + ".socket_source_conflict", value=conflict))
            facts.append(Fact(name=label + ".socket_published_value", value=value))
        if conflict:
            missing.append(f"cpu_support.{label}_socket_source_conflict")
        elif (
            value is not None
            and observation is not None
            and observation.status == "documented"
            and observation.evidence
            and observation.value is not None
            and value != observation.value
        ):
            missing.append(f"cpu_support.{label}_socket_source_disagreement")
    return RuleResult(
        rule_id="B01",
        family="B01",
        state="fail"
        if original.state == "fail"
        else "unknown"
        if missing
        else original.state,
        facts=tuple(facts),
        evidence=tuple(dict.fromkeys(refs)),
        conditions=original.conditions
        + (
            "Socket: reconciliar soporte CPU y fuentes publicadas; contradicción sin "
            "prioridad documental resuelta exige verificación"
            + (", sin borrar fallos BIOS conocidos" if evaluate_bios else ""),
        ),
        missing_fields=tuple(dict.fromkeys(missing)),
    )


def evaluate_basic(config, specs):
    """Specs indexed by instance ID, resolved by server from a pinned publication."""

    def selected(category):
        parts = [part for part in config.parts if part.category == category]
        if len(parts) != 1 or parts[0].quantity != 1:
            return _EMPTY
        return specs.get(parts[0].instance_id, _EMPTY)

    cpu, board, gpu, psu, case = map(
        selected, ("cpu", "motherboard", "gpu", "psu", "case")
    )
    results = [_basic_cpu_support(config, cpu, board)]

    ram = Check("B02")
    cpu_type = ram.read(cpu, "memory_type", "cpu.memory_type")
    board_type = ram.read(board, "memory_type", "motherboard.memory_type")
    board_format = ram.read(board, "module_type", "motherboard.module_type")
    slots = ram.read(board, "slots", "motherboard.ram_slots")
    maximum = ram.read(board, "max_total_gb", "motherboard.max_total_gb")
    module_max = ram.read(
        board, "max_module_gb", "motherboard.max_module_gb", required=False
    )
    cpu_rates = ram.read(cpu, "jedec_mts", "cpu.native_jedec_mts")
    board_rates = ram.read(board, "jedec_mts", "motherboard.native_jedec_mts")
    board_ecc = ram.read(board, "ecc", "motherboard.admitted_ecc")
    board_buffered = ram.read(board, "buffered", "motherboard.admitted_buffered")
    rates = [set(v) for v in (cpu_rates, board_rates) if v is not None]
    modules = [part for part in config.parts if part.category == "ram"]
    if not modules:
        ram.missing.append("ram.modules")
    total, count = 0, 0
    types = [v for v in (cpu_type, board_type) if v is not None]
    for index, part in enumerate(modules, 1):
        spec = specs.get(part.instance_id, _EMPTY)
        prefix = f"ram.module_{index}."
        generation = ram.read(spec, "memory_type", prefix + "memory_type")
        form = ram.read(spec, "module_type", prefix + "module_type")
        ram.read(
            spec,
            "module_type_description",
            prefix + "module_type_description",
            required=False,
        )
        capacity = ram.read(spec, "capacity_gb", prefix + "capacity_gb")
        native = ram.read(spec, "jedec_mts", prefix + "native_jedec_mts")
        ecc = ram.read(spec, "ecc", prefix + "ecc")
        buffered = ram.read(spec, "buffered", prefix + "buffered")
        if ecc is not None and board_ecc is not None and ecc != board_ecc:
            ram.missing.append(prefix + "ecc_cpu_board_applicability")
        if (
            buffered is not None
            and board_buffered is not None
            and buffered != board_buffered
        ):
            ram.failed = True
        if generation is not None:
            types.append(generation)
        if form is not None and board_format is not None and form != board_format:
            ram.failed = True
        if native is not None:
            rates.append(set(native))
        count += part.quantity
        if capacity is not None:
            total += capacity * part.quantity
            if module_max is not None and capacity > module_max:
                ram.failed = True
    if len(set(types)) > 1 or (slots is not None and count > slots):
        ram.failed = True
    if maximum is not None and total > maximum:
        ram.failed = True
    if rates and not set.intersection(*rates):
        ram.failed = True
    results.append(
        ram.result(
            (
                "native_jedec_no_oc; MHz nominales no se usan como aprobación ni rechazo",
                "No exige QVL universal ni estabilidad ensayada; sustituir RAM retira el conjunto previo",
            )
        )
    )

    interface = Check("B03")
    slot = interface.read(board, "pcie_slot", "motherboard.pcie_slot")
    gpu_interface = interface.read(gpu, "pcie_interface", "gpu.pcie_interface")
    backward = interface.read(
        gpu, "pcie_backward_compatible", "gpu.pcie_backward_compatible"
    )
    if slot is not None and gpu_interface is not None:
        if slot != "PCIe x16" or gpu_interface not in ("PCIe x16", "PCIe x8"):
            interface.missing.append("gpu.interface_applicability")
        if backward is False:
            interface.missing.append("gpu.slot_generation_compatibility")
    results.append(
        interface.result(
            (
                "Interfaz física nominal; no certifica ancho de banda ni geometría avanzada",
            )
        )
    )

    length = Check("B04")
    dimension = length.read(gpu, "length_mm", "gpu.length_mm")
    limit = length.read(case, "gpu_limit_mm", "case.gpu_limit_mm")
    if dimension is not None and limit is not None:
        length.failed = dimension > limit
    results.append(
        length.result(
            (
                "Límite nominal publicado; curvas de cables e interferencias adicionales no certificadas",
            )
        )
    )

    results.append(stock_power(Check("B05"), cpu, gpu, psu))

    connectors = Check("B06")
    for key in ("atx24_count", "eps8_count"):
        available = connectors.read(psu, key, "psu." + key)
        required = connectors.read(board, key, "motherboard." + key)
        if available is not None and required is not None and available < required:
            connectors.failed = True
    kind = connectors.read(gpu, "gpu_power_kind", "gpu.power_kind")
    amount = connectors.read(gpu, "gpu_power_count", "gpu.power_count")
    if kind == "PCIe8":
        available = connectors.read(psu, "pcie8_count", "psu.pcie8_count")
        if amount is not None and available is not None and amount > available:
            connectors.failed = True
    elif kind == "16pin":
        native = connectors.read(
            psu, "native16_count", "psu.native16_count", required=False
        )
        if native is not None and amount is not None and native >= amount:
            pass
        else:
            inputs = connectors.read(
                gpu, "adapter_pcie8_inputs", "gpu.adapter_pcie8_inputs"
            )
            available = connectors.read(psu, "pcie8_count", "psu.pcie8_count")
            branches = connectors.read(
                psu, "pcie8_independent_branches", "psu.pcie8_independent_branches"
            )
            if inputs is not None and amount is not None:
                if available is not None and inputs * amount > available:
                    connectors.failed = True
                if branches is not None and inputs * amount > branches:
                    connectors.failed = True
    elif kind is not None:
        connectors.missing.append("gpu.supported_power_route")
    results.append(
        connectors.result(
            (
                "Ruta nativa preferida; adaptador exige entradas y ramales independientes del kit propio",
            )
        )
    )

    mounting = Check("B07")
    for category, spec, formats in (
        ("motherboard", board, "board_formats"),
        ("psu", psu, "psu_formats"),
    ):
        form = mounting.read(spec, "form_factor", category + ".form_factor")
        accepted = mounting.read(case, formats, "case." + formats)
        if form is not None and accepted is not None and form not in accepted:
            mounting.failed = True
    psu_length = mounting.read(psu, "length_mm", "psu.length_mm")
    psu_limit = mounting.read(case, "psu_limit_mm", "case.psu_limit_mm")
    if psu_length is not None and psu_limit is not None and psu_length > psu_limit:
        mounting.failed = True
    results.append(
        mounting.result(("Formatos y límites nominales; no certifica montaje físico",))
    )
    additional = []
    for identity, spec, key in (
        ("cpu_stock_cooling", cpu, "stock_cooling_note"),
        ("psu_nominal_temperature", psu, "nominal_temperature_note"),
    ):
        note = spec.fact(key)
        if note is not None:
            additional.append(
                AdditionalCheck(
                    id=identity,
                    status="unknown",
                    reason=note,
                    evidence_refs=spec.evidence(key),
                )
            )
    if psu.fact("rail12v_conflict") is True:
        additional.append(
            AdditionalCheck(
                id="psu_12v_documentation_conflict",
                status="unknown",
                reason="RM750e RPS0215: F10 declara62,5A y F11 declara54,2A en12V. No se elige cifra favorable;750W totales coherentes se usan solo para selección stock, sin certificar distribución por salida.",
                evidence_refs=psu.evidence("rail12v_conflict"),
            )
        )
    for identity, result in (
        ("B08", storage(config)),
        ("B09", front_functions(config)),
    ):
        additional.append(
            AdditionalCheck(
                id=identity,
                status=result.state if result.state in ("pass", "fail") else "unknown",
                reason=(
                    "Almacenamiento" if identity == "B08" else "Frontales/funciones"
                )
                + ": fuera de cobertura básica; DTO de seis categorías no representa mapa instalado. "
                + (
                    "Fallo documentado: bloquea el veredicto. "
                    if result.state == "fail"
                    else ""
                )
                + " ".join(result.conditions)
                + (
                    " Faltantes: " + ", ".join(result.missing_fields)
                    if result.missing_fields
                    else ""
                ),
                evidence_refs=result.evidence,
            )
        )
    return aggregate_basic(config, tuple(results), tuple(additional))


def aggregate_basic(config, results, additional=()):
    if tuple(result.rule_id for result in results) != REQUIRED:
        raise ValueError("Basic stock requires the complete fixed server inventory")
    notices = scope_notices() + additional
    missing = tuple(
        dict.fromkeys(path for result in results for path in result.missing_fields)
    )

    def ids(*states):
        return tuple(result.rule_id for result in results if result.state in states)

    complete = not missing and all(
        result.state in ("pass", "fail") for result in results
    )
    failed = bool(ids("fail")) or any(check.status == "fail" for check in notices)
    return EvaluationResult(
        verdict="incompatible"
        if failed
        else "compatible"
        if complete
        else "requiere_verificacion",
        rule_results=results,
        missing_fields=missing,
        rules_version=RULES_VERSION,
        data_revision=config.data_revision,
        pc_revision=config.pc_revision,
        coverage=Coverage(
            required=REQUIRED,
            implemented=ids("pass", "fail", "unknown"),
            evaluated=ids("pass", "fail", "unknown"),
            passed=ids("pass"),
            failed=ids("fail"),
            unknown=ids("unknown"),
            not_applicable=(),
            not_implemented=ids("not_implemented"),
            complete=complete,
        ),
        scope=BasicScope(),
        additional_checks=notices,
        warnings=tuple(check.reason for check in notices),
    )
