[CmdletBinding()]
param(
    [switch]$ApiOnly,
    [switch]$WebOnly,
    [switch]$NoReload
)

. (Join-Path $PSScriptRoot "common.ps1")
if ($ApiOnly -and $WebOnly) { throw "Choose either -ApiOnly or -WebOnly, not both." }

Assert-SkryfwysCommand python
Assert-SkryfwysCommand npm
$root = Get-SkryfwysRepositoryRoot
$context = Enter-SkryfwysNativeLocation -Path $root
$processes = [System.Collections.Generic.List[System.Diagnostics.Process]]::new()

try {
    $nativeRoot = $context.NativePath
    if (-not $WebOnly) {
        $apiArguments = @("-m", "uvicorn", "services.api.app.main:app", "--host", "127.0.0.1", "--port", "8000")
        if (-not $NoReload) { $apiArguments += "--reload" }
        $api = Start-Process -FilePath (Get-Command python).Source -ArgumentList $apiArguments -WorkingDirectory $nativeRoot -PassThru -NoNewWindow
        $processes.Add($api)
        Write-Host "API started at http://127.0.0.1:8000 (PID $($api.Id))."
    }
    if (-not $ApiOnly) {
        $npmCommand = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
        if (-not $npmCommand) { $npmCommand = (Get-Command npm).Source }
        $web = Start-Process -FilePath $npmCommand -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1") -WorkingDirectory (Join-Path $nativeRoot "apps\web") -PassThru -NoNewWindow
        $processes.Add($web)
        Write-Host "Web app started at http://127.0.0.1:5173 (PID $($web.Id))."
    }

    Write-Host "Press Ctrl+C to stop all started processes."
    while ($true) {
        Start-Sleep -Milliseconds 500
        foreach ($process in $processes) {
            $process.Refresh()
            if ($process.HasExited) { throw "Development process $($process.Id) exited with code $($process.ExitCode)." }
        }
    }
} finally {
    foreach ($process in $processes) {
        $process.Refresh()
        if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
        $process.Dispose()
    }
    Exit-SkryfwysNativeLocation -Context $context
}

