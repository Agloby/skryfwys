[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$EnvFile,
    [string]$OutputPath = (Join-Path (Get-Location) ("skryfwys-{0:yyyyMMdd-HHmmss}.dump" -f (Get-Date)))
)
. (Join-Path $PSScriptRoot "common.ps1")
Assert-SkryfwysCommand docker
$root = Get-SkryfwysRepositoryRoot
$envPath = [System.IO.Path]::GetFullPath($EnvFile)
$output = [System.IO.Path]::GetFullPath($OutputPath)
$remote = "/tmp/skryfwys-backup.dump"
$base = @("compose", "--env-file", $envPath, "-f", "infrastructure/compose.production.yml")

try {
    Invoke-SkryfwysNative -Command docker -ArgumentList ($base + @("exec", "-T", "postgres", "pg_dump", "-U", "skryfwys", "-d", "skryfwys", "-Fc", "--file=$remote")) -WorkingDirectory $root
    Invoke-SkryfwysNative -Command docker -ArgumentList ($base + @("cp", "postgres:$remote", $output)) -WorkingDirectory $root
    Write-Host "Backup written to $output"
} finally {
    try { Invoke-SkryfwysNative -Command docker -ArgumentList ($base + @("exec", "-T", "postgres", "rm", "-f", $remote)) -WorkingDirectory $root } catch { Write-Warning "Could not remove the temporary in-container backup: $($_.Exception.Message)" }
}

