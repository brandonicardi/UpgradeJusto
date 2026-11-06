"""Pure closed projection; every emitted string has a public or controlled origin."""

from decimal import Decimal

from pydantic import ValidationError

from upgradejusto.compatibility.tower_contract import (
    ESSENTIAL_REQUIRED,
    EssentialScope,
    EssentialScopeV2,
)
from upgradejusto.pcs.service import PCError
from upgradejusto.pcs.tower_models import Tower
from upgradejusto.recommendations.tower_references import benefit
from upgradejusto.retail.technical_validation import validate_technical_binding

from .tower_registry import (
    CATEGORIES,
    ENUMS,
    ESSENTIAL_ORIGIN,
    ESSENTIAL_ORIGIN_V2,
    EXCLUDES,
    FACTS,
    ORIGINS,
    PROJECTION_VERSION,
    RULE_LABELS,
    RULE_LABELS_V2,
    STATE_LABELS,
    VERSIONS,
    money,
    typed_value,
)
from .tower_sources import stamp

FORMS = {"2.5-inch", "3.5-inch", "2242", "2260", "2280", "22110"}
INTERFACES = {"SATA", "M2-NVMe", "M2-SATA"}
PCIE = {"x1", "x4", "x8", "x16"}
PINS = {"3pin", "4pin"}
COOLER_KEYS = {
    "cooler_sockets",
    "cooler_type",
    "cooler_height_mm",
    "fan_count",
    "fan_voltage_mv",
    "fan_current_ma",
    "fan_connector",
    "thermal_compound_required_on_remount",
    "thermal_compound_included",
}
SUMMARY_KEYS = {
    "cpu": {"stock_cooler_included"} | COOLER_KEYS,
    "cooler": COOLER_KEYS,
    "motherboard": {
        "tower_ports",
        "fan_headers",
        "shared_limits",
        "fan_total_current_ma",
    },
    "case": {
        "storage_bays",
        "cooler_height_limit_mm",
        "fan_positions",
        "fan_supported_sizes_mm",
    },
    "storage": {"storage_interface", "storage_form", "sata_power_count"},
    "gpu": {"tower_port_kind", "tower_port_form"},
    "psu": {"sata_power_count"},
    "fan": {"fan_size_mm", "fan_voltage_mv", "fan_current_ma", "fan_connector"},
}
MATERIAL_LABELS = {
    "included": "Incluido en paquete nuevo documentado",
    "available_confirmed": "Disponibilidad declarada explícitamente para esta etapa",
    "priced": "Dependencia cotizada en la revisión histórica",
    "missing": "Disponibilidad o cotización necesaria no acreditada",
}


def require(condition):
    if not condition:
        raise PCError(422, "Tower share projection unavailable")


def integer(value, low=0, high=1000000):
    require(type(value) is int and low <= value <= high)
    return value


def boolean(value, nullable=False):
    require(type(value) is bool or (nullable and value is None))
    return value


class TowerPublicProjection:
    def __init__(self, private, title, sources, revision, published_at):
        self.private, self.title, self.sources = private, title, sources
        self.revision, self.published_at = revision, published_at
        self.parts, self.part_keys, self.lines, self.quotes = [], {}, {}, {}
        self.withheld = 0
        require(
            private.get("kind") == "tower_plan" and private.get("schema_version") == 2
        )
        versions = private.get("versions", {})
        self.origin = next(
            (
                origin
                for origin in ORIGINS
                if all(versions.get(k) == v for k, v in origin.items())
            ),
            None,
        )
        require(self.origin is not None)
        essential = self.origin in (ESSENTIAL_ORIGIN, ESSENTIAL_ORIGIN_V2)
        self.rule_ids = list(ESSENTIAL_REQUIRED if essential else RULE_LABELS)
        if self.origin is ESSENTIAL_ORIGIN_V2:
            scope = EssentialScopeV2()
        elif self.origin is ESSENTIAL_ORIGIN:
            scope = EssentialScope()
        else:
            scope = None
        # Each contract keeps its own labels and declared exclusions.
        self.rule_labels = (
            RULE_LABELS_V2 if self.origin is ESSENTIAL_ORIGIN_V2 else RULE_LABELS
        )
        self.excludes = scope.excludes if scope else EXCLUDES
        self.scope_label = (
            scope.label
            if scope
            else "Torre stock: asignación nominal, no certificación física"
        )
        require(private["versions"].get("catalog") == sources.version)
        require(private.get("objective") in ("general", "gaming", "productivity"))
        require(private.get("workload") in (None, "blender-cpu"))
        require(private.get("price_condition") in ("cash", "list"))
        require(1 <= len(private.get("stages", [])) <= 12)
        require(sum(len(s.get("actions", [])) for s in private["stages"]) <= 96)
        self.base = self.configuration(private["base_configuration"])

    def reserve(self, count=1):
        self.withheld += count

    def extra(self, data, allowed):
        self.reserve(len(set(data) - set(allowed)))

    def local_line(self, identity):
        require(type(identity) is str and 1 <= len(identity) <= 200)
        if identity not in self.lines:
            self.lines[identity] = "l" + str(len(self.lines) + 1)
        return self.lines[identity]

    def summary(self, component):
        raw = component.attributes.get("tower_stock_v1")
        if raw is None:
            return {}
        try:
            envelope = validate_technical_binding(
                raw, component.id, component.model_dump(mode="json"), self.sources.rows
            )
        except (ValueError, KeyError, TypeError):
            self.reserve()
            return {}
        data, result = envelope.data, {}
        ids, groups = {}, {}
        for key in ("tower_ports", "storage_bays", "fan_headers"):
            for item in data.get(key, []):
                ids[item.resource_id] = "R" + str(len(ids) + 1)
        for item in data.get("shared_limits", []):
            groups[item.group] = "G" + str(len(groups) + 1)
        for key, value in data.items():
            refs = envelope.fields.get(key, ())
            if (
                key not in SUMMARY_KEYS.get(component.category.value, ())
                or not refs
                or not all(
                    self.sources.reference(ref.model_dump(mode="json"), component)
                    for ref in refs
                )
            ):
                self.reserve()
                continue
            if key in ("tower_ports", "storage_bays", "fan_headers"):
                public = []
                for item in value:
                    allowed_kind = (
                        {"fan"}
                        if key == "fan_headers"
                        else {"storage-bay"}
                        if key == "storage_bays"
                        else INTERFACES | {"PCIe"}
                    )
                    allowed_forms = (
                        PINS
                        if key == "fan_headers"
                        else PCIE
                        if item.kind == "PCIe"
                        else FORMS
                    )
                    if (
                        item.kind not in allowed_kind
                        or set(item.accepts) - allowed_forms
                        or any(v not in ids for v in item.excludes)
                        or (item.group is not None and item.group not in groups)
                    ):
                        self.reserve()
                        continue
                    public.append(
                        {
                            "ref": ids[item.resource_id],
                            "kind": item.kind,
                            "accepts": list(item.accepts),
                            "group": groups.get(item.group),
                            "excludes": [ids[v] for v in item.excludes],
                            "voltage_mv": item.voltage_mv,
                            "max_current_ma": item.max_current_ma,
                            "cost": item.cost,
                        }
                    )
                result[key] = public
            elif key == "shared_limits":
                result[key] = [
                    {"group": groups[v.group], "capacity": v.capacity} for v in value
                ]
            elif key == "cooler_sockets":
                if set(value) <= ENUMS["socket"]:
                    result[key] = list(value)
                else:
                    self.reserve()
            elif key in (
                "storage_interface",
                "storage_form",
                "cooler_type",
                "fan_connector",
                "tower_port_kind",
                "tower_port_form",
            ):
                allowed = {
                    "storage_interface": INTERFACES,
                    "storage_form": FORMS,
                    "cooler_type": {"air", "liquid", "passive"},
                    "fan_connector": PINS,
                    "tower_port_kind": {"PCIe"},
                    "tower_port_form": PCIE,
                }[key]
                if type(value) is str and value in allowed:
                    result[key] = value
                else:
                    self.reserve()
            elif type(value) is bool:
                result[key] = value
            elif type(value) is int and 0 <= value <= 1000000000:
                result[key] = value
            elif type(value) is list and all(
                type(v) is int and 1 <= v <= 1000000000 for v in value
            ):
                result[key] = list(value)
            else:
                self.reserve()
        return result

    def component(self, category, component_id=None, declared=None):
        require(category in CATEGORIES)
        require((component_id is None) != (declared is None))
        require(type(component_id if component_id is not None else declared) is str)
        key = (category, component_id, declared)
        if key in self.part_keys:
            return self.part_keys[key]
        ref = "p" + str(len(self.parts) + 1)
        part = self.sources.catalog.get(component_id)
        references = (
            self.sources.component_references(part)
            if part and part.category == category
            else []
        )
        public = {
            "ref": ref,
            "category": category,
            "name": CATEGORIES[category] + " no identificada",
            "image": None,
            "references": [],
            "evidence_summary": {},
        }
        if references:
            public.update(
                name=CATEGORIES[category] + " con evidencia publicada",
                references=references,
                image=self.sources.photo(part),
                evidence_summary=self.summary(part),
            )
            if public["image"]:
                public["image"]["alt"] = CATEGORIES[category]
        else:
            self.reserve()
        self.part_keys[key] = ref
        self.parts.append(public)
        return ref

    def configuration(self, config):
        require(type(config) is dict and config.get("schema_version") == 2)
        states = config.get("category_status", {})
        require(
            set(states) == set(CATEGORIES)
            and all(v in ("present", "absent", "unknown") for v in states.values())
        )
        lines = config.get("lines", [])
        require(type(lines) is list and len(lines) <= 36)
        result = []
        for line in lines:
            self.extra(
                line,
                ("line_id", "category", "component_id", "declared_model", "quantity"),
            )
            category = line.get("category")
            result.append(
                {
                    "line_ref": self.local_line(line.get("line_id")),
                    "category": category,
                    "component_ref": self.component(
                        category, line.get("component_id"), line.get("declared_model")
                    ),
                    "quantity": integer(line.get("quantity"), 1, 32),
                }
            )
        # Context/name/id/revision are deliberately private, not copied/cleaned.
        self.extra(
            config,
            (
                "schema_version",
                "category_status",
                "lines",
                "id",
                "revision",
                "origin_schema",
                "name",
                "context",
            ),
        )
        return {
            "schema_version": 2,
            "category_status": {k: states[k] for k in CATEGORIES},
            "lines": result,
        }

    def actions(self, actions):
        require(type(actions) is list and 1 <= len(actions) <= 36)
        result = []
        for action in actions:
            self.extra(
                action,
                ("action", "category", "line_id", "candidates", "candidate_context"),
            )
            require(
                action.get("action")
                in ("replace_category", "replace_line", "add_line", "remove_line")
            )
            require(action.get("category") in CATEGORIES)
            candidates = action.get("candidates", [])
            require(type(candidates) is list and len(candidates) <= 36)
            public = {
                "action": action["action"],
                "category": action["category"],
                "candidates": [],
            }
            if action.get("line_id") is not None:
                public["line_ref"] = self.local_line(action["line_id"])
            for candidate in candidates:
                self.extra(candidate, ("component_id", "declared_model", "quantity"))
                public["candidates"].append(
                    {
                        "component_ref": self.component(
                            action["category"],
                            candidate.get("component_id"),
                            candidate.get("declared_model"),
                        ),
                        "quantity": integer(candidate.get("quantity"), 1, 32),
                    }
                )
            if action.get("candidate_context") is not None:
                public["bios_context"] = "BIOS declarada no publicada"
                self.reserve()
            result.append(public)
        return result

    def references(self, refs):
        result = []
        require(type(refs) is list)
        for ref in refs:
            if type(ref) is not dict:
                self.reserve()
                continue
            self.extra(ref, ("source_id", "url", "consulted_on", "locator"))
            public = self.sources.reference(ref)
            if public is None:
                self.reserve()
            elif public not in result:
                result.append(public)
        return result

    def facts(self, family, facts, config, refs):
        result = []
        require(type(facts) is list)
        for fact in facts:
            spec = FACTS.get(family, {}).get(fact.get("name"))
            self.extra(fact, ("name", "value", "unit"))
            if spec is None:
                self.reserve()
                continue
            kind, category, field = spec
            selected = []
            if category:
                cat, _, index = category.partition(":")
                selected = [
                    line
                    for line in config.get("lines", [])
                    if line.get("category") == cat
                ]
                selected = (
                    selected[int(index) - 1 : int(index)] if index else selected[:1]
                )
            if kind == "model":
                if selected:
                    line = selected[0]
                    result.append(
                        {
                            "name": fact["name"],
                            "component_ref": self.component(
                                category,
                                line.get("component_id"),
                                line.get("declared_model"),
                            ),
                        }
                    )
                else:
                    self.reserve()
                continue
            value = fact.get("value")
            if field:
                bound, published = (
                    self.sources.bound_field(selected[0].get("component_id"), field)
                    if selected
                    else (False, None)
                )
                expected = (
                    ",".join(map(str, published))
                    if type(published) is list
                    else published
                )
                if (
                    not bound
                    or type(value) is not type(expected)
                    or value != expected
                    or not typed_value(kind, published)
                ):
                    self.reserve()
                    continue
                value = published
            elif not refs or not typed_value(kind, value):
                self.reserve()
                continue
            public = {"name": fact["name"], "value": value}
            if fact["name"].endswith("_mm"):
                public["unit"] = "mm"
            elif fact["name"].endswith("_w"):
                public["unit"] = "W"
            result.append(public)
        return result

    def evaluation(self, data, configuration):
        require(
            type(data) is dict and data.get("rules_version") == self.origin["rules"]
        )
        self.extra(
            data,
            (
                "verdict",
                "rule_results",
                "missing_fields",
                "rules_version",
                "data_revision",
                "pc_revision",
                "scope",
                "coverage",
                "additional_checks",
                "warnings",
                "evaluated_configuration",
            ),
        )
        rules = data.get("rule_results", [])
        require([r.get("rule_id") for r in rules] == self.rule_ids)
        require(
            all(
                r.get("family") == r["rule_id"] and r.get("state") in STATE_LABELS
                for r in rules
            )
        )
        coverage = data.get("coverage", {})
        keys = (
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
        require(set(coverage) == set(keys))
        for key in keys[:-1]:
            require(
                type(coverage[key]) is list
                and all(v in self.rule_labels for v in coverage[key])
            )
        require(coverage["required"] == self.rule_ids)
        for state, key in (
            ("pass", "passed"),
            ("fail", "failed"),
            ("unknown", "unknown"),
            ("not_applicable", "not_applicable"),
        ):
            require(
                coverage[key] == [r["rule_id"] for r in rules if r["state"] == state]
            )
        not_applicable = [
            rule for rule in rules if rule.get("state") == "not_applicable"
        ]
        if self.origin is ESSENTIAL_ORIGIN_V2:
            # Policy 2 permits n/a only for the physical checks that can be
            # honestly disclosed as unmeasured, and only with a reason.
            require(
                all(
                    rule["rule_id"] in ("T04", "T07", "T08")
                    and bool(rule.get("conditions"))
                    for rule in not_applicable
                )
            )
            # Policy 2 counts only pass/fail as evaluated; n/a is explicit.
            require(
                coverage["evaluated"]
                == [r["rule_id"] for r in rules if r["state"] in ("pass", "fail")]
            )
        else:
            # Stock and essential v1 never carry not_applicable.
            require(not not_applicable)
        require(
            data.get("verdict")
            in ("compatible", "incompatible", "requiere_verificacion")
        )
        boolean(coverage["complete"])
        scope = data.get("scope", {})
        require(
            scope.get("id") == self.origin["scope"]
            and scope.get("policy_version") == self.origin["policy"]
            and scope.get("inventory_version") == self.origin["inventory"]
        )
        public_rules = []
        for rule in rules:
            self.extra(
                rule,
                (
                    "rule_id",
                    "family",
                    "state",
                    "facts",
                    "evidence",
                    "conditions",
                    "missing_fields",
                ),
            )
            refs = self.references(rule.get("evidence", []))
            # Unknown/private prose is never reflected; controlled rule/state
            # reasons replace it, with explicit public-evidence incompleteness.
            self.reserve(len(rule.get("conditions", [])))
            missing = len(rule.get("missing_fields", []))
            public_rules.append(
                {
                    "rule_id": rule["rule_id"],
                    "family": rule["rule_id"],
                    "state": rule["state"],
                    "reason": self.rule_labels[rule["rule_id"]]
                    + ": "
                    + STATE_LABELS[rule["state"]],
                    "facts": self.facts(
                        rule["rule_id"], rule.get("facts", []), configuration, refs
                    ),
                    "references": refs,
                    "missing_fields": [
                        {
                            "code": "required_fact_missing",
                            "rule_id": rule["rule_id"],
                            "count": missing,
                        }
                    ]
                    if missing
                    else [],
                }
            )
        self.reserve()  # Composite private data_revision is reserved; public tuple retained.
        if any(w not in self.excludes for w in data.get("warnings", [])):
            self.reserve()
        self.reserve(len(data.get("additional_checks", [])))
        return {
            "verdict": data["verdict"],
            "rules_version": self.origin["rules"],
            "coverage": {key: coverage[key] for key in keys},
            "rule_results": public_rules,
            "scope": {
                "id": self.origin["scope"],
                "policy_version": self.origin["policy"],
                "inventory_version": self.origin["inventory"],
                "operating_regime": "stock_no_oc",
                "label": self.scope_label,
                "excludes": list(self.excludes),
            },
            "missing_fields": [
                {
                    "code": "required_fact_missing",
                    "count": len(data.get("missing_fields", [])),
                }
            ]
            if data.get("missing_fields")
            else [],
            "evaluated_configuration": self.configuration(
                data["evaluated_configuration"]
            ),
        }

    def offers(self, values):
        result = []
        for value in values:
            public = self.sources.quote(value)
            identity = value["component_id"]
            part = self.sources.catalog[identity]
            ref = self.component(part.category.value, identity)
            key = value["offer_id"]
            if key not in self.quotes:
                self.quotes[key] = {
                    **public,
                    "quote_ref": "q" + str(len(self.quotes) + 1),
                    "component_ref": ref,
                }
            result.append(self.quotes[key])
        return result

    def cost(self, data):
        self.extra(
            data,
            (
                "total_ars",
                "known_subtotal_ars",
                "within_budget",
                "lines",
                "missing_fields",
                "excluded",
            ),
        )
        subtotal = Decimal(0)
        lines = []
        for line in data.get("lines", []):
            self.extra(
                line,
                (
                    "component_id",
                    "quantity",
                    "unit_amount_ars",
                    "amount_ars",
                    "offer_id",
                ),
            )
            quote = self.quotes.get(line.get("offer_id"))
            if quote is None:
                raise PCError(409, "Historical offer binding unavailable")
            part = self.sources.catalog.get(line.get("component_id"))
            require(
                part is not None
                and self.component(part.category.value, part.id)
                == quote["component_ref"]
            )
            qty = integer(line.get("quantity"), 1)
            unit, amount = (
                money(line.get("unit_amount_ars")),
                money(line.get("amount_ars")),
            )
            require(unit == quote["amount"] and Decimal(unit) * qty == Decimal(amount))
            subtotal += Decimal(amount)
            lines.append(
                {
                    "component_ref": quote["component_ref"],
                    "quote_ref": quote["quote_ref"],
                    "quantity": qty,
                    "unit_amount_ars": unit,
                    "amount_ars": amount,
                }
            )
        known, total = (
            money(data.get("known_subtotal_ars")),
            money(data.get("total_ars"), True),
        )
        require(
            Decimal(known) == subtotal and (total is None or Decimal(total) == subtotal)
        )
        missing = len(data.get("missing_fields", []))
        return {
            "total_ars": total,
            "known_subtotal_ars": known,
            "within_budget": boolean(data.get("within_budget"), True),
            "lines": lines,
            "missing_fields": [{"code": "quote_unresolved", "count": missing}]
            if missing
            else [],
            "excluded": ["shipping", "financing", "labor"],
        }

    def _benefit_configuration(self, configuration):
        """Private calculation input, built closed; never a public DTO.

        Benefit uses only category presence, catalog selections and quantities.
        Keep server IDs internally for strict Tower validation, not private prose
        or future fields. No mutation, dynamic key discovery or extra-ignore DTO.
        """
        require(type(configuration) is dict)
        lines = configuration.get("lines")
        states = configuration.get("category_status")
        require(type(lines) is list and len(lines) <= 36)
        require(type(states) is dict and set(states) == set(CATEGORIES))
        selected = []
        for line in lines:
            require(type(line) is dict)
            component_id = line.get("component_id")
            declared = line.get("declared_model")
            require((component_id is None) != (declared is None))
            if declared is not None:
                require(type(declared) is str and bool(declared.strip()))
            selected.append(
                {
                    "line_id": line.get("line_id"),
                    "category": line.get("category"),
                    "component_id": component_id,
                    "declared_model": (
                        "Componente declarado sin identificar"
                        if declared is not None
                        else None
                    ),
                    "quantity": line.get("quantity"),
                }
            )
        try:
            clean = Tower.model_validate(
                {
                    "schema_version": configuration.get("schema_version"),
                    "id": configuration.get("id"),
                    "revision": configuration.get("revision"),
                    "origin_schema": configuration.get("origin_schema"),
                    "name": "Configuración interna para referencia de beneficio",
                    "category_status": {
                        category: states[category] for category in CATEGORIES
                    },
                    "lines": selected,
                    "context": {"bios_version": None, "notes": None},
                }
            )
        except ValidationError:
            raise PCError(422, "Tower share projection unavailable") from None
        for line in clean.lines:
            if line.component_id is not None:
                published = self.sources.catalog.get(line.component_id)
                if published is None or published.category != line.category:
                    return None
        return clean

    def gain(self, data, before, after):
        status = data.get("status")
        require(status in ("supported", "unknown", "not_an_improvement"))
        result = {
            "status": status,
            "before": None,
            "after": None,
            "source": [],
            "label": "Referencia técnica; no FPS ni rendimiento garantizado",
        }
        if status != "supported":
            return result
        clean_before = self._benefit_configuration(before)
        clean_after = self._benefit_configuration(after)
        if clean_before is None or clean_after is None:
            self.reserve()
            return {**result, "status": "unknown"}
        rebuilt = benefit(
            clean_before,
            clean_after,
            self.sources.catalog,
            self.private["objective"],
            self.private["workload"],
        )
        refs = []
        for source in rebuilt.get("source", []):
            # Find the independently published complete source row, never metadata
            # or URLs from private benefit.source. Missing registry binding reserves.
            candidates = [
                row
                for row in self.sources.rows
                if row.get("url") == source.get("source_url")
            ]
            linked = (
                self.sources.reference(candidates[0]) if len(candidates) == 1 else None
            )
            if linked is not None:
                refs.append(linked)
        if (
            rebuilt.get("status") != "supported"
            or not refs
            or rebuilt.get("before") != data.get("before")
            or rebuilt.get("after") != data.get("after")
        ):
            self.reserve()
            return {**result, "status": "unknown"}
        return {
            **result,
            "before": rebuilt["before"],
            "after": rebuilt["after"],
            "source": refs,
        }

    def dependencies(self, values):
        result = []
        for value in values:
            kind, state = value.get("kind"), value.get("state")
            require(
                kind in set(CATEGORIES) | {"thermal_compound"}
                and state in MATERIAL_LABELS
            )
            required = boolean(value.get("required"))
            # Private component/offer IDs/reasons/source strings never flow through.
            refs = self.references(
                [r for r in value.get("source_refs", []) if type(r) is dict]
            )
            self.reserve(sum(type(r) is not dict for r in value.get("source_refs", [])))
            reason = (
                MATERIAL_LABELS[state]
                if kind == "thermal_compound"
                else CATEGORIES[kind] + ": acción adicional; coste completo obligatorio"
            )
            if kind == "thermal_compound":
                reason += ". Si se reutiliza el cooler stock; la instalación real no está identificada"
            result.append(
                {
                    "kind": kind,
                    "required": required,
                    "state": state,
                    "amount_ars": money(value.get("amount_ars"), True),
                    "reason": reason,
                    "references": refs,
                }
            )
        return result

    def stages(self):
        before = self.private["base_configuration"]
        for position, stage in enumerate(self.private["stages"], 1):
            self.extra(
                stage,
                (
                    "position",
                    "name",
                    "budget_ars",
                    "actions",
                    "materials",
                    "evaluated_configuration",
                    "evaluation",
                    "benefit",
                    "dependencies",
                    "offers",
                    "cost",
                    "cumulative_cost",
                    "status",
                    "missing_fields",
                    "warnings",
                ),
            )
            require(
                stage.get("position") == position
                and stage.get("status") in ("ready", "blocked", "requires_verification")
            )
            after = stage["evaluated_configuration"]
            configured = self.configuration(after)
            evaluation = self.evaluation(stage["evaluation"], after)
            offers = self.offers(stage.get("offers", []))
            gain = self.gain(stage["benefit"], before, after)
            materials = []
            for material in stage.get("materials", []):
                require(
                    material.get("kind") == "thermal_compound"
                    and material.get("state") == "available_confirmed"
                    and material.get("confirmed") is True
                )
                materials.append(
                    {
                        "kind": "thermal_compound",
                        "state": "available_confirmed",
                        "confirmed": True,
                    }
                )
            yield {
                "position": position,
                "name": f"Etapa{position}",
                "budget_ars": money(stage["budget_ars"]),
                "actions": self.actions(stage["actions"]),
                "materials": materials,
                "evaluated_configuration": configured,
                "evaluation": evaluation,
                "benefit": gain,
                "offers": offers,
                "dependencies": self.dependencies(stage.get("dependencies", [])),
                "cost": self.cost(stage["cost"]),
                "cumulative_cost": self.cost(stage["cumulative_cost"]),
                "status": "blocked"
                if stage["status"] == "blocked"
                or evaluation["verdict"] == "incompatible"
                or any(rule["state"] == "fail" for rule in evaluation["rule_results"])
                else "requires_verification"
                if self.withheld
                or evaluation["verdict"] != "compatible"
                or not evaluation["coverage"]["complete"]
                else stage["status"],
                "missing_fields": [
                    {
                        "code": "required_fact_missing",
                        "count": len(stage.get("missing_fields", [])),
                    }
                ]
                if stage.get("missing_fields")
                else [],
                "warnings": ["Alcance nominal; verificar detalles técnicos reservados"],
            }
            before = after

    def finish(self, stages):
        self.extra(
            self.private,
            (
                "kind",
                "schema_version",
                "name",
                "generated_at",
                "pc_revision",
                "base_configuration",
                "objective",
                "workload",
                "budget_ars",
                "currency",
                "price_condition",
                "versions",
                "stages",
                "cost",
                "benefit",
                "status",
                "label",
                "missing_fields",
                "limitations",
            ),
        )
        gain = self.gain(
            self.private["benefit"],
            self.private["base_configuration"],
            self.private["stages"][-1]["evaluated_configuration"],
        )
        cost = self.cost(self.private["cost"])
        status = self.private.get("status")
        require(status in ("ready", "blocked", "requires_verification"))
        failed = status == "blocked" or any(
            s["evaluation"]["verdict"] == "incompatible"
            or any(r["state"] == "fail" for r in s["evaluation"]["rule_results"])
            for s in stages
        )
        if failed:
            status = "blocked"
        elif self.withheld or gain["status"] != "supported":
            status = "requires_verification"
        return {
            "kind": "shared_tower_plan",
            "schema_version": 2,
            "title": self.title,
            "plan_revision": self.revision,
            "published_at": self.published_at.isoformat(),
            "generated_at": stamp(self.private["generated_at"]),
            "objective": self.private["objective"],
            "workload": self.private["workload"],
            "budget_ars": money(self.private["budget_ars"]),
            "currency": "ARS",
            "price_condition": self.private["price_condition"],
            "versions": {
                **self.origin,
                "catalog": self.sources.version,
                **VERSIONS,
                "projection": PROJECTION_VERSION,
            },
            "components": self.parts,
            "references": self.sources.public_refs,
            "base_configuration": self.base,
            "stages": stages,
            "cost": cost,
            "benefit": gain,
            "status": status,
            "projection": {
                "version": PROJECTION_VERSION,
                "evidence_complete": self.withheld == 0,
                "withheld_details": self.withheld,
            },
            "missing_fields": [
                {"code": "public_evidence_withheld", "count": self.withheld}
            ]
            if self.withheld
            else [],
            "warnings": [
                "Cotización histórica; sin garantía de precio o stock actual",
                "Proyección de revisión fija; no certifica instalación ni compatibilidad física",
                "Revocar no elimina copias ya vistas ni respuestas iniciadas",
            ],
        }
