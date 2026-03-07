[CmdletBinding()]
param(
    [string]$BindHost = "127.0.0.1",
    [int]$BindPort = 5173,
    [switch]$CurrentWindow
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RepoRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Get-NpmCommand {
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if ($npm) {
        return "npm"
    }

    $fallback = "D:\nodejs\npm.cmd"
    if (Test-Path $fallback) {
        return $fallback
    }

    throw "npm 不可用，且未找到回退路径 D:\nodejs\npm.cmd"
}

function Get-EsbuildBinaryPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FrontendPath
    )

    $esbuildExe = Join-Path $FrontendPath "node_modules\esbuild\node_modules\@esbuild\win32-x64\esbuild.exe"
    if (-not (Test-Path $esbuildExe)) {
        throw "未找到 esbuild 可执行文件: $esbuildExe"
    }

    return $esbuildExe
}

$frontendRoot = Join-Path (Get-RepoRoot) "apps\glass_nanopore_agent\frontend"
if (-not (Test-Path $frontendRoot)) {
    throw "前端目录不存在: $frontendRoot"
}

$npmCommand = Get-NpmCommand
$esbuildBinary = Get-EsbuildBinaryPath -FrontendPath $frontendRoot

$command = "& '$npmCommand' run dev -- --host $BindHost --port $BindPort"
$fullCommand = @"
Set-Location '$frontendRoot'
`$env:PATH = 'D:\nodejs;' + `$env:PATH
`$env:ESBUILD_BINARY_PATH = '$esbuildBinary'
$command
"@

if ($CurrentWindow) {
    Invoke-Expression $fullCommand
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $fullCommand | Out-Null
    Write-Output "前端已启动: $frontendRoot"
    Write-Output "命令: $command"
}
