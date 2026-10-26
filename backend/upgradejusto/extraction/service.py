"""CU02 orchestration: validate catalog evidence; preview never writes."""

import re
from contextlib import asynccontextmanager

from upgradejusto.catalog.models import Category
from upgradejusto.extraction.models import ExtractResponse
from upgradejusto.pcs.service import PCError


class ExtractionService:
    def __init__(self, pcs, provider, budget=None):
        self.pcs, self.provider = pcs, provider
        self.budget = budget

    @asynccontextmanager
    async def execution(self, owner):
        if self.budget is None:
            # Pure unit construction only. HTTP composition always injects PG budget.
            yield
        else:
            async with self.budget.execution(owner):
                yield

    async def preview(self, data, owner=None):
        parts = self.pcs.catalog.snapshot()
        async with self.execution(owner):
            result = await self.provider.extract(data.text, parts)
        indexed = {part.id: part for part in parts}
        evidence = {entry.field: entry for entry in result.evidence}
        if set(evidence) != set(Category):
            raise PCError(502, "Invalid extraction evidence")
        for entry in result.evidence:
            if len(set(entry.candidate_ids)) != len(entry.candidate_ids):
                raise PCError(502, "Invalid extraction evidence")
            if any(
                identity not in indexed or indexed[identity].category != entry.field
                for identity in entry.candidate_ids
            ):
                raise PCError(502, "Invalid extraction catalog reference")
            if entry.excerpt is not None and entry.excerpt not in data.text:
                raise PCError(502, "Invalid extraction evidence")
            if entry.origin == "unknown" and entry.candidate_ids:
                raise PCError(502, "Invalid unknown evidence")
        for group in result.proposal.components:
            entry = evidence[group.category]
            if (
                entry.origin != "catalog"
                or entry.candidate_ids != [group.component_id]
                or not entry.excerpt
            ):
                raise PCError(502, "Unresolved extraction selection")
            # Deterministic exact fragment matching; no approximate model aliases.
            fragment = entry.excerpt.strip().casefold()
            matches = [
                part.id
                for part in parts
                if part.category == group.category
                and (
                    fragment in part.name.casefold() or part.name.casefold() in fragment
                )
            ]
            if matches != [group.component_id]:
                raise PCError(502, "Ambiguous extraction selection")
            quantity = rf"\b{group.quantity}\s*(?:[x×]|m[oó]dulos?\b)"
            if group.category == "ram" and not re.search(
                quantity, entry.excerpt, re.IGNORECASE
            ):
                raise PCError(502, "RAM quantity requires explicit review")
        # Model never supplies installed BIOS or freeform notes/name as validated facts.
        proposal = result.proposal.model_copy(deep=True)
        proposal.name = "PC extraída"
        proposal.context.bios_version = None
        proposal.context.notes = None
        warnings = [
            "Propuesta no guardada. Revisar componentes, cantidades y BIOS instalada antes de confirmar."
        ]
        for category in Category:
            if not any(group.category == category for group in proposal.components):
                warnings.append(
                    f"{category.value}: sin selección confirmada ({evidence[category].origin})."
                )
        return ExtractResponse(
            proposal=proposal,
            evidence=result.evidence,
            warnings=warnings,
            dataset_version=self.pcs.catalog.repository.dataset_version,
        )

    def confirm(self, owner, data):
        if data.metadata.dataset_version != self.pcs.catalog.repository.dataset_version:
            raise PCError(409, "Catalog revision conflict; review selection")
        try:
            self.pcs.validate_components(data.pc.components)
        except PCError:
            raise PCError(409, "Catalog references changed; review selection") from None
        return self.pcs.create(owner, data.pc)
