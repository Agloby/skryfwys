[CmdletBinding()]
param([switch]$IncludeOffice)
. (Join-Path $PSScriptRoot "common.ps1")
$root = Get-SkryfwysRepositoryRoot

& python -c "import pip_audit, bandit" 2>$null
if ($LASTEXITCODE -ne 0) { throw "Install security tools with scripts/setup.ps1 -IncludeSecurityTools." }
Invoke-SkryfwysNative -Command python -ArgumentList @("-m", "pip_audit") -WorkingDirectory $root
Invoke-SkryfwysNative -Command python -ArgumentList @("-m", "bandit", "-q", "-r", "services") -WorkingDirectory $root
Invoke-SkryfwysNative -Command npm -ArgumentList @("audit", "--omit=dev", "--audit-level=high") -WorkingDirectory (Join-Path $root "apps\web")
if ($IncludeOffice) {
    Invoke-SkryfwysNative -Command npm -ArgumentList @("audit", "--audit-level=high") -WorkingDirectory (Join-Path $root "apps\office-addin")
}

