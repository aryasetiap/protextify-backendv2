import matplotlib.pyplot as plt
from pathlib import Path

output_dir = Path("results/performance/comparison")
output_dir.mkdir(parents=True, exist_ok=True)

scenarios = ["Smoke", "Load", "Stress", "Spike", "Endurance"]

iter1_avg = [100.89, 170.36, 134.16, 84.01, 88.31]
iter1_p95 = [196.35, 618.16, 314.23, 161.84, 153.09]
iter1_p99 = [298.93, 1381.00, 742.36, 307.55, 232.73]
iter1_failed = [0, 0, 0, 0, 0]

iter2_avg = [83.97, 96.47, 282.37, 187.19, 97.27]
iter2_p95 = [155.46, 178.12, 997.19, 581.86, 160.83]
iter2_p99 = [169.76, 296.58, 1813.86, 839.35, 364.13]
iter2_failed = [0, 0, 0, 0, 0]

def make_chart(title, ylabel, data1, data2, filename):
    x = range(len(scenarios))
    width = 0.35

    plt.figure(figsize=(10, 6))
    plt.bar([i - width/2 for i in x], data1, width, label="Iterasi 1")
    plt.bar([i + width/2 for i in x], data2, width, label="Iterasi 2")
    plt.xticks(list(x), scenarios)
    plt.ylabel(ylabel)
    plt.title(title)
    plt.legend()
    plt.tight_layout()
    plt.savefig(output_dir / filename, dpi=200)
    print(f"Saved {output_dir / filename}")

make_chart(
    "Perbandingan Average Response Time Iterasi 1 dan Iterasi 2",
    "Response Time (ms)",
    iter1_avg,
    iter2_avg,
    "comparison-average-response-time.png",
)

make_chart(
    "Perbandingan p95 Response Time Iterasi 1 dan Iterasi 2",
    "Response Time (ms)",
    iter1_p95,
    iter2_p95,
    "comparison-p95-response-time.png",
)

make_chart(
    "Perbandingan p99 Response Time Iterasi 1 dan Iterasi 2",
    "Response Time (ms)",
    iter1_p99,
    iter2_p99,
    "comparison-p99-response-time.png",
)

make_chart(
    "Perbandingan Error Rate Iterasi 1 dan Iterasi 2",
    "HTTP Request Failed (%)",
    iter1_failed,
    iter2_failed,
    "comparison-error-rate.png",
)
