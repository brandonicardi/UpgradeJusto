"""Discriminated closed model selections; no identity/proof supplied by tools."""

from typing import Annotated, Literal

from pydantic import Field, TypeAdapter, model_validator

from upgradejusto.compatibility.http_models import EvaluateRequest, SimulateRequest
from upgradejusto.compatibility.tower_http_models import TowerSimulationDTO
from upgradejusto.recommendations.models import PreviewRequest
from upgradejusto.recommendations.tower_models import TowerPreviewRequest

from .tool_inputs import PCInput


class LegacyEvaluation(PCInput):
    configuration_schema: Literal[1] = 1
    data: EvaluateRequest


class TowerEvaluation(LegacyEvaluation):
    configuration_schema: Literal[2]


class LegacySimulation(LegacyEvaluation):
    data: SimulateRequest


class TowerSimulation(TowerEvaluation):
    data: TowerSimulationDTO


class LegacyPreview(LegacyEvaluation):
    data: PreviewRequest


class TowerPreview(TowerEvaluation):
    data: TowerPreviewRequest

    @model_validator(mode="after")
    def no_model_material_confirmation(self):
        if self.data.materials:
            raise ValueError(
                "Material confirmation requires the explicit user web flow"
            )
        return self


SELECTIONS = {
    "evaluate_pc": TypeAdapter(
        Annotated[
            LegacyEvaluation | TowerEvaluation,
            Field(discriminator="configuration_schema"),
        ]
    ),
    "simulate_pc": TypeAdapter(
        Annotated[
            LegacySimulation | TowerSimulation,
            Field(discriminator="configuration_schema"),
        ]
    ),
    "preview_recommendations": TypeAdapter(
        Annotated[
            LegacyPreview | TowerPreview, Field(discriminator="configuration_schema")
        ]
    ),
}


def validate_selection(name, arguments):
    if type(arguments) is not dict:
        raise ValueError("Closed tool arguments required")
    selected = {"configuration_schema": 1, **arguments}
    if type(selected["configuration_schema"]) is not int:
        raise ValueError("Strict configuration schema required")
    return SELECTIONS[name].validate_python(selected)
