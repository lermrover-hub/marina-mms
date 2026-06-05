param(
  [int]$Port = 3004,
  [switch]$EnableAgentWrites
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env.staging.local"
$stagingProjectId = "zanlunbgupdtqznruzok"
$productionProjectId = "csltloqbjupxqwbkunsd"

if (-not (Test-Path -LiteralPath $envFile)) {
  throw "Missing .env.staging.local. Copy .env.staging.example to .env.staging.local and add the staging service role key."
}

Get-Content -LiteralPath $envFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) {
    return
  }

  $parts = $line -split "=", 2
  if ($parts.Count -ne 2) {
    throw "Invalid environment line: $line"
  }

  $name = $parts[0].Trim()
  $value = $parts[1].Trim().Trim('"').Trim("'")
  [Environment]::SetEnvironmentVariable($name, $value, "Process")
}

$supabaseUrl = [Environment]::GetEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL", "Process")
$serviceRoleKey = [Environment]::GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY", "Process")

if (-not $supabaseUrl -or -not $supabaseUrl.Contains($stagingProjectId)) {
  throw "Blocked: NEXT_PUBLIC_SUPABASE_URL is not the approved staging project."
}
if ($supabaseUrl.Contains($productionProjectId)) {
  throw "Blocked: production Supabase URL detected."
}
if (-not $serviceRoleKey -or $serviceRoleKey -eq "get-from-supabase-dashboard-settings-api") {
  throw "Missing staging SUPABASE_SERVICE_ROLE_KEY."
}

if ($EnableAgentWrites) {
  [Environment]::SetEnvironmentVariable("ENABLE_AI_AGENT_WRITES", "true", "Process")
} else {
  [Environment]::SetEnvironmentVariable("ENABLE_AI_AGENT_WRITES", "false", "Process")
}
[Environment]::SetEnvironmentVariable("ENABLE_AUTOMATION_WRITES", "false", "Process")
[Environment]::SetEnvironmentVariable("RESEND_API_KEY", $null, "Process")
[Environment]::SetEnvironmentVariable("LINE_CHANNEL_ACCESS_TOKEN", $null, "Process")
[Environment]::SetEnvironmentVariable("WHATSAPP_PHONE_NUMBER_ID", $null, "Process")
[Environment]::SetEnvironmentVariable("WHATSAPP_ACCESS_TOKEN", $null, "Process")

Write-Host "Starting Marina MMS against staging project $stagingProjectId on port $Port"
Write-Host "AI agent writes: $([Environment]::GetEnvironmentVariable("ENABLE_AI_AGENT_WRITES", "Process"))"
Set-Location -LiteralPath $repoRoot
& npm.cmd run dev -- --port $Port
