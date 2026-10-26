"""Pure ASGI ingress guard: bounded actual bytes and absolute read deadline.

Only request ingestion is timed; application processing and SSE are not wrapped.
"""

import asyncio
import json
from time import monotonic


def _consume_receive_result(task):
    """Drain abandoned receive completion, including late errors/cancellation."""
    try:
        task.result()
    except BaseException:
        pass


async def _receive_before_deadline(receive, deadline):
    remaining = deadline - monotonic()
    if remaining <= 0:
        raise TimeoutError
    task = asyncio.ensure_future(receive())
    try:
        # wait does not wait for a cancellation-resistant receive to unwind.
        done, _ = await asyncio.wait({task}, timeout=remaining)
        # Check the clock even when EOF won the scheduling race against a timer.
        if not done or monotonic() >= deadline:
            raise TimeoutError
        return task.result()
    except BaseException:
        if not task.done():
            task.cancel()
        task.add_done_callback(_consume_receive_result)
        raise


class BodyLimits:
    def __init__(self, app, timeout_seconds=5):
        self.app, self.timeout_seconds = app, timeout_seconds

    @staticmethod
    def limit(path):
        if path.startswith("/api/auth/"):
            return 8192
        if path.startswith("/api/conversations/") and path.endswith("/messages"):
            return 32768
        if path == "/api/pcs/extract":
            return 65536
        if path == "/api/towers/extract":
            return 65536
        return 262144

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        deadline = monotonic() + self.timeout_seconds
        limit = self.limit(scope.get("path", ""))

        async def reject(status, detail):
            body = json.dumps({"detail": detail}).encode()
            await send(
                {
                    "type": "http.response.start",
                    "status": status,
                    "headers": [
                        (b"content-type", b"application/json"),
                        (b"cache-control", b"no-store"),
                        (b"content-length", str(len(body)).encode()),
                    ],
                }
            )
            await send({"type": "http.response.body", "body": body})

        lengths = [
            value
            for key, value in scope.get("headers", [])
            if key.lower() == b"content-length"
        ]
        if lengths:
            if len(lengths) != 1 or not lengths[0].isdigit():
                return await reject(400, "Invalid Content-Length")
            # Bound decimal parsing too; Content-Length never replaces byte counting.
            if len(lengths[0]) > 12 or int(lengths[0]) > limit:
                return await reject(413, "Request body too large")
        buffer = bytearray()
        failure = None
        try:
            while True:
                message = await _receive_before_deadline(receive, deadline)
                if message["type"] == "http.disconnect":
                    return
                if message["type"] != "http.request":
                    failure = (400, "Invalid request body")
                    break
                chunk = message.get("body", b"")
                if len(buffer) + len(chunk) > limit:
                    failure = (413, "Request body too large")
                    break
                buffer.extend(chunk)
                if not message.get("more_body", False):
                    break
                await asyncio.sleep(0)
        except TimeoutError:
            return await reject(408, "Request body timed out")
        if failure:
            return await reject(*failure)
        if monotonic() >= deadline:
            return await reject(408, "Request body timed out")
        delivered = False

        async def bounded_receive():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {
                    "type": "http.request",
                    "body": bytes(buffer),
                    "more_body": False,
                }
            return await receive()

        return await self.app(scope, bounded_receive, send)
