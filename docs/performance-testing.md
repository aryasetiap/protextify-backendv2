# Performance Testing Backend Protextify

Dokumen ini menjadi panduan teknis untuk menyiapkan dan menjalankan pengujian backend Protextify secara lokal sesuai `RULE_TESTING.md`.

## Tujuan Pengujian

Pengujian bertujuan memastikan layanan backend Protextify berbasis RESTful API dapat berjalan stabil, terukur, dan siap mendukung integrasi deteksi plagiarisme eksternal.

Fokus pengujian:

- functional API testing;
- smoke/baseline testing;
- load, stress, spike, dan endurance testing pada iterasi resmi;
- queue monitoring;
- resource monitoring;
- integration testing WinstonAI secara terbatas.

## Tahapan Pengujian

### Hidden Dry Run

Hidden dry-run adalah pengujian internal untuk memastikan lingkungan lokal siap. Hasil hidden dry-run tidak boleh dijadikan hasil resmi Bab IV.

### Iterasi Pertama

Iterasi Pertama adalah pengujian resmi untuk memperoleh baseline performance backend.

### Iterasi Kedua

Iterasi Kedua dilakukan setelah perbaikan atau penyesuaian berdasarkan temuan Iterasi Pertama.

## Prasyarat Lokal

- Node.js sesuai versi pada `package.json`.
- npm sesuai versi pada `package.json`.
- Docker dan Docker Compose tersedia.
- PostgreSQL dan Redis dapat dijalankan dari `docker-compose.yml`.
- k6 terpasang untuk menjalankan script performance.
- `.env.local` lengkap dan hanya disimpan di mesin lokal.
- Untuk backend yang dijalankan dari host Windows, Redis perlu dipublish ke localhost melalui `docker-compose.local.yml`.

Jangan membagikan isi `.env`, `.env.local`, token, API key, database password, JWT secret, atau credential lain.

## Cek Versi Tooling

```powershell
node -v
npm -v
docker --version
docker compose version
k6 version
```

## Menjalankan PostgreSQL dan Redis untuk Local Testing

Jalankan hanya dependency backend yang dibutuhkan untuk hidden dry-run. Gunakan file local override agar Redis dapat diakses oleh backend yang berjalan di host Windows:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d postgres redis
docker compose -f docker-compose.yml -f docker-compose.local.yml ps
```

`docker-compose.local.yml` hanya mempublish Redis ke `127.0.0.1:6379` untuk kebutuhan lokal. Jangan gunakan override ini untuk deployment production.

Jika container Redis sudah terlanjur berjalan tanpa port mapping, recreate Redis dengan hati-hati:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --force-recreate redis
```

Recreate Redis dapat menghapus data queue sementara di Redis jika belum memakai volume. Pastikan tidak ada job penting sebelum menjalankan command tersebut.

Setelah Redis dipublish, backend lokal sebaiknya memakai:

```text
REDIS_HOST=localhost
REDIS_PORT=6379
```

Redis dari `docker-compose.local.yml` tidak mengaktifkan password. Untuk local hidden dry-run, pastikan `REDIS_PASSWORD` tidak terisi atau tidak dipakai, kecuali Redis lokal memang dikonfigurasi dengan password.

Periksa nilai env tersebut di `.env.local` secara lokal tanpa membagikan isi secret.

Jangan menjalankan `db:seed`, `db:reset`, atau cleanup data sebelum risiko dan target datanya jelas.

## Setup dan Cleanup Data Uji Skripsi

Data uji skripsi dibuat dengan prefix `thesis-perf` dan label `THESIS_PERF` agar mudah dikenali serta aman dibersihkan.

Sebelum setup data uji, pastikan readiness sudah `ready`:

```powershell
curl http://localhost:3000/api/health/readiness
```

Jalankan setup data uji:

```powershell
npm run test:data:setup
```

Script setup akan membuat file lokal berikut:

```text
tests/performance/k6/data/test-data.local.json
```

File lokal tersebut berisi ID data uji yang dibutuhkan k6 dan sudah di-ignore oleh Git. Jangan commit file `*.local.json`.

Jalankan cleanup data uji:

```powershell
npm run test:data:cleanup
```

Reset data uji secara aman dapat dilakukan dengan:

```powershell
npm run thesis:test:data:reset
```

Script setup dan cleanup menolak berjalan pada `NODE_ENV=production`. Periksa `.env.local` sendiri tanpa membagikan secret. Password dummy user test dapat diatur lewat `TEST_USER_PASSWORD`; jika tidak diatur, script memakai fallback dummy lokal yang bukan secret.

Cleanup hanya menghapus data dengan prefix `thesis-perf`, label `THESIS_PERF`, class token `THESISPERF2026`, atau relasi langsung dari data uji tersebut. Script tidak menjalankan `db:reset`, tidak menjalankan `queue:clean`, dan tidak membersihkan queue global.

Troubleshooting:

- Jika assignment terlihat inactive, jalankan ulang `npm run test:data:setup`; script membuat assignment uji dengan `active=true`.
- Jika login/JWT gagal, pastikan user test dibuat dan gunakan password dummy lokal yang sama dengan `TEST_USER_PASSWORD`.
- Jika terjadi konflik data, jalankan `npm run test:data:cleanup`, lalu setup ulang.
- Jika file `test-data.local.json` belum ada, setup belum berhasil atau tidak punya izin tulis ke folder data k6.

## Functional API Testing

Functional API testing digunakan untuk memastikan endpoint utama berjalan sebelum performance testing dengan k6.

Prasyarat:

- backend lokal berjalan;
- `/api/health/readiness` mengembalikan `ready`;
- data uji skripsi sudah dibuat dengan `npm run test:data:setup`;
- file `tests/performance/k6/data/test-data.local.json` tersedia;
- jangan memanggil real WinstonAI untuk functional hidden dry-run.

Jalankan functional test:

```powershell
npm run thesis:test:functional
```

Functional test membaca:

- `BASE_URL` atau default dari `test-data.local.json`;
- data uji dari `tests/performance/k6/data/test-data.local.json`;
- password dummy dari `TEST_USER_PASSWORD` atau fallback dummy lokal yang sama dengan setup script.

Functional test mengubah data uji:

- membuat satu submission baru untuk student khusus create-submission;
- mengubah content submission draft;
- mengubah status submission draft menjadi `SUBMITTED`.

Karena itu, reset data uji sebelum menjalankan ulang functional test:

```powershell
npm run thesis:test:data:reset
npm run thesis:test:functional
```

Positive `POST /api/submissions/:id/check-plagiarism` sengaja tidak dijalankan pada tahap ini agar tidak memicu worker/WinstonAI real. Negative case yang gagal sebelum enqueue/provider tetap dijalankan.

Endpoint report diuji menggunakan submission yang belum memiliki plagiarism check agar tidak memicu pembuatan PDF/storage eksternal. Pengujian report lengkap dilakukan pada integration testing terpisah.

Hasil functional hidden dry-run belum menjadi hasil resmi Bab IV. Hasil resmi hanya berasal dari Iterasi Pertama dan Iterasi Kedua yang benar-benar dijalankan.

## k6 Performance Testing

Script k6 untuk skripsi berada di:

```text
tests/performance/k6/
```

Script yang tersedia:

- `smoke.js` untuk memastikan k6 dapat login dan mengakses endpoint ringan;
- `load.js` untuk beban normal read-heavy;
- `stress.js` untuk mencari titik degradasi secara bertahap;
- `spike.js` untuk lonjakan trafik singkat;
- `endurance.js` untuk stabilitas durasi panjang.

Endpoint performance internal tidak memanggil real WinstonAI, payment/Midtrans, Google OAuth, atau storage upload besar. Endpoint `POST /api/submissions/:id/check-plagiarism` tidak dimasukkan ke load, stress, spike, atau endurance internal.

Prasyarat sebelum menjalankan k6:

- backend lokal berjalan;
- `/api/health/readiness` mengembalikan `ready`;
- data uji sudah dibuat dengan `npm run test:data:setup`;
- `tests/performance/k6/data/test-data.local.json` tersedia;
- `k6 version` berhasil dijalankan;
- hasil hidden dry-run tidak digunakan sebagai hasil resmi Bab IV.

Smoke hidden dry-run:

```powershell
curl http://localhost:3000/api/health/readiness
npm run thesis:k6:smoke
```

Load hidden kecil:

```powershell
$env:K6_LOAD_VUS="5"
$env:K6_LOAD_DURATION="2m"
$env:K6_RUN_LABEL="hidden-dry-run"
$env:K6_SUMMARY_DIR="results/performance/hidden-dry-run"
npm run thesis:k6:load
```

Stress, spike, dan endurance jangan dijalankan otomatis pada hidden dry-run kecuali lingkungan lokal sudah siap dan risikonya dipahami:

```powershell
npm run thesis:k6:stress
npm run thesis:k6:spike
npm run thesis:k6:endurance
```

Official Iterasi Pertama dengan export JSON:

```powershell
$env:K6_RUN_LABEL="iteration-1"
$env:K6_SUMMARY_DIR="results/performance/iteration-1"
k6 run --out json=results/performance/iteration-1/load.json tests/performance/k6/load.js
```

Official Iterasi Kedua dengan export JSON:

```powershell
$env:K6_RUN_LABEL="iteration-2"
$env:K6_SUMMARY_DIR="results/performance/iteration-2"
k6 run --out json=results/performance/iteration-2/load.json tests/performance/k6/load.js
```

Write scenario pada k6 nonaktif secara default. Jika perlu menguji write endpoint terbatas, reset data terlebih dahulu lalu aktifkan flag:

```powershell
npm run thesis:test:data:reset
$env:ENABLE_WRITE_SCENARIO="true"
npm run thesis:k6:load
```

Write scenario dapat mengubah content submission draft. Reset data sebelum menjalankan ulang agar kondisi pengujian tetap repeatable.

Summary otomatis disimpan ke:

```text
results/performance/hidden-dry-run/
results/performance/iteration-1/
results/performance/iteration-2/
```

Gunakan `--out json=...` jika membutuhkan raw metric JSON lengkap dari k6. File JSON, TXT, CSV, dan LOG di folder `results/performance` sudah di-ignore oleh Git.

## Monitoring Resource dan Result Collection

Folder hasil resmi dan hidden dry-run:

```text
results/performance/hidden-dry-run/
results/performance/iteration-1/
results/performance/iteration-2/
```

Siapkan folder hasil pada Windows:

```powershell
npm run thesis:results:prepare -- -Label hidden-dry-run
npm run thesis:results:prepare -- -Label iteration-1
npm run thesis:results:prepare -- -Label iteration-2
```

Siapkan folder hasil pada Linux/VPS:

```bash
bash scripts/monitoring/prepare-result-dir.sh --label hidden-dry-run
bash scripts/monitoring/prepare-result-dir.sh --label iteration-1
bash scripts/monitoring/prepare-result-dir.sh --label iteration-2
```

Script monitoring Windows:

```powershell
$env:RUN_LABEL="hidden-dry-run"
$env:RUN_PHASE="before"
$env:BASE_URL="http://localhost:3000"
npm run thesis:monitor:local
```

Script monitoring Linux/VPS:

```bash
RUN_LABEL=iteration-1 RUN_PHASE=before BASE_URL=http://localhost:3000 \
  bash scripts/monitoring/capture-vps-metrics.sh
```

Queue stats membutuhkan token instructor karena endpoint dilindungi. Jika ingin mengambil queue stats, set token hanya di shell lokal dan jangan tulis ke dokumen:

```powershell
$env:QUEUE_STATS_TOKEN="ISI_TOKEN_INSTRUCTOR_LOKAL"
npm run thesis:monitor:local
Remove-Item Env:\QUEUE_STATS_TOKEN
```

```bash
QUEUE_STATS_TOKEN="ISI_TOKEN_INSTRUCTOR_LOKAL" bash scripts/monitoring/capture-vps-metrics.sh --label iteration-1 --phase before
unset QUEUE_STATS_TOKEN
```

Script monitoring tidak membaca `.env`, tidak mencetak token, tidak mencatat request body, dan tidak menampilkan secret. Jika token tidak tersedia, queue stats akan dilewati dengan catatan `Skipped`.

Naming file hasil:

```text
hidden-dry-run-smoke.json
iteration-1-load.json
iteration-1-stress.json
iteration-1-spike.json
iteration-1-endurance.json
iteration-1-winstonai.json
iteration-1-resource-before.txt
iteration-1-resource-after.txt
iteration-2-load.json
iteration-2-resource-before.txt
iteration-2-resource-after.txt
```

Simpan raw k6 JSON dengan `--out json=...`:

```powershell
$env:K6_RUN_LABEL="iteration-1"
$env:K6_SUMMARY_DIR="results/performance/iteration-1"
k6 run --out json=results/performance/iteration-1/iteration-1-load.json tests/performance/k6/load.js
```

`handleSummary` pada script k6 otomatis membuat summary JSON/TXT di folder `K6_SUMMARY_DIR`. File JSON/TXT/LOG/CSV di `results/performance` sudah di-ignore oleh Git.

Gunakan `docs/performance-result-template.md` untuk menyalin ringkasan hasil ke format laporan yang siap dianalisis.

### Runbook Iterasi Pertama

Jangan jalankan rangkaian ini sampai environment resmi siap. Urutan command Windows:

```powershell
npm run thesis:results:prepare -- -Label iteration-1
npm run thesis:test:data:reset
curl http://localhost:3000/api/health/readiness

$env:RUN_LABEL="iteration-1"
$env:RUN_PHASE="before"
$env:BASE_URL="http://localhost:3000"
npm run thesis:monitor:local

npm run thesis:test:functional

$env:K6_RUN_LABEL="iteration-1"
$env:K6_SUMMARY_DIR="results/performance/iteration-1"
k6 run --out json=results/performance/iteration-1/iteration-1-smoke.json tests/performance/k6/smoke.js
k6 run --out json=results/performance/iteration-1/iteration-1-load.json tests/performance/k6/load.js
k6 run --out json=results/performance/iteration-1/iteration-1-stress.json tests/performance/k6/stress.js
k6 run --out json=results/performance/iteration-1/iteration-1-spike.json tests/performance/k6/spike.js
k6 run --out json=results/performance/iteration-1/iteration-1-endurance.json tests/performance/k6/endurance.js

$env:WINSTON_AI_MODE="mock"
$env:PLAGIARISM_REPORT_MODE="metadata"
k6 run --out json=results/performance/iteration-1/iteration-1-winstonai.json tests/performance/k6/winstonai-integration.js

$env:RUN_PHASE="after"
npm run thesis:monitor:local
npm run thesis:test:data:reset
```

Urutan Linux/VPS:

```bash
bash scripts/monitoring/prepare-result-dir.sh --label iteration-1
npm run thesis:test:data:reset
curl http://localhost:3000/api/health/readiness

RUN_LABEL=iteration-1 RUN_PHASE=before BASE_URL=http://localhost:3000 \
  bash scripts/monitoring/capture-vps-metrics.sh

npm run thesis:test:functional

export K6_RUN_LABEL=iteration-1
export K6_SUMMARY_DIR=results/performance/iteration-1
k6 run --out json=results/performance/iteration-1/iteration-1-smoke.json tests/performance/k6/smoke.js
k6 run --out json=results/performance/iteration-1/iteration-1-load.json tests/performance/k6/load.js
k6 run --out json=results/performance/iteration-1/iteration-1-stress.json tests/performance/k6/stress.js
k6 run --out json=results/performance/iteration-1/iteration-1-spike.json tests/performance/k6/spike.js
k6 run --out json=results/performance/iteration-1/iteration-1-endurance.json tests/performance/k6/endurance.js

WINSTON_AI_MODE=mock PLAGIARISM_REPORT_MODE=metadata \
  k6 run --out json=results/performance/iteration-1/iteration-1-winstonai.json tests/performance/k6/winstonai-integration.js

RUN_LABEL=iteration-1 RUN_PHASE=after BASE_URL=http://localhost:3000 \
  bash scripts/monitoring/capture-vps-metrics.sh
npm run thesis:test:data:reset
```

### Runbook Iterasi Kedua

Gunakan urutan yang sama seperti Iterasi Pertama, tetapi label dan output diarahkan ke `iteration-2`:

```powershell
npm run thesis:results:prepare -- -Label iteration-2
npm run thesis:test:data:reset
curl http://localhost:3000/api/health/readiness

$env:RUN_LABEL="iteration-2"
$env:RUN_PHASE="before"
npm run thesis:monitor:local

npm run thesis:test:functional

$env:K6_RUN_LABEL="iteration-2"
$env:K6_SUMMARY_DIR="results/performance/iteration-2"
k6 run --out json=results/performance/iteration-2/iteration-2-smoke.json tests/performance/k6/smoke.js
k6 run --out json=results/performance/iteration-2/iteration-2-load.json tests/performance/k6/load.js
k6 run --out json=results/performance/iteration-2/iteration-2-stress.json tests/performance/k6/stress.js
k6 run --out json=results/performance/iteration-2/iteration-2-spike.json tests/performance/k6/spike.js
k6 run --out json=results/performance/iteration-2/iteration-2-endurance.json tests/performance/k6/endurance.js
k6 run --out json=results/performance/iteration-2/iteration-2-winstonai.json tests/performance/k6/winstonai-integration.js

$env:RUN_PHASE="after"
npm run thesis:monitor:local
npm run thesis:test:data:reset
```

Hidden dry-run digunakan hanya untuk memastikan kesiapan internal. Hasil resmi Bab IV harus berasal dari Iterasi Pertama dan Iterasi Kedua, dengan file output, snapshot resource, dan ringkasan yang terdokumentasi.

## Deploy ke VPS Testing

Deployment VPS testing digunakan sebagai environment resmi Iterasi Pertama dan Iterasi Kedua. Hidden dry-run lokal tidak boleh dipakai sebagai hasil resmi Bab IV.

### Start Production

Build NestJS repository ini menghasilkan entrypoint:

```text
dist/src/main.js
```

Karena itu `npm run start:prod` menjalankan:

```powershell
node dist/src/main.js
```

Validasi non-Docker:

```powershell
npm install
npm run build
$env:PORT="3000"
npm run start:prod
```

Pada Linux/VPS:

```bash
npm ci
npm run build
PORT=3000 npm run start:prod
```

### Env Testing

Gunakan `.env.testing.example` sebagai template, lalu buat file lokal VPS:

```bash
cp .env.testing.example .env.testing
nano .env.testing
```

Jangan commit `.env.testing`. File tersebut harus diisi sendiri di VPS dan tidak boleh dibagikan.

Mode yang direkomendasikan untuk Iterasi Pertama:

```text
WINSTON_AI_MODE=mock
PLAGIARISM_REPORT_MODE=metadata
```

Real WinstonAI hanya boleh dipakai untuk integration testing terbatas yang eksplisit, misalnya 1-2 trigger, bukan untuk load, stress, spike, atau endurance.

### Docker Compose VPS Testing

Gunakan compose khusus backend testing:

```bash
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml build api
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml up -d postgres redis api
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml ps
```

Untuk validasi konfigurasi dengan file example tanpa membuat `.env.testing`:

```bash
APP_ENV_FILE=.env.testing.example docker compose --env-file .env.testing.example -f docker-compose.vps-testing.yml config --quiet
```

Service yang berjalan:

- `api` pada port `${API_PUBLIC_PORT:-3000}:3000`;
- `postgres` internal Docker network dengan volume `pgdata`;
- `redis` internal Docker network;
- volume `uploads` untuk file upload backend.

PostgreSQL dan Redis tidak dipublish ke publik oleh compose VPS testing. Jika perlu akses debug, gunakan SSH tunnel atau override lokal sementara, bukan publish publik tanpa pembatasan.

Health check:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/health-check
curl http://localhost:3000/api/health/readiness
```

### Deployment Checklist

- Pull repository pada VPS.
- Pastikan branch skripsi/deploy sudah benar.
- Install Docker dan Docker Compose.
- Copy `.env.testing.example` menjadi `.env.testing`.
- Isi `.env.testing` tanpa membagikan secret.
- Pastikan `WINSTON_AI_MODE=mock` dan `PLAGIARISM_REPORT_MODE=metadata` untuk performance internal.
- Build dan jalankan compose VPS testing.
- Cek `/health`, `/api/health-check`, dan `/api/health/readiness`.
- Jalankan `npm run thesis:test:data:reset` pada environment yang terhubung ke DB testing.
- Jalankan functional test.
- Siapkan folder hasil `results/performance/iteration-1`.
- Capture monitoring before.
- Jalankan k6 resmi sesuai runbook.
- Capture monitoring after.
- Reset data uji setelah selesai.
- Salin ringkasan ke `docs/performance-result-template.md`.

### Runbook Iterasi Pertama di VPS

Jangan jalankan command ini sampai environment resmi siap.

```bash
git pull
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml build api
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml up -d postgres redis api
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml ps

curl http://localhost:3000/health
curl http://localhost:3000/api/health-check
curl http://localhost:3000/api/health/readiness

bash scripts/monitoring/prepare-result-dir.sh --label iteration-1
npm run thesis:test:data:reset

RUN_LABEL=iteration-1 RUN_PHASE=before BASE_URL=http://localhost:3000 \
  bash scripts/monitoring/capture-vps-metrics.sh

npm run thesis:test:functional

export K6_RUN_LABEL=iteration-1
export K6_SUMMARY_DIR=results/performance/iteration-1
k6 run --out json=results/performance/iteration-1/iteration-1-smoke.json tests/performance/k6/smoke.js
k6 run --out json=results/performance/iteration-1/iteration-1-load.json tests/performance/k6/load.js
k6 run --out json=results/performance/iteration-1/iteration-1-stress.json tests/performance/k6/stress.js
k6 run --out json=results/performance/iteration-1/iteration-1-spike.json tests/performance/k6/spike.js
k6 run --out json=results/performance/iteration-1/iteration-1-endurance.json tests/performance/k6/endurance.js

WINSTON_AI_MODE=mock PLAGIARISM_REPORT_MODE=metadata \
  k6 run --out json=results/performance/iteration-1/iteration-1-winstonai.json tests/performance/k6/winstonai-integration.js

RUN_LABEL=iteration-1 RUN_PHASE=after BASE_URL=http://localhost:3000 \
  bash scripts/monitoring/capture-vps-metrics.sh

npm run thesis:test:data:reset
```

### Mesin Penguji k6

Idealnya k6 dijalankan dari laptop lokal atau VPS terpisah sebagai mesin penguji. Ini membuat CPU/memory backend tidak bercampur dengan beban generator.

Jika k6 harus dijalankan pada VPS backend yang sama, catat sebagai keterbatasan pengujian karena hasil latency dan resource usage dapat bias oleh proses k6 itu sendiri.

## WinstonAI Integration Testing Terbatas

WinstonAI integration testing digunakan untuk menguji alur backend, bukan akurasi WinstonAI:

```text
trigger endpoint -> Redis/Bull queue -> worker -> provider mock/real -> database -> report/status endpoint
```

Mode provider dikontrol lewat:

```powershell
$env:WINSTON_AI_MODE="mock"
```

Nilai yang didukung:

- `mock` untuk hidden dry-run dan pengujian lokal aman;
- `real` hanya untuk integration testing terbatas setelah token, credit, dan risiko latency diputuskan manual.

Jika `WINSTON_AI_MODE` tidak diset, backend memakai default aman:

- `mock` pada non-production;
- `real` pada production.

Report PDF/storage dapat dinonaktifkan pada local testing dengan:

```powershell
$env:PLAGIARISM_REPORT_MODE="metadata"
```

Jika `PLAGIARISM_REPORT_MODE` tidak diset, backend memakai:

- `metadata` pada non-production;
- `pdf` pada production.

Jalankan integration test WinstonAI terbatas:

```powershell
curl http://localhost:3000/api/health/readiness
npm run thesis:test:data:reset
$env:WINSTON_AI_MODE="mock"
$env:PLAGIARISM_REPORT_MODE="metadata"
npm run thesis:test:winstonai
```

Script k6 WinstonAI integration terbatas dibuat terpisah dari load/stress/spike/endurance:

```powershell
npm run thesis:test:data:reset
$env:WINSTON_AI_MODE="mock"
$env:PLAGIARISM_REPORT_MODE="metadata"
npm run thesis:k6:winstonai
```

Script `tests/performance/k6/winstonai-integration.js` bukan load test besar. Default-nya hanya 1 VU dan 1 iterasi untuk mengukur trigger response time, enqueue success, queue stats, dan polling report secara terbatas.

Jangan memasukkan endpoint WinstonAI real ke `load.js`, `stress.js`, `spike.js`, atau `endurance.js`. Jangan menilai akurasi WinstonAI dari test ini; yang diuji hanya kemampuan backend mengelola integrasi eksternal secara terkendali.

Reset data sebelum menjalankan ulang karena positive integration test mengubah status plagiarism check submission khusus WinstonAI menjadi `completed` atau `failed`.

## Menjalankan Backend Lokal

```powershell
npm install
npm run start:dev
```

Pastikan `.env.local` sudah lengkap sebelum menjalankan backend. Nilai secret tidak boleh ditampilkan di log atau laporan.

## Mengecek Health Endpoint

Endpoint yang dapat dicek secara manual:

```powershell
curl http://localhost:3000/health
curl http://localhost:3000/api/health-check
curl http://localhost:3000/api/health/readiness
curl http://localhost:3000/api/storage/health
```

`/health` dan `/api/health-check` digunakan untuk memastikan API berjalan. `/api/health/readiness` digunakan untuk memastikan API berjalan, PostgreSQL dapat dijangkau, Redis/queue dapat dijangkau, dan queue plagiarism tersedia.

Sebelum lanjut setup data uji, `/api/health/readiness` harus mengembalikan status `ready`.

Contoh readiness yang diharapkan:

```json
{
  "status": "ready",
  "checks": {
    "api": { "status": "up" },
    "postgres": { "status": "up" },
    "redis": { "status": "up" },
    "queue": { "status": "up", "name": "plagiarism" }
  }
}
```

Jika Redis masih `down`:

- pastikan backend membaca `.env.local`;
- pastikan `REDIS_HOST` mengarah ke `localhost` saat backend berjalan di host Windows;
- pastikan `REDIS_PORT` sesuai dengan port yang dipublish;
- pastikan `REDIS_PASSWORD` tidak terisi jika Redis lokal tidak memakai password;
- cek Docker port mapping dengan `docker compose -f docker-compose.yml -f docker-compose.local.yml ps`;
- cek koneksi host dengan `Test-NetConnection localhost -Port 6379`;
- pastikan queue name yang digunakan backend adalah `plagiarism`.

## Menyimpan Hasil Pengujian

Simpan hasil pengujian pada struktur berikut:

```text
results/performance/hidden-dry-run/
results/performance/iteration-1/
results/performance/iteration-2/
```

File hasil seperti JSON, CSV, TXT, dan LOG di folder `results/performance` tidak boleh ikut commit. Sanitasi semua log sebelum digunakan dalam laporan skripsi.

## Aturan WinstonAI

Real WinstonAI hanya boleh digunakan untuk integration testing terbatas. Jangan memanggil real WinstonAI API untuk load test, stress test, spike test, atau endurance test.

Untuk skenario beban internal, gunakan mock/sandbox jika tersedia.

## Catatan Bab IV

Hasil hidden dry-run hanya dipakai untuk kesiapan internal. Hasil resmi Bab IV harus berasal dari Iterasi Pertama dan Iterasi Kedua yang benar-benar dijalankan serta terdokumentasi.
