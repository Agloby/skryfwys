Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-SkryfwysRepositoryRoot {
    return [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
}

function Assert-SkryfwysCommand {
    param([Parameter(Mandatory = $true)][string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found on PATH."
    }
}

function Enter-SkryfwysNativeLocation {
    param([Parameter(Mandatory = $true)][string]$Path)

    $resolved = [System.IO.Path]::GetFullPath($Path)
    $createdDrive = $false
    $driveName = $null
    $nativePath = $resolved
    $isWindowsHost = $env:OS -eq "Windows_NT"

    if ($isWindowsHost -and $resolved.StartsWith("\\", [System.StringComparison]::Ordinal)) {
        $match = [regex]::Match($resolved, '^\\\\(?<server>[^\\]+)\\(?<share>[^\\]+)(?<suffix>\\.*)?$')
        if (-not $match.Success) { throw "Could not parse UNC path '$resolved'." }
        $shareRoot = "\\$($match.Groups['server'].Value)\$($match.Groups['share'].Value)"
        $suffix = $match.Groups['suffix'].Value

        $existing = Get-PSDrive -PSProvider FileSystem | Where-Object {
            $_.DisplayRoot -and $_.DisplayRoot.TrimEnd('\') -ieq $shareRoot.TrimEnd('\')
        } | Select-Object -First 1

        if ($existing) {
            $driveName = $existing.Name
        } else {
            $usedNames = @(Get-PSDrive -PSProvider FileSystem | ForEach-Object { $_.Name.ToUpperInvariant() })
            $driveName = @('Z','Y','X','W','V','U','T','R','Q') | Where-Object { $_ -notin $usedNames } | Select-Object -First 1
            if (-not $driveName) { throw "No free drive letter is available for temporary UNC mapping." }
            New-PSDrive -Name $driveName -PSProvider FileSystem -Root $shareRoot -Persist -Scope Global | Out-Null
            $createdDrive = $true
        }
        $nativePath = if ($suffix) { "${driveName}:$suffix" } else { "${driveName}:\" }
    }

    if (-not (Test-Path -LiteralPath $nativePath)) {
        if ($createdDrive) { Remove-PSDrive -Name $driveName -Force -ErrorAction SilentlyContinue }
        throw "Working directory '$nativePath' does not exist."
    }

    Push-Location -LiteralPath $nativePath
    return [pscustomobject]@{
        NativePath = $nativePath
        DriveName = $driveName
        CreatedDrive = $createdDrive
    }
}

function Exit-SkryfwysNativeLocation {
    param([Parameter(Mandatory = $true)]$Context)
    Pop-Location
    if ($Context.CreatedDrive) {
        Remove-PSDrive -Name $Context.DriveName -Force -ErrorAction SilentlyContinue
    }
}

function Invoke-SkryfwysNative {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [string[]]$ArgumentList = @(),
        [Parameter(Mandatory = $true)][string]$WorkingDirectory
    )

    $context = Enter-SkryfwysNativeLocation -Path $WorkingDirectory
    try {
        $global:LASTEXITCODE = 0
        & $Command @ArgumentList
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) {
            throw "Command '$Command $($ArgumentList -join ' ')' failed with exit code $exitCode."
        }
    } finally {
        Exit-SkryfwysNativeLocation -Context $context
    }
}

function Test-SkryfwysUncPath {
    param([Parameter(Mandatory = $true)][string]$Path)
    return [System.IO.Path]::GetFullPath($Path).StartsWith("\\", [System.StringComparison]::Ordinal)
}

