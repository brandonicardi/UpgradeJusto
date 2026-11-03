$ErrorActionPreference = 'Stop'
$credential = & gh auth token --hostname github.com 2>$null
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($credential)) {
    [Console]::Error.WriteLine('GitHub CLI authorization is required before starting this MCP server.')
    exit 1
}
$env:GITHUB_PERSONAL_ACCESS_TOKEN = $credential.Trim()
$credential = $null
$server = Join-Path $PSScriptRoot '../../.tools/github-mcp/v2.0.3/github-mcp-server.exe'
try {
    & $server stdio --read-only --toolsets repos,pull_requests,actions --tools get_me --lockdown-mode
    $serverExit = $LASTEXITCODE
} finally {
    Remove-Item Env:GITHUB_PERSONAL_ACCESS_TOKEN -ErrorAction SilentlyContinue
}
exit $serverExit