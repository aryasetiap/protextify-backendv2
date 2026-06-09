import csv
import json
import re
from pathlib import Path

try:
    import matplotlib.pyplot as plt
except ImportError as exc:
    raise SystemExit(
        "matplotlib is required to generate PNG charts. Install it with: pip install matplotlib"
    ) from exc


ROOT = Path(__file__).resolve().parents[2]
RESULT_DIR = ROOT / "results" / "performance" / "iteration-1-rerun-vu-adjusted"
OUTPUT_DIR = RESULT_DIR / "thesis-output"
LABEL = "iteration-1-rerun-vu-adjusted"
EXCLUDED_ENDPOINTS = {"auth_login"}

SCENARIOS = {
    "smoke": {"name": "Smoke", "max_vu": 1, "duration": "30 detik"},
    "load": {"name": "Load", "max_vu": 40, "duration": "5 menit"},
    "stress": {"name": "Stress", "max_vu": 120, "duration": "10 menit"},
    "spike": {"name": "Spike", "max_vu": 120, "duration": "2 menit"},
    "endurance": {"name": "Endurance", "max_vu": 40, "duration": "30 menit"},
}


def metric_values(data, metric_name):
    metric = data.get("metrics", {}).get(metric_name, {})
    return metric.get("values", {}) if isinstance(metric, dict) else {}


def number_or_none(value):
    try:
        if value in (None, "", "n/a"):
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def fmt_number(value, digits=2):
    numeric = number_or_none(value)
    if numeric is None:
        return "n/a"
    return f"{numeric:.{digits}f}"


def fmt_percent_from_rate(value):
    numeric = number_or_none(value)
    if numeric is None:
        return "n/a"
    return f"{numeric * 100:.2f}%"


def fmt_percent(value):
    numeric = number_or_none(value)
    if numeric is None:
        return "n/a"
    return f"{numeric:.2f}%"


def read_summary_txt(path):
    values = {}
    if not path.exists():
        return values
    pattern = re.compile(r"^([^:]+):\s*(.+)$")
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        match = pattern.match(line.strip())
        if match:
            values[match.group(1).strip()] = match.group(2).strip()
    return values


def parse_percent_text(value):
    if value is None:
        return None
    return number_or_none(str(value).replace("%", "").strip())


def read_summary(scenario_key, warnings):
    summary_json = RESULT_DIR / f"{LABEL}-{scenario_key}-summary.json"
    summary_txt = RESULT_DIR / f"{LABEL}-{scenario_key}-summary.txt"
    config = SCENARIOS[scenario_key]

    row = {
        "Skenario": config["name"],
        "VU Maksimum": config["max_vu"],
        "Durasi": config["duration"],
        "Total Request": "n/a",
        "Checks": "n/a",
        "HTTP Request Failed": "n/a",
        "Avg Response Time": "n/a",
        "p95": "n/a",
        "p99": "n/a",
        "Status": "Tidak Lolos",
    }
    numeric = {
        "scenario": config["name"],
        "total_request": 0,
        "checks_rate": None,
        "failed_rate": None,
        "avg": None,
        "p95": None,
        "p99": None,
    }

    if summary_json.exists():
        try:
            data = json.loads(summary_json.read_text(encoding="utf-8"))
            checks = metric_values(data, "checks")
            failed = metric_values(data, "http_req_failed")
            requests = metric_values(data, "http_reqs")
            duration = metric_values(data, "http_req_duration")

            numeric["checks_rate"] = number_or_none(checks.get("rate"))
            numeric["failed_rate"] = number_or_none(failed.get("rate"))
            numeric["total_request"] = int(number_or_none(requests.get("count")) or 0)
            numeric["avg"] = number_or_none(duration.get("avg"))
            numeric["p95"] = number_or_none(duration.get("p(95)"))
            numeric["p99"] = number_or_none(duration.get("p(99)"))

            row["Total Request"] = numeric["total_request"]
            row["Checks"] = fmt_percent_from_rate(numeric["checks_rate"])
            row["HTTP Request Failed"] = fmt_percent_from_rate(numeric["failed_rate"])
            row["Avg Response Time"] = fmt_number(numeric["avg"])
            row["p95"] = fmt_number(numeric["p95"])
            row["p99"] = fmt_number(numeric["p99"])
        except (json.JSONDecodeError, OSError) as exc:
            warnings.append(f"{config['name']}: summary JSON tidak terbaca ({exc}); mencoba summary TXT.")
    else:
        warnings.append(f"{config['name']}: file summary JSON tidak ditemukan.")

    if row["Total Request"] == "n/a":
        txt = read_summary_txt(summary_txt)
        if txt:
            checks_percent = parse_percent_text(txt.get("checks"))
            failed_percent = parse_percent_text(txt.get("http_req_failed"))
            numeric["checks_rate"] = checks_percent / 100 if checks_percent is not None else None
            numeric["failed_rate"] = failed_percent / 100 if failed_percent is not None else None
            numeric["total_request"] = int(number_or_none(txt.get("http_reqs")) or 0)
            numeric["avg"] = number_or_none(txt.get("http_req_duration avg"))
            numeric["p95"] = number_or_none(txt.get("http_req_duration p95"))
            numeric["p99"] = number_or_none(txt.get("http_req_duration p99"))

            row["Total Request"] = numeric["total_request"]
            row["Checks"] = fmt_percent(checks_percent)
            row["HTTP Request Failed"] = fmt_percent(failed_percent)
            row["Avg Response Time"] = fmt_number(numeric["avg"])
            row["p95"] = fmt_number(numeric["p95"])
            row["p99"] = fmt_number(numeric["p99"])
        else:
            warnings.append(f"{config['name']}: file summary TXT tidak ditemukan atau kosong.")

    passed = (
        numeric["checks_rate"] is not None
        and numeric["failed_rate"] is not None
        and numeric["checks_rate"] >= 0.95
        and numeric["failed_rate"] < 0.01
    )
    row["Status"] = "Lolos" if passed else "Tidak Lolos"
    return row, numeric


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


def read_endpoint_metrics(scenario_key, warnings):
    path = RESULT_DIR / f"{LABEL}-{scenario_key}-endpoint-metrics.csv"
    if not path.exists():
        warnings.append(f"{SCENARIOS[scenario_key]['name']}: file endpoint metrics tidak ditemukan.")
        return []

    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames or []
        cols = {
            "endpoint": find_column(fieldnames, ["endpoint", "name", "url", "path"]),
            "count": find_column(fieldnames, ["count", "request", "requests", "jumlahrequest", "http_reqs"]),
            "avg": find_column(fieldnames, ["avg_ms", "average", "avg", "mean", "avgresponsetime"]),
            "p95": find_column(fieldnames, ["p95_ms", "p(95)", "p95"]),
            "p99": find_column(fieldnames, ["p99_ms", "p(99)", "p99"]),
            "fail": find_column(fieldnames, ["fail_rate_percent", "failrate", "errorrate", "failed"]),
        }
        missing = [key for key, value in cols.items() if value is None]
        if missing:
            warnings.append(
                f"{SCENARIOS[scenario_key]['name']}: kolom endpoint metrics tidak lengkap ({', '.join(missing)})."
            )
            return []

        rows = []
        for raw in reader:
            endpoint = raw.get(cols["endpoint"], "unknown")
            if endpoint in EXCLUDED_ENDPOINTS:
                continue
            rows.append(
                {
                    "Skenario": SCENARIOS[scenario_key]["name"],
                    "Endpoint": endpoint,
                    "Jumlah Request": int(number_or_none(raw.get(cols["count"])) or 0),
                    "Avg Response Time": number_or_none(raw.get(cols["avg"])),
                    "p95": number_or_none(raw.get(cols["p95"])),
                    "p99": number_or_none(raw.get(cols["p99"])),
                    "Fail Rate": number_or_none(raw.get(cols["fail"])),
                }
            )
    rows.sort(key=lambda row: row["p95"] if row["p95"] is not None else -1, reverse=True)
    return rows[:3]


def write_csv(path, rows, headers):
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


def endpoint_rows_for_output(rows):
    output = []
    for row in rows:
        output.append(
            {
                "Skenario": row["Skenario"],
                "Endpoint": row["Endpoint"],
                "Jumlah Request": row["Jumlah Request"],
                "Avg Response Time": fmt_number(row["Avg Response Time"]),
                "p95": fmt_number(row["p95"]),
                "p99": fmt_number(row["p99"]),
                "Fail Rate": fmt_percent(row["Fail Rate"]),
            }
        )
    return output


def make_bar_chart(path, labels, series, ylabel, title):
    fig, ax = plt.subplots(figsize=(10, 6))
    width = 0.22 if len(series) > 1 else 0.5
    positions = list(range(len(labels)))
    offset_start = -width * (len(series) - 1) / 2
    for index, (name, values) in enumerate(series.items()):
        offsets = [pos + offset_start + index * width for pos in positions]
        ax.bar(offsets, values, width, label=name)
    ax.set_xticks(positions)
    ax.set_xticklabels(labels)
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    ax.grid(axis="y", alpha=0.25)
    if len(series) > 1:
        ax.legend()
    fig.tight_layout()
    fig.savefig(path, dpi=300)
    plt.close(fig)


def make_endpoint_chart(path, rows):
    if not rows:
        return False
    labels = [f"{row['Skenario']}\n{row['Endpoint']}" for row in rows]
    values = [row["p95"] or 0 for row in rows]
    fig, ax = plt.subplots(figsize=(12, 7))
    ax.barh(list(range(len(labels))), values)
    ax.set_yticks(list(range(len(labels))))
    ax.set_yticklabels(labels, fontsize=8)
    ax.invert_yaxis()
    ax.set_xlabel("p95 Response Time (ms)")
    ax.set_title("Endpoint dengan p95 Tertinggi per Skenario")
    ax.grid(axis="x", alpha=0.25)
    fig.tight_layout()
    fig.savefig(path, dpi=300)
    plt.close(fig)
    return True


def write_resource_template():
    rows = []
    for key in ["load", "stress", "spike", "endurance"]:
        rows.append(
            {
                "Skenario": SCENARIOS[key]["name"],
                "VU Maksimum": SCENARIOS[key]["max_vu"],
                "CPU Maksimum": "[isi dari screenshot htop]",
                "Memory Maksimum": "[isi dari screenshot htop]",
                "Load Average Maksimum": "[isi dari screenshot htop]",
                "Keterangan": "[isi dari screenshot htop]",
            }
        )
    headers = [
        "Skenario",
        "VU Maksimum",
        "CPU Maksimum",
        "Memory Maksimum",
        "Load Average Maksimum",
        "Keterangan",
    ]
    write_csv(OUTPUT_DIR / "table_4_58_resource_monitoring_template.csv", rows, headers)
    write_markdown(OUTPUT_DIR / "table_4_58_resource_monitoring_template.md", rows, headers)


def write_narrative(summary_rows, endpoint_rows):
    passed = [row for row in summary_rows if row["Status"] == "Lolos"]
    failed = [row for row in summary_rows if row["Status"] != "Lolos"]
    top_endpoint = endpoint_rows[0] if endpoint_rows else None
    status_sentence = (
        "Seluruh skenario pengujian memenuhi kriteria kelulusan"
        if not failed
        else "Terdapat skenario yang belum memenuhi kriteria kelulusan"
    )

    lines = [
        "# Narasi Hasil Performance Testing Iterasi Pertama",
        "",
        (
            f"{status_sentence} berdasarkan indikator checks minimal 95% dan "
            "HTTP request failed kurang dari 1%. Pengujian dilakukan pada backend Protextify "
            "yang berjalan di VPS dengan beban endpoint RESTful API internal yang dominan read-heavy."
        ),
        "",
        (
            "Smoke testing digunakan untuk memastikan skenario dasar dapat berjalan sebelum beban yang "
            "lebih besar diberikan. Load testing merepresentasikan satu kelas penuh aktif dengan 40 VU. "
            "Stress testing merepresentasikan peningkatan beban secara bertahap hingga 120 VU, yaitu "
            "setara dengan tiga kelas aktif. Spike testing merepresentasikan lonjakan mendadak hingga "
            "120 VU. Endurance testing merepresentasikan kestabilan satu kelas penuh aktif dalam durasi "
            "lebih panjang, yaitu 30 menit."
        ),
        "",
        (
            "Performance testing ini tidak menggunakan WinstonAI real. Endpoint yang berkaitan dengan "
            "laporan plagiarisme hanya dibaca dari data PlagiarismCheck yang sudah tersedia atau mode "
            "metadata/mock, sehingga hasil pengujian tidak digunakan untuk menilai akurasi WinstonAI."
        ),
        "",
    ]
    if failed:
        failed_names = ", ".join(row["Skenario"] for row in failed)
        lines.append(
            f"Skenario yang perlu dianalisis lebih lanjut adalah {failed_names}, karena salah satu "
            "indikator checks atau HTTP request failed belum memenuhi ambang batas penelitian."
        )
    else:
        lines.append(
            f"Kelima skenario ({', '.join(row['Skenario'] for row in passed)}) dinyatakan lolos "
            "berdasarkan ambang batas penelitian."
        )

    if top_endpoint:
        lines.extend(
            [
                "",
                (
                    f"Endpoint dengan p95 tertinggi pada ringkasan endpoint adalah "
                    f"`{top_endpoint['Endpoint']}` pada skenario {top_endpoint['Skenario']} "
                    f"dengan p95 sebesar {fmt_number(top_endpoint['p95'])} ms. Endpoint dengan p95 "
                    "tertinggi dapat digunakan sebagai dasar identifikasi potensi bottleneck dan "
                    "prioritas analisis optimasi backend."
                ),
            ]
        )

    (OUTPUT_DIR / "narasi_hasil_performance_testing_iterasi_pertama.md").write_text(
        "\n".join(lines) + "\n", encoding="utf-8"
    )


def write_readme(warnings):
    warning_text = "\n".join(f"- {warning}" for warning in warnings) if warnings else "- Tidak ada warning pembacaan file."
    content = f"""# Thesis Output Performance Testing Iterasi Pertama

## Sumber Input

Script ini membaca file hasil k6 dari:

```text
{RESULT_DIR.as_posix()}
```

Input yang digunakan meliputi `*-summary.json`, `*-summary.txt`, `*-endpoint-metrics.csv`, dan raw JSON k6 jika tersedia di folder tersebut. Endpoint `auth_login` dikeluarkan dari Tabel 4.57 karena login hanya digunakan pada fase setup untuk memperoleh token dan bukan bagian dari beban utama read-heavy.

## Output

Folder ini berisi tabel CSV/Markdown, grafik PNG 300 dpi, template resource monitoring VPS, dan narasi hasil untuk Bab IV subbab 4.1.4.3.

## Cara Menjalankan

Dari root project:

```bash
python scripts/performance/generate_iteration1_rerun_thesis_outputs.py
```

## Catatan Pembacaan

{warning_text}

Jika file smoke atau file skenario lain tidak ditemukan, script tetap berjalan dan menuliskan warning di terminal serta README ini.
"""
    (OUTPUT_DIR / "README.md").write_text(content, encoding="utf-8")


def main():
    if not RESULT_DIR.exists():
        raise SystemExit(f"Result directory not found: {RESULT_DIR}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    warnings = []

    summary_rows = []
    numeric_rows = []
    endpoint_rows = []

    for key in SCENARIOS:
        row, numeric = read_summary(key, warnings)
        summary_rows.append(row)
        numeric_rows.append(numeric)
        endpoint_rows.extend(read_endpoint_metrics(key, warnings))

    summary_headers = [
        "Skenario",
        "VU Maksimum",
        "Durasi",
        "Total Request",
        "Checks",
        "HTTP Request Failed",
        "Avg Response Time",
        "p95",
        "p99",
        "Status",
    ]
    write_csv(OUTPUT_DIR / "table_4_56_summary.csv", summary_rows, summary_headers)
    write_markdown(OUTPUT_DIR / "table_4_56_summary.md", summary_rows, summary_headers)

    endpoint_output = endpoint_rows_for_output(endpoint_rows)
    endpoint_headers = [
        "Skenario",
        "Endpoint",
        "Jumlah Request",
        "Avg Response Time",
        "p95",
        "p99",
        "Fail Rate",
    ]
    write_csv(OUTPUT_DIR / "table_4_57_endpoint_top_p95.csv", endpoint_output, endpoint_headers)
    write_markdown(OUTPUT_DIR / "table_4_57_endpoint_top_p95.md", endpoint_output, endpoint_headers)

    write_resource_template()

    labels = [row["scenario"] for row in numeric_rows]
    make_bar_chart(
        OUTPUT_DIR / "grafik_response_time_iterasi_pertama.png",
        labels,
        {
            "Average": [row["avg"] or 0 for row in numeric_rows],
            "p95": [row["p95"] or 0 for row in numeric_rows],
            "p99": [row["p99"] or 0 for row in numeric_rows],
        },
        "Response Time (ms)",
        "Response Time per Skenario",
    )
    make_bar_chart(
        OUTPUT_DIR / "grafik_total_request_iterasi_pertama.png",
        labels,
        {"Total Request": [row["total_request"] or 0 for row in numeric_rows]},
        "Total Request",
        "Total Request per Skenario",
    )
    make_bar_chart(
        OUTPUT_DIR / "grafik_error_rate_iterasi_pertama.png",
        labels,
        {"HTTP Request Failed (%)": [(row["failed_rate"] or 0) * 100 for row in numeric_rows]},
        "Error Rate (%)",
        "HTTP Request Failed per Skenario",
    )
    make_endpoint_chart(OUTPUT_DIR / "grafik_endpoint_top_p95_iterasi_pertama.png", endpoint_rows)

    write_narrative(summary_rows, endpoint_rows)
    write_readme(warnings)

    print("Created files:")
    for path in sorted(OUTPUT_DIR.iterdir()):
        print(f"- {path.relative_to(ROOT).as_posix()}")

    print("\nRingkasan Tabel 4.56:")
    for row in summary_rows:
        print(
            f"- {row['Skenario']}: VU {row['VU Maksimum']}, request {row['Total Request']}, "
            f"checks {row['Checks']}, failed {row['HTTP Request Failed']}, status {row['Status']}"
        )

    print("\nTop endpoint p95 Tabel 4.57:")
    for row in endpoint_output:
        print(f"- {row['Skenario']} | {row['Endpoint']} | p95 {row['p95']} ms")

    if warnings:
        print("\nWarnings:")
        for warning in warnings:
            print(f"- {warning}")
    else:
        print("\nWarnings: none")


if __name__ == "__main__":
    main()
