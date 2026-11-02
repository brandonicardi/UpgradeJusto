"""Scoped share headers/errors; no routing, logging, buffering or identity changes."""

import re

SHARE_HEADERS = (
    (b"cache-control", b"no-store"),
    (b"referrer-policy", b"no-referrer"),
    (b"x-content-type-options", b"nosniff"),
    (b"x-robots-tag", b"noindex, nofollow"),
)
PRIVATE_SHARE = re.compile(
    r"/api/tower-plans/"
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
    r"/shares(?:/.*)?\Z"
)


def share_path(path):
    return (
        path == "/api/shared-tower-plans"
        or path.startswith("/api/shared-tower-plans/")
        or PRIVATE_SHARE.fullmatch(path) is not None
    )


class ShareResponseInterrupted(RuntimeError):
    def __init__(self):
        super().__init__("Public share response interrupted")


class TowerShareBoundary:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not share_path(scope.get("path", "")):
            return await self.app(scope, receive, send)
        started = False

        async def safe_send(message):
            nonlocal started
            if message["type"] == "http.response.start":
                names = {name for name, _ in SHARE_HEADERS}
                headers = [
                    (key, value)
                    for key, value in message.get("headers", [])
                    if key.lower() not in names
                ]
                message = {**message, "headers": [*headers, *SHARE_HEADERS]}
                # Treat an attempted start as committed even if transport send fails.
                # Never attempt a second start on a partially written response.
                started = True
            await send(message)

        try:
            return await self.app(scope, receive, safe_send)
        except Exception:
            if not started:
                # ServerErrorMiddleware is OUTSIDE user middleware. Handle only this
                # pre-start share failure here so its outer500 cannot omit headers.
                # Never retain/render/log the error, request target or original body.
                body = b'{"detail":"Internal server error"}'
                await safe_send(
                    {
                        "type": "http.response.start",
                        "status": 500,
                        "headers": [
                            (b"content-type", b"application/json"),
                            (b"content-length", str(len(body)).encode("ascii")),
                        ],
                    }
                )
                await safe_send({"type": "http.response.body", "body": body})
                return
        # Leave the except FIRST: "from None" inside it would only suppress display
        # while retaining the original object in __context__. No error variable or
        # original traceback is attached to this new fixed exception. No second send.
        # BaseException/cancellation and non-share errors never enter this branch.
        raise ShareResponseInterrupted() from None
