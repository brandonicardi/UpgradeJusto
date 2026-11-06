"""Tower orchestration: owner/revision checks, pinned publication, no writes."""

from uuid import uuid4

from pydantic import ValidationError

from upgradejusto.pcs.service import PCError
from upgradejusto.pcs.tower_models import Tower, TowerLine
from upgradejusto.pcs.tower_repository import TowerRepository

from .tower_essential import evaluate_tower_essential
from .tower_evidence import resolve_tower_evidence
from .tower_http_models import TowerEvaluationResponse, TowerSimulationDTO


class TowerEvaluationRepository(TowerRepository):
    def get_for_evaluation(self, owner, identity, expected_revision):
        with self.engine.begin() as conn:
            # Owner lookup precedes revision/catalog details: foreign IDs stay404.
            row = self._header(conn, owner, identity)
            if row is None:
                raise PCError(404, "PC not found")
            if row["revision"] != expected_revision:
                raise PCError(409, "PC revision conflict")
            self._catalog_lock(conn)
            return self._public(conn, row)


def apply_tower_actions(tower, actions, catalog):
    """Each action consumes the preceding result, with fresh server-owned line IDs."""
    result = tower.model_copy(deep=True)
    for action in actions:
        if action.line_id is not None and not any(
            line.line_id == action.line_id and line.category == action.category
            for line in result.lines
        ):
            raise PCError(422, "Invalid tower line identity")
        new_lines = []
        for candidate in action.candidates:
            if candidate.component_id is not None:
                component = catalog.get(candidate.component_id)
                if component is None or component.category != action.category:
                    raise PCError(422, "Invalid component selection")
            new_lines.append(
                TowerLine(
                    line_id=uuid4(), category=action.category, **candidate.model_dump()
                )
            )
        if action.action == "replace_category":
            result.lines = [
                line for line in result.lines if line.category != action.category
            ]
        elif action.action in ("replace_line", "remove_line"):
            result.lines = [
                line for line in result.lines if line.line_id != action.line_id
            ]
        result.lines.extend(new_lines)
        result.category_status[action.category] = (
            "present"
            if any(line.category == action.category for line in result.lines)
            else "absent"
        )
        if action.category == "motherboard":
            result.context.bios_version = (
                action.candidate_context.bios_version
                if action.candidate_context
                else None
            )
        try:
            result = Tower.model_validate(result.model_dump())
        except ValidationError:
            raise PCError(422, "Invalid simulated tower configuration") from None
    return result


class TowerCompatibilityService:
    def __init__(self, repository, catalog):
        self.repository, self.catalog = repository, catalog

    def run(self, owner, identity, request):
        tower = self.repository.get_for_evaluation(
            owner, identity, request.expected_pc_revision
        )
        catalog = self.catalog.resolution_snapshot()
        # A removed/recategorized saved selection needs explicit review, not guessing.
        if any(
            line.component_id is not None
            and (
                line.component_id not in catalog
                or catalog[line.component_id].category != line.category
            )
            for line in tower.lines
        ):
            raise PCError(409, "Catalog revision conflict; review selection")
        if isinstance(request, TowerSimulationDTO):
            tower = apply_tower_actions(tower, request.actions, catalog)
        evidence = resolve_tower_evidence(
            tower, catalog, self.catalog.repository.dataset_version
        )
        evaluation = evaluate_tower_essential(tower, evidence)
        return TowerEvaluationResponse(
            **evaluation.model_dump(), evaluated_configuration=tower
        )
