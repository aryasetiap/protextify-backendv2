param(
  [string]$Label = $(if ($env:RUN_LABEL) { $env:RUN_LABEL } else { 'hidden-dry-run' }),
  [string]$Phase = $(if ($env:RUN_PHASE) { $env:RUN_PHASE } else { 'snapshot' }),
  [string]$BaseUrl = $(if ($env:BASE_URL) { $env:BASE_URL } else { 'http://localhost:3000' }),
  [string]$OutputPath,
  [switch]$AllowCustomLabel
)

$ErrorActionPreference = 'Stop'
$AllowedLabels = @('hidden-dry-run', 'iteration-1', 'iteration-1-final', 'iteration-1-rerun-vu-adjusted', 'iteration-2', 'iteration-2-vu-adjusted')

if (-not $AllowCustomLabel -and $AllowedLabels -notcontains $Label) {
  throw "Invalid result label '$Label'. Allowed labels: $($AllowedLabels -join ', '). Use -AllowCustomLabel only for explicit local experiments."
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir '..\..')
$ResultDir = Join-Path $RepoRoot "results\performance\$Label"
New-Item -ItemType Directory -Path $ResultDir -Force | Out-Null

if (-not $OutputPath) {
  $safePhase = $Phase -replace '[^a-zA-Z0-9_-]', '-'
  $OutputPath = Join-Path $ResultDir "$Label-resource-$safePhase.txt"
}

$QueueStatsToken = if ($env:QUEUE_STATS_TOKEN) { $env:QUEUE_STATS_TOKEN } elseif ($env:INSTRUCTOR_TOKEN) { $env:INSTRUCTOR_TOKEN } else { $null }

function Add-Line {
  param([string]$Text = '')
  $Text | Out-File -FilePath $OutputPath -Append -Encoding utf8
}

function Add-Section {
  param([string]$Title)
  Add-Line ''
  Add-Line "## $Title"
}

function Add-CommandOutput {
  param(
    [string]$Title,
    [scriptblock]$Command
  )

  Add-Section $Title
  try {
    & $Command 2>&1 | Out-String | ForEach-Object { $_.TrimEnd() } | Out-File -FilePath $OutputPath -Append -Encoding utf8
  } catch {
    Add-Line "Command failed or unavailable: $($_.Exception.Message)"
  }
}

function Add-JsonEndpoint {
  param(
    [string]$Title,
    [string]$Url,
    [hashtable]$Headers = @{}
  )

  Add-Section $Title
  try {
    $Response = Invoke-RestMethod -Uri $Url -Headers $Headers -TimeoutSec 5
    $Response | ConvertTo-Json -Depth 12 | Out-File -FilePath $OutputPath -Append -Encoding utf8
  } catch {
    Add-Line "Request failed: $($_.Exception.Message)"
  }
}

Set-Content -Path $OutputPath -Value '' -Encoding utf8

Add-Line '# Protextify Resource Snapshot'
Add-Line "timestamp: $(Get-Date -Format o)"
Add-Line "label: $Label"
Add-Line "phase: $Phase"
Add-Line "baseUrl: $BaseUrl"
Add-Line 'secretPolicy: env files, tokens, passwords, and request bodies are not captured'
Add-Line "queueStatsTokenProvided: $([bool]$QueueStatsToken)"

Add-CommandOutput 'Git Snapshot' {
  git branch --show-current
  git rev-parse --short HEAD
  git status --short
}

Add-CommandOutput 'Tool Versions' {
  node -v
  npm -v
  docker --version
  docker compose version
  k6 version
}

Add-CommandOutput 'Windows System Info' {
  $os = Get-CimInstance Win32_OperatingSystem
  $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
  [PSCustomObject]@{
    Caption = $os.Caption
    Version = $os.Version
    TotalVisibleMemoryMB = [math]::Round($os.TotalVisibleMemorySize / 1024, 2)
    FreePhysicalMemoryMB = [math]::Round($os.FreePhysicalMemory / 1024, 2)
    CpuName = $cpu.Name
    LogicalProcessors = $cpu.NumberOfLogicalProcessors
  } | Format-List
}

Add-CommandOutput 'Top Local Processes by Memory' {
  Get-Process |
    Sort-Object WorkingSet64 -Descending |
    Select-Object -First 15 Id, ProcessName, CPU, @{Name='WorkingSetMB'; Expression = {[math]::Round($_.WorkingSet64 / 1MB, 2)}} |
    Format-Table -AutoSize
}

Add-CommandOutput 'Docker Compose PS' {
  docker compose ps
}

Add-CommandOutput 'Docker Stats No Stream' {
  docker stats --no-stream --format "table {{.Name}}`t{{.CPUPerc}}`t{{.MemUsage}}`t{{.NetIO}}`t{{.BlockIO}}`t{{.PIDs}}"
}

Add-JsonEndpoint 'Health Endpoint' "$BaseUrl/health"
Add-JsonEndpoint 'Readiness Endpoint' "$BaseUrl/api/health/readiness"

if ($QueueStatsToken) {
  Add-JsonEndpoint 'Queue Stats Endpoint' "$BaseUrl/api/plagiarism/queue-stats" @{ Authorization = "Bearer $QueueStatsToken" }
} else {
  Add-Section 'Queue Stats Endpoint'
  Add-Line 'Skipped: set QUEUE_STATS_TOKEN or INSTRUCTOR_TOKEN in the shell to capture protected queue stats.'
}

Write-Output "Resource snapshot written to: $OutputPath"
Write-Output 'No secret values were intentionally captured.'
