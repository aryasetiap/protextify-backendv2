# RULE_TESTING.md

## 1. Tujuan

Dokumen ini menjadi aturan utama dalam menyiapkan, menjalankan, dan mendokumentasikan pengujian backend Protextify untuk kebutuhan skripsi:

**"UJI PERFORMANCE LAYANAN BACKEND PROTEXTIFY BERBASIS RESTFUL API UNTUK MENDUKUNG INTEGRASI DETEKSI PLAGIARISME EKSTERNAL"**

Pengujian berfokus pada backend RESTful API, bukan frontend, bukan akurasi WinstonAI, bukan security testing mendalam, dan bukan performa payment gateway.

---

## 2. Prinsip Utama

1. Jangan menampilkan secret apa pun.
2. Jangan commit `.env`, token, JWT, API key, database password, WinstonAI token, Midtrans key, Cloudflare key, atau credential lain.
3. Jangan melakukan stress test terhadap real WinstonAI API.
4. Jangan menjadikan hidden dry-run sebagai hasil resmi Bab IV.
5. Jangan mengarang hasil pengujian.
6. Semua hasil resmi Bab IV harus berasal dari pengujian yang benar-benar dijalankan.
7. Bedakan:
   - fakta repository;
   - rencana pengujian;
   - hasil hidden dry-run;
   - hasil resmi Iterasi Pertama;
   - hasil resmi Iterasi Kedua.
8. Semua perubahan kode harus dijelaskan dengan:
   - file yang diubah;
   - alasan perubahan;
   - cara menjalankan;
   - dampak terhadap pengujian;
   - risiko atau batasan.

---

## 3. Lingkup Pengujian

Pengujian mencakup:

1. Functional API Testing.
2. Smoke/Baseline Testing.
3. Load Testing.
4. Stress Testing.
5. Spike Testing.
6. Endurance Testing.
7. Integration Testing WinstonAI terbatas.
8. Queue Monitoring.
9. Resource Monitoring.

---

## 4. Endpoint Utama

Endpoint utama yang menjadi fokus pengujian:

1. `POST /api/auth/login`
2. `GET /api/users/me`
3. `GET /api/classes`
4. `GET /api/classes/:id`
5. `GET /api/classes/:classId/assignments`
6. `GET /api/assignments/:id`
7. `POST /api/assignments/:assignmentId/submissions`
8. `PATCH /api/submissions/:id/content`
9. `POST /api/submissions/:id/submit`
10. `GET /api/submissions/:id`
11. `GET /api/classes/:classId/history`
12. `POST /api/submissions/:id/check-plagiarism`
13. `GET /api/submissions/:id/plagiarism-report`
14. `GET /api/plagiarism/queue-stats`

Payment/Midtrans hanya digunakan sebagai prasyarat aktivasi assignment jika diperlukan, bukan target utama performance testing.

---

## 5. Hidden Dry Run dan Iterasi Resmi

### Hidden Dry Run

Hidden dry-run adalah pengujian internal untuk memastikan:

1. backend dapat berjalan;
2. PostgreSQL dan Redis terhubung;
3. data uji dapat dibuat;
4. functional test dapat berjalan;
5. k6 dapat menghasilkan output;
6. queue stats dapat dipantau;
7. cleanup data uji dapat berjalan.

Hidden dry-run tidak dimasukkan sebagai hasil resmi Bab IV.

### Iterasi Pertama

Iterasi Pertama adalah pengujian resmi untuk memperoleh baseline performance backend.

Output:
- hasil functional API testing;
- hasil smoke/baseline;
- hasil load testing;
- hasil stress testing;
- hasil spike testing;
- hasil endurance testing;
- hasil integration testing WinstonAI terbatas;
- hasil resource monitoring;
- temuan bottleneck.

### Iterasi Kedua

Iterasi Kedua dilakukan setelah perbaikan atau penyesuaian berdasarkan temuan Iterasi Pertama.

Output:
- hasil pengujian ulang;
- perbandingan dengan Iterasi Pertama;
- analisis perubahan performance;
- klasifikasi akhir.

---

## 6. Struktur Folder Testing

Struktur folder yang disarankan:

```text
tests/
  e2e/
  performance/
    k6/
      config.js
      helpers/
        auth.js
        payloads.js
        metrics.js
      data/
        users.example.json
        submissions.example.json
      smoke.js
      load.js
      stress.js
      spike.js
      endurance.js
      winstonai-integration.js

scripts/
  test-data/
    setup-test-data.ts
    cleanup-test-data.ts

results/
  performance/
    hidden-dry-run/
    iteration-1/
    iteration-2/

docs/
  performance-testing.md
```

---

## 7. Data Uji

Data uji harus menggunakan data dummy dan tidak boleh menggunakan data pribadi asli.

Data minimal:

- instructor verified;
- student verified;
- token instructor;
- token student;
- class;
- class token;
- assignment aktif;
- submission draft;
- submission submitted;
- content minimal 100 karakter;
- submission khusus WinstonAI.

Data uji harus dapat dibuat ulang dan dibersihkan.

---

## 8. Output Hasil Pengujian

Setiap hasil pengujian disimpan ke folder:

```text
results/performance/hidden-dry-run/
results/performance/iteration-1/
results/performance/iteration-2/
```

Format output yang disarankan:

- JSON hasil k6.
- CSV ringkasan jika memungkinkan.
- Summary text.
- Screenshot terminal jika perlu.
- Snapshot queue stats.
- Snapshot docker stats.
- Log backend yang sudah disanitasi.

---

## 9. Aturan k6

Login/token dilakukan pada tahap setup, bukan diulang pada setiap request kecuali memang diuji.

Endpoint read-heavy boleh diberi beban lebih tinggi.

Endpoint write harus memakai data unik.

Endpoint WinstonAI real API tidak boleh dijadikan target stress/spike besar.

Skenario internal API dan WinstonAI integration harus dipisahkan.

Semua script k6 harus memiliki:

- konfigurasi VU;
- durasi;
- threshold awal;
- tag endpoint;
- check status code;
- output summary.

---

## 10. Aturan WinstonAI

Real WinstonAI hanya digunakan untuk integration testing terbatas.

Tidak menguji akurasi WinstonAI.

Tidak melakukan stress/spike besar ke real WinstonAI.

Jika memungkinkan, sediakan mode mock/sandbox.

Pisahkan:

- trigger response time;
- enqueue success;
- queue status;
- worker status;
- report availability;
- report retrieval response time.

---

## 11. Resource Monitoring

Minimal monitoring:

- docker stats
- htop atau top
- free -m
- df -h
- queue stats endpoint
- health endpoint

Resource monitoring digunakan untuk membantu analisis bottleneck.

---

## 12. Keamanan dan Etika

- Jangan tampilkan token.
- Jangan tampilkan password.
- Jangan tampilkan API key.
- Jangan tampilkan isi .env.
- Jangan menulis data sensitif ke log.
- Jangan commit hasil pengujian yang berisi credential.
- Semua log yang masuk skripsi harus disanitasi.

---

## 13. Checklist Siap Iterasi Pertama

Iterasi Pertama baru boleh dimulai jika:

- backend berjalan di local;
- PostgreSQL berjalan;
- Redis berjalan;
- health check API berhasil;
- health check DB/Redis berhasil;
- setup data uji berhasil;
- cleanup data uji berhasil;
- functional API testing berhasil;
- k6 smoke test berhasil;
- hasil k6 tersimpan ke JSON atau summary;
- queue stats dapat diakses;
- resource monitoring dapat dicatat;
- WinstonAI real/mock sudah diputuskan;
- tidak ada secret di log/output.

---

## 14. Laporan Codex

Setiap kali Codex melakukan perubahan, laporan wajib berisi:

- Ringkasan perubahan.
- File yang diubah.
- Alasan perubahan.
- Cara menjalankan.
- Hasil test atau verifikasi.
- Risiko atau batasan.
- Dampak terhadap Bab IV.
- Hal manual yang harus dilakukan Arya.
