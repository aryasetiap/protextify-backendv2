param(
  [ValidateSet('smoke', 'load', 'stress', 'spike', 'endurance', 'all')]
  [string]$Scenario = 'all',
  [string]$BaseUrl = $(if ($env:BASE_URL) { $env:BASE_URL } else { 'http://localhost:3000' }),
  [string]$TestDataPath = $(if ($env:TEST_DATA_PATH) { $env:TEST_DATA_PATH } else { './data/test-data.local.json' }),
  [switch]$Overwrite
)

$ErrorActionPreference = 'Stop'

$Label = 'iteration-1-rerun-vu-adjusted'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir '..\..')
$ResultDir = Join-Path $RepoRoot "results\performance\$Label"
$EndpointMetricsScript = Join-Path $RepoRoot 'scripts\analysis\k6_endpoint_metrics.py'

$ScenarioScripts = [ordered]@{
  smoke = 'tests\performance\k6\smoke.js'
  load = 'tests\performance\k6\load.js'
  stress = 'tests\performance\k6\stress.js'
  spike = 'tests\performance\k6\spike.js'
  endurance = 'tests\performance\k6\endurance.js'
}

function Set-EnvVar {
  param([string]$Name, [string]$Value)

  $script:PreviousEnv[$Name] = [Environment]::GetEnvironmentVariable($Name, 'Process')
  [Environment]::SetEnvironmentVariable($Name, $Value, 'Process')
}

function Restore-Env {
  foreach ($Name in $script:PreviousEnv.Keys) {
    [Environment]::SetEnvironmentVariable($Name, $script:PreviousEnv[$Name], 'Process')
  }
}

function Assert-NoOverwrite {
  param([string[]]$Paths)

  if ($Overwrite) {
    return
  }

  $Existing = $Paths | Where-Object { Test-Path $_ }
  if ($Existing.Count -gt 0) {
    throw "Output file already exists. Use -Overwrite only if you intentionally want to replace it: $($Existing -join ', ')"
  }
}

function Invoke-EndpointMetrics {
  param(
    [string]$RawJsonPath,
    [string]$OutputCsvPath
  )

  if (-not (Test-Path $EndpointMetricsScript)) {
    Write-Warning "Endpoint metrics script not found: $EndpointMetricsScript"
    return
  }

  $Python = Get-Command python -ErrorAction SilentlyContinue
  if ($Python) {
    & $Python.Source $EndpointMetricsScript $RawJsonPath $OutputCsvPath
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "Endpoint metrics generation failed for $RawJsonPath"
    }
    return
  }

  $PyLauncher = Get-Command py -ErrorAction SilentlyContinue
  if ($PyLauncher) {
    & $PyLauncher.Source -3 $EndpointMetricsScript $RawJsonPath $OutputCsvPath
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "Endpoint metrics generation failed for $RawJsonPath"
    }
    return
  }

  Write-Warning 'Python is unavailable; endpoint-level metrics CSV was skipped.'
}

New-Item -ItemType Directory -Path $ResultDir -Force | Out-Null

$SelectedScenarios = if ($Scenario -eq 'all') {
  @($ScenarioScripts.Keys)
} else {
  @($Scenario)
}

$script:PreviousEnv = @{}
Set-EnvVar 'BASE_URL' $BaseUrl
Set-EnvVar 'TEST_DATA_PATH' $TestDataPath
Set-EnvVar 'K6_RUN_LABEL' $Label
Set-EnvVar 'K6_SUMMARY_DIR' "results/performance/$Label"
Set-EnvVar 'WINSTON_AI_MODE' 'mock'
Set-EnvVar 'PLAGIARISM_REPORT_MODE' 'metadata'
Set-EnvVar 'ENABLE_WRITE_SCENARIO' 'false'
Set-EnvVar 'K6_SMOKE_VUS' '1'
Set-EnvVar 'K6_SMOKE_DURATION' '30s'
Set-EnvVar 'K6_LOAD_VUS' '40'
Set-EnvVar 'K6_LOAD_DURATION' '5m'
Set-EnvVar 'K6_STRESS_MAX_VUS' '120'
Set-EnvVar 'K6_SPIKE_MAX_VUS' '120'
Set-EnvVar 'K6_ENDURANCE_VUS' '40'
Set-EnvVar 'K6_ENDURANCE_DURATION' '30m'

$Failures = @()

try {
  Push-Location $RepoRoot

  foreach ($Name in $SelectedScenarios) {
    $ScriptPath = Join-Path $RepoRoot $ScenarioScripts[$Name]
    $RawJsonPath = Join-Path $ResultDir "$Label-$Name.json"
    $LogPath = Join-Path $ResultDir "$Label-$Name.log"
    $EndpointCsvPath = Join-Path $ResultDir "$Label-$Name-endpoint-metrics.csv"
    $SummaryJsonPath = Join-Path $ResultDir "$Label-$Name-summary.json"
    $SummaryTextPath = Join-Path $ResultDir "$Label-$Name-summary.txt"

    Assert-NoOverwrite @(
      $RawJsonPath,
      $LogPath,
      $EndpointCsvPath,
      $SummaryJsonPath,
      $SummaryTextPath
    )

    Write-Output "Running k6 scenario: $Name"
    Write-Output "Base URL: $BaseUrl"
    Write-Output "Result directory: $ResultDir"

    $K6Args = @(
      'run',
      '--out',
      "json=$RawJsonPath",
      $ScriptPath
    )

    & k6 @K6Args 2>&1 | Tee-Object -FilePath $LogPath
    $ExitCode = $LASTEXITCODE

    if (Test-Path $RawJsonPath) {
      Invoke-EndpointMetrics -RawJsonPath $RawJsonPath -OutputCsvPath $EndpointCsvPath
    } else {
      Write-Warning "Raw k6 JSON was not created for scenario $Name"
    }

    if ($ExitCode -ne 0) {
      $Failures += "$Name (exit code $ExitCode)"
      Write-Warning "Scenario $Name finished with k6 exit code $ExitCode. Output was still preserved."
    } else {
      Write-Output "Scenario $Name completed successfully."
    }
  }
} finally {
  Pop-Location
  Restore-Env
}

if ($Failures.Count -gt 0) {
  Write-Error "One or more scenarios failed thresholds or execution: $($Failures -join '; ')"
  exit 1
}

Write-Output "All selected scenarios completed. Results are in: $ResultDir"
