"""Cancellation regression gates: real PG, controlled runner, no provider calls.

Baseline before fix: three failures and shielded control passed (Build). Require
persisted after cancellation; diagnostic output contains lifecycle flags only.
ASGI spec 2.3 deliberately exercises StreamingResponse's disconnect listener and
AnyIO task-group cancel scope, not only asyncio.Task.cancel().
"""

import asyncio
import json
import threading
from uuid import uuid4

import anyio
import pytest
from fastapi import HTTPException
from starlette.responses import StreamingResponse
from test_assistant_postgres import assistant_actors as assistant_actors
from test_pcs_postgres import actors as actors

from upgradejusto.assistant.models import MessageCreate
from upgradejusto.assistant.repository import Repository
from upgradejusto.assistant.service import AssistantService

PARTIAL_CITATION = {
    "source_id": "synthetic-cancellation-fixture",
    "url": "https://example.test/cancellation-fixture",
    "title": "Synthetic lifecycle fixture, not hardware evidence",
    "locator": "fixture:1",
    "excerpt": "Controlled partial citation for persistence testing only.",
}


class FinishProbe:
    """Instrument the real repository; do not emulate persistence."""

    def __init__(self, repository):
        self.repository = repository
        self.lock = threading.Lock()
        self.flags = []

    def flag(self, value):
        with self.lock:
            self.flags.append(value)

    def finish(self, *args):
        self.flag("finish_enter_" + args[-2])
        try:
            result = self.repository.finish(*args)
        except BaseException:
            self.flag("finish_failed")
            raise
        self.flag("finish_returned")
        return result

    def interrupt_pending(self, owner, cid, mid, content, citations):
        self.flag("finish_enter_interrupted")
        try:
            result = self.repository.interrupt_pending(
                owner, cid, mid, content, citations
            )
        except BaseException:
            self.flag("finish_failed")
            raise
        self.flag("finish_returned")
        return result


@pytest.mark.parametrize(
    "boundary", ["after_start", "runner_waiting", "asgi_disconnect"]
)
def test_cancel_scope_disconnect_persists_interrupted(
    boundary, assistant_actors, pg_engine
):
    a, _ = assistant_actors
    repository = Repository(pg_engine)
    cid = repository.create(a[2], "Controlled cancellation fixture")["id"]
    mid = repository.begin(
        a[2],
        cid,
        MessageCreate(content="controlled fixture", client_request_id=uuid4()),
    )
    probe = FinishProbe(repository)

    async def exercise():
        runner_started = anyio.Event()
        body_sent = anyio.Event()
        stages = []

        async def runner(raw, history, emit, conversation_id):
            stages.append("runner_enter")
            runner_started.set()
            try:
                await emit("delta", {"text": "controlled partial"})
                await emit("citation", PARTIAL_CITATION)
                await anyio.sleep_forever()
            finally:
                stages.append("runner_finally_enter")
                # Real async teardown checkpoint (e.g. provider/MCP context exit).
                await anyio.sleep(0)
                stages.append("runner_finally_returned")

        svc = AssistantService(probe, runner)
        stream = svc.stream(a[2], cid, mid, "synthetic-not-a-session", [])
        if boundary == "asgi_disconnect":
            response = StreamingResponse(stream, media_type="text/event-stream")

            async def receive():
                await runner_started.wait()
                await body_sent.wait()
                stages.append("http_disconnect")
                return {"type": "http.disconnect"}

            async def send(message):
                if message["type"] == "http.response.body":
                    data = message.get("body", b"")
                    if b"event: delta" in data:
                        stages.append("delta_sent")
                        body_sent.set()
                    if b"event: done" in data:
                        stages.append("done_sent")

            scope = {
                "type": "http",
                "asgi": {"version": "3.0", "spec_version": "2.3"},
                "http_version": "1.1",
                "method": "POST",
                "scheme": "http",
                "path": "/controlled-stream",
                "raw_path": b"/controlled-stream",
                "query_string": b"",
                "headers": [],
            }
            with anyio.fail_after(3):
                await response(scope, receive, send)
        else:
            with anyio.CancelScope() as cancelled_scope:
                first = await anext(stream)
                assert first.startswith("event: start")
                stages.append("start_received")
                if boundary == "runner_waiting":
                    await runner_started.wait()
                # No checkpoint between start and cancel for the startup boundary.
                cancelled_scope.cancel()
                stages.append("scope_cancelled")
                await stream.aclose()

        # Test-only observation window, not a new product timeout. Shield the
        # observer so the diagnostic itself is not suppressed by cancellation.
        # Permit detached asyncio.shield tasks to finish before querying PG.
        with anyio.move_on_after(1, shield=True):
            while "finish_returned" not in probe.flags:
                await anyio.sleep(0.01)
        await stream.aclose()
        rows = repository.page(a[2], 1, 20, cid)["items"]
        status = next(row["status"] for row in rows if row["id"] == mid)
        print(
            json.dumps(
                {"stages": stages, "finish_flags": probe.flags, "status": status}
            )
        )
        assert status == "interrupted"
        assert probe.flags.count("finish_enter_interrupted") == 1
        assert "finish_enter_completed" not in probe.flags
        assert "done_sent" not in stages
        if boundary != "after_start":
            assert "runner_finally_returned" in stages
            assistant_row = next(row for row in rows if row["id"] == mid)
            assert assistant_row["content"] == "controlled partial"
            assert assistant_row["citations"] == [PARTIAL_CITATION]

    asyncio.run(exercise())


@pytest.mark.parametrize("terminal", ["completed", "failed", "interrupted"])
def test_interrupt_pending_is_owner_scoped_and_preserves_terminal(
    terminal, assistant_actors, pg_engine
):
    a, b = assistant_actors
    repository = Repository(pg_engine)
    cid = repository.create(a[2], "Terminal preservation fixture")["id"]
    mid = repository.begin(
        a[2],
        cid,
        MessageCreate(content="controlled fixture", client_request_id=uuid4()),
    )
    with pytest.raises(HTTPException) as denied:
        repository.interrupt_pending(b[2], cid, mid, "foreign", [])
    assert denied.value.status_code == 404
    repository.finish(a[2], cid, mid, "original terminal content", terminal, [])
    before = repository.page(a[2], 1, 20, cid)
    metadata_before = repository.get(a[2], cid)
    assert not repository.interrupt_pending(a[2], cid, mid, "overwrite", [])
    after = repository.page(a[2], 1, 20, cid)
    assert bool(before == after)
    assert bool(metadata_before == repository.get(a[2], cid))


def test_stalled_runner_close_cannot_block_pending_cleanup(
    assistant_actors, pg_engine, monkeypatch
):
    from upgradejusto.assistant import service as service_module

    # Reduce only the teardown grace in this harness; no production timeout grows.
    monkeypatch.setattr(service_module, "CLOSE_SECONDS", 0.05)
    a, _ = assistant_actors
    repository = Repository(pg_engine)
    cid = repository.create(a[2], "Stalled close fixture")["id"]
    mid = repository.begin(
        a[2],
        cid,
        MessageCreate(content="controlled fixture", client_request_id=uuid4()),
    )

    async def exercise():
        started = anyio.Event()
        release = anyio.Event()
        closed = anyio.Event()

        async def runner(raw, history, emit, conversation_id):
            started.set()
            try:
                await anyio.sleep_forever()
            finally:
                # Deliberately uncooperative external teardown, released only by
                # the harness after the service independently finalizes PG.
                with anyio.CancelScope(shield=True):
                    while not release.is_set():
                        try:
                            await release.wait()
                        except asyncio.CancelledError:
                            continue
                    closed.set()

        stream = AssistantService(repository, runner).stream(
            a[2], cid, mid, "synthetic-not-a-session", []
        )
        await anext(stream)
        await started.wait()
        try:
            with anyio.fail_after(4):
                await stream.aclose()
            assert not closed.is_set()
            rows = repository.page(a[2], 1, 20, cid)["items"]
            assert (
                next(row["status"] for row in rows if row["id"] == mid) == "interrupted"
            )
        finally:
            release.set()
            with anyio.fail_after(1):
                await closed.wait()

    asyncio.run(exercise())


def test_parent_task_cancellation_propagates_after_pg_cleanup(
    assistant_actors, pg_engine
):
    a, _ = assistant_actors
    repository = Repository(pg_engine)
    cid = repository.create(a[2], "Parent cancellation fixture")["id"]
    mid = repository.begin(
        a[2],
        cid,
        MessageCreate(content="controlled fixture", client_request_id=uuid4()),
    )

    async def exercise():
        started = anyio.Event()
        closed = anyio.Event()

        async def runner(raw, history, emit, conversation_id):
            started.set()
            try:
                await anyio.sleep_forever()
            finally:
                await anyio.sleep(0)
                closed.set()

        async def consume():
            async for _ in AssistantService(repository, runner).stream(
                a[2], cid, mid, "synthetic-not-a-session", []
            ):
                pass

        consumer = asyncio.create_task(consume())
        await started.wait()
        consumer.cancel()
        with pytest.raises(asyncio.CancelledError):
            await consumer
        assert closed.is_set()
        rows = repository.page(a[2], 1, 20, cid)["items"]
        assert next(row["status"] for row in rows if row["id"] == mid) == "interrupted"

    asyncio.run(exercise())


def test_cancel_scope_shielded_reference_can_finish_real_pg(
    assistant_actors, pg_engine
):
    """Control experiment only, not a substitute for passing service/ASGI gates."""
    a, _ = assistant_actors
    repository = Repository(pg_engine)
    cid = repository.create(a[2], "Shielded control fixture")["id"]
    mid = repository.begin(
        a[2],
        cid,
        MessageCreate(content="controlled fixture", client_request_id=uuid4()),
    )
    probe = FinishProbe(repository)

    async def exercise():
        stages = []
        with anyio.CancelScope() as cancelled_scope:
            cancelled_scope.cancel()
            stages.append("scope_cancelled")
            # Bound the waiting task; this does not claim a running PG thread can
            # be killed. Production cleanup also needs appropriate DB timeouts.
            with anyio.move_on_after(1, shield=True) as guard:
                await anyio.to_thread.run_sync(
                    probe.finish,
                    a[2],
                    cid,
                    mid,
                    "",
                    "interrupted",
                    [],
                    abandon_on_cancel=True,
                )
                stages.append("shielded_finish_returned")
            assert not guard.cancel_called
        rows = repository.page(a[2], 1, 20, cid)["items"]
        status = next(row["status"] for row in rows if row["id"] == mid)
        print(
            json.dumps(
                {"stages": stages, "finish_flags": probe.flags, "status": status}
            )
        )
        assert status == "interrupted"
        assert probe.flags == ["finish_enter_interrupted", "finish_returned"]

    asyncio.run(exercise())
