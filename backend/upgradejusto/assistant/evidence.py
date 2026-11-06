"""Server-side facts collected from already-validated MCP results.

Evidence is built BEFORE the compact projection, from the trusted raw result of a
read-only tool called in this turn. It never stores provider text, model
arguments, history, projected summaries or RAG excerpts as facts. Failed tools,
invalid projections and truncated results are not evidence.

Nothing here decides compatibility: verdicts, missing fields and rules come
verbatim from the deterministic engine.
"""

import copy
import json
import re
import unicodedata
from dataclasses import dataclass
from datetime import date

from pydantic import ValidationError

from .tool_projection import ToolFailure, validated_payload

_EVALUATION_TOOLS = frozenset({"evaluate_pc", "simulate_pc"})
_EVIDENCE_TOOLS = _EVALUATION_TOOLS | {
    "catalog_search",
    "preview_recommendations",
    "search_public_docs",
    "get_pc",
}
_SAFE_ERRORS = (
    ToolFailure,
    ValidationError,
    ValueError,
    TypeError,
    KeyError,
    RecursionError,
    UnicodeError,
)
_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


@dataclass(frozen=True)
class EvaluationEvidence:
    """One engine evaluation of an explicit configuration."""

    tool: str
    pc_id: str | None
    pc_revision: int | None
    configuration: str
    context: str
    verdict: str
    missing_fields: tuple[str, ...]
    rules: tuple[tuple[str, str, tuple[str, ...]], ...]
    component_ids: frozenset[str]


@dataclass(frozen=True)
class OfferEvidence:
    component_id: str | None
    component_name: str | None
    category: str | None
    amount: str | None
    currency: str | None
    source: str | None
    observed_date: str | None
    condition: str | None
    availability: str | None
    stock_quantity: int | None


@dataclass(frozen=True)
class PieceEvidence:
    component_id: str
    name: str | None
    normalized_name: str | None
    category: str | None
    origins: frozenset[str]


@dataclass(frozen=True)
class CitationEvidence:
    source_id: str
    url: str
    title: str
    locator: str


def _text(value):
    return value if isinstance(value, str) and value else None


def _revision(value):
    """`pc_revision` arrives as Text/str from the engine, int in turn context."""
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.isdigit():
        return int(value)
    return None


def _canonical(value):
    return json.dumps(
        value,
        sort_keys=True,
        ensure_ascii=False,
        separators=(",", ":"),
        allow_nan=False,
    )


def _observed_date(value):
    if isinstance(value, str):
        value = value[:10]
        if _DATE.match(value):
            try:
                return date.fromisoformat(value).isoformat()
            except ValueError:
                return None
    return None


def normalize_name(value):
    """Catalog-name comparison only: lower case, no accents, collapsed spaces."""
    if not isinstance(value, str):
        return None
    decomposed = unicodedata.normalize("NFKD", value)
    stripped = "".join(c for c in decomposed if not unicodedata.combining(c))
    collapsed = " ".join(stripped.casefold().split())
    return collapsed or None


def _configuration_components(evaluated):
    """Return (component_id, category, declared_model) from either schema."""
    if not isinstance(evaluated, dict):
        return []
    rows = evaluated.get("components")
    if not isinstance(rows, list):
        rows = evaluated.get("lines")
    if not isinstance(rows, list):
        return []
    components = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        components.append(
            (
                _text(row.get("component_id")),
                _text(row.get("category")),
                _text(row.get("declared_model")),
            )
        )
    return components


def _configuration_fingerprint(evaluated):
    """Canonical evaluated configuration: parts and context, never notes text."""
    value = copy.deepcopy(evaluated)
    context = value.get("context")
    if isinstance(context, dict):
        context.pop("notes", None)
    return _canonical(value)


class TurnEvidence:
    """Evidence of one assistant turn; the snapshot is server-owned context."""

    def __init__(self, snapshot):
        if not isinstance(snapshot, dict):
            snapshot = None
        self.snapshot = snapshot
        self.pc_id = _text(snapshot.get("pc_id")) if snapshot else None
        self.expected_pc_revision = (
            _revision(snapshot.get("expected_pc_revision")) if snapshot else None
        )
        self.objective = _text(snapshot.get("objective")) if snapshot else None
        self.budget_ars = _text(snapshot.get("budget_ars")) if snapshot else None
        self.price_condition = (
            _text(snapshot.get("price_condition")) if snapshot else None
        )
        self.workload = _text(snapshot.get("workload")) if snapshot else None
        self.context = _canonical(
            {
                "objective": self.objective,
                "budget_ars": self.budget_ars,
                "price_condition": self.price_condition,
                "workload": self.workload,
            }
        )
        self.evaluations: list[EvaluationEvidence] = []
        self.offers: list[OfferEvidence] = []
        self.pieces: dict[str, PieceEvidence] = {}
        self.citations: list[CitationEvidence] = []
        if snapshot:
            self._snapshot_pieces()

    # ------------------------------------------------------------------ pieces

    def _piece(self, component_id, name, category, origin):
        component_id = _text(component_id)
        if component_id is None:
            return
        name = _text(name)
        category = _text(category)
        previous = self.pieces.get(component_id)
        origins = {origin}
        if previous is not None:
            name = name or previous.name
            category = category or previous.category
            origins |= previous.origins
        self.pieces[component_id] = PieceEvidence(
            component_id=component_id,
            name=name,
            normalized_name=normalize_name(name),
            category=category,
            origins=frozenset(origins),
        )

    def _snapshot_pieces(self):
        configuration = self.snapshot.get("configuration")
        if not isinstance(configuration, dict):
            return
        selected = self.snapshot.get("selected_components")
        selected = selected if isinstance(selected, dict) else {}
        rows = configuration.get("components")
        if not isinstance(rows, list):
            rows = configuration.get("lines")
        if not isinstance(rows, list):
            return
        for row in rows:
            if not isinstance(row, dict):
                continue
            component_id = _text(row.get("component_id"))
            self._piece(
                component_id,
                _text(selected.get(component_id)) or _text(row.get("declared_model")),
                row.get("category"),
                "pc",
            )

    def _evaluated_pieces(self, evaluated):
        # Declared models have no catalog identity and are not piece evidence.
        for component_id, category, _ in _configuration_components(evaluated):
            self._piece(component_id, None, category, "evaluation")

    # ------------------------------------------------------------------ record

    def record(self, tool_name, args, result):
        """Collect evidence from a successful raw MCP result; never raises.

        `args` is accepted only to mirror the graph call site: model arguments
        are not facts and are deliberately ignored.
        """
        if tool_name not in _EVIDENCE_TOOLS:
            return False
        if getattr(result, "is_error", True):
            return False
        try:
            data = validated_payload(tool_name, result)
        except _SAFE_ERRORS:
            return False
        if not isinstance(data, dict):
            return False
        if tool_name == "catalog_search":
            self._catalog(data)
        elif tool_name in _EVALUATION_TOOLS:
            self._evaluation(data, tool_name, self.pc_id)
        elif tool_name == "preview_recommendations":
            self._preview(data)
        elif tool_name == "search_public_docs":
            self._citations(data)
        elif tool_name == "get_pc":
            self._pc(data)
        else:
            return False
        return True

    def _catalog(self, data):
        items = data.get("items")
        if not isinstance(items, list):
            return
        for component in items:
            if not isinstance(component, dict):
                continue
            component_id = _text(component.get("id"))
            name = _text(component.get("name"))
            category = _text(component.get("category"))
            self._piece(component_id, name, category, "catalog")
            for offer in component.get("offers") or ():
                if isinstance(offer, dict):
                    self._offer(
                        offer,
                        component_id=component_id,
                        component_name=name,
                        category=category,
                    )

    def _pc(self, data):
        components = data.get("components")
        if not isinstance(components, list):
            components = data.get("lines")
        for row in components or ():
            if isinstance(row, dict):
                self._piece(
                    row.get("component_id"),
                    row.get("declared_model"),
                    row.get("category"),
                    "pc",
                )

    def _evaluation(self, data, tool, pc_id):
        evaluated = data.get("evaluated_configuration")
        if not isinstance(evaluated, dict):
            return
        self._evaluated_pieces(evaluated)
        rules = []
        for rule in data.get("rule_results") or ():
            if not isinstance(rule, dict):
                continue
            missing = tuple(
                value
                for value in (rule.get("missing_fields") or ())
                if isinstance(value, str)
            )
            rules.append(
                (
                    _text(rule.get("rule_id")) or "",
                    _text(rule.get("state")) or "",
                    missing,
                )
            )
        missing_fields = tuple(
            value
            for value in (data.get("missing_fields") or ())
            if isinstance(value, str)
        )
        component_ids = frozenset(
            component_id
            for component_id, _, _ in _configuration_components(evaluated)
            if component_id is not None
        )
        self.evaluations.append(
            EvaluationEvidence(
                tool=tool,
                pc_id=pc_id,
                pc_revision=_revision(data.get("pc_revision")),
                configuration=_configuration_fingerprint(evaluated),
                context=self.context,
                verdict=_text(data.get("verdict")) or "",
                missing_fields=missing_fields,
                rules=tuple(rules),
                component_ids=component_ids,
            )
        )

    def _preview(self, data):
        pc_id = _text(data.get("pc_id"))
        items = data.get("items")
        if not isinstance(items, list):
            return
        for item in items:
            if not isinstance(item, dict):
                continue
            evaluation = item.get("evaluation")
            if isinstance(evaluation, dict):
                self._evaluation(evaluation, "preview_recommendations", pc_id)
                evaluated = evaluation.get("evaluated_configuration")
                categories = {
                    component_id: category
                    for component_id, category, _ in _configuration_components(
                        evaluated
                    )
                    if component_id is not None
                }
            else:
                categories = {}
            for offer in item.get("offers") or ():
                if isinstance(offer, dict):
                    component_id = _text(offer.get("component_id"))
                    known = self.pieces.get(component_id)
                    self._offer(
                        offer,
                        component_id=component_id,
                        component_name=known.name if known else None,
                        category=categories.get(component_id),
                    )
            cost = item.get("cost")
            if isinstance(cost, dict):
                self._cost_lines(cost, categories)

    def _cost_lines(self, cost, categories):
        """Legacy preview quotes; tower lines lack source/date and are skipped."""
        lines = cost.get("lines")
        if not isinstance(lines, list):
            return
        for line in lines:
            if not isinstance(line, dict):
                continue
            source = _text(line.get("source"))
            quote_date = _observed_date(line.get("date"))
            amount = _text(line.get("unit_amount"))
            currency = _text(line.get("currency"))
            if source is None or quote_date is None or amount is None:
                continue
            component_id = _text(line.get("component_id"))
            known = self.pieces.get(component_id)
            self._add_offer(
                OfferEvidence(
                    component_id=component_id,
                    component_name=known.name if known else None,
                    category=categories.get(component_id),
                    amount=amount,
                    currency=currency,
                    source=source,
                    observed_date=quote_date,
                    # Server context condition; never inferred when absent.
                    condition=self.price_condition,
                    availability=None,
                    stock_quantity=None,
                )
            )

    def _offer(self, offer, *, component_id, component_name, category):
        stock = offer.get("stock_quantity")
        if isinstance(stock, bool) or not isinstance(stock, int):
            stock = None
        self._add_offer(
            OfferEvidence(
                component_id=component_id,
                component_name=component_name,
                category=category,
                amount=_text(offer.get("amount")),
                currency=_text(offer.get("currency")),
                source=_text(offer.get("store")),
                observed_date=_observed_date(offer.get("observed_at")),
                condition=_text(offer.get("condition")),
                availability=_text(offer.get("availability")),
                stock_quantity=stock,
            )
        )

    def _add_offer(self, offer):
        if offer not in self.offers:
            self.offers.append(offer)

    def _citations(self, data):
        citations = data.get("citations")
        if not isinstance(citations, list):
            return
        for citation in citations:
            if not isinstance(citation, dict):
                continue
            source_id = _text(citation.get("source_id"))
            url = _text(citation.get("url"))
            title = _text(citation.get("title"))
            locator = _text(citation.get("locator"))
            if None in (source_id, url, title, locator):
                continue
            entry = CitationEvidence(
                source_id=source_id,
                url=url,
                title=title,
                locator=locator,
            )
            if entry not in self.citations:
                self.citations.append(entry)
