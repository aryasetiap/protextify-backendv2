#!/usr/bin/env bash
set -euo pipefail

LABEL="${RUN_LABEL:-iteration-1-rerun-vu-adjusted}"
PHASE="${RUN_PHASE:-}"
INTERVAL_SECONDS="${CAPTURE_INTERVAL_SECONDS:-10}"
DURATION_SECONDS="${CAPTURE_DURATION_SECONDS:-300}"
BASE_URL="${BASE_URL:-http://localhost:3000}"

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/monitoring/capture-continuous-vps-metrics.sh --phase <phase> [--interval <seconds>] [--duration <seconds>] [--label <label>] [--base-url <url>]

Examples:
  bash scripts/monitoring/capture-continuous-vps-metrics.sh --phase during-load --interval 10 --duration 300
  bash scripts/monitoring/capture-continuous-vps-metrics.sh --phase during-stress --interval 10 --duration 300
  bash scripts/monitoring/capture-continuous-vps-metrics.sh --phase during-spike --interval 5 --duration 120
  bash scripts/monitoring/capture-continuous-vps-metrics.sh --phase during-endurance --interval 60 --duration 1800
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --label)
      LABEL="$2"
      shift 2
      ;;
    --phase)
      PHASE="$2"
      shift 2
      ;;
    --interval)
      INTERVAL_SECONDS="$2"
      shift 2
      ;;
    --duration)
      DURATION_SECONDS="$2"
      shift 2
      ;;
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$PHASE" ]]; then
  echo "Missing required argument: --phase" >&2
  usage >&2
  exit 1
fi

if ! [[ "$INTERVAL_SECONDS" =~ ^[0-9]+$ ]] || [[ "$INTERVAL_SECONDS" -lt 1 ]]; then
  echo "--interval must be a positive integer." >&2
  exit 1
fi

if ! [[ "$DURATION_SECONDS" =~ ^[0-9]+$ ]] || [[ "$DURATION_SECONDS" -lt 1 ]]; then
  echo "--duration must be a positive integer." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RESULT_DIR="$REPO_ROOT/results/performance/$LABEL"
SAFE_PHASE="$(printf '%s' "$PHASE" | tr -c 'a-zA-Z0-9_-' '-')"
OUTPUT_PATH="$RESULT_DIR/$LABEL-resource-$SAFE_PHASE-continuous.txt"

mkdir -p "$RESULT_DIR"
: > "$OUTPUT_PATH"

append_section() {
  local title="$1"
  printf '\n## %s\n' "$title" >> "$OUTPUT_PATH"
}

run_cmd() {
  append_section "$1"
  shift
  if "$@" >> "$OUTPUT_PATH" 2>&1; then
    true
  else
    printf 'Command failed or unavailable: %s\n' "$*" >> "$OUTPUT_PATH"
  fi
}

capture_url() {
  local title="$1"
  local url="$2"
  append_section "$title"
  if command -v curl >/dev/null 2>&1; then
    curl -fsS --max-time 5 "$url" >> "$OUTPUT_PATH" 2>&1 || printf 'Request failed: %s\n' "$url" >> "$OUTPUT_PATH"
    printf '\n' >> "$OUTPUT_PATH"
  else
    printf 'curl is unavailable\n' >> "$OUTPUT_PATH"
  fi
}

{
  printf '# Protextify VPS Continuous Resource Capture\n'
  printf 'startedAt: %s\n' "$(date -Iseconds)"
  printf 'label: %s\n' "$LABEL"
  printf 'phase: %s\n' "$PHASE"
  printf 'intervalSeconds: %s\n' "$INTERVAL_SECONDS"
  printf 'durationSeconds: %s\n' "$DURATION_SECONDS"
  printf 'baseUrl: %s\n' "$BASE_URL"
  printf 'secretPolicy: env files, tokens, passwords, and request bodies are not captured\n'
} >> "$OUTPUT_PATH"

end_epoch=$(( $(date +%s) + DURATION_SECONDS ))
sample=1

while [[ "$(date +%s)" -lt "$end_epoch" ]]; do
  {
    printf '\n============================================================\n'
    printf 'sample: %s\n' "$sample"
    printf 'timestamp: %s\n' "$(date -Iseconds)"
  } >> "$OUTPUT_PATH"

  run_cmd "Docker PS" docker ps
  run_cmd "Docker Stats No Stream" docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}\t{{.PIDs}}"
  run_cmd "Memory" free -m
  run_cmd "Disk" df -h
  run_cmd "Uptime" uptime
  run_cmd "Top Snapshot" sh -c "top -b -n 1 | head -40"
  run_cmd "Process Snapshot" sh -c "ps aux --sort=-%mem | head -20"
  capture_url "Health Endpoint" "$BASE_URL/health"
  capture_url "Readiness Endpoint" "$BASE_URL/api/health/readiness"

  sample=$((sample + 1))
  sleep "$INTERVAL_SECONDS"
done

{
  printf '\ncompletedAt: %s\n' "$(date -Iseconds)"
  printf 'samplesCaptured: %s\n' "$((sample - 1))"
} >> "$OUTPUT_PATH"

echo "Continuous resource capture written to: $OUTPUT_PATH"
echo "No k6 command was run by this script."
