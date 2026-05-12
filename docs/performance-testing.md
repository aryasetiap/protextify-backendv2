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
