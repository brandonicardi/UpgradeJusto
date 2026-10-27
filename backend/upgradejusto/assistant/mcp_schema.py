"""Correlate simulation metadata without changing SDK dispatch or authorization."""

from copy import deepcopy

from mcp.server import MCPServer


def simulation_schema(schema):
    """Retain SDK constraints/definitions and add only cross-field correlation.

    These references are the two DTOs in the registered handler's annotation.
    Unexpected SDK shape is a configuration failure, never a loose fallback.
    """
    error = "Unexpected simulation metadata schema"
    if type(schema) is not dict:
        raise ValueError(error)
    properties = schema.get("properties")
    definitions = schema.get("$defs")
    if (
        schema.get("type") != "object"
        or "oneOf" in schema
        or "anyOf" in schema
        or type(properties) is not dict
        or set(properties) != {"pc_id", "configuration_schema", "data"}
        or type(definitions) is not dict
        or type(schema.get("required")) is not list
        or not all(type(name) is str for name in schema["required"])
        or set(schema["required"]) != {"pc_id", "data"}
    ):
        raise ValueError(error)
    selector = properties["configuration_schema"]
    data = properties["data"]
    pc_id = properties["pc_id"]
    if (
        type(selector) is not dict
        or selector.get("type") != "integer"
        or selector.get("enum") != [1, 2]
        or not all(type(value) is int for value in selector["enum"])
        or type(selector.get("default")) is not int
        or selector["default"] != 1
        or type(pc_id) is not dict
        or pc_id.get("type") != "string"
        or pc_id.get("format") != "uuid"
        or type(data) is not dict
        or type(data.get("anyOf")) is not list
    ):
        raise ValueError(error)
    names = ("SimulateRequest", "TowerSimulationDTO")
    references = [{"$ref": f"#/$defs/{name}"} for name in names]
    if len(data["anyOf"]) != 2 or any(
        reference not in data["anyOf"] for reference in references
    ):
        raise ValueError(error)
    for name in names:
        definition = definitions.get(name)
        if (
            type(definition) is not dict
            or definition.get("type") != "object"
            or definition.get("additionalProperties") is not False
        ):
            raise ValueError(error)
    result = deepcopy(schema)
    result["oneOf"] = [
        {
            "properties": {
                "configuration_schema": {"const": 1},
                "data": deepcopy(references[0]),
            }
        },
        {
            "properties": {
                "configuration_schema": {"const": 2},
                "data": deepcopy(references[1]),
            },
            "required": ["configuration_schema"],
        },
    ]
    return result


class CorrelatedMCPServer(MCPServer):
    """Public virtual metadata extension; all tool execution stays in the SDK."""

    async def list_tools(self):
        tools = await super().list_tools()
        return [
            tool.model_copy(
                deep=True,
                update={"input_schema": simulation_schema(tool.input_schema)},
            )
            if tool.name == "simulate_pc"
            else tool
            for tool in tools
        ]
