"""Optional local model: chooses among already verified proposals and says why.

It never sees a person, never decides compatibility and cannot add options. An
answer outside the list, a number it was not given, a timeout or a model that is
not running all end the same way: the deterministic order stands.
"""

import json
import os
import re
from decimal import Decimal

import httpx

LOCAL_URL = "http://127.0.0.1:8081/v1/chat/completions"
MAX_OPTIONS = 5
TIMEOUT_SECONDS = 12
SYSTEM = (
    "Sos un asesor de hardware para gente que no sabe de computadoras. Elegí UNA "
    "opción de la lista, la que mejor sirva para el objetivo y el presupuesto, y "
    "explicá por qué en una o dos oraciones simples, en español rioplatense. Todas "
    "las opciones ya encajan con la PC: no hables de compatibilidad. No inventes "
    "datos. No hagas cuentas ni nombres montos de dinero: ya están en pantalla. El "
    "único número que podés usar es el porcentaje de mejora de la lista."
)
# It explains value. Fit is the engine's word and performance is never promised.
BANNED = re.compile(r"compatib|encaj|\bfps\b|garantiz|funciona|el doble", re.I)
GOALS = {
    "gaming": "jugar mejor",
    "productivity": "trabajar más rápido",
    "general": "que todo abra más rápido",
}
SCHEMA = {
    "type": "object",
    "properties": {
        "key": {"type": "string"},
        "reason": {"type": "string", "maxLength": 320},
    },
    "required": ["key", "reason"],
    "additionalProperties": False,
}


def enabled():
    return os.environ.get("UJ_LOCAL_ADVISOR", "0") == "1"


def numbers(text):
    return {value.replace(".", "") for value in re.findall(r"\d[\d.]*\d|\d", text)}


def payload(options, objective, budget):
    listing = "\n".join(
        f"- key={option['key']} | {option['name']} | ${option['price']} ARS | "
        f"mejora {option['gain']} %"
        for option in options
    )
    prompt = f"Objetivo: {GOALS[objective]}. Presupuesto: ${budget} ARS.\n{listing}"
    return {
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0,
        "max_tokens": 220,
        "chat_template_kwargs": {"enable_thinking": False},
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": "eleccion", "schema": SCHEMA, "strict": True},
        },
    }


def validated(raw, options, budget):
    """Only a listed key and only numbers it was given survive."""
    try:
        answer = json.loads(raw)
        key, reason = answer["key"], answer["reason"]
    except (ValueError, TypeError, KeyError):
        return None
    if not isinstance(key, str) or not isinstance(reason, str):
        return None
    reason = " ".join(reason.split())
    allowed = numbers(str(budget))
    for option in options:
        allowed |= numbers(f"{option['name']} {option['price']} {option['gain']}")
        # What is left of the budget is the one sum a person would expect to read.
        allowed.add(str(int(Decimal(str(budget))) - int(option["price"])))
    if (
        BANNED.search(reason)
        or key not in {option["key"] for option in options}
        or not 10 <= len(reason) <= 320
        or numbers(reason) - allowed
    ):
        return None
    return {"key": key, "reason": reason, "source": "local_model"}


def advise(options, objective, budget, post=None):
    if not enabled() or len(options) < 2:
        return None
    options = options[:MAX_OPTIONS]
    try:
        if post is None:
            with httpx.Client(timeout=TIMEOUT_SECONDS, trust_env=False) as client:
                post = client.post
                response = post(LOCAL_URL, json=payload(options, objective, budget))
        else:
            response = post(LOCAL_URL, json=payload(options, objective, budget))
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
        return None
    return validated(content, options, budget)
