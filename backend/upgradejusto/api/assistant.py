"""I HTTP contract: cookie + CSRF before SSE headers, no client identity."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.exc import SQLAlchemyError

from upgradejusto.api.auth import COOKIE
from upgradejusto.api.pcs import owner
from upgradejusto.api.proxy_ip import client_ip
from upgradejusto.assistant.models import ConversationCreate, MessageCreate
from upgradejusto.assistant.repository import Repository
from upgradejusto.assistant.service import AssistantService
from upgradejusto.persistence.runtime import runtime_engine

router = APIRouter(
    prefix="/api/conversations", tags=["assistant"], dependencies=[Depends(client_ip)]
)


def service():
    return AssistantService(Repository(runtime_engine()))


def pg_call(method, *args):
    try:
        return method(*args)
    except SQLAlchemyError:
        raise HTTPException(503, "History unavailable") from None


@router.post("", status_code=201)
def create(data: ConversationCreate, identity=Depends(owner), svc=Depends(service)):
    return pg_call(svc.repository.create, identity, data.title)


@router.get("")
def list_conversations(
    page: Annotated[int, Query(ge=1, le=10000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 20,
    identity=Depends(owner),
    svc=Depends(service),
):
    return pg_call(svc.repository.page, identity, page, page_size)


@router.get("/{conversation_id}")
def get(conversation_id: UUID, identity=Depends(owner), svc=Depends(service)):
    return pg_call(svc.repository.get, identity, conversation_id)


@router.get("/{conversation_id}/messages")
def messages(
    conversation_id: UUID,
    page: Annotated[int, Query(ge=1, le=10000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 20,
    identity=Depends(owner),
    svc=Depends(service),
):
    return pg_call(svc.repository.page, identity, page, page_size, conversation_id)


@router.post("/{conversation_id}/messages")
def send(
    conversation_id: UUID,
    data: MessageCreate,
    request: Request,
    identity=Depends(owner),
    svc=Depends(service),
):
    # Reserve and read history under the same PG lock/transaction.
    mid, history = pg_call(svc.repository.begin, identity, conversation_id, data, True, True)
    return StreamingResponse(
        svc.stream(identity, conversation_id, mid, request.cookies[COOKIE], history),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


@router.delete("/{conversation_id}", status_code=204)
def delete(conversation_id: UUID, identity=Depends(owner), svc=Depends(service)):
    pg_call(svc.repository.delete, identity, conversation_id)
