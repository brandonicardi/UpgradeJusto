"""Read frozen owned plan formats; no recosting, writes or model authority."""

from upgradejusto.pcs.service import PCError
from upgradejusto.plans.repository import PlanRepository
from upgradejusto.plans.service import PlanService
from upgradejusto.plans.tower_models import TowerPlanRead
from upgradejusto.plans.tower_repository import TowerPlanRepository
from upgradejusto.plans.tower_service import TowerPlanService


def read_owned_plan(engine, catalog, owner, identity):
    legacy = None
    tower = None
    try:
        legacy = PlanService(PlanRepository(engine), catalog).get(owner, identity)
    except PCError as exc:
        if exc.status != 404:
            raise
    try:
        raw = TowerPlanService(TowerPlanRepository(engine)).get(
            owner, identity, revision=None
        )
        tower = TowerPlanRead.model_validate(raw).model_dump(mode="json")
    except PCError as exc:
        if exc.status != 404:
            raise
    if legacy is not None and tower is not None:
        raise PCError(409, "Ambiguous owned plan identity")
    if tower is not None:
        return {"configuration_schema": 2, "data": tower}
    if legacy is not None:
        return legacy.model_dump(mode="json")
    raise PCError(404, "Plan not found")
