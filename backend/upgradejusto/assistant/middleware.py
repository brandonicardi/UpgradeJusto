"""Raw input guard using public MCPServer middleware, pinned SDK mcp==2.3.0.

The public middleware contract is provisional/version-specific: ctx.method,
ctx.params (raw RPC dict), and call_next(ctx). Validate before SDK argument
models can discard extras/coerce booleans. Reverify this boundary on SDK upgrade.
No identity lives here; each accepted tool revalidates its server session/owner.
"""

from mcp import types as mcp_types
from pydantic import ValidationError

from .tool_inputs import validate_call


def invalid_input():
    return mcp_types.CallToolResult(
        is_error=True,
        content=[mcp_types.TextContent(type="text", text="Invalid tool input")],
    )


async def validate_raw_tool_call(ctx, call_next):
    if ctx.method == "tools/call":
        params = ctx.params
        if not isinstance(params, dict):
            return invalid_input()
        name = params.get("name")
        arguments = params.get("arguments", {})
        if not isinstance(name, str) or not isinstance(arguments, dict):
            return invalid_input()
        try:
            validate_call(name, arguments)
        except (ValidationError, ValueError):
            return invalid_input()
    return await call_next(ctx)
