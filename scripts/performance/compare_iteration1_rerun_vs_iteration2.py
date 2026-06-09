import csv
import json
import re
from pathlib import Path

try:
    import matplotlib.pyplot as plt
except ImportError as exc:
    raise SystemExit(
        "matplotlib is required to generate comparison charts. Install it with: pip install matplotlib"
    ) from exc


ROOT = Path(__file__).resolve().parents[2]
ITERATION_1 = ROOT / "results" / "performance" / "iteration-1-rerun-vu-adjusted"
ITERATION_2 = ROOT / "results" / "performance" / "iteration-2-vu-adjusted"
OUTPUT_DIR = ROOT / "results" / "performance" / "comparison-iteration1-vs-iteration2"

SCENARIOS = ["smoke", "load", "stress", "spike", "endurance"]
SCENARIO_NAMES = {
    "smoke": "Smoke",
    "load": "Load",
    "stress": "Stress",
    "spike": "Spike",
    "endurance": "Endurance",
}


def metric_values(data, metric_name):
    metric = data.get("metrics", {}).get(metric_name, {})
    return metric.get("values", {}) if isinstance(metric, dict) else {}


def read_summary(result_dir, label, scenario, warnings):
    path = result_dir / f"{label}-{scenario}-summary.json"
    if not path.exists():
        warnings.append(f"Summary tidak ditemukan: {path}")
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        warnings.append(f"Summary tidak terbaca: {path} ({exc})")
        return None

    duration = metric_values(data, "http_req_duration")
    failed = metric_values(data, "http_req_failed")
    requests = metric_values(data, "http_reqs")
    return {
        "scenario": SCENARIO_NAMES[scenario],
        "avg": duration.get("avg"),
        "p95": duration.get("p(95)"),
        "p99": duration.get("p(99)"),
        "failed": (failed.get("rate") or 0) * 100,
        "requests": requests.get("count"),
    }


def write_csv(path, rows, headers):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)


def write_markdown(path, rows, headers):
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(["---"] * len(headers)) + " |",
    ]
    for row in rows:
        lines.append("| " + " | ".join(str(row.get(header, "")) for header in headers) + " |")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def fmt(value):
    if value is None:
        return "n/a"
    return f"{float(value):.2f}"


def build_comparison_rows(metric, label, warnings):
    rows = []
    for scenario in SCENARIOS:
        first = read_summary(ITERATION_1, "iteration-1-rerun-vu-adjusted", scenario, warnings)
        second = read_summary(ITERATION_2, "iteration-2-vu-adjusted", scenario, warnings)
        if not first or not second:
            continue
        delta = None
        if first[metric] is not None and second[metric] is not None:
            delta = float(second[metric]) - float(first[metric])
        rows.append(
            {
                "Skenario": SCENARIO_NAMES[scenario],
                "Iterasi Pertama": fmt(first[metric]),
                "Iterasi Kedua": fmt(second[metric]),
                "Selisih": fmt(delta),
                "Metrik": label,
            }
        )
    return rows


def make_chart(path, rows, title, ylabel):
    if not rows:
        return False
    labels = [row["Skenario"] for row in rows]
    first = [float(row["Iterasi Pertama"]) for row in rows]
    second = [float(row["Iterasi Kedua"]) for row in rows]
    positions = list(range(len(labels)))
    width = 0.35

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.bar([pos - width / 2 for pos in positions], first, width, label="Iterasi Pertama")
    ax.bar([pos + width / 2 for pos in positions], second, width, label="Iterasi Kedua")
    ax.set_xticks(positions)
    ax.set_xticklabels(labels)
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    ax.grid(axis="y", alpha=0.25)
    ax.legend()
    fig.tight_layout()
    fig.savefig(path, dpi=300)
    plt.close(fig)
    return True


def normalize(name):
    return re.sub(r"[^a-z0-9]", "", name.lower())


def find_column(fieldnames, candidates):
    normalized = {normalize(name): name for name in fieldnames}
    for candidate in candidates:
        key = normalize(candidate)
        if key in normalized:
            return normalized[key]
    for name in fieldnames:
        key = normalize(name)
        if any(normalize(candidate) in key for candidate in candidates):
            return name
    return None


def read_iteration2_top_endpoint_rows(warnings):
    rows = []
    for scenario in SCENARIOS:
        path = ITERATION_2 / f"iteration-2-vu-adjusted-{scenario}-endpoint-metrics.csv"
        if not path.exists():
            warnings.append(f"Endpoint metrics Iterasi Kedua tidak ditemukan: {path}")
            continue
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            fieldnames = reader.fieldnames or []
            cols = {
                "endpoint": find_column(fieldnames, ["endpoint", "name", "url", "path"]),
                "count": find_column(fieldnames, ["count", "request", "requests", "jumlahrequest"]),
                "avg": find_column(fieldnames, ["avg_ms", "average", "avg", "mean"]),
                "p95": find_column(fieldnames, ["p95_ms", "p(95)", "p95"]),
                "p99": find_column(fieldnames, ["p99_ms", "p(99)", "p99"]),
                "fail": find_column(fieldnames, ["fail_rate_percent", "failrate", "errorrate", "failed"]),
            }
            if any(value is None for value in cols.values()):
                warnings.append(f"Kolom endpoint metrics Iterasi Kedua tidak lengkap: {path}")
                continue
            scenario_rows = []
            for row in reader:
                endpoint = row.get(cols["endpoint"], "unknown")
                if endpoint == "auth_login":
                    continue
                scenario_rows.append(
                    {
                        "Skenario": SCENARIO_NAMES[scenario],
                        "Endpoint": endpoint,
                        "Jumlah Request": row.get(cols["count"], "n/a"),
                        "Avg Response Time": row.get(cols["avg"], "n/a"),
                        "p95": row.get(cols["p95"], "n/a"),
                        "p99": row.get(cols["p99"], "n/a"),
                        "Fail Rate": row.get(cols["fail"], "n/a"),
                    }
                )
            scenario_rows.sort(key=lambda item: float(item["p95"]), reverse=True)
            rows.extend(scenario_rows[:3])
    return rows


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    warnings = []
    outputs = []

    comparisons = [
        ("avg", "Average Response Time (ms)", "comparison_average_response_time"),
        ("p95", "p95 Response Time (ms)", "comparison_p95_response_time"),
        ("p99", "p99 Response Time (ms)", "comparison_p99_response_time"),
        ("failed", "HTTP Request Failed (%)", "comparison_error_rate"),
    ]

    for metric, label, filename in comparisons:
        rows = build_comparison_rows(metric, label, warnings)
        headers = ["Skenario", "Iterasi Pertama", "Iterasi Kedua", "Selisih", "Metrik"]
        csv_path = OUTPUT_DIR / f"{filename}.csv"
        md_path = OUTPUT_DIR / f"{filename}.md"
        png_path = OUTPUT_DIR / f"{filename}.png"
        write_csv(csv_path, rows, headers)
        write_markdown(md_path, rows, headers)
        if make_chart(png_path, rows, label, label):
            outputs.append(png_path)
        outputs.extend([csv_path, md_path])

    endpoint_rows = read_iteration2_top_endpoint_rows(warnings)
    endpoint_headers = [
        "Skenario",
        "Endpoint",
        "Jumlah Request",
        "Avg Response Time",
        "p95",
        "p99",
        "Fail Rate",
    ]
    endpoint_csv = OUTPUT_DIR / "iteration2_endpoint_top_p95.csv"
    endpoint_md = OUTPUT_DIR / "iteration2_endpoint_top_p95.md"
    write_csv(endpoint_csv, endpoint_rows, endpoint_headers)
    write_markdown(endpoint_md, endpoint_rows, endpoint_headers)
    outputs.extend([endpoint_csv, endpoint_md])

    readme = OUTPUT_DIR / "README.md"
    readme.write_text(
        "# Comparison Iterasi Pertama vs Iterasi Kedua\n\n"
        "Script ini membandingkan hasil `iteration-1-rerun-vu-adjusted` dengan "
        "`iteration-2-vu-adjusted`. Jalankan setelah seluruh skenario Iterasi Kedua selesai.\n\n"
        "Command:\n\n"
        "```bash\npython scripts/performance/compare_iteration1_rerun_vs_iteration2.py\n```\n\n"
        "Warnings:\n"
        + ("\n".join(f"- {warning}" for warning in warnings) if warnings else "- Tidak ada warning.")
        + "\n",
        encoding="utf-8",
    )
    outputs.append(readme)

    print("Created comparison outputs:")
    for path in sorted(set(outputs)):
        print(f"- {path.relative_to(ROOT).as_posix()}")

    if warnings:
        print("\nWarnings:")
        for warning in warnings:
            print(f"- {warning}")
    else:
        print("\nWarnings: none")


if __name__ == "__main__":
    main()
