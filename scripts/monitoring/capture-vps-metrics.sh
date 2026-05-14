#!/usr/bin/env bash
set -euo pipefail

LABEL="${RUN_LABEL:-hidden-dry-run}"
PHASE="${RUN_PHASE:-snapshot}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
QUEUE_STATS_TOKEN="${QUEUE_STATS_TOKEN:-${INSTRUCTOR_TOKEN:-}}"
ALLOW_CUSTOM="${ALLOW_CUSTOM_RESULT_LABEL:-false}"

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
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    --allow-custom-label)
      ALLOW_CUSTOM="true"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

case "$LABEL" in
  hidden-dry-run|iteration-1|iteration-1-final|iteration-2)
    ;;
  *)
    if [[ "$ALLOW_CUSTOM" != "true" ]]; then
      echo "Invalid result label '$LABEL'. Allowed labels: hidden-dry-run, iteration-1, iteration-1-final, iteration-2." >&2
      exit 1
    fi
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RESULT_DIR="$REPO_ROOT/results/performance/$LABEL"
SAFE_PHASE="$(printf '%s' "$PHASE" | tr -c 'a-zA-Z0-9_-' '-')"
OUTPUT_PATH="$RESULT_DIR/$LABEL-resource-$SAFE_PHASE.txt"

mkdir -p "$RESULT_DIR"

append() {
  printf '%s\n' "$1" >> "$OUTPUT_PATH"
}

section() {
  append ""
  append "## $1"
}

run_cmd() {
  section "$1"
  shift
  if "$@" >> "$OUTPUT_PATH" 2>&1; then
    true
  else
    append "Command failed or unavailable: $*"
  fi
}

capture_json() {
  local title="$1"
  local url="$2"
  section "$title"
  if command -v curl >/dev/null 2>&1; then
    curl -fsS --max-time 5 "$url" >> "$OUTPUT_PATH" 2>&1 || append "Request failed: $url"
    append ""
  else
    append "curl is unavailable"
  fi
}

: > "$OUTPUT_PATH"

append "# Protextify VPS Resource Snapshot"
append "timestamp: $(date -Iseconds)"
append "label: $LABEL"
append "phase: $PHASE"
append "baseUrl: $BASE_URL"
append "secretPolicy: env files, tokens, passwords, and request bodies are not captured"
if [[ -n "$QUEUE_STATS_TOKEN" ]]; then
  append "queueStatsTokenProvided: true"
else
  append "queueStatsTokenProvided: false"
fi

section "Git Snapshot"
git branch --show-current >> "$OUTPUT_PATH" 2>&1 || true
git rev-parse --short HEAD >> "$OUTPUT_PATH" 2>&1 || true
git status --short >> "$OUTPUT_PATH" 2>&1 || true

section "Tool Versions"
node -v >> "$OUTPUT_PATH" 2>&1 || true
npm -v >> "$OUTPUT_PATH" 2>&1 || true
docker --version >> "$OUTPUT_PATH" 2>&1 || true
docker compose version >> "$OUTPUT_PATH" 2>&1 || true
k6 version >> "$OUTPUT_PATH" 2>&1 || true

run_cmd "Docker PS" docker ps
run_cmd "Docker Stats No Stream" docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}\t{{.PIDs}}"
run_cmd "Memory" free -m
run_cmd "Disk" df -h
run_cmd "Uptime" uptime
run_cmd "Top Snapshot" sh -c "top -b -n 1 | head -40"
run_cmd "Process Snapshot" sh -c "ps aux --sort=-%mem | head -20"

capture_json "Health Endpoint" "$BASE_URL/health"
capture_json "Readiness Endpoint" "$BASE_URL/api/health/readiness"

section "Queue Stats Endpoint"
if [[ -n "$QUEUE_STATS_TOKEN" ]]; then
  curl -fsS --max-time 5 -H "Authorization: Bearer $QUEUE_STATS_TOKEN" "$BASE_URL/api/plagiarism/queue-stats" >> "$OUTPUT_PATH" 2>&1 || append "Request failed: queue stats endpoint"
  append ""
else
  append "Skipped: set QUEUE_STATS_TOKEN or INSTRUCTOR_TOKEN in the shell to capture protected queue stats."
fi

echo "Resource snapshot written to: $OUTPUT_PATH"
echo "No secret values were intentionally captured."
