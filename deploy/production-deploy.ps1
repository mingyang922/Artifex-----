[CmdletBinding()]
param(
    [string]$Server = "82.156.244.66",
    [string]$User = "ubuntu",
    [string]$IdentityFile = "$env:USERPROFILE\.ssh\id_ed25519",
    [string]$RemoteDirectory = "/opt/Artifex-----",
    [switch]$SkipChecks
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $projectRoot
try {
    $version = (& node -p "require('./package.json').version").Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($version)) {
        throw "Unable to read package version with Node.js"
    }
}
finally {
    Pop-Location
}
$outputDirectory = Join-Path $projectRoot "output\deploy"
$artifactName = "artifex-v$version-production.tgz"
$artifactPath = Join-Path $outputDirectory $artifactName
$remoteArtifact = "/home/$User/$artifactName"
$remoteScript = "/home/$User/artifex-production-remote.sh"
$sshTarget = "$User@$Server"

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )

    Write-Host "==> $Label" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

if (-not (Test-Path -LiteralPath $IdentityFile -PathType Leaf)) {
    throw "SSH identity file not found: $IdentityFile"
}

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

Push-Location $projectRoot
try {
    if (-not $SkipChecks) {
        Invoke-Checked "ESLint" { npm run lint }
        Invoke-Checked "Unit tests" { npm test }
        Invoke-Checked "Production build" { npm run build }
    }

    if (Test-Path -LiteralPath $artifactPath) {
        Remove-Item -LiteralPath $artifactPath -Force
    }

    $tarArguments = @(
        "-czf", $artifactPath,
        "--exclude=.git",
        "--exclude=node_modules",
        "--exclude=output",
        "--exclude=backend/.env",
        "--exclude=backend/data",
        "--exclude=config/.env",
        "--exclude=config/ark-rest-api.local.json",
        "--exclude=.env",
        "--exclude=playwright-report",
        "--exclude=test-results",
        "."
    )
    Invoke-Checked "Create deployment archive" { & tar @tarArguments }
}
finally {
    Pop-Location
}

$sha256 = (Get-FileHash -LiteralPath $artifactPath -Algorithm SHA256).Hash.ToLowerInvariant()
Write-Host "Artifact: $artifactPath"
Write-Host "SHA-256: $sha256"

$sshArguments = @(
    "-i", $IdentityFile,
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=15",
    "-o", "StrictHostKeyChecking=accept-new"
)

Invoke-Checked "SSH preflight" {
    & ssh @sshArguments $sshTarget "sudo test -f '$RemoteDirectory/docker-compose.yml' && sudo docker compose version >/dev/null && sudo docker inspect artifex-platform >/dev/null"
}

Invoke-Checked "Upload release archive" {
    & scp @sshArguments $artifactPath "${sshTarget}:$remoteArtifact"
}

Invoke-Checked "Upload remote deployment helper" {
    & scp @sshArguments (Join-Path $projectRoot "deploy\production-remote.sh") "${sshTarget}:$remoteScript"
}

Invoke-Checked "Deploy Artifex $version" {
    & ssh @sshArguments $sshTarget "bash '$remoteScript' '$remoteArtifact' '$sha256' '$RemoteDirectory' '$version'"
}

Write-Host ""
Write-Host "Artifex $version deployed successfully." -ForegroundColor Green
Write-Host "Health: https://artifex.com.cn/api/health"
