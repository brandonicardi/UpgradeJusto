"""Real MCP stdio server; one process/turn, no HTTP tools or mutable global user."""

import os
from functools import wraps
from typing import Annotated, Any, Literal
from uuid import UUID

from mcp.server.mcpserver.exceptions import ToolError
from pydantic import Field, StringConstraints

from upgradejusto.auth.repository import AuthRepository
from upgradejusto.auth.service import AuthService
from upgradejusto.catalog.models import Category
from upgradejusto.catalog.postgres import PostgresCatalogRepository
from upgradejusto.catalog.service import CatalogService
from upgradejusto.compatibility.http_models import EvaluateRequest, SimulateRequest
from upgradejusto.compatibility.tower_http_models import TowerSimulationDTO
from upgradejusto.pcs.repository import PCRepository
from upgradejusto.pcs.service import PCService
from upgradejusto.persistence.runtime import runtime_engine
from upgradejusto.recommendations.models import PreviewRequest
from upgradejusto.recommendations.tower_models import TowerPreviewRequest

from .mcp_schema import CorrelatedMCPServer
from .middleware import validate_raw_tool_call
from .repository import Repository
from .tool_inputs import validate_call
from .tower_plans import read_owned_plan
from .tower_tools import TowerReadTools


def safe_tool(function):
    @wraps(function)
    def invoke(*args, **kwargs):
        try:
            return function(*args, **kwargs)
        except Exception:
            # SDK must never serialize DB driver errors/SQL or local paths.
            raise ToolError("Tool unavailable or access denied") from None

    return invoke


def build_server():
    # Capture once in this private child only; never expose it in a tool schema.
    raw = os.environ.pop("UJ_ASSISTANT_SESSION", None)
    if not raw:
        raise RuntimeError("Missing server session context")
    conversation_id = UUID(os.environ.pop("UJ_ASSISTANT_CONVERSATION"))
    engine = runtime_engine()
    auth = AuthService(AuthRepository(engine))
    catalog = CatalogService(PostgresCatalogRepository())
    pcs = PCService(PCRepository(engine), catalog)
    tower_tools = TowerReadTools(engine, catalog, pcs)
    server = CorrelatedMCPServer(
        "UpgradeJusto read-only tools", middleware=[validate_raw_tool_call]
    )

    def owner():
        identity = UUID(auth.current(raw)["id"])
        Repository(engine).get(identity, conversation_id)
        return identity

    @server.tool(structured_output=True)
    @safe_tool
    def catalog_search(
        q: Annotated[str, StringConstraints(max_length=100)] = "",
        category: Category | None = None,
        page: Annotated[int, Field(strict=True, ge=1)] = 1,
        page_size: Annotated[int, Field(strict=True, ge=1, le=20)] = 12,
    ) -> dict[str, Any]:
        """Buscar catálogo curado. No inventa precios ni atributos."""
        owner()
        return catalog.list_components(
            category=category, q=q, page=page, page_size=page_size
        ).model_dump(mode="json")

    @server.tool(structured_output=True)
    @safe_tool
    def get_pc(pc_id: UUID) -> dict[str, Any]:
        """Obtener exclusivamente una PC de la sesión actual."""
        return tower_tools.get_pc(owner(), pc_id)

    @server.tool(structured_output=True)
    @safe_tool
    def evaluate_pc(
        pc_id: UUID, data: EvaluateRequest, configuration_schema: Literal[1, 2] = 1
    ) -> dict[str, Any]:
        """Evaluar con motor determinístico, conserva faltantes y cobertura."""
        identity = owner()
        selection = validate_call(
            "evaluate_pc",
            {
                "pc_id": pc_id,
                "data": data.model_dump(exclude_unset=True),
                "configuration_schema": configuration_schema,
            },
        )
        return tower_tools.evaluate(identity, selection)

    @server.tool(structured_output=True)
    @safe_tool
    def simulate_pc(
        pc_id: UUID,
        data: SimulateRequest | TowerSimulationDTO,
        configuration_schema: Literal[1, 2] = 1,
    ) -> dict[str, Any]:
        """Sustitución efímera: RAM reemplaza conjunto. No guarda la PC."""
        identity = owner()
        selection = validate_call(
            "simulate_pc",
            {
                "pc_id": pc_id,
                "data": data.model_dump(exclude_unset=True),
                "configuration_schema": configuration_schema,
            },
        )
        return tower_tools.evaluate(identity, selection)

    @server.tool(structured_output=True)
    @safe_tool
    def preview_recommendations(
        pc_id: UUID,
        data: PreviewRequest | TowerPreviewRequest,
        configuration_schema: Literal[1, 2] = 1,
    ) -> dict[str, Any]:
        """Comparar alternativas explícitas con presupuesto ARS, sin persistir."""
        identity = owner()
        selection = validate_call(
            "preview_recommendations",
            {
                "pc_id": pc_id,
                "data": data.model_dump(exclude_unset=True),
                "configuration_schema": configuration_schema,
            },
        )
        return tower_tools.preview(identity, selection)

    @server.tool(structured_output=True)
    @safe_tool
    def get_plan(plan_id: UUID) -> dict[str, Any]:
        """Obtener un plan propio; no crea, edita ni comparte."""
        return read_owned_plan(engine, catalog, owner(), plan_id)

    @server.tool(structured_output=True)
    @safe_tool
    def search_public_docs(
        query: Annotated[str, StringConstraints(min_length=1, max_length=500)],
        top_k: Annotated[int, Field(ge=1, le=5)] = 3,
    ) -> dict[str, Any]:
        """Evidencia documental pública, NO un veredicto de compatibilidad."""
        owner()
        from .rag import search

        return {"citations": search(engine, query, top_k)}

    return server


if __name__ == "__main__":
    build_server().run()
