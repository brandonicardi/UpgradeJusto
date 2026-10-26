"""Application deadlines, canonical request hashes and snapshot size guards."""

import hashlib
import json
from datetime import datetime
from time import monotonic

from upgradejusto.pcs.service import PCError
from upgradejusto.recommendations.tower_service import canonical_actions

from .tower_calculation import finish_snapshot, iter_stages


def canonical_request(request):
    data = request.model_dump(mode="json")
    for target, stage in zip(data["stages"], request.stages, strict=True):
        target["actions"] = canonical_actions(stage.actions)
    return data


def request_hash(request):
    raw = json.dumps(
        canonical_request(request),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    ).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


class Generation:
    def __init__(self, request, clock=monotonic):
        self.request, self.clock = request, clock
        self.deadline = clock() + 5

    def check(self):
        if self.clock() >= self.deadline:
            raise PCError(408, "Plan generation timed out")

    def calculate(self, tower, catalog, version, now):
        self.check()
        stages = []
        for stage in iter_stages(tower, self.request, catalog, version, now):
            self.check()
            stages.append(stage)
        snapshot = finish_snapshot(tower, self.request, catalog, version, now, stages)
        encoded = json.dumps(snapshot, ensure_ascii=False, allow_nan=False).encode(
            "utf-8"
        )
        if len(encoded) > 1048576:
            raise PCError(422, "Tower plan snapshot too large")
        self.check()
        return snapshot

    def before_commit(self, snapshot, now):
        self.check()
        for stage in snapshot["stages"]:
            for quote in stage["offers"]:
                if datetime.fromisoformat(quote["expires_at"]) <= now:
                    raise PCError(
                        409, "Plan quote expired; explicitly retry generation"
                    )


class TowerPlanService:
    def __init__(self, repository):
        self.repository = repository

    def save(self, owner, request, identity=None):
        generation = Generation(request)
        return self.repository.save(
            owner, request, request_hash(request), generation, identity
        )

    def get(self, owner, identity, revision=None):
        return self.repository.get(owner, identity, revision)

    def list(self, owner, page, page_size):
        return self.repository.list(owner, page, page_size)

    def delete(self, owner, identity, expected_revision):
        self.repository.delete(owner, identity, expected_revision)
