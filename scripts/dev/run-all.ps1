[CmdletBinding()]
param(
    [string]$CondaEnv = "lab_agent",
    [string]$BackendHost = "127.0.0.1",
    [int]$BackendPort = 8000,
    [string]$FrontendHost = "127.0.0.1",
    [int]$FrontendPort = 5173,
    [switch]$OpenBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$runAgent = Join-Path $PSScriptRoot "run-agent.ps1"
$runFrontend = Join-Path $PSScriptRoot "run-frontend.ps1"

if (-not (Test-Path $runAgent)) {
    throw "后端启动脚本不存在: $runAgent"
}
if (-not (Test-Path $runFrontend)) {
    throw "前端启动脚本不存在: $runFrontend"
}

& $runAgent -CondaEnv $CondaEnv -BindHost $BackendHost -Port $BackendPort
& $runFrontend -BindHost $FrontendHost -BindPort $FrontendPort

if ($OpenBrowser) {
    Start-Process "http://$FrontendHost`:$FrontendPort" | Out-Null
}

Write-Output "Application launch scripts triggered."
Write-Output ("Repo root: {0}" -f $repoRoot)
Write-Output ("Backend: http://{0}:{1}" -f $BackendHost, $BackendPort)
Write-Output ("Frontend: http://{0}:{1}" -f $FrontendHost, $FrontendPort)
