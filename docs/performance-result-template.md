# Template Hasil Pengujian Backend Protextify

Gunakan template ini untuk merangkum hasil hidden dry-run, Iterasi Pertama, dan Iterasi Kedua. Jangan menulis secret, token, password, API key, atau isi `.env`.

## Identitas Run

| Item | Nilai |
|---|---|
| Run label | hidden-dry-run / iteration-1 / iteration-2 |
| Tanggal dan waktu |  |
| Penguji |  |
| Branch |  |
| Commit hash |  |
| Backend base URL |  |
| Environment | local / VPS |
| WinstonAI mode | mock / real terbatas |
| Report mode | metadata / pdf |
| Catatan data uji |  |

## Versi Tooling

| Tool | Versi |
|---|---|
| Node.js |  |
| npm |  |
| Docker |  |
| Docker Compose |  |
| k6 |  |
| PostgreSQL image/version |  |
| Redis image/version |  |

## Skenario yang Dijalankan

| No | Skenario | Script/Command | Output File | Status |
|---:|---|---|---|---|
| 1 | Functional API testing |  |  |  |
| 2 | k6 smoke |  |  |  |
| 3 | k6 load |  |  |  |
| 4 | k6 stress |  |  |  |
| 5 | k6 spike |  |  |  |
| 6 | k6 endurance |  |  |  |
| 7 | WinstonAI integration terbatas |  |  |  |

## Functional API Testing

| Metric | Nilai |
|---|---|
| Test suites passed |  |
| Tests passed |  |
| Tests failed |  |
| Skipped |  |
| Catatan endpoint gagal |  |

## k6 Summary

| Skenario | VU | Durasi | HTTP Reqs | RPS | Error Rate | Checks | p95 | p99 | Status |
|---|---:|---|---:|---:|---:|---:|---:|---:|---|
| Smoke |  |  |  |  |  |  |  |  |  |
| Load |  |  |  |  |  |  |  |  |  |
| Stress |  |  |  |  |  |  |  |  |  |
| Spike |  |  |  |  |  |  |  |  |  |
| Endurance |  |  |  |  |  |  |  |  |  |

## WinstonAI Integration

| Item | Nilai |
|---|---|
| Mode provider | mock / real terbatas |
| Jumlah trigger |  |
| Status akhir job | completed / failed |
| Provider latency |  |
| Total processing time |  |
| Queue waiting before/after |  |
| Queue active before/after |  |
| Queue completed before/after |  |
| Queue failed before/after |  |
| Catatan failure provider |  |

## Queue Stats

| Waktu | Waiting | Active | Completed | Failed | Total | Catatan |
|---|---:|---:|---:|---:|---:|---|
| Before |  |  |  |  |  |  |
| During |  |  |  |  |  |  |
| After |  |  |  |  |  |  |

## Resource Usage

| Waktu | CPU Backend | Memory Backend | CPU Postgres | Memory Postgres | CPU Redis | Memory Redis | Catatan |
|---|---:|---:|---:|---:|---:|---:|---|
| Before |  |  |  |  |  |  |  |
| During |  |  |  |  |  |  |  |
| After |  |  |  |  |  |  |  |

## Health dan Readiness Snapshot

| Waktu | Health | Readiness | PostgreSQL | Redis | Queue | Catatan |
|---|---|---|---|---|---|---|
| Before |  |  |  |  |  |  |
| After |  |  |  |  |  |  |

## Error dan Anomali

| No | Waktu | Skenario | Gejala | Bukti Output | Dampak | Tindak Lanjut |
|---:|---|---|---|---|---|---|
| 1 |  |  |  |  |  |  |

## Catatan Bottleneck

| Area | Indikasi | Bukti | Dugaan Penyebab | Rekomendasi |
|---|---|---|---|---|
| API latency |  |  |  |  |
| Database |  |  |  |  |
| Redis/Queue |  |  |  |  |
| External provider |  |  |  |  |
| CPU/Memory |  |  |  |  |

## Klasifikasi Sementara

| Kategori | Status | Catatan |
|---|---|---|
| Functional readiness | READY / PARTIALLY READY / NOT READY |  |
| Performance baseline | ACCEPTABLE / NEEDS IMPROVEMENT / BLOCKED |  |
| Queue readiness | READY / PARTIALLY READY / NOT READY |  |
| WinstonAI integration | READY / PARTIALLY READY / NOT READY |  |
| Resource stability | STABLE / WATCH / UNSTABLE |  |

## Kesimpulan Run

Tuliskan ringkasan singkat hasil run, temuan utama, dan keputusan apakah lanjut ke tahap berikutnya atau perlu perbaikan terlebih dahulu.
