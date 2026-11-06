"""Deterministic factual validation of the visible assistant candidate.

The model drafts natural text; this module decides, paragraph by paragraph,
whether every high-risk token in that text is covered by an exact tuple from
this turn's evidence. It never decides compatibility: verdicts, prices and
stock come verbatim from `TurnEvidence`.

Claims declared by the model are validated too, but they are only an aid: the
natural text is the source of truth and is scanned independently. Absence of a
detected token never authorizes a paragraph by itself, but a paragraph with no
high-risk token may pass as general advice.
"""

import json
import re
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation

from .evidence import (
    CitationEvidence,
    EvaluationEvidence,
    OfferEvidence,
    PieceEvidence,
    TurnEvidence,
    normalize_name,
)

_CLAIM_KINDS = frozenset({"verdict", "piece", "price", "stock", "revision", "source"})

_VERDICT_VALUES = frozenset({"compatible", "incompatible", "requiere_verificacion"})

# Generic technology words never identify a catalog piece on their own.
_GENERIC_TOKENS = frozenset(
    {
        "de",
        "del",
        "la",
        "el",
        "los",
        "las",
        "un",
        "una",
        "y",
        "con",
        "para",
        "en",
        "por",
        "memoria",
        "ram",
        "ssd",
        "hdd",
        "nvme",
        "gpu",
        "cpu",
        "psu",
        "motherboard",
        "placa",
        "madre",
        "video",
        "grafica",
        "procesador",
        "fuente",
        "gabinete",
        "cooler",
        "ventilador",
        "almacenamiento",
        "disco",
        "ddr3",
        "ddr4",
        "ddr5",
        "am4",
        "am5",
        "lga",
        "pcie",
        "sata",
        "atx",
        "matx",
        "itx",
        "rgb",
        "gb",
        "tb",
        "mhz",
        "ghz",
        "w",
        "watts",
        "modulo",
        "modulos",
        "unidad",
        "unidades",
    }
)

_MONTHS = {
    "enero": 1,
    "febrero": 2,
    "marzo": 3,
    "abril": 4,
    "mayo": 5,
    "junio": 6,
    "julio": 7,
    "agosto": 8,
    "septiembre": 9,
    "setiembre": 9,
    "octubre": 10,
    "noviembre": 11,
    "diciembre": 12,
}

_PC_SUBJECTS = frozenset(
    {"pc", "la pc", "esta pc", "tu pc", "el equipo", "mi pc", "equipo"}
)

_REFERENCE_PATTERNS = (
    re.compile(r"\[\[\s*E\d+\s*\]\]"),
    re.compile(r"\[\s*E\d+\s*\]"),
    re.compile(r"(?<![A-Za-z0-9_])E\d+(?![A-Za-z0-9_])"),
)

_URL_RE = re.compile(r"https?://[^\s<>\"')\]]+", re.IGNORECASE)
_DATE_ISO_RE = re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b")
_DATE_SLASH_RE = re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b")
_DATE_TEXT_RE = re.compile(
    r"\b(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚÜáéíóúüñ]+)\s+(?:de\s+|del\s+)?(\d{4})\b",
    re.IGNORECASE,
)

_MONEY_RE = re.compile(
    r"(?P<prefix>u\$s|us\$|\$|ARS|USD)\s*(?P<amount1>\d[\d.,]*)"
    r"|(?P<amount2>\d[\d.,]*)\s*(?P<suffix>ARS|USD|pesos)\b",
    re.IGNORECASE,
)

_NUMBER_RE = re.compile(
    r"(?<![A-Za-z0-9])"
    r"(?:\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?|\d+[.,]\d+|\d+)"
    r"(?![A-Za-z0-9])"
)
_CODE_RE = re.compile(r"\bcg-[A-Za-z0-9-]+\b", re.IGNORECASE)
_TECH_UNIT_RE = re.compile(
    r"\s*(?:gb|gib|tb|tib|mb|mib|kb|kib|mhz|ghz|hz|w|watts?|mm|cm|rpm|nm|db|m\.2)\b",
    re.IGNORECASE,
)
_PC_WORD_RE = re.compile(r"\b(?:pc|computadora|equipo)\b")
_PRICE_WORDS = ("precio", "presupuesto", "cuesta", "cuestan", "sale", "vale", "oferta")

_VERDICT_RE = re.compile(
    r"(?P<incompatible>"
    r"\bno\s+(?:es\s+|resulta\s+|seria\s+)?compatible\b"
    r"|\bincompatible\b"
    r"|\bno\s+encaja\b"
    r"|\bno\s+entra\b"
    r")"
    r"|(?P<requiere>"
    r"\bfalta\s+un\s+dato\b"
    r"|\bfaltan\s+datos\b"
    r"|\brequiere\s+verificacion\b"
    r")"
    r"|(?P<compatible>\bcompatible\b|\bencaja\b)"
)

_REVISION_RE = re.compile(
    r"\brevisi[oó]n\s+(\d+)\b|\brev\.?\s*(\d+)\b", re.IGNORECASE
)

_STOCK_DOUBT_RE = re.compile(
    r"\bno\s+se\s+si\s+(?:hay\s+)?(?:stock|disponible|disponibilidad)\b"
    r"|\bno\s+esta\s+claro\b"
    r"|\bno\s+sabemos\s+si\b"
)
_STOCK_NEG_RE = re.compile(
    r"\bsin\s+stock\b"
    r"|\bagotad[oa]s?\b"
    r"|\bno\s+hay\s+(?:stock|disponibles?|unidades?)\b"
    r"|\bno\s+disponibles?\b"
    r"|\bfuera\s+de\s+stock\b"
)
_STOCK_POS_RE = re.compile(
    r"\bhay\s+stock\b"
    r"|\ben\s+stock\b"
    r"|\bdisponibles?\b"
    r"|\ben\s+existencia\b"
    r"|\bhay\s+\d+\s+(?:unidades?|disponibles?)\b"
    r"|\bquedan\s+\d+\b"
)
_STOCK_QTY_RE = re.compile(r"\b(\d+)\s*(?:unidades?|disponibles?)\b|\bquedan\s+(\d+)\b")

_CONDITION_PATTERNS = (
    (re.compile(r"\befectivo\b"), "cash"),
    (re.compile(r"\bcash\b"), "cash"),
    (re.compile(r"\bprecio\s+de\s+lista\b|\blista\b"), "list"),
    (re.compile(r"\blist\b"), "list"),
)

_TRAILING_URL_PUNCT = ".,;:!?"


@dataclass(frozen=True)
class Claim:
    """Optional model-declared assertion; never the only defence."""

    kind: str
    evidence: str
    subject: str | None = None
    value: str | None = None


@dataclass(frozen=True)
class CandidateParagraph:
    id: str
    text: str
    claims: tuple[Claim, ...] = ()


@dataclass(frozen=True)
class ParagraphResult:
    paragraph: CandidateParagraph
    failed: bool
    reasons: tuple[str, ...]
    text_sin_referencias: str


def strip_references(text):
    """Remove server-owned `E<n>` references from publishable text."""
    if not isinstance(text, str):
        return ""
    cleaned = text
    for pattern in _REFERENCE_PATTERNS:
        cleaned = pattern.sub("", cleaned)
    cleaned = re.sub(r"\(\s*\)", "", cleaned)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
    cleaned = re.sub(r"[ \t]+([,.;:!?])", r"\1", cleaned)
    return cleaned.strip()


def parse_candidate(text):
    """Parse a JSON candidate or fall back to blank-line paragraphs.

    The natural text is the source of truth. Invalid JSON never raises: the
    whole input becomes plain paragraphs without claims.
    """
    if not isinstance(text, str):
        return []
    parsed = _load_json(text)
    if isinstance(parsed, dict) and isinstance(parsed.get("paragraphs"), list):
        paragraphs = []
        for index, item in enumerate(parsed["paragraphs"], start=1):
            if not isinstance(item, dict):
                continue
            body = item.get("text")
            if not isinstance(body, str) or not body.strip():
                continue
            identifier = item.get("id")
            if not isinstance(identifier, str) or not identifier.strip():
                identifier = f"p{index}"
            claims = []
            raw_claims = item.get("claims")
            if isinstance(raw_claims, list):
                for raw in raw_claims:
                    if not isinstance(raw, dict):
                        claims.append(Claim(kind="", evidence=""))
                        continue
                    claims.append(
                        Claim(
                            kind=_string(raw.get("kind")),
                            evidence=_string(raw.get("evidence")),
                            subject=_optional_string(raw.get("subject")),
                            value=_optional_string(raw.get("value")),
                        )
                    )
            paragraphs.append(
                CandidateParagraph(
                    id=identifier.strip(),
                    text=body,
                    claims=tuple(claims),
                )
            )
        return paragraphs
    blocks = [block.strip() for block in re.split(r"\n\s*\n", text)]
    return [
        CandidateParagraph(id=f"p{index}", text=block)
        for index, block in enumerate((b for b in blocks if b), start=1)
    ]


def validate_candidate(evidence, text):
    """Return one result per paragraph; never raises on candidate content."""
    if not isinstance(evidence, TurnEvidence):
        raise TypeError("evidence must be a TurnEvidence")
    return [
        _validate_paragraph(evidence, paragraph) for paragraph in parse_candidate(text)
    ]


# --------------------------------------------------------------------- helpers


def _string(value):
    return value if isinstance(value, str) else ""


def _optional_string(value):
    if isinstance(value, str) and value.strip():
        return value
    return None


def _load_json(text):
    try:
        return json.loads(text)
    except (ValueError, TypeError, RecursionError):
        return None


def _norm(text):
    return normalize_name(text) or ""


def _tokens(value):
    return re.findall(r"[a-z0-9]+", value)


def _distinctive(token):
    return len(token) >= 2 and token not in _GENERIC_TOKENS


def _overlaps(span, spans):
    start, end = span
    return any(
        start < other_end and other_start < end for other_start, other_end in spans
    )


def _spans(pattern, text):
    return [(match.start(), match.end(), match) for match in pattern.finditer(text)]


def _parse_amount(raw):
    if not isinstance(raw, str):
        return None
    value = raw.strip().rstrip(".,")
    if not re.fullmatch(r"\d[\d.,]*", value):
        return None
    if "," in value and "." in value:
        if value.rfind(",") > value.rfind("."):
            value = value.replace(".", "").replace(",", ".")
        else:
            value = value.replace(",", "")
    elif "," in value:
        if value.count(",") > 1:
            value = value.replace(",", "")
        else:
            head, tail = value.split(",")
            if len(tail) == 3 and len(head) <= 3:
                value = value.replace(",", "")
            else:
                value = value.replace(",", ".")
    elif "." in value:
        if value.count(".") > 1:
            value = value.replace(".", "")
        else:
            head, tail = value.split(".")
            if len(tail) == 3 and len(head) <= 3:
                value = value.replace(".", "")
    try:
        return Decimal(value)
    except (InvalidOperation, ValueError):
        return None


def _to_decimal(value):
    if not isinstance(value, str):
        return None
    try:
        return Decimal(value)
    except (InvalidOperation, ValueError):
        return None


def _currency(value):
    if value is None:
        return None
    raw = value.casefold()
    if raw in {"usd", "u$s", "us$"}:
        return "USD"
    if raw == "ars":
        return "ARS"
    if raw == "pesos":
        return "ARS"
    return None


def _add_date(found, span, year, month, day):
    try:
        found.append((span, date(year, month, day).isoformat()))
    except ValueError:
        return


def _dates(text, blocked):
    found = []
    for start, end, match in _spans(_DATE_ISO_RE, text):
        if _overlaps((start, end), blocked):
            continue
        _add_date(
            found,
            (start, end),
            int(match.group(1)),
            int(match.group(2)),
            int(match.group(3)),
        )
    for start, end, match in _spans(_DATE_SLASH_RE, text):
        if _overlaps((start, end), blocked):
            continue
        _add_date(
            found,
            (start, end),
            int(match.group(3)),
            int(match.group(2)),
            int(match.group(1)),
        )
    for start, end, match in _spans(_DATE_TEXT_RE, text):
        if _overlaps((start, end), blocked):
            continue
        month = _MONTHS.get(_norm(match.group(2)))
        if month is None:
            continue
        _add_date(found, (start, end), int(match.group(3)), month, int(match.group(1)))
    return found


def _urls(text):
    found = []
    for start, end, match in _spans(_URL_RE, text):
        value = match.group(0)
        while value and value[-1] in _TRAILING_URL_PUNCT:
            value = value[:-1]
            end -= 1
        found.append(((start, end), value))
    return found


def _money(text):
    found = []
    for start, end, match in _spans(_MONEY_RE, text):
        raw = match.group("amount1") or match.group("amount2")
        currency = _currency(match.group("prefix") or match.group("suffix"))
        found.append(((start, end), _parse_amount(raw), currency))
    return found


def _numbers(text, blocked, *, subject, price_or_stock_context):
    found = []
    for start, end, match in _spans(_NUMBER_RE, text):
        if _overlaps((start, end), blocked):
            continue
        # Specs like "16 GB" or "3200 MHz" are general advice unless the
        # paragraph talks about a concrete piece/PC or about price/stock.
        if (
            not subject
            and not price_or_stock_context
            and _TECH_UNIT_RE.match(text, end)
        ):
            continue
        found.append(((start, end), _parse_amount(match.group(0))))
    return found


# ------------------------------------------------------------------ pieces


def _id_in_text(component_id, text):
    pattern = re.compile(
        r"(?<![A-Za-z0-9_-])" + re.escape(component_id) + r"(?![A-Za-z0-9_-])",
        re.IGNORECASE,
    )
    return pattern.search(text) is not None


def _distinctive_run(text_tokens, name_tokens):
    for text_index in range(len(text_tokens)):
        for name_index in range(len(name_tokens)):
            length = 0
            distinctive = 0
            while (
                text_index + length < len(text_tokens)
                and name_index + length < len(name_tokens)
                and text_tokens[text_index + length] == name_tokens[name_index + length]
            ):
                if _distinctive(text_tokens[text_index + length]):
                    distinctive += 1
                length += 1
            if length >= 2 and distinctive >= 2:
                return True
    return False


def _piece_ids_in_text(evidence, text):
    norm = _norm(text)
    tokens = _tokens(norm)
    found = set()
    for component_id, piece in evidence.pieces.items():
        if _id_in_text(component_id, text):
            found.add(component_id)
            continue
        name = piece.normalized_name
        if not name:
            continue
        if name in norm:
            found.add(component_id)
            continue
        if _distinctive_run(tokens, _tokens(name)):
            found.add(component_id)
    return found


# ---------------------------------------------------------------- evaluators


_DIRECT_EVALUATION_TOOLS = frozenset({"evaluate_pc", "simulate_pc"})


def _evaluation_matches(evidence, evaluation, verdict, piece_ids):
    if evaluation.verdict != verdict:
        return False
    if evaluation.pc_id != evidence.pc_id:
        return False
    if evaluation.pc_revision != evidence.expected_pc_revision:
        return False
    if evaluation.context != evidence.context:
        return False
    if piece_ids and not piece_ids.issubset(evaluation.component_ids):
        return False
    return True


def _verdict_evidence_matches(evidence, evaluation, verdict, piece_ids):
    """Shared by text scanning and declared claims.

    A PC-level verdict must come from a direct evaluation of this PC; a
    preview of another configuration cannot stand in for it. A piece-level
    verdict may come from any evaluation whose configuration includes it.
    """
    if not _evaluation_matches(evidence, evaluation, verdict, piece_ids):
        return False
    if not piece_ids and evaluation.tool not in _DIRECT_EVALUATION_TOOLS:
        return False
    return True


def _verdict_supported(evidence, verdict, piece_ids):
    return any(
        _verdict_evidence_matches(evidence, evaluation, verdict, piece_ids)
        for evaluation in evidence.evaluations
    )


def _revision_supported(evidence, revision):
    return any(
        evaluation.pc_revision == revision
        and evaluation.pc_id == evidence.pc_id
        and evaluation.context == evidence.context
        for evaluation in evidence.evaluations
    )


def _asserted_conditions(norm):
    found = set()
    for pattern, condition in _CONDITION_PATTERNS:
        if pattern.search(norm):
            found.add(condition)
    return found


def _condition_value(value):
    if value is None:
        return None
    raw = value.casefold()
    if raw in {"cash", "efectivo"}:
        return "cash"
    if raw in {"list", "lista", "precio de lista"}:
        return "list"
    return raw


def _compact(value):
    return (normalize_name(value) or "").replace(" ", "")


def _price_supported(evidence, amount, currency, norm, dates, piece_ids):
    if amount is None or not piece_ids:
        return False
    asserted = _asserted_conditions(norm)
    for offer in evidence.offers:
        if offer.component_id not in piece_ids:
            continue
        offer_amount = _to_decimal(offer.amount)
        if offer_amount is None or offer_amount != amount:
            continue
        if offer.currency is None:
            continue
        if currency is not None and offer.currency.upper() != currency:
            continue
        if offer.source is None:
            continue
        if _norm(offer.source) not in norm and _compact(offer.source) not in _compact(
            norm
        ):
            continue
        if offer.observed_date is None or offer.observed_date not in dates:
            continue
        if offer.condition is None:
            continue
        if asserted and _condition_value(offer.condition) not in asserted:
            continue
        return True
    return False


def _remove_doubt(norm):
    result = norm
    for match in list(_STOCK_DOUBT_RE.finditer(result)):
        tail = re.search(r"[.!?;\n]", result[match.end() :])
        end = match.end() + (tail.start() if tail else len(result) - match.end())
        result = result[: match.start()] + " " + result[end:]
    return result


def _stock_claims(norm):
    text = _remove_doubt(norm)
    negative = bool(_STOCK_NEG_RE.search(text))
    text = _STOCK_NEG_RE.sub(" ", text)
    positive = bool(_STOCK_POS_RE.search(text))
    quantity = None
    for match in _STOCK_QTY_RE.finditer(text):
        raw = match.group(1) or match.group(2)
        if raw is not None:
            quantity = int(raw)
            break
    return negative, positive, quantity


def _stock_supported(evidence, negative, positive, quantity, piece_ids):
    offers = evidence.offers
    if piece_ids:
        offers = [offer for offer in offers if offer.component_id in piece_ids]
    if negative and not any(offer.availability == "out_of_stock" for offer in offers):
        return False
    if positive and not any(offer.availability == "in_stock" for offer in offers):
        return False
    if quantity is not None and not any(
        offer.availability == "in_stock" and offer.stock_quantity == quantity
        for offer in offers
    ):
        return False
    return True


# ------------------------------------------------------------------- scanner


def _scan_reasons(evidence, text, norm):
    reasons = []

    url_spans = _urls(text)
    blocked = [span for span, _ in url_spans]
    for _, url in url_spans:
        if not any(_same_url(url, citation.url) for citation in evidence.citations):
            reasons.append("uncovered_url")

    date_tokens = _dates(text, blocked)
    dates = {iso for _, iso in date_tokens}
    for _, iso in date_tokens:
        if not any(offer.observed_date == iso for offer in evidence.offers):
            reasons.append("uncovered_date")
    blocked.extend(span for span, _ in date_tokens)

    money_tokens = _money(text)
    blocked.extend(span for span, _, _ in money_tokens)

    code_tokens = _spans(_CODE_RE, text)
    blocked.extend((start, end) for start, end, _ in code_tokens)
    for start, end, match in code_tokens:
        code = match.group(0).casefold()
        if not any(component_id.casefold() == code for component_id in evidence.pieces):
            reasons.append("uncovered_code")

    revision_tokens = _spans(_REVISION_RE, text)
    blocked.extend((start, end) for start, end, _ in revision_tokens)
    for start, end, match in revision_tokens:
        raw = match.group(1) or match.group(2)
        if raw is None:
            continue
        if not _revision_supported(evidence, int(raw)):
            reasons.append("uncovered_revision")

    piece_ids = _piece_ids_in_text(evidence, text)
    negative, positive, quantity = _stock_claims(norm)

    for _, amount, currency in money_tokens:
        if not _price_supported(evidence, amount, currency, norm, dates, piece_ids):
            reasons.append("uncovered_amount")

    subject = bool(piece_ids) or _PC_WORD_RE.search(norm) is not None
    price_or_stock_context = (
        bool(money_tokens)
        or negative
        or positive
        or quantity is not None
        or any(word in norm for word in _PRICE_WORDS)
    )
    for _, value in _numbers(
        text,
        blocked,
        subject=subject,
        price_or_stock_context=price_or_stock_context,
    ):
        if not _number_supported(evidence, value, norm):
            reasons.append("uncovered_number")

    verdicts = _verdicts(norm)
    for verdict in verdicts:
        if not _verdict_supported(evidence, verdict, piece_ids):
            reasons.append("uncovered_verdict")

    if (negative or positive or quantity is not None) and not _stock_supported(
        evidence, negative, positive, quantity, piece_ids
    ):
        reasons.append("uncovered_stock")

    return reasons


def _same_url(left, right):
    return left.rstrip("/") == right.rstrip("/")


def _number_supported(evidence, value, norm):
    if value is None:
        return False
    if "presupuesto" in norm:
        budget = _to_decimal(evidence.budget_ars)
        if budget is not None and budget == value:
            return True
    if "stock" in norm or "unidades" in norm or "disponible" in norm:
        if value == value.to_integral_value():
            quantity = int(value)
            if any(offer.stock_quantity == quantity for offer in evidence.offers):
                return True
    return False


def _verdicts(norm):
    found = []
    for match in _VERDICT_RE.finditer(norm):
        if match.group("incompatible"):
            found.append("incompatible")
        elif match.group("requiere"):
            found.append("requiere_verificacion")
        else:
            found.append("compatible")
    return found


# -------------------------------------------------------------------- claims


def evidence_entries(evidence):
    """Stable `E1..En` order shared by claims and the reviewer prompt.

    Evaluations first, then offers, pieces (sorted by id) and citations
    (sorted by source id). Same list and order on every call.
    """
    entries = list(evidence.evaluations)
    entries.extend(evidence.offers)
    entries.extend(evidence.pieces[key] for key in sorted(evidence.pieces))
    entries.extend(sorted(evidence.citations, key=lambda c: c.source_id))
    return entries


def _resolve_evidence(evidence, reference):
    if not isinstance(reference, str) or not reference.strip():
        return None
    value = reference.strip()
    index = re.fullmatch(r"[Ee](\d+)", value)
    if index is not None:
        position = int(index.group(1)) - 1
        entries = evidence_entries(evidence)
        if 0 <= position < len(entries):
            return entries[position]
        return None
    if value.startswith("evaluation:"):
        return _indexed(evidence.evaluations, value.split(":", 1)[1])
    if value.startswith("offer:"):
        return _indexed(evidence.offers, value.split(":", 1)[1])
    if value.startswith("piece:"):
        return evidence.pieces.get(value.split(":", 1)[1])
    if value.startswith("citation:"):
        source_id = value.split(":", 1)[1]
        return next((c for c in evidence.citations if c.source_id == source_id), None)
    if value in evidence.pieces:
        return evidence.pieces[value]
    for citation in evidence.citations:
        if value in (citation.source_id, citation.url):
            return citation
    return None


def _indexed(items, raw):
    try:
        position = int(raw)
    except (TypeError, ValueError):
        return None
    if 0 <= position < len(items):
        return items[position]
    return None


def _claim_verdict(value):
    raw = _norm(value)
    if raw in {"compatible", "encaja"}:
        return "compatible"
    if raw in {"incompatible", "no encaja", "no entra", "no compatible"}:
        return "incompatible"
    if raw in {
        "requiere verificacion",
        "requiere_verificacion",
        "falta un dato",
        "faltan datos",
    }:
        return "requiere_verificacion"
    return None


def _claim_subject_pieces(evidence, subject):
    if subject is None or _norm(subject) in _PC_SUBJECTS:
        return set()
    return _piece_ids_in_text(evidence, subject)


def _claim_amount(value):
    if not isinstance(value, str):
        return None
    cleaned = re.sub(r"(?i)(u\$s|us\$|\$|ars|usd|pesos)", " ", value)
    return _parse_amount(cleaned.strip())


def _subject_matches_offer(subject, offer):
    if subject is None:
        return True
    if offer.component_id is not None and subject == offer.component_id:
        return True
    if offer.component_name is not None:
        return _norm(subject) == _norm(offer.component_name)
    return False


def _claim_reasons(evidence, claim):
    kind = _norm(claim.kind)
    if kind not in _CLAIM_KINDS:
        return ["unknown_claim_kind"]
    target = _resolve_evidence(evidence, claim.evidence)
    if target is None:
        return ["evidence_not_found"]

    if kind == "verdict":
        if not isinstance(target, EvaluationEvidence):
            return ["claim_value_mismatch"]
        verdict = _claim_verdict(claim.value or "")
        if verdict is None:
            return ["claim_value_mismatch"]
        pieces = _claim_subject_pieces(evidence, claim.subject)
        if not _verdict_evidence_matches(evidence, target, verdict, pieces):
            return ["claim_value_mismatch"]
        return []

    if kind == "revision":
        if not isinstance(target, EvaluationEvidence):
            return ["claim_value_mismatch"]
        raw = (claim.value or "").strip()
        if not raw.isdigit() or target.pc_revision != int(raw):
            return ["claim_value_mismatch"]
        if target.pc_id != evidence.pc_id or target.context != evidence.context:
            return ["claim_value_mismatch"]
        return []

    if kind == "piece":
        if not isinstance(target, PieceEvidence):
            return ["claim_value_mismatch"]
        if claim.subject is None and claim.value is None:
            return ["claim_value_mismatch"]
        for candidate in (claim.subject, claim.value):
            if candidate is None:
                continue
            if candidate == target.component_id:
                continue
            if _norm(candidate) == target.normalized_name:
                continue
            return ["claim_value_mismatch"]
        return []

    if kind == "price":
        if not isinstance(target, OfferEvidence):
            return ["claim_value_mismatch"]
        if not _subject_matches_offer(claim.subject, target):
            return ["claim_value_mismatch"]
        pieces = _claim_subject_pieces(evidence, claim.subject)
        if pieces and target.component_id not in pieces:
            return ["claim_value_mismatch"]
        amount = _claim_amount(claim.value)
        offer_amount = _to_decimal(target.amount)
        if amount is None or offer_amount is None or amount != offer_amount:
            return ["claim_value_mismatch"]
        return []

    if kind == "stock":
        if not isinstance(target, OfferEvidence):
            return ["claim_value_mismatch"]
        pieces = _claim_subject_pieces(evidence, claim.subject)
        if pieces and target.component_id not in pieces:
            return ["claim_value_mismatch"]
        raw = _norm(claim.value)
        if raw in {"in_stock", "disponible", "hay stock", "en stock"}:
            return [] if target.availability == "in_stock" else ["claim_value_mismatch"]
        if raw in {"out_of_stock", "agotado", "sin stock"}:
            return (
                []
                if target.availability == "out_of_stock"
                else ["claim_value_mismatch"]
            )
        if raw.isdigit():
            return [] if target.stock_quantity == int(raw) else ["claim_value_mismatch"]
        return ["claim_value_mismatch"]

    # source
    if not isinstance(target, CitationEvidence):
        return ["claim_value_mismatch"]
    expected = claim.value or claim.subject
    if expected is None:
        return ["claim_value_mismatch"]
    if expected == target.url or expected == target.source_id:
        return []
    if _norm(expected) == _norm(target.title):
        return []
    return ["claim_value_mismatch"]


# ------------------------------------------------------------------ results


def _dedupe(reasons):
    seen = []
    for reason in reasons:
        if reason not in seen:
            seen.append(reason)
    return tuple(seen)


def _validate_paragraph(evidence, paragraph):
    text = strip_references(paragraph.text)
    norm = _norm(text)
    reasons = _scan_reasons(evidence, text, norm)
    for claim in paragraph.claims:
        reasons.extend(_claim_reasons(evidence, claim))
    deduped = _dedupe(reasons)
    return ParagraphResult(
        paragraph=paragraph,
        failed=bool(deduped),
        reasons=deduped,
        text_sin_referencias=text,
    )
