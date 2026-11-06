"""The local model only picks from verified options; any doubt keeps the rules."""

import json
from types import SimpleNamespace

import httpx
import pytest

from upgradejusto.recommendations.advisor import advise, payload, validated

OPTIONS = [
    {"key": "a", "name": "RX 9070 16GB", "price": "1316750", "gain": "50"},
    {"key": "b", "name": "RTX 5060 Ti 8GB", "price": "912600", "gain": "29"},
]


def answer(content):
    body = {"choices": [{"message": {"content": content}}]}
    return SimpleNamespace(raise_for_status=lambda: None, json=lambda: body)


@pytest.fixture(autouse=True)
def on(monkeypatch):
    monkeypatch.setenv("UJ_LOCAL_ADVISOR", "1")


def reply(key, reason):
    return lambda *_, **__: answer(json.dumps({"key": key, "reason": reason}))


def test_listed_choice_with_given_numbers_is_accepted():
    post = reply("b", "Mejora 29 % y te sobra plata del presupuesto.")
    result = advise(OPTIONS, "gaming", "1500000", post=post)
    assert result["key"] == "b" and result["source"] == "local_model"


def test_key_outside_the_list_is_ignored():
    post = reply("z", "Esta otra placa es mucho mejor para vos.")
    assert advise(OPTIONS, "gaming", "1500000", post=post) is None


def test_invented_number_is_ignored():
    post = reply("a", "Te da 144 FPS en todos los juegos que tengas.")
    assert advise(OPTIONS, "gaming", "1500000", post=post) is None


def test_what_is_left_of_the_budget_is_a_given_number():
    post = reply("a", "Mejora 50 % y te sobran $183.250 del presupuesto.")
    assert advise(OPTIONS, "gaming", "1500000", post=post)["key"] == "a"


def test_model_cannot_talk_about_fit_or_promise_performance():
    for reason in (
        "Es compatible con tu placa y anda bien.",
        "Rinde el doble de FPS seguro.",
    ):
        assert advise(OPTIONS, "gaming", "1500000", post=reply("a", reason)) is None


def test_malformed_answer_is_ignored():
    assert validated("no es json", OPTIONS, "1500000") is None
    assert validated('{"key": 1, "reason": 2}', OPTIONS, "1500000") is None


def test_model_down_keeps_rules():
    def down(*_, **__):
        raise httpx.ConnectError("sin servidor")

    assert advise(OPTIONS, "gaming", "1500000", post=down) is None


def test_disabled_by_default(monkeypatch):
    monkeypatch.delenv("UJ_LOCAL_ADVISOR")
    post = reply("a", "Una razón suficientemente larga.")
    assert advise(OPTIONS, "gaming", "1500000", post=post) is None


def test_single_option_needs_no_model():
    post = reply("a", "Una razón suficientemente larga.")
    assert advise(OPTIONS[:1], "gaming", "1500000", post=post) is None


def test_prompt_carries_no_identity():
    text = json.dumps(payload(OPTIONS, "gaming", "1500000"))
    assert "owner" not in text and "user_id" not in text
