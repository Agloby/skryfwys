[CmdletBinding()]
param([switch]$IncludeOffice)
. (Join-Path $PSScriptRoot "common.ps1")
$root = Get-SkryfwysRepositoryRoot
Invoke-SkryfwysNative -Command npm -ArgumentList @("run", "build") -WorkingDirectory (Join-Path $root "apps\web")
if ($IncludeOffice) {
    Invoke-SkryfwysNative -Command npm -ArgumentList @("run", "build") -WorkingDirectory (Join-Path $root "apps\office-addin")
    Invoke-SkryfwysNative -Command npm -ArgumentList @("run", "validate-manifests") -WorkingDirectory (Join-Path $root "apps\office-addin")
}

