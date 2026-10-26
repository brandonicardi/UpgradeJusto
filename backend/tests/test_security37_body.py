"""Pure ASGI ingress tests: actual chunks, absolute deadline, no provider/PG."""

import asyncio

import pytest

from upgradejusto.api import body_limits
from upgradejusto.api.body_limits import BodyLimits


def run(
    chunks,
    *,
    path="/api/auth/login",
    headers=(),
    delay=0,
    timeout=0.03,
    downstream_delay=0,
):
    async def exercise():
        sent, called, received = [], [], []
        messages = iter(chunks)

        async def receive():
            await asyncio.sleep(delay)
            return next(messages)

        async def send(message):
            sent.append(message)

        async def app(scope, receive, send):
            called.append(True)
            received.append(await receive())
            await asyncio.sleep(downstream_delay)
            await send({"type": "http.response.start", "status": 200, "headers": []})
            await send({"type": "http.response.body", "body": b"ok"})

        await BodyLimits(app, timeout_seconds=timeout)(
            {"type": "http", "path": path, "headers": headers}, receive, send
        )
        return sent, called, received

    return asyncio.run(exercise())


@pytest.mark.parametrize(
    "headers", [(), ((b"content-length", b"1"),), ((b"content-length", b"0"),)]
)
def test_actual_chunk_bytes_not_declared_length(headers):
    sent, called, _ = run(
        [
            {"type": "http.request", "body": b"a" * 8192, "more_body": True},
            {"type": "http.request", "body": b"b", "more_body": False},
        ],
        headers=headers,
    )
    assert sent[0]["status"] == 413 and not called


@pytest.mark.parametrize(
    "path,limit",
    [
        ("/api/pcs", 262144),
        ("/api/auth/register", 8192),
        ("/api/conversations/example/messages", 32768),
        ("/api/pcs/extract", 65536),
    ],
)
def test_caps_exact_and_one_byte_over(path, limit):
    sent, called, received = run(
        [{"type": "http.request", "body": b"x" * limit}], path=path
    )
    assert sent[0]["status"] == 200 and called and len(received[0]["body"]) == limit
    sent, called, _ = run(
        [{"type": "http.request", "body": b"x" * (limit + 1)}], path=path
    )
    assert sent[0]["status"] == 413 and not called


def test_absolute_deadline_is_not_reset_per_chunk():
    sent, called, _ = run(
        [{"type": "http.request", "body": b"a", "more_body": True}] * 5, delay=0.02
    )
    assert sent[0]["status"] == 408 and not called


def test_disconnect_and_external_cancel_never_reach_parser():
    sent, called, _ = run([{"type": "http.disconnect"}])
    assert not sent and not called

    async def exercise():
        async def forbidden(*args):
            pytest.fail("Disconnected request reached parser")

        async def receive():
            raise asyncio.CancelledError

        with pytest.raises(asyncio.CancelledError):
            await BodyLimits(forbidden)(
                {"type": "http", "path": "/", "headers": []}, receive, forbidden
            )

    asyncio.run(exercise())


def test_request_deadline_does_not_time_application_or_sse():
    sent, called, _ = run(
        [{"type": "http.request", "body": b"{}"}], downstream_delay=0.06
    )
    assert sent[0]["status"] == 200 and called


def test_early_declared_oversize_and_invalid_length():
    assert run([], headers=((b"content-length", b"999999"),))[0][0]["status"] == 413
    assert run([], headers=((b"content-length", b"bad"),))[0][0]["status"] == 400


def test_late_eof_rejected_before_timeout_callback_can_dispatch(monkeypatch):
    # Scheduler time stays real: only the guard's monotonic clock advances.
    # EOF returns without a suspension, so no scheduled timer callback is needed.
    clock = [100.0]
    monkeypatch.setattr(body_limits, "monotonic", lambda: clock[0])

    async def exercise():
        sent, called = [], []

        async def receive():
            clock[0] = 105.000001
            return {"type": "http.request", "body": b"{}", "more_body": False}

        async def app(*args):
            called.append(True)

        async def send(message):
            sent.append(message)

        await BodyLimits(app)(
            {"type": "http", "path": "/api/pcs", "headers": []}, receive, send
        )
        assert sent[0]["status"] == 408 and not called

    asyncio.run(exercise())


def test_expired_clock_prevents_starting_next_receive(monkeypatch):
    async def exercise():
        async def receive():
            pytest.fail("Expired deadline started a receive")

        monkeypatch.setattr(body_limits, "monotonic", lambda: 6.0)
        with pytest.raises(TimeoutError):
            await body_limits._receive_before_deadline(receive, 5.0)

    asyncio.run(exercise())


def test_delayed_receive_cancellation_does_not_delay_408_and_late_error_is_drained(
    monkeypatch,
):
    async def exercise():
        cancelled, release = asyncio.Event(), asyncio.Event()
        held, drained, sent, called = [], [], [], []
        consume = body_limits._consume_receive_result

        def probe(task):
            consume(task)
            drained.append(task.done())

        monkeypatch.setattr(body_limits, "_consume_receive_result", probe)

        async def receive():
            held.append(asyncio.current_task())
            try:
                await asyncio.Event().wait()
            except asyncio.CancelledError:
                cancelled.set()
                await release.wait()
                raise RuntimeError("Synthetic late receive failure")

        async def app(*args):
            called.append(True)

        async def send(message):
            sent.append(message)

        try:
            await asyncio.wait_for(
                BodyLimits(app, timeout_seconds=0.01)(
                    {"type": "http", "path": "/api/pcs", "headers": []},
                    receive,
                    send,
                ),
                timeout=0.5,
            )
            assert sent[0]["status"] == 408 and not called
            await asyncio.wait_for(cancelled.wait(), timeout=0.5)
            assert held and not held[0].done()
        finally:
            release.set()
            await asyncio.wait_for(
                asyncio.gather(*held, return_exceptions=True), timeout=0.5
            )
            await asyncio.sleep(0)
        assert drained == [True]
        assert all(task.done() for task in held)

    asyncio.run(exercise())


def test_external_request_cancel_cancels_pending_receive_without_downstream():
    async def exercise():
        started, cancelled = asyncio.Event(), asyncio.Event()

        async def receive():
            started.set()
            try:
                await asyncio.Event().wait()
            finally:
                cancelled.set()

        async def forbidden(*args):
            pytest.fail("Cancelled request reached downstream or sent a response")

        request = asyncio.create_task(
            BodyLimits(forbidden)(
                {"type": "http", "path": "/api/pcs", "headers": []},
                receive,
                forbidden,
            )
        )
        await started.wait()
        request.cancel()
        with pytest.raises(asyncio.CancelledError):
            await request
        await asyncio.wait_for(cancelled.wait(), timeout=0.5)
        await asyncio.sleep(0)

    asyncio.run(exercise())
