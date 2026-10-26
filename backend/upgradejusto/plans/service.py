"""Servicio G controla recálculo explícito y acceso privado a snapshots."""

from upgradejusto.pcs.service import PCError

from .calculation import calculate_plan


class PlanService:
    def __init__(self, repository, catalog):
        self.repository, self.catalog = repository, catalog

    def get(self, owner, identity):
        plan = self.repository.get(owner, identity)
        if plan is None:
            raise PCError(404, "Plan not found")
        return plan

    def list(self, owner, page, page_size):
        return self.repository.list(owner, page, page_size)

    def save(self, owner, data, identity=None):
        def calculate(pc):
            catalog = self.catalog.resolution_snapshot()
            return calculate_plan(
                pc, data, catalog, self.catalog.repository.dataset_version
            )

        return self.repository.save(owner, data, calculate, identity)

    def delete(self, owner, identity):
        if not self.repository.delete(owner, identity):
            raise PCError(404, "Plan not found")
