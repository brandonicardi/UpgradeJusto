"""F orquesta PC/catálogo servidor y evalúa la combinación completa una sola vez."""

from decimal import Decimal

from upgradejusto.compatibility.application import (
    apply_replacements,
    evaluate_current,
)
from upgradejusto.compatibility.http_models import (
    EvaluatedConfiguration,
    EvaluationResponse,
)
from upgradejusto.pcs.service import PCError

from .domain import (
    LIMITATIONS,
    acquisition_cost,
    comparative_benefit,
    item_status,
    ordered_items,
)
from .models import PreviewItem, PreviewResponse


def assess(
    base, alternative, catalog, revision, dataset_version, budget, objective=None
):
    configuration = apply_replacements(base, alternative.replacements, catalog)
    evaluation = EvaluationResponse(
        **evaluate_current(
            configuration, catalog, revision, dataset_version
        ).model_dump(),
        evaluated_configuration=configuration,
    )
    cost = acquisition_cost(alternative.replacements, catalog, budget)
    benefit = comparative_benefit(base, configuration, catalog, objective)
    missing = list(evaluation.missing_fields) + cost.missing_fields
    if benefit.status == "unknown":
        missing.append("benefit.comparative_evidence")
    return PreviewItem(
        key=alternative.key,
        replacements=alternative.replacements,
        evaluation=evaluation,
        cost=cost,
        benefit=benefit,
        status=item_status(evaluation, cost, benefit, budget),
        missing_fields=list(dict.fromkeys(missing)),
    )


class RecommendationService:
    def __init__(self, pcs, catalog):
        self.pcs, self.catalog = pcs, catalog

    def preview(self, owner, pc_id, request):
        pc = self.pcs.get(owner, pc_id)
        if pc.revision != request.expected_pc_revision:
            raise PCError(409, "PC revision conflict")
        catalog = self.catalog.resolution_snapshot()
        base = EvaluatedConfiguration(components=pc.components, context=pc.context)
        budget = Decimal(request.budget_ars)
        items = [
            assess(
                base,
                alternative,
                catalog,
                pc.revision,
                self.catalog.repository.dataset_version,
                budget,
                request.objective,
            )
            for alternative in request.alternatives
        ]
        return PreviewResponse(
            pc_id=pc_id,
            pc_revision=str(pc.revision),
            objective=request.objective,
            budget_ars=request.budget_ars,
            items=ordered_items(items),
            limitations=LIMITATIONS,
        )
