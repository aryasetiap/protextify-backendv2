import json
import sys
from pathlib import Path
from statistics import mean

def percentile(values, p):
    if not values:
        return None
    values = sorted(values)
    k = (len(values) - 1) * (p / 100)
    f = int(k)
    c = min(f + 1, len(values) - 1)
    if f == c:
        return values[f]
    return values[f] + (values[c] - values[f]) * (k - f)

def pick_endpoint(tags):
    return (
        tags.get("name")
        or tags.get("url")
        or tags.get("endpoint")
        or "unknown"
    )

def main():
    if len(sys.argv) < 3:
        print("Usage: python scripts/analysis/k6_endpoint_metrics.py <input.json> <output.csv>")
        sys.exit(1)

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    output_path.parent.mkdir(parents=True, exist_ok=True)

    durations = {}
    failed = {}

    with input_path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue

            if row.get("type") != "Point":
                continue

            metric = row.get("metric")
            data = row.get("data", {})
            tags = data.get("tags", {})
            endpoint = pick_endpoint(tags)

            if metric == "http_req_duration":
                durations.setdefault(endpoint, []).append(float(data.get("value", 0)))
            elif metric == "http_req_failed":
                failed.setdefault(endpoint, []).append(float(data.get("value", 0)))

    rows = []
    for endpoint, values in durations.items():
        fail_values = failed.get(endpoint, [])
        fail_rate = (sum(fail_values) / len(fail_values) * 100) if fail_values else 0

        rows.append({
            "endpoint": endpoint,
            "count": len(values),
            "avg_ms": mean(values),
            "min_ms": min(values),
            "max_ms": max(values),
            "p50_ms": percentile(values, 50),
            "p90_ms": percentile(values, 90),
            "p95_ms": percentile(values, 95),
            "p99_ms": percentile(values, 99),
            "fail_rate_percent": fail_rate,
        })

    rows.sort(key=lambda x: x["p95_ms"], reverse=True)

    with output_path.open("w", encoding="utf-8") as f:
        headers = [
            "endpoint", "count", "avg_ms", "min_ms", "max_ms",
            "p50_ms", "p90_ms", "p95_ms", "p99_ms", "fail_rate_percent"
        ]
        f.write(",".join(headers) + "\n")
        for row in rows:
            f.write(",".join([
                str(row["endpoint"]),
                str(row["count"]),
                f'{row["avg_ms"]:.2f}',
                f'{row["min_ms"]:.2f}',
                f'{row["max_ms"]:.2f}',
                f'{row["p50_ms"]:.2f}',
                f'{row["p90_ms"]:.2f}',
                f'{row["p95_ms"]:.2f}',
                f'{row["p99_ms"]:.2f}',
                f'{row["fail_rate_percent"]:.2f}',
            ]) + "\n")

    print(f"Saved endpoint metrics to {output_path}")

if __name__ == "__main__":
    main()
