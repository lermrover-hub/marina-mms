#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$PrintExecutable,
    [switch]$EnsureOnly
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
} catch {}

function Write-Status([string]$Message) {
    [Console]::Error.WriteLine("[OpenCADStudio MCP] $Message")
}

function Resolve-OpenCADStudioExecutable {
    if ($env:OPEN_CAD_STUDIO_EXE -and (Test-Path -LiteralPath $env:OPEN_CAD_STUDIO_EXE)) {
        return (Resolve-Path -LiteralPath $env:OPEN_CAD_STUDIO_EXE).Path
    }

    $cmd = Get-Command OpenCADStudio.exe -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) {
        return $cmd.Source
    }

    $candidates = @(
        (Join-Path $env:LOCALAPPDATA "OpenCADStudio\OpenCADStudio.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\OpenCADStudio\OpenCADStudio.exe"),
        (Join-Path $env:ProgramFiles "OpenCADStudio\OpenCADStudio.exe")
    )

    if (${env:ProgramFiles(x86)}) {
        $candidates += (Join-Path ${env:ProgramFiles(x86)} "OpenCADStudio\OpenCADStudio.exe")
    }

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    $appPathKeys = @(
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\App Paths\OpenCADStudio.exe",
        "HKLM:\Software\Microsoft\Windows\CurrentVersion\App Paths\OpenCADStudio.exe",
        "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\OpenCADStudio.exe"
    )

    foreach ($key in $appPathKeys) {
        try {
            $value = (Get-ItemProperty -LiteralPath $key -ErrorAction Stop)."(default)"
            if ($value -and (Test-Path -LiteralPath $value)) {
                return (Resolve-Path -LiteralPath $value).Path
            }
        } catch {}
    }

    return $null
}

function Install-LatestPortableOpenCADStudio {
    $installDir = Join-Path $env:LOCALAPPDATA "OpenCADStudio"
    $target = Join-Path $installDir "OpenCADStudio.exe"
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null

    Write-Status "OpenCADStudio not found. Downloading latest official Windows x86_64 portable release."

    $headers = @{
        "User-Agent" = "marina-mms-opencadstudio-mcp-bootstrap"
        "Accept" = "application/vnd.github+json"
    }

    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/HakanSeven12/OpenCADStudio/releases/latest" -Headers $headers -Method Get

    $asset = $release.assets |
        Where-Object { $_.name -match "windows-x86_64-portable\.exe$" } |
        Select-Object -First 1

    if (-not $asset) {
        throw "Latest OpenCADStudio release does not contain a windows-x86_64-portable.exe asset."
    }

    $tempFile = Join-Path $env:TEMP ("OpenCADStudio-" + [guid]::NewGuid().ToString("N") + ".exe")
    try {
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tempFile -Headers $headers

        if ($asset.digest -and ([string]$asset.digest -match "^sha256:(.+)$")) {
            $expected = $Matches[1].ToLowerInvariant()
            $actual = (Get-FileHash -Path $tempFile -Algorithm SHA256).Hash.ToLowerInvariant()
            if ($actual -ne $expected) {
                throw "SHA-256 verification failed. Expected $expected but got $actual."
            }
        }

        Move-Item -LiteralPath $tempFile -Destination $target -Force

        $metadata = [ordered]@{
            version = $release.tag_name
            asset = $asset.name
            downloaded_at = (Get-Date).ToString("o")
            source = $asset.browser_download_url
            digest = $asset.digest
        } | ConvertTo-Json -Depth 3

        Set-Content -LiteralPath (Join-Path $installDir "release.json") -Value $metadata -Encoding UTF8
    } finally {
        if (Test-Path -LiteralPath $tempFile) {
            Remove-Item -LiteralPath $tempFile -Force -ErrorAction SilentlyContinue
        }
    }

    if (-not (Test-Path -LiteralPath $target)) {
        throw "OpenCADStudio download completed but executable was not created at $target."
    }

    Write-Status "Installed OpenCADStudio portable executable to $target"
    return $target
}

$exe = Resolve-OpenCADStudioExecutable
if (-not $exe) {
    $exe = Install-LatestPortableOpenCADStudio
}

if ($PrintExecutable) {
    Write-Output $exe
    exit 0
}

if ($EnsureOnly) {
    Write-Status "OpenCADStudio ready at $exe"
    exit 0
}

Write-Status "Launching OpenCADStudio MCP server."
& $exe --mcp
exit $LASTEXITCODE
