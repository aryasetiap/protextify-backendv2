"""
Script pembuatan grafik Bab IV Iterasi Pertama Protextify.

Output:
1. gambar_8_p95_p99_k6_iterasi_pertama.png
2. gambar_9_request_avg_response_k6_iterasi_pertama.png
3. gambar_10_api_cpu_memory_resource_iterasi_pertama.png
4. data_k6_iterasi_pertama.csv
5. data_resource_iterasi_pertama.csv

Cara menjalankan:
python generate_bab4_iterasi1_graphs.py
"""

from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt


def main() -> None:
    output_dir = Path("protextify_bab4_grafik")
    output_dir.mkdir(parents=True, exist_ok=True)

    # Data k6 Iterasi Pertama berdasarkan hasil final pengujian.
    k6_data = pd.DataFrame({
        "Skenario": ["Smoke", "Load", "Stress", "Spike", "Endurance", "WinstonAI mock"],
        "Requests": [30, 10533, 7211, 1404, 24164, 6],
        "Avg_ms": [86.93, 139.71, 248.79, 725.02, 114.49, 131.63],
        "p95_ms": [139.06, 324.14, 978.27, 1844.82, 245.80, 276.98],
        "p99_ms": [159.37, 668.90, 1753.73, 2126.42, 611.85, 287.98],
    })

    # Data resource VPS Iterasi Pertama berdasarkan snapshot final.
    resource_data = pd.DataFrame({
        "Snapshot": [
            "Before",
            "During Load",
            "During Stress",
            "During Spike",
            "During Endurance",
            "After",
        ],
        "API_CPU_pct": [0.02, 6.10, 22.67, 18.94, 6.45, 0.00],
        "API_Mem_MiB": [214.7, 293.1, 322.0, 239.1, 277.0, 329.6],
    })

    # Simpan data sumber agar grafik bisa diaudit ulang.
    k6_data.to_csv(output_dir / "data_k6_iterasi_pertama.csv", index=False)
    resource_data.to_csv(output_dir / "data_resource_iterasi_pertama.csv", index=False)

    # ---------------------------------------------------------------------
    # Gambar 8: Perbandingan p95 dan p99 k6 Iterasi Pertama
    # ---------------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(10, 5.5))
    x = list(range(len(k6_data)))
    width = 0.35

    ax.bar([i - width / 2 for i in x], k6_data["p95_ms"], width, label="p95")
    ax.bar([i + width / 2 for i in x], k6_data["p99_ms"], width, label="p99")

    ax.set_xticks(x)
    ax.set_xticklabels(k6_data["Skenario"], rotation=25, ha="right")
    ax.set_ylabel("Waktu Respons (ms)")
    ax.set_xlabel("Skenario Pengujian")
    ax.set_title("Perbandingan p95 dan p99 k6 Iterasi Pertama")
    ax.legend()

    fig.tight_layout()
    fig.savefig(
        output_dir / "gambar_8_p95_p99_k6_iterasi_pertama.png",
        dpi=300,
        bbox_inches="tight",
    )
    plt.close(fig)

    # ---------------------------------------------------------------------
    # Gambar 9: Jumlah Request dan Average Response Time k6 Iterasi Pertama
    # ---------------------------------------------------------------------
    fig, ax1 = plt.subplots(figsize=(10, 5.5))
    x = list(range(len(k6_data)))

    ax1.bar(x, k6_data["Requests"], label="Jumlah Request")
    ax1.set_ylabel("Jumlah Request")
    ax1.set_xlabel("Skenario Pengujian")
    ax1.set_xticks(x)
    ax1.set_xticklabels(k6_data["Skenario"], rotation=25, ha="right")

    ax2 = ax1.twinx()
    ax2.plot(x, k6_data["Avg_ms"], marker="o", label="Average Response Time")
    ax2.set_ylabel("Average Response Time (ms)")

    handles1, labels1 = ax1.get_legend_handles_labels()
    handles2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(handles1 + handles2, labels1 + labels2, loc="upper left")

    ax1.set_title("Jumlah Request dan Average Response Time k6 Iterasi Pertama")
    fig.tight_layout()
    fig.savefig(
        output_dir / "gambar_9_request_avg_response_k6_iterasi_pertama.png",
        dpi=300,
        bbox_inches="tight",
    )
    plt.close(fig)

    # ---------------------------------------------------------------------
    # Gambar 10: API CPU dan API Memory pada Snapshot Resource Iterasi Pertama
    # ---------------------------------------------------------------------
    fig, ax1 = plt.subplots(figsize=(10, 5.5))
    x = list(range(len(resource_data)))

    ax1.plot(x, resource_data["API_CPU_pct"], marker="o", label="API CPU")
    ax1.set_ylabel("API CPU (%)")
    ax1.set_xlabel("Snapshot Resource")
    ax1.set_xticks(x)
    ax1.set_xticklabels(resource_data["Snapshot"], rotation=25, ha="right")

    ax2 = ax1.twinx()
    ax2.plot(x, resource_data["API_Mem_MiB"], marker="s", label="API Memory")
    ax2.set_ylabel("API Memory (MiB)")

    handles1, labels1 = ax1.get_legend_handles_labels()
    handles2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(handles1 + handles2, labels1 + labels2, loc="upper left")

    ax1.set_title("API CPU dan API Memory pada Snapshot Resource Iterasi Pertama")
    fig.tight_layout()
    fig.savefig(
        output_dir / "gambar_10_api_cpu_memory_resource_iterasi_pertama.png",
        dpi=300,
        bbox_inches="tight",
    )
    plt.close(fig)

    print("Grafik dan data sumber berhasil dibuat di folder:")
    print(output_dir.resolve())


if __name__ == "__main__":
    main()
