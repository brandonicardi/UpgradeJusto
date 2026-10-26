"""Explicit Groq model/stream/tool probe; no secrets or response bodies in output."""

import json
import os
import ssl
import sys
from pathlib import Path

import httpx
from groq import APIStatusError, Groq
from langchain_groq import ChatGroq

ROOT = Path(__file__).resolve().parents[1]


def main():
    key = os.environ.get("GROQ_API_KEY", "")
    report = {
        "key_present": bool(key),
        "models_verified": False,
        "live_assistant_verified": False,
    }
    if not key:
        report["blocker"] = (
            "Configure GROQ_API_KEY in ignored project .env; never paste it in chat"
        )
        print(
            "Groq not configured for this process/project; independent blocks may continue"
        )
    else:
        try:
            # Explicit local diagnostic option; verification and hostname checks stay on.
            system_trust = (
                "--system-trust" in sys.argv[1:]
                or os.environ.get("UJ_TLS_TRUST") == "system"
            )
            context = ssl.create_default_context() if system_trust else True
            report["tls_trust"] = "system" if system_trust else "certifi"
            transport = httpx.Client(verify=context, timeout=30)
            client = Groq(api_key=key, timeout=20, max_retries=0, http_client=transport)
            available = {item.id for item in client.models.list().data}
            # Public candidates only; never publish a user's complete model catalog.
            report["public_candidates"] = {
                name: name in available
                for name in ("openai/gpt-oss-20b", "llama-3.3-70b-versatile")
            }
            report["models_verified"] = True
            model_name = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
            if model_name not in available:
                raise ValueError("Configured model unavailable")
            model = ChatGroq(
                model=model_name,
                api_key=key,
                timeout=30,
                max_retries=0,
                max_tokens=128,
                temperature=0,
                http_client=transport,
            )
            chunks = list(model.stream("Reply with OK only."))
            report["stream_verified"] = any(chunk.content for chunk in chunks)
            report["stream_chunks"] = len(chunks)
            tool = {
                "type": "function",
                "function": {
                    "name": "probe_ready",
                    "description": "Return readiness; probe only, no external action.",
                    "parameters": {"type": "object", "properties": {}, "required": []},
                },
            }
            bound = model.bind_tools([tool], tool_choice="probe_ready")
            combined = None
            for chunk in bound.stream("Call probe_ready once."):
                combined = chunk if combined is None else combined + chunk
            report["tool_stream_verified"] = bool(
                combined
                and any(t["name"] == "probe_ready" for t in combined.tool_calls)
            )
            report["model"] = model_name
            print(
                "Groq SDK models, minimal stream and tool stream probed; safe report local"
            )
        except APIStatusError as error:
            report["http_status"] = error.status_code
            report["blocker"] = (
                "Groq access unavailable; no automatic provider/key changes"
            )
            print(
                f"Groq probe failed HTTP{error.status_code}; credentials and body omitted"
            )
        except Exception as error:
            report["error_class"] = type(error).__name__
            report["blocker"] = "Groq model, connection or probe unavailable"
            print(
                "Groq probe incomplete; safe error class saved, no automatic provider change"
            )
    destination = ROOT / ".local/evidence/sprint32/groq-availability.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(report), encoding="utf-8")
    return (
        0
        if all(
            report.get(k)
            for k in ("models_verified", "stream_verified", "tool_stream_verified")
        )
        else 2
    )


if __name__ == "__main__":
    raise SystemExit(main())
