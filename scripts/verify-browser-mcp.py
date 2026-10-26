"""Actual external Playwright MCP calls, isolated public local-app checks only."""

import asyncio
import json
import shutil
from pathlib import Path

from mcp import Client, StdioServerParameters

ROOT = Path(__file__).resolve().parents[1]


async def main():
    node = shutil.which("node")
    browsers = sorted(
        (ROOT / ".local/ms-playwright").glob("chromium-*/chrome-win*/chrome.exe")
    )
    if not node or not browsers:
        raise RuntimeError(
            "Existing project Node/Chromium required; no install fallback"
        )
    output = ROOT / ".local/evidence/sprint32/browser-mcp"
    output.mkdir(parents=True, exist_ok=True)
    server = StdioServerParameters(
        command=node,
        args=[
            str(ROOT / "tools/browser-mcp/node_modules/@playwright/mcp/cli.js"),
            "--config",
            str(ROOT / "tools/browser-mcp/config.json"),
            "--executable-path",
            str(browsers[-1]),
            "--output-dir",
            str(output),
            "--no-webmcp",
        ],
        cwd=str(ROOT),
    )
    report = {"transport": "stdio", "server": "@playwright/mcp@0.0.83", "calls": []}
    async with Client(server) as client:
        tools = await client.list_tools()
        names = {tool.name for tool in tools.tools}
        for name in ("browser_navigate", "browser_snapshot", "browser_close"):
            if name not in names:
                raise RuntimeError("Expected public browser MCP tool missing")
        try:
            for name, arguments in (
                ("browser_navigate", {"url": "http://127.0.0.1:3000/catalog"}),
                ("browser_snapshot", {}),
            ):
                result = await client.call_tool(
                    name, arguments, read_timeout_seconds=30
                )
                text = "\n".join(getattr(part, "text", "") for part in result.content)
                observed = "Catálogo de componentes" in text
                ok = not result.is_error and (observed or name == "browser_navigate")
                report["calls"].append(
                    {
                        "tool": name,
                        "catalog_heading_observed": observed,
                        "is_error": result.is_error,
                        "safe_error_categories": [
                            word
                            for word in (
                                "timeout",
                                "executable",
                                "blocked",
                                "not allowed",
                                "sandbox",
                                "ERR_",
                            )
                            if word.lower() in text.lower()
                        ],
                    }
                )
                (output / "report.json").write_text(
                    json.dumps(report, indent=2), encoding="utf-8"
                )
                print(json.dumps(report["calls"][-1]))
                if not ok:
                    raise RuntimeError("Local public catalog MCP assertion failed")
        finally:
            await client.call_tool("browser_close", {}, read_timeout_seconds=10)
    (output / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(
        "Playwright MCP real stdio navigate+snapshot: local catalog verified; isolated browser closed"
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception:
        print("Browser MCP assertion failed; safe local report, no raw browser output")
        raise SystemExit(1) from None
