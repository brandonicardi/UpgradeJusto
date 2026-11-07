"""Only what passed validation reaches the person; the draft never leaves here.

The model's text stays in a private buffer. Each paragraph is checked against this
turn's evidence, the failed ones get a single rewrite, and whatever still cannot be
proved is left out. The draft is never sent, stored or logged.
"""

import re

from .grounding import validate_candidate

NOTHING_VERIFIED = (
    "No pude comprobar esa respuesta con los datos de esta consulta. Elegí tu PC en "
    "la charla y preguntame de nuevo, o mirá «Lo que te conviene»."
)
REPAIR_POLICY = (
    "Reescribí estos párrafos de un asistente de hardware. Sacá toda afirmación sobre "
    "si algo encaja o es compatible, precios, stock, fechas, códigos y números: no se "
    "pudieron comprobar. Dejá solo consejo general útil, sin datos específicos. Si no "
    "queda nada útil, respondé vacío. No avises que sacaste algo, no agregues "
    "advertencias ni digas que los datos no son fiables. Devolvé solo el texto."
)


CATEGORY_WORDS = {
    "cpu": "procesador",
    "motherboard": "placa madre",
    "ram": "memoria",
    "gpu": "placa de video",
    "psu": "fuente",
    "case": "gabinete",
    "storage": "almacenamiento",
    "cooler": "cooler",
    "fan": "ventiladores",
}
FIELD_LIST = re.compile(r"\s*\(\s*`[\w.]+`(?:\s*,\s*`[\w.]+`)*\s*\)")
CODE = re.compile(r"`([\w.]+)`")
ENGINE = re.compile(r"\b(el|El) motor\b")
VERDICT_AS_NOUN = re.compile(r"\btiene Falta un dato\b")


def plain_words(text):
    """The prompt asks for this, but a small model slips: never show internal names."""
    text = FIELD_LIST.sub("", text)
    text = CODE.sub(lambda code: CATEGORY_WORDS.get(code[1], code[1]), text)
    text = ENGINE.sub(
        lambda word: f"{'la' if word[1] == 'el' else 'La'} revisión", text
    )
    return VERDICT_AS_NOUN.sub("tiene datos por completar", text)


def passed(results):
    return [result.text_sin_referencias for result in results if not result.failed]


async def publish(evidence, draft, emit, repair=None):
    """Emit the validated text as one delta; return how many paragraphs were left out."""
    results = validate_candidate(evidence, draft)
    failed = [result for result in results if result.failed]
    repaired = []
    if failed and repair is not None:
        rewritten = await repair("\n\n".join(item.paragraph.text for item in failed))
        if rewritten:
            # One rewrite only, and it goes through the same validation.
            repaired = passed(validate_candidate(evidence, rewritten))
    parts = []
    used_repair = False
    for result in results:
        if not result.failed:
            parts.append(result.text_sin_referencias)
        elif not used_repair:
            parts.extend(repaired)
            used_repair = True
    omitted = max(len(failed) - len(repaired), 0)
    if not parts:
        await emit("delta", {"text": NOTHING_VERIFIED})
        return len(results)
    await emit("delta", {"text": plain_words("\n\n".join(parts))})
    return omitted
