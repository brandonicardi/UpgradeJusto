"""The draft stays private: only validated paragraphs are emitted."""

import asyncio
from decimal import Decimal

from upgradejusto.assistant.evidence import TurnEvidence
from upgradejusto.assistant.grounding import validate_candidate
from upgradejusto.assistant.publication import (
    NOTHING_VERIFIED,
    OMITTED_NOTICE,
    publish,
)

ADVICE = "Conviene mirar primero qué te frena más."
INVENTED = "Tu PC es compatible con esa memoria."


def run(draft, repair=None):
    events = []

    async def emit(kind, data):
        events.append((kind, data))

    asyncio.run(publish(TurnEvidence(None), draft, emit, repair))
    return events


def text(events):
    assert [kind for kind, _ in events] == ["delta"]
    return events[0][1]["text"]


def test_general_advice_is_published():
    assert text(run(ADVICE)) == ADVICE


def test_unproved_verdict_never_reaches_the_person():
    published = text(run(f"{ADVICE}\n\n{INVENTED}"))
    assert ADVICE in published and OMITTED_NOTICE in published
    assert "compatible" not in published


def test_nothing_proved_gives_a_safe_message_not_the_draft():
    assert text(run(INVENTED)) == NOTHING_VERIFIED


def test_single_repair_replaces_the_failed_paragraph():
    calls = []

    async def repair(failed):
        calls.append(failed)
        return "Revisá el modelo exacto antes de comprar."

    published = text(run(f"{ADVICE}\n\n{INVENTED}", repair))
    assert calls == [INVENTED]
    assert "Revisá el modelo exacto" in published
    assert "compatible" not in published and OMITTED_NOTICE not in published


def test_repair_is_validated_too():
    async def repair(_):
        return "Las dos piezas son compatibles."

    published = text(run(f"{ADVICE}\n\n{INVENTED}", repair))
    assert "compatibles" not in published and OMITTED_NOTICE in published


def test_repair_failure_keeps_what_was_proved():
    async def repair(_):
        return None

    assert ADVICE in text(run(f"{ADVICE}\n\n{INVENTED}", repair))


def test_verdict_in_other_words_is_caught():
    for phrase in (
        "Las dos piezas son compatibles.",
        "No son compatibles.",
        "Encajan perfecto.",
        "Va a funcionar sin problemas con tu placa.",
        "Esa fuente alcanza para esa placa de video.",
    ):
        assert validate_candidate(TurnEvidence(None), phrase)[0].failed, phrase


def test_model_names_are_not_claims():
    phrase = "Las RTX 5060 y RX 9070 XT son placas de video conocidas."
    assert not validate_candidate(TurnEvidence(None), phrase)[0].failed


def test_list_stays_with_the_line_that_opens_it():
    results = validate_candidate(TurnEvidence(None), "Precios del día:\n\n* uno\n* dos")
    assert len(results) == 1


def test_list_numbers_and_the_typed_budget_are_not_claims():
    evidence = TurnEvidence(None)
    evidence.stated_amounts = frozenset({Decimal(1500000)})
    phrase = "Para tu PC con $1.500.000 podés:\n1. Buscar\n2. Comparar"
    assert not validate_candidate(evidence, phrase)[0].failed


def test_a_verdict_never_inherits_proof_it_does_not_have():
    draft = "Mirá esta memoria.\n\nVeredicto: Encaja con tu PC."
    assert validate_candidate(TurnEvidence(None), draft)[1].failed
