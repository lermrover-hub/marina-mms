#requires -Version 5.1
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Write-Status([string]$Message) {
    Write-Host "[OpenCADStudio Setup] $Message"
}

$launcher = Join-Path $PSScriptRoot "opencadstudio-mcp-launcher.ps1"
if (-not (Test-Path -LiteralPath $launcher)) {
    throw "Launcher not found: $launcher"
}

$exe = (& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher -PrintExecutable | Select-Object -Last 1).Trim()
if (-not $exe -or -not (Test-Path -LiteralPath $exe)) {
    throw "Could not resolve OpenCADStudio executable."
}

Write-Status "OpenCADStudio executable: $exe"

$codexDir = Join-Path $HOME ".codex"
$codexConfig = Join-Path $codexDir "config.toml"
New-Item -ItemType Directory -Path $codexDir -Force | Out-Null

$raw = ""
if (Test-Path -LiteralPath $codexConfig) {
    $raw = Get-Content -LiteralPath $codexConfig -Raw
    Copy-Item -LiteralPath $codexConfig -Destination ($codexConfig + ".bak-opencadstudio") -Force
}

$literalExe = $exe.Replace("'", "''")
$newBlock = @"
[mcp_servers.opencadstudio]
command = '$literalExe'
args = ["--mcp"]
enabled = true
required = false
startup_timeout_sec = 180
tool_timeout_sec = 900
default_tools_approval_mode = "prompt"
"@

$pattern = '(?ms)^\[mcp_servers\.opencadstudio\]\s*\r?\n.*?(?=^\[|\z)'
if ([regex]::IsMatch($raw, $pattern)) {
    $updated = [regex]::Replace($raw, $pattern, ($newBlock.TrimEnd() + [Environment]::NewLine + [Environment]::NewLine), 1)
} else {
    if ($raw -and -not $raw.EndsWith([Environment]::NewLine)) {
        $raw += [Environment]::NewLine
    }
    $updated = $raw + [Environment]::NewLine + $newBlock.TrimEnd() + [Environment]::NewLine
}

Set-Content -LiteralPath $codexConfig -Value $updated -Encoding UTF8
Write-Status "Configured Codex MCP in $codexConfig"

$code = Get-Command code -ErrorAction SilentlyContinue
if ($code) {
    $payload = @{
        name = "opencadstudio"
        command = $exe
        args = @("--mcp")
    } | ConvertTo-Json -Compress

    try {
        & $code.Source --add-mcp $payload | Out-Host
        Write-Status "Registered OpenCADStudio MCP in VS Code."
    } catch {
        Write-Warning "VS Code CLI registration failed. Workspace .vscode/mcp.json remains available."
    }
} else {
    Write-Status "VS Code code CLI not found. Workspace .vscode/mcp.json will provide the MCP server in this repository."
}

$codex = Get-Command codex -ErrorAction SilentlyContinue
if ($codex) {
    Write-Status "Codex MCP list:"
    & $codex.Source mcp list | Out-Host
}

Write-Status "Setup complete. Restart Codex or VS Code so the MCP server is reloaded."
