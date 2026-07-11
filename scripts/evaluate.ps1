. (Join-Path $PSScriptRoot "common.ps1")
$root = Get-SkryfwysRepositoryRoot
Invoke-SkryfwysNative -Command python -ArgumentList @("-m", "services.language_engine.evaluation") -WorkingDirectory $root

