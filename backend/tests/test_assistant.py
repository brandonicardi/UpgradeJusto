"""Fault-only unit tests. These are not evidence of PG/MCP/Groq integration."""

import asyncio
import json
import ssl
from uuid import uuid4

import pytest
from pydantic import ValidationError

from upgradejusto.assistant.graph import RoundLimit
from upgradejusto.assistant.models import ConversationCreate, MessageCreate
from upgradejusto.assistant.provider import tls_context
from upgradejusto.assistant.service import AssistantService


def test_closed_inputs():
    assert ConversationCreate(title=" hola ").title == "hola"
    with pytest.raises(ValidationError):
        ConversationCreate(title="hola", owner_id=str(uuid4()))
    with pytest.raises(ValidationError):
        MessageCreate(content=" " * 20, client_request_id=uuid4())
    with pytest.raises(ValidationError):
        MessageCreate(content="x" * 8001, client_request_id=uuid4())


def test_tls_stays_verified(monkeypatch):
    for mode in ("system", "certifi"):
        monkeypatch.setenv("UJ_TLS_TRUST", mode)
        context = tls_context()
        assert context.verify_mode == ssl.CERT_REQUIRED and context.check_hostname
    monkeypatch.setenv("UJ_TLS_TRUST", "insecure")
    with pytest.raises(ValueError):
        tls_context()


@pytest.mark.parametrize("failure", [RoundLimit, TimeoutError, RuntimeError])
def test_stream_partial_failure_never_success(failure):
    class FaultRepository:
        finished = None

        def finish(self, *args):
            self.finished = args

        def interrupt_pending(self, *args):
            return False  # finish already stored the terminal failed state

    async def failing(raw, history, emit, conversation_id):
        await emit("delta", {"text": "Respuesta parcial"})
        raise failure("SECRET_MUST_NOT_LEAK")

    async def collect():
        repo = FaultRepository()
        svc = AssistantService(repo, failing)
        frames = [
            part async for part in svc.stream(uuid4(), uuid4(), uuid4(), "opaque", [])
        ]
        assert repo.finished[-2] == "failed"
        text = "".join(frames)
        assert "event: error" in text and "event: done" not in text
        assert "SECRET_MUST_NOT_LEAK" not in text and "opaque" not in text
        payloads = [json.loads(frame.split("data: ", 1)[1]) for frame in frames]
        assert [p["sequence"] for p in payloads] == list(range(1, len(payloads) + 1))

    asyncio.run(collect())


def test_persistence_failure_cannot_confirm_history():
    class FaultRepository:
        def finish(self, *args):
            raise RuntimeError("SQL_PRIVATE")

        def interrupt_pending(self, *args):
            raise RuntimeError("SQL_PRIVATE")

    async def runner(raw, history, emit, conversation_id):
        await emit("delta", {"text": "texto"})

    async def collect():
        frames = [
            part
            async for part in AssistantService(FaultRepository(), runner).stream(
                uuid4(), uuid4(), uuid4(), "opaque", []
            )
        ]
        text = "".join(frames)
        assert "history_unavailable" in text and "event: done" not in text
        assert "SQL_PRIVATE" not in text

    asyncio.run(collect())


def test_disconnect_interrupts_pending_turn():
    class FaultRepository:
        status = None

        def finish(self, owner, cid, mid, content, status, citations):
            self.status = status

        def interrupt_pending(self, owner, cid, mid, content, citations):
            if self.status is None:
                self.status = "interrupted"
                return True
            return False

    async def exercise():
        started = asyncio.Event()

        async def runner(raw, history, emit, conversation_id):
            started.set()
            await asyncio.Event().wait()

        repo = FaultRepository()
        stream = AssistantService(repo, runner).stream(
            uuid4(), uuid4(), uuid4(), "opaque", []
        )
        assert "event: start" in await anext(stream)
        await started.wait()
        await stream.aclose()
        assert repo.status == "interrupted"

    asyncio.run(exercise())
