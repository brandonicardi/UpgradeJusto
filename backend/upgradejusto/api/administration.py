"""Admin HTTP: fresh server role on every endpoint, existing session/CSRF controls."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from upgradejusto.administration.models import (
    Collection,
    PublishInput,
    RevisionInput,
    RowInput,
)
from upgradejusto.administration.repository import AdministrationRepository
from upgradejusto.administration.service import AdministrationService
from upgradejusto.api.pcs import owner
from upgradejusto.api.proxy_ip import client_ip
from upgradejusto.persistence.runtime import runtime_engine

router = APIRouter(
    prefix="/api/admin", tags=["administration"], dependencies=[Depends(client_ip)]
)
Limit = Annotated[int, Query(ge=1, le=100)]
Offset = Annotated[int, Query(ge=0)]


def service():
    return AdministrationService(AdministrationRepository(runtime_engine()))


def administrator(identity=Depends(owner), svc=Depends(service)):
    svc.repository.authorize(identity)
    return identity


@router.get("/revisions")
def list_revisions(
    limit: Limit = 25,
    offset: Offset = 0,
    identity=Depends(administrator),
    svc=Depends(service),
):
    return svc.list(identity, None, None, limit, offset)


@router.post("/revisions", status_code=201)
def create_revision(
    data: RevisionInput, identity=Depends(administrator), svc=Depends(service)
):
    return svc.create(identity, data)


@router.post("/revisions/{revision_id}/publish")
def publish(
    revision_id: str,
    data: PublishInput,
    identity=Depends(administrator),
    svc=Depends(service),
):
    return svc.publish(identity, revision_id, data)


@router.get("/revisions/{revision_id}/{collection}")
def list_rows(
    revision_id: str,
    collection: Collection,
    limit: Limit = 25,
    offset: Offset = 0,
    identity=Depends(administrator),
    svc=Depends(service),
):
    return svc.list(identity, revision_id, collection, limit, offset)


@router.post("/revisions/{revision_id}/{collection}", status_code=201)
def create_row(
    revision_id: str,
    collection: Collection,
    data: RowInput,
    identity=Depends(administrator),
    svc=Depends(service),
):
    return svc.write(identity, revision_id, collection, data.data)


@router.patch("/revisions/{revision_id}/{collection}/{row_id}")
def update_row(
    revision_id: str,
    collection: Collection,
    row_id: str,
    data: RowInput,
    identity=Depends(administrator),
    svc=Depends(service),
):
    return svc.write(identity, revision_id, collection, data.data, row_id)


@router.delete("/revisions/{revision_id}/{collection}/{row_id}", status_code=204)
def delete_row(
    revision_id: str,
    collection: Collection,
    row_id: str,
    identity=Depends(administrator),
    svc=Depends(service),
):
    svc.write(identity, revision_id, collection, row_id=row_id, delete=True)
