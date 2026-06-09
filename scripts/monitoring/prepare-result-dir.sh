#!/usr/bin/env bash
set -euo pipefail

LABEL="${RUN_LABEL:-hidden-dry-run}"
ALLOW_CUSTOM="${ALLOW_CUSTOM_RESULT_LABEL:-false}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --label)
      LABEL="$2"
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
  hidden-dry-run|iteration-1|iteration-1-final|iteration-1-rerun-vu-adjusted|iteration-2|iteration-2-vu-adjusted)
    ;;
  *)
    if [[ "$ALLOW_CUSTOM" != "true" ]]; then
      echo "Invalid result label '$LABEL'. Allowed labels: hidden-dry-run, iteration-1, iteration-1-final, iteration-1-rerun-vu-adjusted, iteration-2, iteration-2-vu-adjusted." >&2
      exit 1
    fi
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RESULT_DIR="$REPO_ROOT/results/performance/$LABEL"

mkdir -p "$RESULT_DIR"
touch "$RESULT_DIR/.gitkeep"

echo "Prepared result directory: $RESULT_DIR"
echo "No existing result files were deleted."
