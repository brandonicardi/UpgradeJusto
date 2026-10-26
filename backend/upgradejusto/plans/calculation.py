"""G cálculo acumulado; no acceso HTTP/BD ni sustituciones implícitas."""

from decimal import Decimal

from upgradejusto.compatibility.http_models import EvaluatedConfiguration
from upgradejusto.recommendations.domain import comparative_benefit
from upgradejusto.recommendations.models import Alternative, Cost
from upgradejusto.recommendations.service import assess

from .models import PlanSnapshot, StageResult


def accumulate(costs, budget):
    subtotal = sum((Decimal(cost.known_subtotal_ars) for cost in costs), Decimal(0))
    missing = [
        f"stages.{index}.{path}"
        for index, cost in enumerate(costs, 1)
        for path in cost.missing_fields
    ]
    amount = format(subtotal, "f")
    return Cost(
        total_ars=None if missing else amount,
        known_subtotal_ars=amount,
        within_budget=None if missing else subtotal <= budget,
        lines=[line for cost in costs for line in cost.lines],
        missing_fields=missing,
    )


def calculate_plan(pc, data, catalog, dataset_version):
    base = EvaluatedConfiguration(components=pc.components, context=pc.context)
    current = base.model_copy(deep=True)
    budget = Decimal(data.budget_ars)
    stages, costs, missing = [], [], []
    for position, stage in enumerate(data.stages, 1):
        item = assess(
            current,
            Alternative(key=f"stage-{position}", replacements=stage.replacements),
            catalog,
            pc.revision,
            dataset_version,
            budget,
            data.objective,
        )
        current = item.evaluation.evaluated_configuration.model_copy(deep=True)
        costs.append(item.cost)
        stages.append(
            StageResult(
                name=stage.name,
                replacements=stage.replacements,
                position=position,
                evaluated_configuration=current,
                evaluation=item.evaluation,
                cost=item.cost,
                cumulative_cost=accumulate(costs, budget),
                benefit=item.benefit,
            )
        )
        missing.extend(f"stages.{position}.{path}" for path in item.missing_fields)
    cost = accumulate(costs, budget)
    benefit = comparative_benefit(base, current, catalog, data.objective)
    if benefit.status == "unknown":
        missing.append("benefit.comparative_evidence")
    blocked = (
        any(stage.evaluation.verdict == "incompatible" for stage in stages)
        or Decimal(cost.known_subtotal_ars) > budget
        or benefit.status == "not_an_improvement"
    )
    ready = (
        all(
            stage.evaluation.verdict == "compatible"
            and stage.evaluation.coverage.complete
            for stage in stages
        )
        and cost.within_budget is True
        and not cost.missing_fields
        and benefit.status == "supported"
    )
    return PlanSnapshot(
        pc_revision=str(pc.revision),
        base_snapshot=base,
        objective=data.objective,
        budget_ars=data.budget_ars,
        stages=stages,
        status="blocked" if blocked else "ready" if ready else "requires_verification",
        cost=cost,
        benefit=benefit,
        missing_fields=list(dict.fromkeys(missing + cost.missing_fields)),
    )
