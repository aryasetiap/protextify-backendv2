# Protextify Backend — Rencana Kerja Detail

Dokumen ini adalah checklist komprehensif untuk membangun backend Protextify. Setiap tugas diperkaya dengan konteks arsitektur, alur bisnis, dan praktik terbaik.

---

## 🚀 **Milestone 1: Inisiasi & Setup Proyek (Pondasi)**

**Tujuan:** Menyiapkan lingkungan development yang bersih, terstruktur, dan siap dikembangkan.

### 1.1 **Setup Project & Version Control** ✅

- **Tugas:** Inisialisasi Git repository (GitHub/GitLab). Buat branch `main` dan `develop`.
- **Catatan:**
  - `main`: kode produksi stabil.
  - `develop`: integrasi fitur.
  - Konfigurasikan `.gitignore` untuk `node_modules`, `.env`, dan `dist`.

### 1.2 **Inisialisasi Project NestJS** ✅

- **Tugas:** Install NestJS CLI dan buat project baru.
- **Catatan:** Struktur proyek awal, jalankan lokal dengan `npm run start:dev`.

### 1.3 **Setup Database & ORM** ✅

- **Tugas:** Install Prisma, inisialisasi, dan hubungkan ke PostgreSQL.
- **Catatan:** Gunakan `npx prisma init --datasource-provider postgresql`, atur `DATABASE_URL` di `.env`.

### 1.4 **Containerization (Docker)** ✅

- **Tugas:** Buat `Dockerfile` dan `docker-compose.yml`.
- **Catatan:** Definisikan service: `postgres`, `redis`, dan `app`. Jalankan dengan satu perintah: `docker-compose up`.

### 1.5 **Konfigurasi Linting & Formatting** ✅

- **Tugas:** Setup ESLint & Prettier.
- **Catatan:** Tambahkan script lint dan format di `package.json`.

### 1.6 **Setup Konfigurasi & Environment** ✅

- **Tugas:** Install `@nestjs/config` dan validasi environment variables.
- **Catatan:** Validasi variabel krusial dengan Joi/class-validator.

### 1.7 **Setup Security Middleware** ✅

- **Tugas:** Implementasi middleware keamanan.
- **Catatan:**
  - Tambahkan `helmet` untuk proteksi HTTP headers.
  - Integrasi `nestjs-throttler` untuk rate limiting (misal: endpoint login).
  - Tambahkan logger terstruktur (`Winston`/`Pino`) untuk audit dan monitoring.

---

## 🏗️ **Milestone 2: Desain Sistem & Database (Blueprint)**

**Tujuan:** Memfinalkan arsitektur data dan API.

### 2.1 **Desain Skema Database**

- Definisikan model utama di `schema.prisma`:
  - **User** (role: INSTRUCTOR | STUDENT)
  - **Class**
  - **Assignment**
  - **Submission**
  - **PaymentTransaction**
  - **PlagiarismCheckResult**
- Relasi many-to-many untuk enrollment.
- Jalankan migrasi: `npx prisma migrate dev --name init`.

### 2.2 **Desain API Contract (OpenAPI/Swagger)**

- Definisikan endpoint & DTO menggunakan `@nestjs/swagger`.
- Contoh endpoint:
  - `POST /auth/register`
  - `POST /auth/login`
  - `GET /auth/google`, `GET /auth/google/callback`
  - `GET /users/me`, `PATCH /users/me`
  - `POST /classes`, `POST /classes/join`
  - `POST /payments/create-transaction`, `POST /payments/webhook`

---

## 🔑 **Milestone 3: Implementasi Core — Autentikasi & User**

**Tujuan:** Fitur dasar otentikasi dan manajemen profil pengguna.

### 3.1 & 3.2 **Registrasi, Login & JWT**

- Buat `AuthModule` untuk registrasi/login lokal dan JWT.
- Validasi input dengan DTO (`login.dto.ts`, `register.dto.ts`) dan class-validator.
- Hash password dengan bcrypt, generate JWT.
- Implementasi email verifikasi:
  - Endpoint: `POST /auth/send-verification` untuk mengirim email verifikasi.
  - Endpoint: `POST /auth/verify-email` untuk verifikasi token email.
  - Buat modul/folder `email/` untuk service pengiriman email dan template.
- Implementasi `JwtAuthGuard` untuk proteksi endpoint.
- Implementasi `jwt.strategy.ts` untuk validasi token JWT.

### 3.3 **Google OAuth 2.0**

- Integrasi login Google dengan `passport-google-oauth20`.
- Implementasi `google.strategy.ts` untuk autentikasi Google.
- Endpoint: `GET /auth/google`, `GET /auth/google/callback`.

### 3.4 **Role-Based Access Control (RBAC)**

- Buat `RolesGuard` (`roles.guard.ts`) dan decorator `@Roles('INSTRUCTOR')`.
- Batasi akses endpoint sesuai role.

### 3.5 **API Manajemen Profil User**

- Endpoint: `GET /users/me`, `PATCH /users/me`.
- Validasi input dengan DTO (`update-user.dto.ts`), update data user, role tidak bisa diubah sendiri.

### 4.1–4.3 **API Kelas, Tugas, Submission**

- Setiap modul (`classes`, `assignments`, `submissions`) memiliki DTO untuk validasi input dan response.
- Gunakan guard untuk proteksi endpoint sesuai role.

---

## 📚 **Milestone 4: Fitur Utama — Kelas & Tugas**

**Tujuan:** Membangun alur kerja inti platform.

### 4.1 **API Manajemen Kelas**

- Modul: `ClassesModule`.
- Endpoint: `POST /classes`, `POST /classes/join`, `GET /classes`, `GET /classes/:id`.

### 4.2 **API Manajemen Tugas (Assignment)**

- Modul: `AssignmentsModule`.
- Endpoint: `POST /classes/:classId/assignments`, `GET /classes/:classId/assignments`.

### 4.3 **API Submission Tugas**

- Modul: `SubmissionsModule`.
- Endpoint: `POST /assignments/:id/submissions`, `GET /submissions/:id`, `PATCH /submissions/:id`.

### 4.4 **Auto-Save via WebSocket**

- Modul: `RealtimeGateway` dengan Socket.IO.
- Event utama:
  - `updateContent`: frontend mengirim konten terbaru, backend auto-save ke database.
    - **Payload:** `{ submissionId, content, updatedAt }`
    - **Response:** `{ status: 'success', updatedAt }`
  - `submissionUpdated`: backend broadcast ke client jika submission diupdate (misal: dinilai, dicek plagiarisme).
    - **Payload:** `{ submissionId, status, grade?, plagiarismScore?, updatedAt }`
  - `notification`: backend kirim notifikasi real-time ke user (misal: hasil plagiarisme, status pembayaran).
    - **Payload:** `{ type, message, data?, createdAt }`
- Implementasi throttling/debouncing pada event `updateContent` agar tidak overload.
- Pastikan autentikasi WebSocket dengan JWT.

### 4.5 **Monitoring Submission via WebSocket**

- Saat instructor membuka monitoring submission (`GET /classes/:classId/assignments/:assignmentId/submissions`), backend dapat broadcast event:
  - `submissionListUpdated`: update daftar submission secara real-time.
    - **Payload:** `{ assignmentId, submissions: [ { submissionId, studentId, status, plagiarismScore, lastUpdated } ] }`
  - **Response event:** update otomatis pada tampilan monitoring instructor.

---

## 🌐 **Milestone 5: Integrasi Layanan Eksternal**

**Tujuan:** Integrasi dengan layanan pihak ketiga.

### 5.1 **Pembayaran (Midtrans)**

- Modul: `PaymentsModule`.
- Endpoint: `POST /payments/create-transaction`, `POST /payments/webhook`.

### 5.2 **Setup Antrian (Queue) & Worker**

- Konfigurasi BullMQ dan Redis untuk background jobs.

### 5.3 **Integrasi Cek Plagiarisme**

- Modul: `PlagiarismModule`.
- Endpoint: `POST /submissions/:id/check-plagiarism`.
- Worker: `plagiarism.processor.ts`.
- Setelah worker selesai cek plagiarisme, backend broadcast event `notification` ke user terkait via WebSocket.

### 5.4 **Download Tugas**

- Endpoint: `GET /submissions/:id/download`.
- Konversi file, simpan ke cloud storage, kirim pre-signed URL.
- Implementasi modul/folder `storage/` untuk integrasi AWS S3, GCS, atau Cloudinary.
- Pastikan file tidak disimpan di server lokal, gunakan cloud storage untuk keamanan dan skalabilitas.
- Gunakan pre-signed URL agar file hanya bisa diakses secara aman dan terbatas waktu.

---

## 🧪 **Milestone 6: Kualitas & Pengujian (Quality Assurance)**

**Tujuan:** Memastikan aplikasi berjalan sesuai ekspektasi.

### 6.1–6.3 **Tes Otomatis**

- Unit Test (Jest), Integration Test, E2E Test (Supertest).

### 6.4 **Testing Keamanan**

- Audit keamanan, validasi DTO, rate limiting.

### 6.5 **Pengujian Manual Skenario Kunci**

- Simulasi pembayaran dan cek plagiarisme di sandbox.

### 6.6 **Audit Logging & Monitoring**

- Implementasi logging terstruktur di seluruh modul (gunakan Winston/Pino).
- Pastikan semua error dan event penting tercatat.

---

## 🚢 **Milestone 7: Deployment & DevOps (Go-Live)**

**Tujuan:** Otomatisasi build, test, dan deploy.

### 7.1 **Setup CI/CD Pipeline**

- Pipeline: install → lint → test → build → push → deploy.

### 7.2–7.3 **Persiapan Environment & Deployment**

- Infrastruktur cloud, domain & SSL, migrasi DB otomatis.

### 7.4 **Initial Deployment**

- Deploy ke Staging, smoke testing, lanjut ke Produksi.

---

## 📈 **Milestone 8: Pasca-Rilis — Monitoring & Dokumentasi**

**Tujuan:** Monitoring, pengelolaan, dan dokumentasi.

### 8.1–8.2 **Logging, Monitoring & Alerting**

- Logger terstruktur (pino/winston), error reporting (Sentry), alert ke Slack/email.

### 8.3–8.4 **Finalisasi Dokumentasi**

- Dokumentasi Swagger/OpenAPI, update README.md, buat RUNBOOK.md.

### 8.5 **Backup & Recovery Plan**

- Backup otomatis database, uji restore berkala.

---

> **Tips Visual:**
>
> - Gunakan emoji dan heading untuk navigasi cepat.
> - Checklist milestone dengan bullet dan sub-bullet.
> - Tambahkan highlight pada tugas penting dan praktik terbaik.

> ℹ️ Untuk detail request/response schema setiap endpoint dan event, silakan lihat langsung di Swagger API Docs pada aplikasi backend.
> Referensi struktur payload event WebSocket dapat dilihat di file `src/realtime/events.ts`.
