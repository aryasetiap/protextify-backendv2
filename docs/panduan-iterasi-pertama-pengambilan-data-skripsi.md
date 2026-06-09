# Panduan Pengambilan Data Skripsi Iterasi Pertama

Dokumen ini adalah SOP untuk menjalankan pengambilan data skripsi Iterasi Pertama pada backend Protextify. Fokusnya adalah memperoleh bukti functional testing, integration testing terbatas, performance testing k6, dan resource monitoring yang siap dianalisis pada Bab IV.

Gunakan panduan ini sebagai checklist eksekusi. Jangan menulis secret, token, password, API key, JWT, atau isi file `.env` ke laporan, chat, commit, maupun file evidence.

## Ringkasan Run

| Item | Nilai |
|---|---|
| Nama run resmi | Iterasi Pertama |
| Label folder yang direkomendasikan | `iteration-1-final` |
| Target pengujian | Backend Protextify pada VPS testing |
| Mesin penguji k6 | Laptop lokal atau mesin terpisah |
| Mode WinstonAI | `mock` |
| Mode report plagiarism | `metadata` |
| Output utama | JSON k6, JSON Newman, hasil Jest, snapshot resource VPS |

Catatan penting: jika folder `iteration-1` pernah dipakai untuk pilot atau baseline ringan, gunakan `iteration-1-final` untuk hasil resmi skripsi agar data final tidak bercampur dengan percobaan awal.

## Tujuan

Iterasi Pertama bertujuan untuk:

- memastikan endpoint utama backend berjalan dengan functional testing;
- memastikan alur integrasi plagiarism check berjalan terbatas dengan mode mock;
- memperoleh baseline performa backend melalui smoke, load, stress, spike, dan endurance testing;
- mencatat kondisi resource VPS sebelum, saat, dan setelah pengujian;
- menghasilkan evidence yang dapat ditelusuri ulang untuk Bab IV.

## Topologi Pengujian

Gunakan pemisahan peran berikut agar hasil resource backend tidak tercampur dengan beban generator:

| Komponen | Lokasi | Keterangan |
|---|---|---|
| Backend API | VPS testing | Dijalankan dengan Docker Compose VPS testing |
| PostgreSQL | VPS testing | Internal Docker network |
| Redis/Queue | VPS testing | Internal Docker network |
| k6 | Laptop lokal | Mengirim beban ke API VPS |
| Newman/Postman | Laptop lokal | Functional dan integration evidence tambahan |
| Resource monitoring | VPS testing | Mengambil snapshot CPU, memory, health, dan queue |

Jika k6 terpaksa dijalankan di VPS yang sama dengan backend, catat sebagai keterbatasan penelitian karena CPU dan memory VPS ikut dipakai oleh proses k6.

## Prasyarat

### Di Laptop Lokal

Pastikan tool berikut tersedia:

```powershell
node -v
npm -v
k6 version
git --version
```

Pastikan dependency project sudah terpasang:

```powershell
npm install
```

Pastikan file environment Postman lokal tersedia:

```powershell
Copy-Item tests/postman/protextify-api-testing.postman_environment.example.json `
  tests/postman/protextify-api-testing.postman_environment.local.json
```

Isi placeholder di `tests/postman/protextify-api-testing.postman_environment.local.json` dari data uji VPS. Jangan mencetak isi file tersebut ke terminal atau laporan.

### Di VPS Testing

Pastikan VPS sudah memiliki:

- Docker dan Docker Compose;
- repository backend Protextify;
- file `.env.testing` yang dibuat dari `.env.testing.example`;
- konfigurasi `WINSTON_AI_MODE=mock`;
- konfigurasi `PLAGIARISM_REPORT_MODE=metadata`;
- port API publik terbuka sesuai kebutuhan pengujian.

Validasi Docker Compose:

```bash
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml config --quiet
```

## Struktur Folder Evidence

Gunakan struktur berikut:

```text
results/performance/iteration-1-final/
skripsi-evidence/result-files/
```

File mentah di `results/performance` digunakan sebagai output asli. File di `skripsi-evidence/result-files` dapat dipakai sebagai salinan evidence yang sudah dipilih untuk kebutuhan skripsi.

Siapkan folder hasil dari laptop:

```powershell
npm run thesis:results:prepare -- -Label iteration-1-final
```

Siapkan folder hasil dari VPS:

```bash
bash scripts/monitoring/prepare-result-dir.sh --label iteration-1-final
```

## Checklist Sebelum Run

Isi checklist ini sebelum mulai pengambilan data:

| No | Pemeriksaan | Status |
|---:|---|---|
| 1 | Branch repository sudah benar |  |
| 2 | Commit hash sudah dicatat |  |
| 3 | Backend VPS sudah berjalan |  |
| 4 | PostgreSQL dan Redis VPS berjalan |  |
| 5 | `/api/health/readiness` berstatus `ready` |  |
| 6 | Data uji skripsi sudah di-reset |  |
| 7 | Functional test lulus |  |
| 8 | Folder `iteration-1-final` sudah dibuat |  |
| 9 | Mode WinstonAI memakai `mock` |  |
| 10 | Mode report memakai `metadata` |  |
| 11 | Token/secret tidak tercetak di log |  |

## Langkah 1: Deploy Backend di VPS

Jalankan di VPS:

```bash
git pull

docker compose --env-file .env.testing -f docker-compose.vps-testing.yml build api
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml up -d postgres redis api
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml ps
```

Cek health endpoint:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/health-check
curl http://localhost:3000/api/health/readiness
```

Lanjutkan hanya jika readiness menunjukkan API, PostgreSQL, Redis, dan queue dalam kondisi siap.

## Langkah 2: Reset Data Uji di VPS

Jalankan di VPS:

```bash
npm run thesis:test:data:reset
```

Data uji yang dibuat memakai prefix `thesis-perf` dan label `THESIS_PERF`. Script tidak boleh dijalankan pada `NODE_ENV=production`.

Setelah reset, cek kembali readiness:

```bash
curl http://localhost:3000/api/health/readiness
```

## Langkah 3: Catat Identitas Run

Catat informasi berikut sebelum pengujian:

```bash
git branch --show-current
git rev-parse HEAD
node -v
npm -v
docker --version
docker compose version
```

Di laptop, catat versi k6:

```powershell
k6 version
```

Masukkan informasi ini ke template hasil:

```text
docs/performance-result-template.md
```

## Langkah 4: Ambil Resource Snapshot Before

Jalankan di VPS sebelum functional test dan k6:

```bash
RUN_LABEL=iteration-1-final RUN_PHASE=before BASE_URL=http://localhost:3000 \
  bash scripts/monitoring/capture-vps-metrics.sh
```

Output yang diharapkan:

```text
results/performance/iteration-1-final/iteration-1-final-resource-before.txt
```

Jika ingin menyertakan queue stats, set token instructor hanya pada shell aktif. Jangan tulis token ke file:

```bash
QUEUE_STATS_TOKEN="ISI_TOKEN_INSTRUCTOR_LOKAL" \
RUN_LABEL=iteration-1-final RUN_PHASE=before BASE_URL=http://localhost:3000 \
  bash scripts/monitoring/capture-vps-metrics.sh

unset QUEUE_STATS_TOKEN
```

## Langkah 5: Jalankan Functional Test

Jalankan di VPS:

```bash
npm run thesis:test:functional
```

Jika functional test gagal, hentikan pengambilan data resmi. Perbaiki penyebabnya, reset data uji, lalu ulangi dari Langkah 2.

Catat hasilnya:

| Item | Nilai |
|---|---|
| Test suites passed |  |
| Tests passed |  |
| Tests failed |  |
| Catatan endpoint gagal |  |

## Langkah 6: Jalankan Newman dari Laptop

Pastikan `base_url` pada environment lokal mengarah ke API VPS, misalnya:

```text
http://103.55.37.96:3000
```

Jalankan dari laptop:

```powershell
npm run test:postman:iteration1
```

Atau command langsung:

```powershell
npx --yes newman run tests/postman/protextify-api-functional-integration.postman_collection.json `
  -e tests/postman/protextify-api-testing.postman_environment.local.json `
  --reporters cli,json `
  --reporter-json-export results/performance/iteration-1-final/iteration-1-final-postman-newman-report.json
```

Output yang diharapkan:

```text
results/performance/iteration-1-final/iteration-1-final-postman-newman-report.json
```

Jika Newman gagal karena data berubah, reset data uji di VPS lalu ulangi functional test sebelum lanjut.

## Langkah 7: Set Environment k6 di Laptop

Jalankan di laptop sebelum semua skenario k6:

```powershell
$env:BASE_URL="http://103.55.37.96:3000"
$env:K6_RUN_LABEL="iteration-1-final"
$env:K6_SUMMARY_DIR="results/performance/iteration-1-final"
$env:WINSTON_AI_MODE="mock"
$env:PLAGIARISM_REPORT_MODE="metadata"

$env:K6_LOAD_VUS="20"
$env:K6_LOAD_DURATION="10m"
$env:K6_STRESS_MAX_VUS="75"
$env:K6_SPIKE_MAX_VUS="75"
$env:K6_ENDURANCE_VUS="15"
$env:K6_ENDURANCE_DURATION="30m"
```

Sesuaikan `BASE_URL` dengan alamat VPS yang benar. Jangan memakai endpoint production sungguhan.

## Langkah 8: Jalankan Smoke Test

Jalankan di laptop:

```powershell
k6 run --out json=results/performance/iteration-1-final/iteration-1-final-smoke.json tests/performance/k6/smoke.js
```

Lanjutkan hanya jika smoke test lulus. Output yang diharapkan:

```text
results/performance/iteration-1-final/iteration-1-final-smoke.json
results/performance/iteration-1-final/iteration-1-final-smoke-summary.json
```

## Langkah 9: Jalankan Load Test dan Capture During

Mulai load test dari laptop:

```powershell
k6 run --out json=results/performance/iteration-1-final/iteration-1-final-load.json tests/performance/k6/load.js
```

Saat load test sedang berjalan, ambil snapshot di VPS:

```bash
RUN_LABEL=iteration-1-final RUN_PHASE=during-load BASE_URL=http://localhost:3000 \
  bash scripts/monitoring/capture-vps-metrics.sh
```

Output yang diharapkan:

```text
results/performance/iteration-1-final/iteration-1-final-load.json
results/performance/iteration-1-final/iteration-1-final-load-summary.json
results/performance/iteration-1-final/iteration-1-final-resource-during-load.txt
```

## Langkah 10: Jalankan Stress Test dan Capture During

Mulai stress test dari laptop:

```powershell
k6 run --out json=results/performance/iteration-1-final/iteration-1-final-stress.json tests/performance/k6/stress.js
```

Saat stress test sedang berjalan, ambil snapshot di VPS:

```bash
RUN_LABEL=iteration-1-final RUN_PHASE=during-stress BASE_URL=http://localhost:3000 \
  bash scripts/monitoring/capture-vps-metrics.sh
```

Output yang diharapkan:

```text
results/performance/iteration-1-final/iteration-1-final-stress.json
results/performance/iteration-1-final/iteration-1-final-stress-summary.json
results/performance/iteration-1-final/iteration-1-final-resource-during-stress.txt
```

Stress test memang boleh menunjukkan degradasi. Yang perlu dianalisis adalah error rate, p95, p99, status code, queue, dan resource VPS.

## Langkah 11: Jalankan Spike Test dan Capture During

Mulai spike test dari laptop:

```powershell
k6 run --out json=results/performance/iteration-1-final/iteration-1-final-spike.json tests/performance/k6/spike.js
```

Saat spike test sedang berjalan, ambil snapshot di VPS:

```bash
RUN_LABEL=iteration-1-final RUN_PHASE=during-spike BASE_URL=http://localhost:3000 \
  bash scripts/monitoring/capture-vps-metrics.sh
```

Output yang diharapkan:

```text
results/performance/iteration-1-final/iteration-1-final-spike.json
results/performance/iteration-1-final/iteration-1-final-spike-summary.json
results/performance/iteration-1-final/iteration-1-final-resource-during-spike.txt
```

## Langkah 12: Jalankan Endurance Test dan Capture During

Mulai endurance test dari laptop:

```powershell
k6 run --out json=results/performance/iteration-1-final/iteration-1-final-endurance.json tests/performance/k6/endurance.js
```

Saat endurance test sedang berjalan, ambil snapshot di VPS:

```bash
RUN_LABEL=iteration-1-final RUN_PHASE=during-endurance BASE_URL=http://localhost:3000 \
  bash scripts/monitoring/capture-vps-metrics.sh
```

Output yang diharapkan:

```text
results/performance/iteration-1-final/iteration-1-final-endurance.json
results/performance/iteration-1-final/iteration-1-final-endurance-summary.json
results/performance/iteration-1-final/iteration-1-final-resource-during-endurance.txt
```

## Langkah 13: Jalankan WinstonAI Integration Terbatas

Jalankan dari laptop:

```powershell
k6 run --out json=results/performance/iteration-1-final/iteration-1-final-winstonai.json tests/performance/k6/winstonai-integration.js
```

Output yang diharapkan:

```text
results/performance/iteration-1-final/iteration-1-final-winstonai.json
results/performance/iteration-1-final/iteration-1-final-winstonai-integration-summary.json
```

Pengujian ini tidak mengukur akurasi WinstonAI. Yang diuji adalah alur backend:

```text
trigger endpoint -> Redis/Bull queue -> worker -> provider mock -> database -> report/status endpoint
```

Jangan memakai real WinstonAI untuk load, stress, spike, atau endurance.

## Langkah 14: Ambil Resource Snapshot After

Setelah semua skenario selesai, jalankan di VPS:

```bash
RUN_LABEL=iteration-1-final RUN_PHASE=after BASE_URL=http://localhost:3000 \
  bash scripts/monitoring/capture-vps-metrics.sh
```

Output yang diharapkan:

```text
results/performance/iteration-1-final/iteration-1-final-resource-after.txt
```

## Langkah 15: Reset Data Uji Setelah Run

Jalankan di VPS:

```bash
npm run thesis:test:data:reset
```

Tujuannya agar environment siap untuk pengujian ulang atau Iterasi Kedua.

## Checklist File Evidence

Pastikan file berikut tersedia setelah run selesai:

| No | File | Status |
|---:|---|---|
| 1 | `iteration-1-final-postman-newman-report.json` |  |
| 2 | `iteration-1-final-smoke.json` |  |
| 3 | `iteration-1-final-smoke-summary.json` |  |
| 4 | `iteration-1-final-load.json` |  |
| 5 | `iteration-1-final-load-summary.json` |  |
| 6 | `iteration-1-final-stress.json` |  |
| 7 | `iteration-1-final-stress-summary.json` |  |
| 8 | `iteration-1-final-spike.json` |  |
| 9 | `iteration-1-final-spike-summary.json` |  |
| 10 | `iteration-1-final-endurance.json` |  |
| 11 | `iteration-1-final-endurance-summary.json` |  |
| 12 | `iteration-1-final-winstonai.json` |  |
| 13 | `iteration-1-final-winstonai-integration-summary.json` |  |
| 14 | `iteration-1-final-resource-before.txt` |  |
| 15 | `iteration-1-final-resource-during-load.txt` |  |
| 16 | `iteration-1-final-resource-during-stress.txt` |  |
| 17 | `iteration-1-final-resource-during-spike.txt` |  |
| 18 | `iteration-1-final-resource-during-endurance.txt` |  |
| 19 | `iteration-1-final-resource-after.txt` |  |

## Kriteria Run Valid

Run Iterasi Pertama dianggap valid jika:

- backend VPS berjalan pada commit yang dicatat;
- readiness berstatus siap sebelum pengujian;
- data uji sudah di-reset sebelum pengujian;
- functional test tidak gagal;
- smoke test k6 lulus;
- load, stress, spike, endurance, dan WinstonAI mock menghasilkan file output;
- snapshot resource before, during, dan after tersedia;
- tidak ada secret yang masuk ke evidence;
- semua anomali dicatat, bukan disembunyikan.

Run perlu diulang jika:

- backend atau database restart tidak sengaja saat skenario berjalan;
- file output utama hilang atau korup;
- k6 diarahkan ke `BASE_URL` yang salah;
- mode WinstonAI ternyata `real` saat load, stress, spike, atau endurance;
- data uji tidak konsisten karena tidak di-reset;
- functional test gagal tetapi performance test tetap dijalankan.

## Ringkasan Data yang Diambil untuk Bab IV

Gunakan file summary k6 untuk mengisi tabel:

| Skenario | Data yang Diambil |
|---|---|
| Smoke | status checks, request count, error rate, p95, p99 |
| Load | request count, RPS, avg response, p95, p99, error rate |
| Stress | titik degradasi, p95, p99, error rate, status code |
| Spike | respons terhadap lonjakan, error rate, p95, p99 |
| Endurance | stabilitas durasi panjang, error rate, p95, p99 |
| WinstonAI mock | trigger response, queue behavior, status akhir job |
| Resource VPS | CPU dan memory API, PostgreSQL, Redis, queue snapshot |

Salin ringkasan ke:

```text
docs/performance-result-template.md
```

## Format Catatan Anomali

Gunakan format berikut jika terjadi masalah:

| Waktu | Skenario | Gejala | Bukti | Dampak | Keputusan |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

Contoh keputusan:

- `lanjut`, jika anomali kecil dan evidence tetap lengkap;
- `ulang skenario`, jika satu skenario gagal tetapi environment masih valid;
- `ulang dari awal`, jika readiness, data uji, mode provider, atau deployment tidak valid.

## Urutan Cepat Command

Bagian ini hanya ringkasan. Gunakan langkah detail di atas saat menjalankan pengambilan data resmi.

Di VPS:

```bash
git pull
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml build api
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml up -d postgres redis api
curl http://localhost:3000/api/health/readiness
bash scripts/monitoring/prepare-result-dir.sh --label iteration-1-final
npm run thesis:test:data:reset
RUN_LABEL=iteration-1-final RUN_PHASE=before BASE_URL=http://localhost:3000 bash scripts/monitoring/capture-vps-metrics.sh
npm run thesis:test:functional
```

Di laptop:

```powershell
npm run thesis:results:prepare -- -Label iteration-1-final

$env:BASE_URL="http://103.55.37.96:3000"
$env:K6_RUN_LABEL="iteration-1-final"
$env:K6_SUMMARY_DIR="results/performance/iteration-1-final"
$env:WINSTON_AI_MODE="mock"
$env:PLAGIARISM_REPORT_MODE="metadata"
$env:K6_LOAD_VUS="20"
$env:K6_LOAD_DURATION="10m"
$env:K6_STRESS_MAX_VUS="75"
$env:K6_SPIKE_MAX_VUS="75"
$env:K6_ENDURANCE_VUS="15"
$env:K6_ENDURANCE_DURATION="30m"

npm run test:postman:iteration1
k6 run --out json=results/performance/iteration-1-final/iteration-1-final-smoke.json tests/performance/k6/smoke.js
k6 run --out json=results/performance/iteration-1-final/iteration-1-final-load.json tests/performance/k6/load.js
k6 run --out json=results/performance/iteration-1-final/iteration-1-final-stress.json tests/performance/k6/stress.js
k6 run --out json=results/performance/iteration-1-final/iteration-1-final-spike.json tests/performance/k6/spike.js
k6 run --out json=results/performance/iteration-1-final/iteration-1-final-endurance.json tests/performance/k6/endurance.js
k6 run --out json=results/performance/iteration-1-final/iteration-1-final-winstonai.json tests/performance/k6/winstonai-integration.js
```

Di VPS saat masing-masing skenario berjalan:

```bash
RUN_LABEL=iteration-1-final RUN_PHASE=during-load BASE_URL=http://localhost:3000 bash scripts/monitoring/capture-vps-metrics.sh
RUN_LABEL=iteration-1-final RUN_PHASE=during-stress BASE_URL=http://localhost:3000 bash scripts/monitoring/capture-vps-metrics.sh
RUN_LABEL=iteration-1-final RUN_PHASE=during-spike BASE_URL=http://localhost:3000 bash scripts/monitoring/capture-vps-metrics.sh
RUN_LABEL=iteration-1-final RUN_PHASE=during-endurance BASE_URL=http://localhost:3000 bash scripts/monitoring/capture-vps-metrics.sh
RUN_LABEL=iteration-1-final RUN_PHASE=after BASE_URL=http://localhost:3000 bash scripts/monitoring/capture-vps-metrics.sh
npm run thesis:test:data:reset
```

## Setelah Pengambilan Data

Setelah semua output tersedia:

1. salin angka penting ke `docs/performance-result-template.md`;
2. cek ulang tidak ada secret di file evidence;
3. simpan daftar file evidence yang dipakai pada Bab IV;
4. catat anomali dan keterbatasan;
5. lanjutkan analisis untuk menentukan perbaikan pada Iterasi Kedua.
