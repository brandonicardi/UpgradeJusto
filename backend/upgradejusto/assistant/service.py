"""Turn lifecycle: persisted start, bounded streaming, explicit failure states."""

import asyncio
import json

import anyio
from fastapi.encoders import jsonable_encoder

from .graph import RoundLimit, ToolFailure, run_turn

# Cleanup budgets, not increases to provider/turn timeouts. A stalled MCP close
# must not prevent the independent pending->interrupted transaction.
CLOSE_SECONDS = 2
PERSIST_SECONDS = 3


def consume_task_result(task):
    """Drain a late teardown exception without logging private provider details."""
    try:
        task.result()
    except BaseException:
        pass


class AssistantService:
    def __init__(self, repository, runner=run_turn):
        self.repository = repository
        self.runner = runner

    async def release_provider(self, owner, message_id):
        # No-op only for pure unit repository doubles; production Repository
        # implements owner-scoped PG release. Failed PG cleanup leaves TTL intact.
        release = getattr(self.repository, "release_provider", None)
        if release is not None:
            with anyio.CancelScope(shield=True):
                try:
                    await anyio.to_thread.run_sync(release, owner, message_id)
                except Exception:
                    pass

    async def stream(self, owner, identity, message_id, raw, history):
        queue = asyncio.Queue(maxsize=64)
        content = ""
        citations = []
        sequence = 0
        closing = False

        def event(kind, data):
            nonlocal sequence
            sequence += 1
            payload = {**data, "message_id": str(message_id), "sequence": sequence}
            return f"event: {kind}\ndata: {json.dumps(jsonable_encoder(payload), ensure_ascii=False)}\n\n"

        async def emit(kind, data):
            nonlocal content
            if closing:
                raise asyncio.CancelledError
            if kind == "delta":
                if len(content) + len(data["text"]) > 32000:
                    raise ToolFailure("output_limit")
                content += data["text"]
            elif kind == "citation":
                # Only public, bounded fields, no provider metadata.
                required = {"source_id", "url", "title", "locator", "excerpt"}
                if not required.issubset(data) or len(citations) >= 20:
                    raise ToolFailure("invalid_citation")
                data = {
                    k: str(v)[:2000]
                    for k, v in data.items()
                    if k in required | {"revision"}
                }
                citations.append(data)
            await queue.put((kind, data))

        async def produce():
            try:
                async with asyncio.timeout(90):
                    await self.runner(raw, history, emit, identity)
                if closing:
                    raise asyncio.CancelledError
                await asyncio.to_thread(
                    self.repository.finish,
                    owner,
                    identity,
                    message_id,
                    content,
                    "completed",
                    citations,
                )
                await queue.put(("done", {"status": "completed"}))
            except asyncio.CancelledError:
                # The generator owns interruption, including cancellation before
                # this coroutine gets its first execution step.
                raise
            except Exception as exc:
                if closing:
                    # A teardown failure after disconnect is interruption, not
                    # another visible generation result or a queue write.
                    raise asyncio.CancelledError from None
                code = (
                    "round_limit"
                    if isinstance(exc, RoundLimit)
                    else "generation_failed"
                )
                try:
                    await asyncio.to_thread(
                        self.repository.finish,
                        owner,
                        identity,
                        message_id,
                        content,
                        "failed",
                        citations,
                    )
                except Exception:
                    code = "history_unavailable"
                await queue.put(("error", {"code": code, "retryable": False}))
            finally:
                await self.release_provider(owner, message_id)
                # Avoid cancellation deadlock if disconnected with a full queue.
                if not closing and not asyncio.current_task().cancelling():
                    await queue.put(None)

        task = asyncio.create_task(produce())
        try:
            yield event("start", {})
            while True:
                item = await queue.get()
                if item is None:
                    break
                yield event(*item)
        finally:
            closing = True
            # Shield against AnyIO level cancellation before awaiting the child;
            # otherwise awaiting it in a cancelled scope re-cancels its async
            # teardown at every checkpoint. asyncio.shield alone is insufficient.
            with anyio.CancelScope(shield=True):
                try:
                    if not task.done():
                        task.cancel()
                    with anyio.move_on_after(CLOSE_SECONDS):
                        try:
                            await asyncio.shield(task)
                        except asyncio.CancelledError:
                            if not task.cancelled():
                                raise
                    if not task.done():
                        # Grace expired: do not await an uncooperative MCP close.
                        task.cancel()
                        task.add_done_callback(consume_task_result)
                finally:
                    if task.done():
                        await self.release_provider(owner, message_id)
                    # Independent of whether produce started or closed cleanly.
                    # Snapshots cannot change after closing=True: emit rejects.
                    try:
                        with anyio.move_on_after(PERSIST_SECONDS):
                            await anyio.to_thread.run_sync(
                                self.repository.interrupt_pending,
                                owner,
                                identity,
                                message_id,
                                content,
                                [dict(citation) for citation in citations],
                                abandon_on_cancel=True,
                            )
                    except Exception:
                        # PG failure cannot become done/success. Exclusive
                        # startup recovery remains the last resort for pending.
                        pass
