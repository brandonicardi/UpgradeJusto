"""TEST-only Uvicorn target; synthetic error routes require explicit child opt-in."""

import os
import re


def require_test_runtime():
    value = os.environ.get("DATABASE_URL")
    if (
        os.environ.get("UJ_ENV") != "test"
        or not value
        or value != os.environ.get("TEST_DATABASE_URL")
    ):
        raise RuntimeError("Share runtime probe requires the matched TEST environment")


def error_probe_markers():
    flag = os.environ.get("UJ_TEST_SHARE_ERROR_PROBE", "0")
    if flag == "0":
        return None
    if flag != "1":
        raise RuntimeError("Share error probe requires explicit TEST opt-in")
    before = os.environ.get("UJ_TEST_SHARE_ERROR_BEFORE_TOKEN", "")
    after = os.environ.get("UJ_TEST_SHARE_ERROR_AFTER_TOKEN", "")
    if (
        re.fullmatch(r"[A-Za-z0-9_-]{43}", before, re.ASCII) is None
        or re.fullmatch(r"[A-Za-z0-9_-]{43}", after, re.ASCII) is None
        or before == after
    ):
        raise RuntimeError("Share error probe requires distinct synthetic TEST markers")
    return before, after


def create_app():
    # Refuse before importing production composition or opening any resources.
    require_test_runtime()
    markers = error_probe_markers()
    from upgradejusto.api.tower_shares import public_ingress, public_router, router
    from upgradejusto.main import app as production

    paths = {getattr(route, "path", "") for route in production.router.routes}
    if markers is not None:
        # Literal selectors must precede public catch-all, only in a fresh TEST child.
        if "/api/shared-tower-plans/{token}" in paths:
            raise RuntimeError("Share error probe requires a fresh TEST factory")
        import asyncio

        from fastapi import APIRouter, Depends
        from fastapi.responses import StreamingResponse

        before, after = markers
        error_routes = APIRouter(dependencies=[Depends(public_ingress)])
        note = "synthetic-private-share-note@example.invalid"

        def fail_before_start():
            raise RuntimeError("Synthetic TEST before-start: " + before + ":" + note)

        @error_routes.get(
            "/api/shared-tower-plans/" + before,
            dependencies=[Depends(fail_before_start)],
            include_in_schema=False,
        )
        def before_start():
            return {"unreachable": True}

        @error_routes.get("/api/shared-tower-plans/" + after, include_in_schema=False)
        def after_start():
            async def interrupted_stream():
                yield b"data: synthetic-start\n\n"
                await asyncio.sleep(0.01)
                print("TEST_SHARE_STREAM_ERROR_REACHED", flush=True)
                raise RuntimeError("Synthetic TEST after-start: " + after + ":" + note)

            return StreamingResponse(
                interrupted_stream(), media_type="text/event-stream"
            )

        # Same signed/direct ingress as business GET; no fake identity/service/quota.
        production.include_router(error_routes)
    if "/api/tower-plans/{plan_id}/shares" not in paths:
        production.include_router(router)
    if "/api/shared-tower-plans/{token}" not in paths:
        production.include_router(public_router)
    return production


app = create_app()
