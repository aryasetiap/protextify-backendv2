# Panduan Setup VPS Backend Protextify untuk Iterasi Pertama

Panduan ini menyiapkan VPS sebagai environment resmi pengujian backend Protextify untuk skripsi. Ikuti `RULE_TESTING.md`: jangan menampilkan secret, jangan commit `.env`, jangan menjalankan `db:reset`, dan jangan memakai real WinstonAI untuk load/stress/spike/endurance.

## 1. Target Setup

Repository:

```bash
https://github.com/aryasetiap/protextify-backendv2.git
```

Branch:

```bash
skripsi/performance-be-rest-api-plagiarism
```

Mode Iterasi Pertama yang direkomendasikan:

```text
WINSTON_AI_MODE=mock
PLAGIARISM_REPORT_MODE=metadata
```

Real WinstonAI hanya boleh diuji terpisah secara terbatas dan eksplisit, bukan sebagai bagian dari load/stress/spike/endurance.

## 2. Prasyarat VPS

Rekomendasi minimum:

- Ubuntu 22.04 LTS atau 24.04 LTS;
- 2 vCPU;
- 4 GB RAM atau lebih;
- 30 GB disk atau lebih;
- akses SSH;
- port API yang dipakai, default `3000`, dibuka hanya jika memang diperlukan.

Update sistem:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg git ufw htop unzip
```

## 3. Install Docker dan Docker Compose

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Keluar dari SSH lalu login lagi agar group `docker` aktif. Validasi:

```bash
docker --version
docker compose version
```

## 4. Firewall Dasar

```bash
sudo ufw allow OpenSSH
sudo ufw allow 3000/tcp
sudo ufw enable
sudo ufw status
```

Jangan expose PostgreSQL `5432` atau Redis `6379` ke publik. Pada compose VPS testing, keduanya hanya berada di Docker network internal.

## 5. Clone Repository

```bash
mkdir -p ~/apps
cd ~/apps
git clone https://github.com/aryasetiap/protextify-backendv2.git
cd protextify-backendv2
git checkout skripsi/performance-be-rest-api-plagiarism
```

Validasi file penting:

```bash
ls
ls docs
ls scripts/monitoring
ls tests/performance/k6
```

## 6. Siapkan Environment File

Buat `.env.testing` dari template:

```bash
cp .env.testing.example .env.testing
nano .env.testing
```

Isi nilai sendiri di VPS. Jangan kirim atau commit file ini.

Checklist variabel wajib:

```text
NODE_ENV
PORT
API_PUBLIC_PORT
DATABASE_URL
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DB
REDIS_HOST
REDIS_PORT
REDIS_PASSWORD
JWT_SECRET
JWT_EXPIRATION_TIME
WINSTON_AI_MODE
WINSTON_AI_API_URL
WINSTON_AI_TOKEN
PLAGIARISM_REPORT_MODE
BASE_URL
FRONTEND_URL
CORS_ORIGINS
CLOUDFLARE_R2_ENDPOINT
CLOUDFLARE_R2_REGION
CLOUDFLARE_R2_BUCKET
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_PUBLIC_URL
MIDTRANS_SERVER_KEY
MIDTRANS_CLIENT_KEY
MIDTRANS_IS_PRODUCTION
ENABLE_REQUEST_LOGGING
TEST_USER_PASSWORD
```

Untuk performance internal:

```text
WINSTON_AI_MODE=mock
PLAGIARISM_REPORT_MODE=metadata
ENABLE_REQUEST_LOGGING=false
```

`DATABASE_URL` di container harus memakai host Docker service:

```text
postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@postgres:5432/<POSTGRES_DB>?schema=public
```

Redis di container:

```text
REDIS_HOST=redis
REDIS_PORT=6379
```

## 7. Validasi Compose

```bash
APP_ENV_FILE=.env.testing.example \
docker compose --env-file .env.testing.example -f docker-compose.vps-testing.yml config --quiet

docker compose --env-file .env.testing -f docker-compose.vps-testing.yml config --quiet
```

Jika command kedua gagal, cek `.env.testing` di VPS. Jangan tempel nilainya ke chat atau laporan.

## 8. Build dan Jalankan Dependency

Build image API:

```bash
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml build api
```

Jalankan PostgreSQL dan Redis lebih dulu:

```bash
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml up -d postgres redis
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml ps
```

## 9. Jalankan Migrasi Aman

Gunakan `prisma migrate deploy`, bukan `db:reset`.

```bash
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml run --rm api npx prisma migrate deploy
```

Jika migrasi gagal, hentikan proses deploy dan simpan error ringkas tanpa secret.

## 10. Jalankan API

```bash
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml up -d api
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml ps
```

Lihat log ringkas:

```bash
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml logs --tail=100 api
```

Pastikan log tidak menampilkan secret sebelum disimpan ke laporan.

## 11. Health dan Readiness Check

Dari VPS:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/health-check
curl http://localhost:3000/api/health/readiness
```

Expected:

```text
/health -> healthy
/api/health-check -> healthy
/api/health/readiness -> ready
postgres -> up
redis -> up
queue -> up
```

Dari mesin lokal, jika port 3000 dibuka:

```bash
curl http://<VPS_IP_OR_DOMAIN>:3000/health
curl http://<VPS_IP_OR_DOMAIN>:3000/api/health/readiness
```

## 12. Setup Data Uji Skripsi di VPS

Data uji harus dibuat dengan prefix `thesis-perf` dan cleanup hanya boleh menyentuh data uji tersebut.

Jalankan dari container API:

```bash
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml exec api npm run thesis:test:data:reset
```

Ambil file data k6 dari container ke host VPS:

```bash
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml cp \
  api:/usr/src/app/tests/performance/k6/data/test-data.local.json \
  tests/performance/k6/data/test-data.local.json
```

File `test-data.local.json` sudah di-ignore. Jangan commit file ini.

Jika k6 dijalankan dari laptop atau VPS penguji terpisah, salin file tersebut secara aman:

```bash
scp user@<VPS_IP>:~/apps/protextify-backendv2/tests/performance/k6/data/test-data.local.json \
  ./tests/performance/k6/data/test-data.local.json
```

File ini berisi ID dan email dummy, bukan token. Tetap jangan commit.

## 13. Opsi Mesin Penguji k6

### Opsi Ideal: k6 dari Laptop atau VPS Terpisah

Kelebihan:

- resource backend tidak bercampur dengan load generator;
- hasil CPU/memory VPS backend lebih mudah dibaca;
- lebih netral untuk Bab IV.

Set pada mesin penguji:

```bash
export BASE_URL=http://<VPS_IP_OR_DOMAIN>:3000
export K6_RUN_LABEL=iteration-1
export K6_SUMMARY_DIR=results/performance/iteration-1
```

### Opsi Alternatif: k6 dari VPS Backend yang Sama

Boleh jika tidak ada mesin lain, tetapi catat sebagai keterbatasan karena proses k6 ikut memakai CPU/memory VPS backend.

## 14. Install Node dan k6 pada Mesin Penguji

Jika mesin penguji adalah VPS yang sama atau VPS terpisah:

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Install k6:

```bash
sudo gpg -k
curl -fsSL https://dl.k6.io/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt update
sudo apt install -y k6
k6 version
```

Install dependency repo pada mesin penguji jika akan menjalankan Jest/k6 dari repo:

```bash
npm ci
```

## 15. Monitoring Before/After

Siapkan folder hasil:

```bash
bash scripts/monitoring/prepare-result-dir.sh --label iteration-1
```

Capture before:

```bash
RUN_LABEL=iteration-1 RUN_PHASE=before BASE_URL=http://localhost:3000 \
  bash scripts/monitoring/capture-vps-metrics.sh
```

Jika monitoring dijalankan dari mesin penguji terpisah, sesuaikan `BASE_URL`:

```bash
RUN_LABEL=iteration-1 RUN_PHASE=before BASE_URL=http://<VPS_IP_OR_DOMAIN>:3000 \
  bash scripts/monitoring/capture-vps-metrics.sh
```

Queue stats endpoint protected. Jika ingin capture queue stats, set token instructor di shell saja, lalu hapus:

```bash
export QUEUE_STATS_TOKEN="<ISI_TOKEN_INSTRUCTOR_LOKAL>"
RUN_LABEL=iteration-1 RUN_PHASE=before BASE_URL=http://<VPS_IP_OR_DOMAIN>:3000 \
  bash scripts/monitoring/capture-vps-metrics.sh
unset QUEUE_STATS_TOKEN
```

Jangan masukkan token ke dokumen.

## 16. Functional Test Readiness

Jalankan setelah `test-data.local.json` tersedia pada mesin penguji:

```bash
export BASE_URL=http://<VPS_IP_OR_DOMAIN>:3000
npm run thesis:test:functional
```

Jika functional test mengubah data, reset data lagi di VPS:

```bash
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml exec api npm run thesis:test:data:reset
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml cp \
  api:/usr/src/app/tests/performance/k6/data/test-data.local.json \
  tests/performance/k6/data/test-data.local.json
```

## 17. Runbook Iterasi Pertama Resmi

Jangan jalankan sebelum Arya menyatakan environment resmi siap.

```bash
bash scripts/monitoring/prepare-result-dir.sh --label iteration-1

docker compose --env-file .env.testing -f docker-compose.vps-testing.yml exec api npm run thesis:test:data:reset
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml cp \
  api:/usr/src/app/tests/performance/k6/data/test-data.local.json \
  tests/performance/k6/data/test-data.local.json

curl http://localhost:3000/api/health/readiness

RUN_LABEL=iteration-1 RUN_PHASE=before BASE_URL=http://localhost:3000 \
  bash scripts/monitoring/capture-vps-metrics.sh

export BASE_URL=http://localhost:3000
npm run thesis:test:functional

docker compose --env-file .env.testing -f docker-compose.vps-testing.yml exec api npm run thesis:test:data:reset
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml cp \
  api:/usr/src/app/tests/performance/k6/data/test-data.local.json \
  tests/performance/k6/data/test-data.local.json

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

docker compose --env-file .env.testing -f docker-compose.vps-testing.yml exec api npm run thesis:test:data:reset
```

Jika k6 dijalankan dari mesin penguji terpisah, ubah `BASE_URL` menjadi URL publik VPS.

## 18. File Hasil yang Diharapkan

```text
results/performance/iteration-1/iteration-1-smoke.json
results/performance/iteration-1/iteration-1-load.json
results/performance/iteration-1/iteration-1-stress.json
results/performance/iteration-1/iteration-1-spike.json
results/performance/iteration-1/iteration-1-endurance.json
results/performance/iteration-1/iteration-1-winstonai.json
results/performance/iteration-1/iteration-1-resource-before.txt
results/performance/iteration-1/iteration-1-resource-after.txt
```

File hasil di `results/performance` sudah di-ignore. Jangan commit file JSON/TXT/LOG/CSV hasil pengujian.

## 19. Troubleshooting

### API tidak healthy

```bash
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml logs --tail=150 api
```

Cek:

- `.env.testing` lengkap;
- `DATABASE_URL` memakai host `postgres`;
- `REDIS_HOST=redis`;
- `JWT_SECRET` dan `JWT_EXPIRATION_TIME` terisi;
- migrasi sudah dijalankan.

### Readiness postgres down

```bash
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml ps postgres
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml logs --tail=100 postgres
```

Cek `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, dan `DATABASE_URL`. Jangan tampilkan nilainya di laporan.

### Readiness redis/queue down

```bash
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml ps redis
docker compose --env-file .env.testing -f docker-compose.vps-testing.yml logs --tail=100 redis
```

Cek `REDIS_HOST`, `REDIS_PORT`, dan `REDIS_PASSWORD`.

### Test data setup gagal

Pastikan `NODE_ENV` bukan `production`. Untuk environment skripsi gunakan `development` atau `test`, karena script data uji menolak production.

### k6 gagal login

Cek:

- `test-data.local.json` sudah tersedia di mesin penguji;
- `TEST_USER_PASSWORD` sama dengan saat setup data uji;
- `BASE_URL` mengarah ke API VPS yang benar;
- readiness masih `ready`.

## 20. Checklist Siap Iterasi Pertama

- VPS berhasil clone branch skripsi.
- `.env.testing` sudah diisi tanpa dibagikan.
- `docker compose ... config --quiet` lulus.
- PostgreSQL dan Redis healthy.
- `npx prisma migrate deploy` berhasil.
- API healthy.
- `/api/health/readiness` ready.
- Data uji skripsi berhasil dibuat.
- `test-data.local.json` tersedia di mesin penguji.
- Functional test PASS.
- Monitoring before berhasil.
- k6 dan Node tersedia di mesin penguji.
- WinstonAI mode untuk internal performance adalah `mock`.
- Real WinstonAI tidak masuk load/stress/spike/endurance.

Jika semua checklist lulus, lanjutkan ke pengujian resmi Iterasi Pertama dan salin ringkasan hasil ke `docs/performance-result-template.md`.
