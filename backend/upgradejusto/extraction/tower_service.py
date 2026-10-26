"""Server-owned extraction boundary: validate observations, no preview writes."""

import re

from pydantic import ValidationError

from upgradejusto.catalog.models import Category
from upgradejusto.extraction.tower_models import (
    TowerCategoryEvidence,
    TowerExtractResponse,
    TowerLineEvidence,
    TowerProviderProposal,
)
from upgradejusto.pcs.service import PCError
from upgradejusto.pcs.tower_models import SINGLE_CATEGORIES, TowerCreate, TowerLine

NEGATIVE_NAMES = {
    "cpu": ("cpu", "procesador"),
    "motherboard": ("motherboard", "placa madre"),
    "ram": ("ram", "memoria ram"),
    "gpu": ("gpu", "tarjeta gráfica"),
    "psu": ("psu", "fuente"),
    "case": ("case", "gabinete"),
    "storage": ("storage", "almacenamiento", "discos"),
    "cooler": ("cooler", "disipador"),
    "fan": ("fan", "fans", "ventiladores"),
}
INSTRUCTIONS = re.compile(
    r"https?://|\b(?:ignore|ignora|ejecuta|execute|delete|select|insert|update|"
    r"system|assistant|password|contraseña|owner_id|user_id)\b|[<>\r\n\x00]",
    re.IGNORECASE,
)


def invalid():
    raise PCError(502, "Invalid tower extraction evidence")


def literal_label(label, excerpt, text):
    if (
        not label
        or not label.strip()
        or INSTRUCTIONS.search(label)
        or excerpt not in text
    ):
        invalid()
    # Require a literal full label; return only that hardware fragment, not notes.
    match = re.search(rf"(?<!\w){re.escape(label)}(?!\w)", excerpt, re.IGNORECASE)
    if match is None:
        invalid()
    return match.group(0)


def _windows(quote, text):
    return tuple(match.span() for match in re.finditer(re.escape(quote), text))


def _whole_label(text, label_span, proof_start, category):
    """Only explicit record separators terminate a hardware label, not word edges.

    Unsupported prose/variant affixes are reviewable, never silently trimmed.
    This grammar recognizes framing, not hardware synonyms or variant suffixes.
    """
    start, end = label_span
    left = max(text.rfind(";", 0, start), text.rfind("\n", 0, start)) + 1
    ends = (text.find(separator, end) for separator in (";", "\n"))
    right = min((position for position in ends if position >= 0), default=len(text))
    names = "|".join(re.escape(name) for name in NEGATIVE_NAMES[category.value])
    framing = (
        rf"\s*(?:[-*•]\s*)?(?:(?:tengo|mi pc tiene)\s+)?"
        rf"(?:(?:{names})\s*:\s*)?"
    )
    return bool(
        re.fullmatch(framing, text[left:proof_start], re.IGNORECASE)
        and re.fullmatch(r"\s*\.?\s*", text[end:right])
    )


def _review(line):
    line.resolution = "needs_review"
    line.component_id = None
    line.quantity = None
    line.quantity_excerpt = None


def _assign_occurrences(records):
    """Bipartite assignment of original label spans, never excerpt-string identity."""
    owners = {}

    def assign(index, visited):
        for span in records[index][1]:
            if span in visited:
                continue
            visited.add(span)
            if span not in owners or assign(owners[span], visited):
                owners[span] = index
                return True
        return False

    affected = {index for index in range(len(records)) if not assign(index, set())}
    chosen = sorted(owners.items())
    for position, (span, index) in enumerate(chosen):
        for other_span, other_index in chosen[position + 1 :]:
            if other_span[0] >= span[1]:
                break
            affected.update((index, other_index))
    # An unmatched observation taints the whole connected evidence component,
    # not just whichever observation happened to be assigned last.
    while True:
        bad_spans = {span for index in affected for span in records[index][1]}
        expanded = affected | {
            index
            for index, (_, spans) in enumerate(records)
            if any(
                start < bad_end and bad_start < end
                for start, end in spans
                for bad_start, bad_end in bad_spans
            )
        }
        if expanded == affected:
            break
        affected = expanded
    for index in affected:
        _review(records[index][0])


def normalize_line(observation, category, text, parts):
    if observation.excerpt not in text:
        invalid()
    if len(set(observation.candidate_ids)) != len(observation.candidate_ids):
        invalid()
    indexed = {part.id: part for part in parts}
    if any(
        identity not in indexed or indexed[identity].category != category
        for identity in observation.candidate_ids
    ):
        invalid()
    component_id, declared = observation.component_id, observation.declared_model
    if component_id is not None and declared is not None:
        invalid()
    resolution = "needs_review"
    excerpt = None
    if component_id is not None:
        selected = indexed.get(component_id)
        if selected is None or selected.category != category:
            invalid()
        excerpt = literal_label(selected.name, observation.excerpt, text)
        exact = [
            part.id
            for part in parts
            if part.category == category
            and re.search(
                rf"(?<!\w){re.escape(part.name)}(?!\w)",
                observation.excerpt,
                re.IGNORECASE,
            )
            and (
                part.name.casefold() == selected.name.casefold()
                or not re.search(
                    rf"(?<!\w){re.escape(part.name)}(?!\w)",
                    selected.name,
                    re.IGNORECASE,
                )
            )
        ]
        if exact != [component_id] or observation.candidate_ids != [component_id]:
            invalid()
        resolution = "catalog"
    elif declared is not None:
        excerpt = literal_label(declared, observation.excerpt, text)
        if observation.candidate_ids:
            resolution = "needs_review"
        else:
            resolution = "declared"
    else:
        # No safe literal label to echo from an arbitrary report or instruction.
        return None, ()
    quantity = observation.quantity
    quantity_excerpt = None
    excerpt_windows = _windows(observation.excerpt, text)
    label_pattern = rf"(?P<label>(?<!\w){re.escape(excerpt)}(?!\w))"
    pattern = label_pattern
    source_windows = None
    if category not in SINGLE_CATEGORIES and quantity is not None:
        source = observation.quantity_excerpt
        if (
            source is None
            or source not in text
            or excerpt.casefold() not in source.casefold()
        ):
            invalid()
        count_pattern = (
            rf"(?P<count>(?<![\w.,+\-]){quantity}\s*(?:[x×]|m[oó]dulos?\b|discos?\b|"
            rf"ventiladores?\b|fans?\b))"
        )
        pattern = rf"{count_pattern}\s*(?:de\s+)?{label_pattern}"
        match = re.search(pattern, source, re.IGNORECASE)
        if match is None:
            if re.search(count_pattern, source, re.IGNORECASE) is None:
                invalid()
            # An intervening unknown model prefix is not a base-model selection.
            # Preserve no physical count when its association cannot be proved.
            quantity = None
            resolution = "needs_review"
            pattern = label_pattern
        else:
            quantity_excerpt = match.group("count")
            if len(quantity_excerpt) > 120:
                invalid()
            source_windows = _windows(source, text)
    elif category in SINGLE_CATEGORIES and quantity not in (None, 1):
        invalid()
    if quantity is None:
        resolution = "needs_review"
    spans = tuple(
        match.span("label")
        for match in re.finditer(pattern, text, re.IGNORECASE)
        if any(
            left <= match.start("label") and match.end("label") <= right
            for left, right in excerpt_windows
        )
        and (
            source_windows is None
            or any(
                left <= match.start() and match.end() <= right
                for left, right in source_windows
            )
        )
        and _whole_label(text, match.span("label"), match.start(), category)
    )
    line = TowerLineEvidence(
        proposal_line_index=None,
        component_id=component_id,
        declared_model=declared,
        quantity=quantity,
        excerpt=excerpt,
        quantity_excerpt=quantity_excerpt,
        candidate_ids=observation.candidate_ids,
        resolution=resolution,
    )
    if not spans:
        _review(line)
    return line, spans


def normalize_proposal(raw, text, parts, revision):
    try:
        raw = TowerProviderProposal.model_validate(raw)
    except (ValidationError, ValueError, TypeError):
        invalid()
    categories = {item.category: item for item in raw.categories}
    if len(categories) != 9 or set(categories) != set(Category):
        invalid()
    if sum(len(item.lines) for item in raw.categories) > 36:
        invalid()
    states, lines, evidence, missing, records = {}, [], [], [], []
    for category in Category:
        observed = categories[category]
        if observed.status != "present" and observed.lines:
            invalid()
        if observed.status == "present" and not observed.lines:
            invalid()
        absence = observed.absence_excerpt
        if observed.status == "absent":
            names = "|".join(re.escape(name) for name in NEGATIVE_NAMES[category.value])
            if (
                absence is None
                or absence not in text
                or not re.fullmatch(
                    rf"(?:sin|no tengo) (?:{names})", absence, re.IGNORECASE
                )
            ):
                invalid()
        elif absence is not None:
            invalid()
        normalized_pairs = [
            normalize_line(item, category, text, parts) for item in observed.lines
        ]
        normalized = [item for item, _ in normalized_pairs if item is not None]
        status = (
            "unknown"
            if any(item is None for item, _ in normalized_pairs)
            else observed.status
        )
        entry = TowerCategoryEvidence(
            category=category,
            status=status,
            absence_excerpt=absence,
            lines=normalized,
        )
        evidence.append(entry)
        span_sets = [spans for item, spans in normalized_pairs if item is not None]
        records.extend(
            (item, spans)
            for item, spans in zip(entry.lines, span_sets, strict=True)
            if item.resolution != "needs_review"
        )
    _assign_occurrences(records)
    for entry in evidence:
        if any(item.resolution == "needs_review" for item in entry.lines):
            entry.status = "unknown"
        if entry.status == "unknown":
            missing.append(entry.category.value + ".review_identity_presence_quantity")
        if entry.status == "present":
            for item in entry.lines:
                item.proposal_line_index = len(lines)
                lines.append(
                    TowerLine(
                        category=entry.category,
                        component_id=item.component_id,
                        declared_model=item.declared_model,
                        quantity=item.quantity,
                    )
                )
        states[entry.category] = entry.status
    try:
        proposal = TowerCreate(
            schema_version=2,
            name="Torre extraída",
            category_status=states,
            lines=lines,
            context={"bios_version": None, "notes": None},
        )
    except ValidationError:
        invalid()
    return TowerExtractResponse(
        proposal=proposal,
        evidence=evidence,
        missing_fields=missing,
        warnings=[
            "Propuesta no guardada: revisar identidades, cantidades y ausencias antes de confirmar.",
            "Etiquetas y ofertas no son atributos técnicos ni un veredicto de compatibilidad.",
            "BIOS instalada desconocida; no se infiere del modelo ni del texto libre.",
        ],
        catalog_revision=revision,
    )


class TowerExtractionService:
    def __init__(self, towers, provider, budget):
        self.towers, self.provider, self.budget = towers, provider, budget

    async def preview(self, data, owner):
        parts = self.towers.catalog.snapshot()
        revision = self.towers.catalog.repository.dataset_version
        # Same PG admission/lease service as assistant and legacy extraction.
        async with self.budget.execution(owner):
            raw = await self.provider.extract(data.text, parts)
        return normalize_proposal(raw, data.text, parts, revision)

    def confirm(self, owner, data):
        if data.confirmed is not True:
            raise PCError(422, "Explicit confirmation required")
        if data.catalog_revision != self.towers.catalog.repository.dataset_version:
            raise PCError(409, "Catalog revision conflict; review selection")
        if any(line.line_id is not None for line in data.proposal.lines):
            raise PCError(422, "New tower requires server line identities")
        return self.towers.create(owner, data.proposal)
