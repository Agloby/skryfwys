[CmdletBinding()]
param(
    [switch]$SkipBackend,
    [switch]$SkipWeb,
    [switch]$IncludeOffice,
    [switch]$Evaluation
)

. (Join-Path $PSScriptRoot "common.ps1")
$root = Get-SkryfwysRepositoryRoot

if (-not $SkipBackend) {
    Assert-SkryfwysCommand python
    Invoke-SkryfwysNative -Command python -ArgumentList @("-m", "pytest") -WorkingDirectory $root
}
if (-not $SkipWeb) {
    Assert-SkryfwysCommand npm
    Invoke-SkryfwysNative -Command npm -ArgumentList @("test") -WorkingDirectory (Join-Path $root "apps\web")
}

# Use an exact path: Node exits nonzero if the extension test file is missing, instead of
# reporting a misleading successful zero-test glob on cmd.exe/UNC workspaces.
Assert-SkryfwysCommand node
Invoke-SkryfwysNative -Command node -ArgumentList @("--test", "test/safety.test.cjs") -WorkingDirectory (Join-Path $root "apps\browser-extension")

if ($IncludeOffice) {
    Invoke-SkryfwysNative -Command npm -ArgumentList @("test") -WorkingDirectory (Join-Path $root "apps\office-addin")
    Invoke-SkryfwysNative -Command npm -ArgumentList @("run", "typecheck") -WorkingDirectory (Join-Path $root "apps\office-addin")
}
if ($Evaluation) {
    Invoke-SkryfwysNative -Command python -ArgumentList @("-m", "services.language_engine.evaluation") -WorkingDirectory $root
}

Write-Host "Requested Skryfwys tests passed."

