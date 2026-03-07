[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RepoRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Test-ToolAvailable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) {
        return $true
    }

    if ($Name -eq "npm") {
        return (Test-Path "D:\nodejs\npm.cmd")
    }

    return $false
}

function Test-NodePipeSpawnCapability {
    $nodeCandidates = @()
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCommand) {
        $nodeCandidates += $nodeCommand.Source
    }
    if (Test-Path "D:\nodejs\node.exe") {
        $nodeCandidates += "D:\nodejs\node.exe"
    }

    $nodePath = $nodeCandidates | Select-Object -First 1
    if (-not $nodePath) {
        return $false
    }

    $probe = "const cp=require('node:child_process'); try { cp.spawn('cmd',['/c','echo','ok'],{windowsHide:true,stdio:['pipe','pipe','inherit']}); process.exit(0);} catch(e){ process.exit(1);} "
    & $nodePath -e $probe | Out-Null
    return ($LASTEXITCODE -eq 0)
}

$repoRoot = Get-RepoRoot
$checks = @(
    @{ Label = "App root"; Path = Join-Path $repoRoot "apps\glass_nanopore_agent" },
    @{ Label = "Backend entry"; Path = Join-Path $repoRoot "apps\glass_nanopore_agent\backend\main.py" },
    @{ Label = "Frontend package"; Path = Join-Path $repoRoot "apps\glass_nanopore_agent\frontend\package.json" },
    @{ Label = "Experiment DB"; Path = Join-Path $repoRoot "data\etching_experiments.sqlite" },
    @{ Label = "Raw cvdata"; Path = "D:\LabOSData\cvdata" },
    @{ Label = "Firmware ioc"; Path = Join-Path $repoRoot "firmware\etching_controller\untitle4.ioc" }
)

Write-Output ("Repo root: {0}" -f $repoRoot)
Write-Output ""
Write-Output "Path checks:"

foreach ($item in $checks) {
    $status = if (Test-Path $item.Path) { "OK" } else { "MISSING" }
    Write-Output ("- {0}: {1} -> {2}" -f $item.Label, $status, $item.Path)
}

Write-Output ""
Write-Output "Tool checks:"
$toolNames = @("python", "powershell", "npm", "conda")
foreach ($name in $toolNames) {
    $status = if (Test-ToolAvailable -Name $name) { "OK" } else { "MISSING" }
    Write-Output ("- {0}: {1}" -f $name, $status)
}

Write-Output ""
Write-Output "Runtime checks:"
$spawnStatus = if (Test-NodePipeSpawnCapability) { "OK" } else { "BLOCKED" }
Write-Output ("- node spawn(pipe): {0}" -f $spawnStatus)
if ($spawnStatus -eq "BLOCKED") {
    Write-Output "  hint: frontend vite/esbuild may fail in this terminal environment."
}
