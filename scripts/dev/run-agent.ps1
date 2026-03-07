[CmdletBinding()]
param(
    [string]$CondaEnv = "lab_agent",
    [string]$BindHost = "127.0.0.1",
    [int]$Port = 8000,
    [switch]$CurrentWindow
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RepoRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Get-AgentRoot {
    return Join-Path (Get-RepoRoot) "apps\glass_nanopore_agent"
}

function Get-BackendCommand {
    param(
        [string]$EnvName,
        [string]$BindHost,
        [int]$BindPort
    )

    $pythonCommand = "python backend\main.py"
    $conda = Get-Command conda -ErrorAction SilentlyContinue
    if ($conda) {
        return "conda run -n $EnvName $pythonCommand"
    }

    return $pythonCommand
}

$agentRoot = Get-AgentRoot
if (-not (Test-Path $agentRoot)) {
    throw "应用目录不存在: $agentRoot"
}

$command = Get-BackendCommand -EnvName $CondaEnv -BindHost $BindHost -BindPort $Port
$fullCommand = "Set-Location '$agentRoot'; `$env:PYTHONUTF8='1'; $command"

if ($CurrentWindow) {
    Invoke-Expression $fullCommand
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $fullCommand | Out-Null
    Write-Output "后端已启动: $agentRoot"
    Write-Output "命令: $command"
}
