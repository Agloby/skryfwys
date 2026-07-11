[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$EnvFile,
    [Parameter(Mandatory = $true)][string]$InputPath,
    [switch]$Force
)
. (Join-Path $PSScriptRoot "common.ps1")
if (-not $Force) { throw "Restore replaces database objects. Re-run with -Force after verifying the backup and target stack." }
Assert-SkryfwysCommand docker
$root = Get-SkryfwysRepositoryRoot
$envPath = [System.IO.Path]::GetFullPath($EnvFile)
$input = [System.IO.Path]::GetFullPath($InputPath)
if (-not (Test-Path -LiteralPath $input -PathType Leaf)) { throw "Backup file '$input' was not found." }
$remote = "/tmp/skryfwys-restore.dump"
$base = @("compose", "--env-file", $envPath, "-f", "infrastructure/compose.production.yml")

try {
    Invoke-SkryfwysNative -Command docker -ArgumentList ($base + @("cp", $input, "postgres:$remote")) -WorkingDirectory $root
    Invoke-SkryfwysNative -Command docker -ArgumentList ($base + @("exec", "-T", "postgres", "pg_restore", "-U", "skryfwys", "-d", "skryfwys", "--clean", "--if-exists", "--no-owner", $remote)) -WorkingDirectory $root
    Write-Host "Restore completed from $input"
} finally {
    try { Invoke-SkryfwysNative -Command docker -ArgumentList ($base + @("exec", "-T", "postgres", "rm", "-f", $remote)) -WorkingDirectory $root } catch { Write-Warning "Could not remove the temporary in-container restore file: $($_.Exception.Message)" }
}

