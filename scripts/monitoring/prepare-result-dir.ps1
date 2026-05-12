param(
  [string]$Label = $(if ($env:RUN_LABEL) { $env:RUN_LABEL } else { 'hidden-dry-run' }),
  [switch]$AllowCustomLabel
)

$ErrorActionPreference = 'Stop'
$AllowedLabels = @('hidden-dry-run', 'iteration-1', 'iteration-2')

if (-not $AllowCustomLabel -and $AllowedLabels -notcontains $Label) {
  throw "Invalid result label '$Label'. Allowed labels: $($AllowedLabels -join ', '). Use -AllowCustomLabel only for explicit local experiments."
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir '..\..')
$ResultDir = Join-Path $RepoRoot "results\performance\$Label"

New-Item -ItemType Directory -Path $ResultDir -Force | Out-Null

$GitKeep = Join-Path $ResultDir '.gitkeep'
if (-not (Test-Path $GitKeep)) {
  New-Item -ItemType File -Path $GitKeep -Force | Out-Null
}

Write-Output "Prepared result directory: $ResultDir"
Write-Output 'No existing result files were deleted.'
