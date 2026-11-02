"""Bounded projection and bearer orchestration; no token in exception messages."""

import hashlib
import ipaddress
import json
import re
import secrets
from time import monotonic

from sqlalchemy.exc import SQLAlchemyError

from upgradejusto.pcs.service import PCError

from .tower_projection import TowerPublicProjection

MAX_BYTES = 1024 * 1024
TOKEN = re.compile(r"[A-Za-z0-9_-]{43}", re.ASCII)


class ReadBudgetExceeded(PCError):
    def __init__(self, retry_after):
        super().__init__(429, "Too many requests")
        self.retry_after = retry_after


def token_digest(token):
    return hashlib.sha256(token.encode("ascii")).hexdigest()


class ProjectionGeneration:
    def __init__(self):
        self.deadline = monotonic() + 5

    def check(self):
        if monotonic() >= self.deadline:
            raise PCError(503, "Share generation unavailable")

    def project(self, private, title, sources, revision, now):
        self.check()
        # Reject, never truncate; also bounds work before pure traversal.
        encoded = json.dumps(private, ensure_ascii=True, allow_nan=False).encode(
            "utf-8"
        )
        if len(encoded) > MAX_BYTES:
            raise PCError(422, "Share payload limit exceeded")
        projection = TowerPublicProjection(private, title, sources, revision, now)
        stages = []
        for stage in projection.stages():
            self.check()
            stages.append(stage)
        self.check()
        result = projection.finish(stages)
        encoded = json.dumps(result, ensure_ascii=True, allow_nan=False).encode("utf-8")
        self.check()
        if len(encoded) > MAX_BYTES:
            raise PCError(422, "Share payload limit exceeded")
        return result


def guarded(operation):
    try:
        return operation()
    except PCError:
        raise
    except SQLAlchemyError:
        raise PCError(503, "Share storage unavailable") from None
    except (ValueError, TypeError, KeyError, AttributeError, OverflowError):
        raise PCError(422, "Tower share projection unavailable") from None


class TowerShareService:
    def __init__(self, repository):
        self.repository = repository

    def publish(self, owner, identity, request):
        def create():
            generation = ProjectionGeneration()
            token = secrets.token_urlsafe(32)
            metadata = self.repository.publish(
                owner, identity, request, token_digest(token), generation
            )
            return {**metadata, "token": token}

        return guarded(create)

    def list(self, owner, identity):
        return guarded(lambda: self.repository.list(owner, identity))

    def revoke(self, owner, identity, share_id, captured_revision):
        return guarded(
            lambda: self.repository.revoke(owner, identity, share_id, captured_revision)
        )

    def public(self, token, verified_ip):
        def read():
            ip = ipaddress.ip_address(verified_ip).compressed
            key = hashlib.sha256(
                ("tower-share-read-1:" + ip).encode("ascii")
            ).hexdigest()
            allowed, retry = self.repository.consume_read(key)
            if not allowed:
                raise ReadBudgetExceeded(retry)
            if type(token) is not str or TOKEN.fullmatch(token) is None:
                raise PCError(404, "Shared plan not found")
            return self.repository.public(token_digest(token))

        return guarded(read)
