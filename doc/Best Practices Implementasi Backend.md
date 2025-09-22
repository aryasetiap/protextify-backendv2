# 🚀 Best Practices Implementasi Backend Protextify

Panduan ini merangkum praktik terbaik agar backend Anda **aman, scalable, dan mudah dikelola**.

---

## 1️⃣ Keamanan (Security)

- **Validasi Input User**
  - Selalu validasi data dari client menggunakan DTO (`login.dto.ts`, `register.dto.ts`, `update-user.dto.ts`) dan pipes di NestJS.
  - DTO diletakkan di folder `dto/` pada setiap modul.
  - Mencegah data tidak valid masuk ke logika bisnis/database.

- **Amankan Endpoint**
  - Gunakan Guards (`JwtAuthGuard` di `guards/jwt-auth.guard.ts`) untuk autentikasi.
  - Terapkan Role-Based Access Control (RBAC) dengan `RolesGuard` (`guards/roles.guard.ts`) dan decorator `@Roles`.
  - Implementasi strategy (`jwt.strategy.ts`, `google.strategy.ts`) untuk autentikasi JWT dan Google OAuth.

- **Gunakan Environment Variables**
  - Simpan data sensitif (API key, DB connection, JWT secret) di `.env`.
  - Jangan hardcode atau commit file `.env` ke Git.
  - Gunakan modul `@nestjs/config`.

- **Hashing Password**
  - Gunakan algoritma hashing kuat seperti `bcrypt`.
  - Jangan simpan password dalam bentuk plain text.

- **Proteksi Serangan Umum**
  - **SQL Injection:** Prisma ORM sudah melindungi dengan parameterized queries.
  - **CSRF & XSS:** Gunakan `helmet` middleware untuk HTTP headers yang aman.
  - **Brute Force:** Implementasikan rate limiting (`nestjs-throttler`) pada endpoint login.
  - **Verifikasi Webhook:** Selalu verifikasi signature dari webhook eksternal (misal: Midtrans).
  - **Verifikasi Email User**
    - Kirim email verifikasi setelah registrasi menggunakan modul `email.service.ts`.
    - Gunakan token unik (JWT/UUID) untuk link verifikasi.
    - Endpoint: `POST /auth/send-verification` dan `POST /auth/verify-email`.
    - Template email diletakkan di folder `email/templates/`.
    - Pastikan proses verifikasi aman dan token hanya sekali pakai.

---

## 2️⃣ Skalabilitas & Performa (Scalability & Performance)

- **Gunakan Queue untuk Tugas Berat**
  - Proses lama (cek plagiarisme, email massal, generate laporan) dijalankan di background.
  - Gunakan message queue seperti `BullMQ` + Redis.
  - Pisahkan worker ke file khusus (misal: `plagiarism.processor.ts` di folder modul terkait).
  - Worker harus idempotent dan menangani retry/failure dengan baik.
  - Pastikan job queue ter-monitor (gunakan dashboard BullMQ atau monitoring custom).
  - Validasi data sebelum memasukkan job ke queue dan sebelum diproses oleh worker.
  - Hindari blocking operation di worker, gunakan async/await.

- **Desain API Stateless**
  - Jangan simpan state/sesi di server.
  - Gunakan JWT untuk autentikasi setiap request.
  - Memudahkan horizontal scaling.

- **Database Indexing**
  - Tambahkan index pada kolom yang sering digunakan untuk filter/order di `schema.prisma` (`@@index([columnName])`).

- **Koneksi Database Efisien**
  - Prisma menangani connection pooling otomatis.
  - Buat satu instance `PrismaService` yang di-provide secara global.

- **Gunakan Caching**
  - Terapkan caching (misal: Redis) untuk data yang jarang berubah (profil user, daftar kelas).

- **File Storage Cloud Integration**
  - Simpan file (PDF/DOCX, laporan plagiarisme) di cloud storage (AWS S3, GCS, Cloudinary), bukan di server lokal.
  - Gunakan modul/folder `storage/` untuk abstraction dan integrasi storage provider.
  - Untuk download, generate pre-signed URL agar file hanya bisa diakses secara aman dan terbatas waktu.
  - Pastikan file yang diupload/divalidasi sudah terenkripsi dan tidak mengandung malware.
  - Pisahkan logic upload/download dari controller ke service khusus.

- **WebSocket Event Design**
  - Gunakan event `updateContent` untuk auto-save editor secara real-time.
    - Payload minimal: `{ submissionId, content, updatedAt }`
    - Response: `{ status: 'success', updatedAt }`
  - Gunakan event `notification` untuk push notifikasi ke user (misal: hasil plagiarisme, status pembayaran).
    - Payload: `{ type, message, data?, createdAt }`
  - Gunakan event `submissionUpdated` untuk broadcast perubahan submission ke semua client yang relevan.
    - Payload: `{ submissionId, status, grade?, plagiarismScore?, updatedAt }`
  - Untuk monitoring submission, gunakan event `submissionListUpdated`:
    - Payload: `{ assignmentId, submissions: [ { submissionId, studentId, status, plagiarismScore, lastUpdated } ] }`
    - Response event: update otomatis pada tampilan monitoring instructor.
  - Implementasi throttling/debouncing pada event yang intensif (misal: auto-save).
  - Pastikan autentikasi WebSocket (JWT) dan validasi payload setiap event.

---

## 3️⃣ Kode & Pengembangan (Code & Development)

- **Struktur Modular**
  - Setiap fitur di modulnya sendiri.
  - Kode mudah ditemukan, dikelola, dan diuji.

- **Prinsip SOLID**
  - Terapkan prinsip SOLID.
  - Controller hanya untuk HTTP, Service untuk logika bisnis.

- **Konsistensi Koding**
  - Gunakan linter (`ESLint`) dan formatter (`Prettier`) untuk konsistensi gaya kode.

- **Error Handling yang Baik**
  - Buat custom exception filter untuk error global.
  - Berikan pesan error dan kode status HTTP yang jelas.

- **Logging Komprehensif**
  - Implementasikan logging (`Pino`/`Winston`), bukan `console.log`.
  - Catat request, error, dan event penting.

- **Automated Testing**
  - Tulis unit test untuk services dan e2e test untuk controllers.
  - NestJS mendukung testing dengan Jest.

---

> 💡 **Dengan mengikuti best practices ini, backend Protextify Anda akan lebih aman, scalable, dan siap untuk pengembangan jangka panjang!**

> ℹ️ Untuk detail request/response schema setiap endpoint dan event, silakan lihat langsung di Swagger API Docs pada aplikasi backend.
> Referensi struktur payload event WebSocket dapat dilihat di file `src/realtime/events.ts`.
