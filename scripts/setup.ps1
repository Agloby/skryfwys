[CmdletBinding()]
param(
    [switch]$IncludeIntegrations,
    [switch]$IncludeSecurityTools,
    [switch]$SkipBackend,
    [switch]$SkipWeb
)

. (Join-Path $PSScriptRoot "common.ps1")
$root = Get-SkryfwysRepositoryRoot

Assert-SkryfwysCommand python
Assert-SkryfwysCommand node
Assert-SkryfwysCommand npm

$pythonVersion = & python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
if ([version]$pythonVersion -lt [version]"3.12") { throw "Python 3.12+ is required; found $pythonVersion." }
$nodeVersion = (& node -p "process.versions.node").Trim()
$minimumNode = if ($IncludeIntegrations) { [version]"22.15" } else { [version]"20.0" }
if ([version]$nodeVersion -lt $minimumNode) { throw "Node.js $minimumNode+ is required; found $nodeVersion." }

if (Test-SkryfwysUncPath $root) {
    Write-Warning "This repository is on a UNC share. Commands use a temporary mapped drive for cmd/npm compatibility. If npm reports SMB locking errors, clone or copy the repository to a local NTFS path."
}

if (-not $SkipBackend) {
    Invoke-SkryfwysNative -Command python -ArgumentList @("-m", "pip", "install", "--upgrade", "pip") -WorkingDirectory $root
    Invoke-SkryfwysNative -Command python -ArgumentList @("-m", "pip", "install", "-e", ".[dev]") -WorkingDirectory $root
    if ($IncludeSecurityTools) {
        Invoke-SkryfwysNative -Command python -ArgumentList @("-m", "pip", "install", "pip-audit", "bandit") -WorkingDirectory $root
    }
}

if (-not $SkipWeb) {
    $web = Join-Path $root "apps\web"
    $installCommand = if (Test-Path (Join-Path $web "package-lock.json")) { "ci" } else { "install" }
    Invoke-SkryfwysNative -Command npm -ArgumentList @($installCommand) -WorkingDirectory $web
}

if ($IncludeIntegrations) {
    $office = Join-Path $root "apps\office-addin"
    Invoke-SkryfwysNative -Command npm -ArgumentList @("ci") -WorkingDirectory $office
}

Write-Host "Skryfwys setup completed. Run scripts/dev.ps1 to start the API and web app."

