"""Read-only MCP service bindings; session owner is supplied by server adapter."""

from upgradejusto.compatibility.application import CompatibilityService
from upgradejusto.compatibility.tower_application import (
    TowerCompatibilityService,
    TowerEvaluationRepository,
)
from upgradejusto.pcs.service import PCError
from upgradejusto.pcs.tower_repository import TowerRepository
from upgradejusto.pcs.tower_service import TowerService
from upgradejusto.recommendations.service import RecommendationService
from upgradejusto.recommendations.tower_repository import TowerRecommendationRepository
from upgradejusto.recommendations.tower_service import TowerRecommendationService


class TowerReadTools:
    def __init__(self, engine, catalog, pcs):
        self.catalog, self.pcs = catalog, pcs
        version = catalog.repository.dataset_version
        self.towers = TowerService(TowerRepository(engine, version), catalog)
        self.compatibility = TowerCompatibilityService(
            TowerEvaluationRepository(engine, version), catalog
        )
        self.recommendations = TowerRecommendationService(
            TowerRecommendationRepository(engine, version)
        )

    def get_pc(self, owner, identity):
        tower = self.towers.get(owner, identity)
        if tower.origin_schema == 2:
            return {"configuration_schema": 2, "data": tower.model_dump(mode="json")}
        return self.pcs.get(owner, identity).model_dump(mode="json")

    def select_schema(self, owner, identity, schema):
        actual = self.towers.get(owner, identity)
        if actual.origin_schema != schema:
            raise PCError(409, "PC configuration schema conflict")

    def evaluate(self, owner, selection):
        self.select_schema(owner, selection.pc_id, selection.configuration_schema)
        svc = (
            self.compatibility
            if selection.configuration_schema == 2
            else CompatibilityService(self.pcs, self.catalog)
        )
        result = svc.run(owner, selection.pc_id, selection.data).model_dump(mode="json")
        return (
            {"configuration_schema": 2, "data": result}
            if selection.configuration_schema == 2
            else result
        )

    def preview(self, owner, selection):
        self.select_schema(owner, selection.pc_id, selection.configuration_schema)
        svc = (
            self.recommendations
            if selection.configuration_schema == 2
            else RecommendationService(self.pcs, self.catalog)
        )
        result = svc.preview(owner, selection.pc_id, selection.data).model_dump(
            mode="json"
        )
        return (
            {"configuration_schema": 2, "data": result}
            if selection.configuration_schema == 2
            else result
        )
