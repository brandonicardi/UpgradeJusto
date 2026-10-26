"""H servidor genera capacidad criptográfica; herramientas no eligen identidad/token."""

import hashlib
import re
import secrets

from upgradejusto.pcs.service import PCError

from .models import PublishedShare, SharePage
from .projection import public_snapshot


def token_digest(token):
    return hashlib.sha256(token.encode("ascii")).hexdigest()


class ShareService:
    def __init__(self, repository):
        self.repository = repository

    def publish(self, owner, identity, request):
        token = secrets.token_urlsafe(32)
        metadata = self.repository.publish(
            owner,
            identity,
            request,
            token_digest(token),
            public_snapshot,
        )
        return PublishedShare(
            id=metadata.id,
            plan_revision=metadata.plan_revision,
            title=metadata.title,
            created_at=metadata.created_at,
            path=f"/shared/{token}",
        )

    def list(self, owner, identity):
        return SharePage(items=self.repository.list(owner, identity))

    def revoke(self, owner, identity, share_id):
        self.repository.revoke(owner, identity, share_id)

    def public(self, token):
        if not re.fullmatch(r"[A-Za-z0-9_-]{43}", token):
            raise PCError(404, "Shared plan not found")
        snapshot = self.repository.public(token_digest(token))
        if snapshot is None:
            raise PCError(404, "Shared plan not found")
        return snapshot
