[CmdletBinding()]
param(
    [ValidateSet("up", "down", "config", "logs")][string]$Action = "up",
    [switch]$Production,
    [string]$EnvFile
)
. (Join-Path $PSScriptRoot "common.ps1")
Assert-SkryfwysCommand docker
$root = Get-SkryfwysRepositoryRoot
$arguments = @("compose")
if ($Production) {
    if (-not $EnvFile) { throw "-EnvFile is required for the production stack." }
    $arguments += @("--env-file", [System.IO.Path]::GetFullPath($EnvFile), "-f", "infrastructure/compose.production.yml")
}
switch ($Action) {
    "up" { $arguments += @("up", "--build", "-d") }
    "down" { $arguments += @("down") }
    "config" { $arguments += @("config") }
    "logs" { $arguments += @("logs", "--follow") }
}
Invoke-SkryfwysNative -Command docker -ArgumentList $arguments -WorkingDirectory $root

