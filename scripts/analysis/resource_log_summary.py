import re
import sys
from pathlib import Path

if len(sys.argv) < 2:
    print("Usage: python scripts/analysis/resource_log_summary.py <resource-log-file>")
    sys.exit(1)

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8", errors="ignore")

targets = {
    "api": "protextify-backendv2-api-1",
    "postgres": "protextify-backendv2-postgres-1",
    "redis": "protextify-backendv2-redis-1",
}

print(f"File: {path}")
for label, name in targets.items():
    cpu_values = []
    mem_mib_values = []
    mem_percent_values = []

    for line in text.splitlines():
        if name not in line:
            continue

        cpu_match = re.search(r"\s(\d+(?:\.\d+)?)%\s+", line)
        mem_match = re.search(r"(\d+(?:\.\d+)?)MiB\s*/", line)
        mem_percent_match = re.search(r"\s(\d+(?:\.\d+)?)%\s+", line)

        parts = line.split()
        # docker stats format: NAME CPU% MEM_USAGE / LIMIT MEM%
        # safer parse by position after name
        try:
            idx = parts.index(name)
            cpu = float(parts[idx + 1].replace("%", ""))
            mem = float(parts[idx + 2].replace("MiB", ""))
            mem_percent = float(parts[idx + 5].replace("%", ""))
            cpu_values.append(cpu)
            mem_mib_values.append(mem)
            mem_percent_values.append(mem_percent)
        except Exception:
            continue

    if not cpu_values:
        print(f"{label}: no data")
        continue

    print(
        f"{label}: "
        f"max_cpu={max(cpu_values):.2f}%, "
        f"avg_cpu={sum(cpu_values)/len(cpu_values):.2f}%, "
        f"max_mem={max(mem_mib_values):.2f}MiB, "
        f"max_mem_percent={max(mem_percent_values):.2f}%"
    )
