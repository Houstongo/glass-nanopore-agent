[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$firmwareRoot = Join-Path $repoRoot "firmware\etching_controller"

if (-not (Test-Path $firmwareRoot)) {
    throw ("Firmware directory not found: {0}" -f $firmwareRoot)
}

$importantPaths = @(
    "untitle4.ioc",
    "Core",
    "Drivers",
    "MDK-ARM",
    "CMakeLists.txt",
    "STM32F103RCTX_FLASH.ld"
)

Write-Output ("Firmware root: {0}" -f $firmwareRoot)
Write-Output "Mode: read-only. STM32 source code is not modified."
Write-Output ""
Write-Output "Important paths:"

foreach ($relative in $importantPaths) {
    $fullPath = Join-Path $firmwareRoot $relative
    $exists = Test-Path $fullPath
    Write-Output ("- {0} : {1}" -f $relative, ($(if ($exists) { "present" } else { "missing" })))
}

Write-Output ""
Write-Output "Top-level summary:"
Get-ChildItem -LiteralPath $firmwareRoot -Force |
    Select-Object Name, PSIsContainer |
    Format-Table -AutoSize
