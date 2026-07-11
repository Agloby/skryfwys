[CmdletBinding()]
param([switch]$IncludeOffice)
. (Join-Path $PSScriptRoot "common.ps1")
$root = Get-SkryfwysRepositoryRoot
Invoke-SkryfwysNative -Command python -ArgumentList @("-m", "ruff", "check", ".") -WorkingDirectory $root
Invoke-SkryfwysNative -Command npm -ArgumentList @("run", "lint") -WorkingDirectory (Join-Path $root "apps\web")
if ($IncludeOffice) {
    Invoke-SkryfwysNative -Command npm -ArgumentList @("run", "lint") -WorkingDirectory (Join-Path $root "apps\office-addin")
}

