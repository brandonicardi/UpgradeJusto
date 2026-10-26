"""Tower HTTP selections only: technical evidence and rule switches are forbidden."""

from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, StrictInt, StrictStr, model_validator

from upgradejusto.catalog.models import Category
from upgradejusto.pcs.models import InputModel
from upgradejusto.pcs.tower_models import Tower, TowerLine

from .http_models import CandidateContext, EvaluateRequest
from .tower_contract import TowerEvaluationResult


class TowerCandidate(InputModel):
    component_id: Annotated[StrictStr, Field(min_length=1, max_length=200)] | None = (
        None
    )
    declared_model: Annotated[StrictStr, Field(min_length=1, max_length=200)] | None = (
        None
    )
    quantity: Annotated[StrictInt, Field(ge=1, le=32)]


class TowerAction(InputModel):
    action: Literal["replace_category", "replace_line", "add_line", "remove_line"]
    category: Category
    line_id: UUID | None = None
    candidates: Annotated[list[TowerCandidate], Field(max_length=36)]
    candidate_context: CandidateContext | None = None

    @model_validator(mode="after")
    def valid_action(self):
        if self.category == "ram" and self.action != "replace_category":
            raise ValueError("RAM requires replacement of the complete module set")
        targets_line = self.action in ("replace_line", "remove_line")
        if targets_line != (self.line_id is not None):
            raise ValueError("Line action requires its own line identity")
        if self.action == "add_line" and self.category not in ("storage", "fan"):
            raise ValueError("Only storage/fan support add_line")
        if self.action == "remove_line":
            if self.candidates:
                raise ValueError("remove_line requires no candidates")
        elif not self.candidates or (
            self.action != "replace_category" and len(self.candidates) != 1
        ):
            raise ValueError("Invalid candidate count for action")
        if "candidate_context" in self.model_fields_set and (
            self.category != "motherboard"
            or self.candidate_context is None
            or self.action == "remove_line"
        ):
            raise ValueError("Candidate context requires replacement motherboard")
        for candidate in self.candidates:
            TowerLine(category=self.category, **candidate.model_dump())
        return self


class TowerSimulationDTO(EvaluateRequest):
    actions: Annotated[list[TowerAction], Field(min_length=1, max_length=36)]


class TowerEvaluationResponse(TowerEvaluationResult):
    evaluated_configuration: Tower
