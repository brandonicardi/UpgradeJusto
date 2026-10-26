"""Allowlist explícita en CADA nivel: jamás serializar un plan privado completo.

La confianza de citas procede de la revisión publicada, no de URLs/textos insertados en
un snapshot. No red, ni lectura de URLs, ni reutilización de notas/nombres privados.
"""

import re
from decimal import Decimal

from upgradejusto.compatibility.basic_contract import BasicScope, scope_notices
from upgradejusto.compatibility.basic_manufacturer import resolve_stock_specs
from upgradejusto.compatibility.platform_curation import (
    references as platform_references,
)
from upgradejusto.recommendations.domain import LIMITATIONS


class PublicCatalogContext:
    """Internal projection authority; never accepted by an HTTP DTO."""

    def __init__(self, parts, support_rows, source_rows=None):
        self.catalog = {component.id: component for component in parts}
        self.source_rows = source_rows
        self.price_records = {
            (component.id, price.amount, price.date.isoformat(), price.source)
            for component in parts
            for price in component.prices
        }
        references, basic_references = [], []
        for component in self.catalog.values():
            references.extend(platform_references(component, self))
            specs = resolve_stock_specs(component, self)
            basic_references.extend(specs.evidence(*specs.references))
        for support in support_rows:
            references.extend(support.row.evidence)
            for observation in (
                support.cpu_socket,
                support.motherboard_socket,
                support.applicable_revision,
            ):
                references.extend(observation.evidence)
        self.references = {
            (e.source_id, e.url): e.model_dump(mode="json") for e in references
        }
        for ref in basic_references:
            self.references.setdefault(
                (ref.source_id, ref.url), ref.model_dump(mode="json")
            )


FACTS = {
    "cpu_model",
    "motherboard_model",
    "installed_bios_declared",
    "cpu_socket",
    "motherboard_socket",
    "applicable_revision",
    "minimum_bios",
    "bios_requirement_met",
    "gpu_length",
    "effective_limit",
    "excess_mm",
    "route_mode",
    "required_inputs",
    "independent_cables",
    "free_connectors",
    "available_independent_branches",
    "ram_platform_generation",
    "ram_module_count",
    "ram_slot_capacity",
    "ram_cpu_generation",
    "ram_board_generation",
    "ram_module_type",
    "ram_ecc",
    "ram_buffered",
    "ram_per_module_capacity",
    "ram_rank",
    "ram_jedec_rate",
    "ram_voltage",
    "ram_total_capacity",
    "ram_platform_rate",
    "ram_total_gb",
    "ram_population_count",
    "ram_unique_slots",
    "ram_population",
    "mounting_board_format",
    "mounting_psu_format",
    "mounting_psu_nominal_length",
    "mounting_psu_effective_length",
    "mounting_standoffs",
    "resource_available",
    "resource_shared_free",
    "pcie_gpu_generation",
    "pcie_physical_fit",
    "pcie_negotiable_link",
    "power_electrical_kind",
    "power_cable_set_owner",
    "power_cable_reach",
    "power_independent_branches",
    "power_voltage",
    "power_connector_current",
    "power_rail_current",
    "storage_protocol",
    "storage_mount_size",
    "storage_retention",
    "storage_power_kind",
    "storage_temperature",
    "front_header_channels",
    "front_cable_reach",
    "front_electrical_kind",
    "front_adapter_input",
    "front_adapter_output",
    "front_adapter_clearance",
    "front_adapter_channels",
    "front_effective_rate_mbps",
    "front_usb_rate",
    "front_function_preserved",
}
CONDITIONS = {
    "BIOS instalada declarada por usuario; no es evidencia curada de instalación",
    "BIOS anterior falla requisito de soporte; no afirma imposibilidad física de POST",
    "Comprobación necesaria aún sin implementar; no se presume aprobada",
    "Inventario instalado completo documenta ausencia de almacenamiento",
}
COVERAGE = (
    "required",
    "implemented",
    "evaluated",
    "passed",
    "failed",
    "unknown",
    "not_applicable",
    "not_implemented",
    "complete",
)


def scalar(value):
    return value if type(value) in (str, int, float, bool, type(None)) else None


def public_fact(data):
    name, value = data.get("name"), data.get("value")
    if name not in FACTS:
        return None
    if name.startswith(("resource_", "pcie_", "power_", "storage_", "front_")):
        if name == "pcie_gpu_generation":
            if type(value) is not int or value not in (1, 2, 3, 4, 5):
                return None
        elif name == "front_effective_rate_mbps":
            if type(value) is not int or value <= 0:
                return None
        elif type(value) is not bool:
            return None
        return {
            "name": name,
            "value": value,
            "unit": "Mb/s" if name == "front_effective_rate_mbps" else None,
        }
    return {key: scalar(data.get(key)) for key in ("name", "value", "unit")}


def missing_fields(values):
    # Solo rutas técnicas, nunca texto libre ni identificadores de entidades privadas.
    return [
        value
        for value in values
        if isinstance(value, str)
        and re.fullmatch(
            r"(?:stages\.[0-9]+\.)*(?:cpu_support|implementation|gpu_length|adapter_route|ram|mounting|pcie|power|storage|front|benefit|prices|dependencies|cpu|motherboard|gpu|psu|case)(?:\.[A-Za-z0-9_-]+)*",
            value,
        )
        and not any(
            word in value.lower()
            for word in (
                "notes",
                "owner",
                "email",
                "pc_id",
                "plan_id",
                "user_id",
                "token",
                "conversation",
            )
        )
    ]


def configuration(data, context):
    return {
        "components": [
            {key: group[key] for key in ("category", "component_id", "quantity")}
            for group in data.get("components", [])
            if group.get("component_id") in context.catalog
        ],
        "context": {
            "bios_version": scalar(data.get("context", {}).get("bios_version"))
        },
    }


def replacements(values, context):
    result = []
    for value in values:
        item = {
            "category": value["category"],
            "candidates": [
                {key: candidate[key] for key in ("component_id", "quantity")}
                for candidate in value["candidates"]
                if candidate.get("component_id") in context.catalog
            ],
        }
        if value["category"] == "motherboard" and isinstance(
            value.get("candidate_context"), dict
        ):
            item["candidate_context"] = {
                "bios_version": scalar(value["candidate_context"].get("bios_version"))
            }
        result.append(item)
    return result


def evidence(values, context):
    return [
        dict(context.references[(value.get("source_id"), value.get("url"))])
        for value in values
        if (value.get("source_id"), value.get("url")) in context.references
    ]


def cost(data, context):
    lines = [
        {
            key: line[key]
            for key in (
                "component_id",
                "quantity",
                "unit_amount",
                "currency",
                "date",
                "source",
            )
        }
        for line in data["lines"]
        if line.get("currency") == "ARS"
        and (
            line.get("component_id"),
            line.get("unit_amount"),
            line.get("date"),
            line.get("source"),
        )
        in context.price_records
    ]
    omitted = len(lines) != len(data["lines"])
    subtotal = sum(
        (Decimal(line["unit_amount"]) * line["quantity"] for line in lines), Decimal(0)
    )
    return {
        "total_ars": None if omitted else data["total_ars"],
        "known_subtotal_ars": format(subtotal, "f"),
        "within_budget": None if omitted else data["within_budget"],
        "lines": lines,
        "missing_fields": missing_fields(data["missing_fields"])
        + (["prices.public_source"] if omitted else []),
    }


def benefit(data):
    # F/G no poseen referencias comparativas curadas: no publicar afirmaciones nuevas.
    return {
        "status": "not_an_improvement"
        if data["status"] == "not_an_improvement"
        else "unknown",
        "evidence": [],
    }


def evaluation(data, context):
    projected = {
        "verdict": data["verdict"],
        "rules_version": data["rules_version"],
        "data_revision": data["data_revision"],
        "pc_revision": data["pc_revision"],
        "coverage": {key: data["coverage"][key] for key in COVERAGE},
        "missing_fields": missing_fields(data["missing_fields"]),
        "evaluated_configuration": configuration(
            data["evaluated_configuration"], context
        ),
        "rule_results": [
            {
                "rule_id": rule["rule_id"],
                "family": rule["family"],
                "state": rule["state"],
                "facts": [
                    projected
                    for projected in (public_fact(fact) for fact in rule["facts"])
                    if projected is not None
                ],
                "evidence": evidence(rule["evidence"], context),
                "conditions": [
                    value for value in rule["conditions"] if value in CONDITIONS
                ],
                "missing_fields": missing_fields(rule["missing_fields"]),
            }
            for rule in data["rule_results"]
        ],
    }
    if (data.get("scope") or {}).get("id") == "cu05-basic-stock-1":
        # Canonical server labels only: a stored free-text field must never
        # smuggle private notes into a public share.
        reasons = {check.id: check.reason for check in scope_notices()}
        reasons.update(
            {
                "B08": "Almacenamiento fuera de cobertura básica: mapa instalado no representado; no se presume ausencia ni puertos libres.",
                "B09": "Frontales/funciones fuera de cobertura básica: no se presume conservación funcional ni cableado instalado.",
                "psu_12v_documentation_conflict": "RM750e: conflicto F10/F11 de12V62,5A frente a54,2A conservado;750W totales solo para selección stock, no certificación eléctrica.",
                "cpu_stock_cooling": "La refrigeración stock debe resolverse:5600 BOX incluye Wraith Stealth;5700X no incluye cooler. No se presume selección, instalación ni validación térmica.",
                "psu_nominal_temperature": "Rating nominal de temperatura fabricante; temperatura real no medida ni certificada.",
            }
        )
        additional = [
            {
                "id": check["id"],
                "status": check["status"],
                "reason": reasons[check["id"]]
                + (
                    " Fallo documentado: bloquea el veredicto."
                    if check["status"] == "fail"
                    else ""
                ),
                "evidence_refs": evidence(check.get("evidence_refs", []), context),
            }
            for check in data.get("additional_checks", [])
            if check.get("id") in reasons
            and check.get("status") in ("outside_scope", "unknown", "pass", "fail")
        ]
        projected.update(
            scope=BasicScope().model_dump(mode="json"),
            additional_checks=additional,
            warnings=[check["reason"] for check in additional],
        )
    return projected


def public_snapshot(snapshot, title, context):
    return {
        "title": title,
        "objective": snapshot["objective"],
        "budget_ars": snapshot["budget_ars"],
        "currency": "ARS",
        "status": "requires_verification"
        if snapshot["status"] == "ready"
        and benefit(snapshot["benefit"])["status"] != "supported"
        else snapshot["status"],
        "cost": cost(snapshot["cost"], context),
        "benefit": benefit(snapshot["benefit"]),
        "missing_fields": missing_fields(snapshot["missing_fields"]),
        "stages": [
            {
                "position": stage["position"],
                "name": f"Etapa {stage['position']}",
                "replacements": replacements(stage["replacements"], context),
                "evaluated_configuration": configuration(
                    stage["evaluated_configuration"], context
                ),
                "evaluation": evaluation(stage["evaluation"], context),
                "cost": cost(stage["cost"], context),
                "cumulative_cost": cost(stage["cumulative_cost"], context),
                "benefit": benefit(stage["benefit"]),
            }
            for stage in snapshot["stages"]
        ],
        "warnings": [
            *LIMITATIONS,
            "Se publica BIOS declarada y contexto técnico, no notas ni nombres privados de etapas.",
            "Proyección pública limitada a la revisión publicada del plan; no certifica compatibilidad.",
            "Revocar impide lecturas posteriores; no elimina copias ya vistas ni respuestas iniciadas.",
        ],
    }
