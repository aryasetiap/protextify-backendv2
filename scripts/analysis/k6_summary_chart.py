import matplotlib.pyplot as plt
from pathlib import Path

output_dir = Path("results/performance/iteration-1")
output_dir.mkdir(parents=True, exist_ok=True)

scenarios = ["Smoke", "Load", "Stress", "Spike", "Endurance"]

avg = [100.89, 170.36, 134.16, 84.01, 88.31]
p95 = [196.35, 618.16, 314.23, 161.84, 153.09]
p99 = [298.93, 1381.00, 742.36, 307.55, 232.73]
failed = [0, 0, 0, 0, 0]

plt.figure(figsize=(10, 6))
plt.plot(scenarios, avg, marker="o", label="Average")
plt.plot(scenarios, p95, marker="o", label="p95")
plt.plot(scenarios, p99, marker="o", label="p99")
plt.xlabel("Skenario Pengujian")
plt.ylabel("Response Time (ms)")
plt.title("Perbandingan Response Time Performance Testing Iterasi Pertama")
plt.legend()
plt.grid(True, axis="y")
plt.tight_layout()
plt.savefig(output_dir / "grafik-response-time-p95-p99.png", dpi=200)
print(f"Saved {output_dir / 'grafik-response-time-p95-p99.png'}")

plt.figure(figsize=(10, 6))
plt.bar(scenarios, failed)
plt.xlabel("Skenario Pengujian")
plt.ylabel("HTTP Request Failed (%)")
plt.title("Error Rate Performance Testing Iterasi Pertama")
plt.tight_layout()
plt.savefig(output_dir / "grafik-error-rate.png", dpi=200)
print(f"Saved {output_dir / 'grafik-error-rate.png'}")
