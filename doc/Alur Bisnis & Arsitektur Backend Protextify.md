# Fondasi Backend untuk Platform Protextify

Dokumen ini merinci **alur bisnis**, **arsitektur**, dan **teknologi** yang direkomendasikan untuk membangun backend platform Protextify.

---

## 1. Rekomendasi Arsitektur & Teknologi Backend

| Komponen             | Rekomendasi & Penjelasan                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------- |
| **Framework**        | **NestJS (Node.js)**<br>Modular, TypeScript, Dependency Injection, mudah diuji dan scalable. |
| **Database**         | **PostgreSQL**<br>Solid untuk data relasional kompleks (user, kelas, tugas, dsb).            |
| **ORM**              | **Prisma**<br>Type-safety, mempercepat development, mengurangi bug.                          |
| **Autentikasi**      | **Passport.js**<br>passport-jwt (token), passport-google-oauth20 (Google Auth).              |
| **Real-time**        | **WebSockets (Socket.IO)**<br>Auto-save, monitoring real-time. Modul @nestjs/websockets.     |
| **Pembayaran**       | **Midtrans**<br>Integrasi API untuk transaksi & webhook pembayaran.                          |
| **Plagiarisme**      | **Winston AI API**<br>Backend sebagai perantara pengecekan teks.                             |
| **Background Jobs**  | **BullMQ + Redis**<br>Queue untuk proses pengecekan plagiarisme.                             |
| **File Storage**     | **Cloud Storage**<br>AWS S3, GCS, atau Cloudinary. Jangan simpan file di server/database.    |
| **Containerization** | **Docker**<br>Mempermudah development, testing, deployment.                                  |
| **CI/CD**            | **GitHub Actions / GitLab CI**<br>Otomatisasi testing & deployment.                          |

---

## 2. Alur Bisnis Backend (Step-by-Step)

### 2.1. Autentikasi Pengguna

#### A. Registrasi Akun Baru (Email/Password)

- **Trigger:** User mengirim form registrasi.
- **Endpoint:** `POST /auth/register`
- **Proses:**
  1. Validasi data (email, password, fullName, role, institution).
  2. Cek email unik.
  3. Hash password (bcrypt).
  4. Simpan user (Prisma).
  5. Kirim email verifikasi (opsional).
  6. Respons 201 Created (tanpa password).

#### B. Login (Email/Password)

- **Trigger:** User login.
- **Endpoint:** `POST /auth/login`
- **Proses:**
  1. Validasi email & password.
  2. Cek user & password (bcrypt.compare).
  3. Generate JWT (userId, role).
  4. Respons 200 OK (accessToken, user data).

#### C. Integrasi Google Auth

- **Trigger:** Klik "Login with Google".
- **Endpoint:** `GET /auth/google`, `GET /auth/google/callback`
- **Proses:**
  1. Redirect ke Google.
  2. Terima data profil.
  3. Cek/buat user di database.
  4. Generate JWT.
  5. Redirect ke frontend (accessToken).

---

### 2.2. Manajemen Profil Pengguna

- **Endpoint:** `GET /users/me`, `PATCH /users/me`
- **Proses:**
  - Dilindungi AuthGuard (JWT).
  - GET: Ambil data user.
  - PATCH: Validasi & update data user.

---

### 2.3. Pembuatan & Bergabung Kelas

#### A. Instructor Membuat Kelas

- **Trigger:** Instructor buat kelas baru (tanpa pembayaran).
- **Endpoint:** `POST /classes`
- **Proses:**
  1. Buat kelas (className, description).
  2. Generate token kelas unik.
  3. Respons 201 Created (data kelas, token).

#### B. Student Bergabung ke Kelas

- **Trigger:** Student masukkan token kelas.
- **Endpoint:** `POST /classes/join`
- **Proses:**
  1. Validasi token kelas.
  2. Cek kuota kelas.
  3. Cek status student.
  4. Buat relasi User-Class.
  5. Respons 200 OK.

---

### 2.4. Editor Penulisan & Event WebSocket

- **Teknologi:** WebSocket (Socket.IO)
- **Event utama:**
  - `updateContent`: frontend mengirim konten terbaru, backend auto-save ke database.
    - Payload: `{ submissionId, content, updatedAt }`
    - Response: `{ status: 'success', updatedAt }`
  - `notification`: backend kirim notifikasi real-time ke user (misal: hasil plagiarisme, status pembayaran).
    - Payload: `{ type, message, data?, createdAt }`
  - `submissionUpdated`: backend broadcast ke client jika submission diupdate (misal: dinilai, dicek plagiarisme).
    - Payload: `{ submissionId, status, grade?, plagiarismScore?, updatedAt }`
  - `submissionListUpdated`: update daftar submission secara real-time untuk monitoring instructor.
    - Payload: `{ assignmentId, submissions: [ { submissionId, studentId, status, plagiarismScore, lastUpdated } ] }`
    - Response event: update otomatis pada tampilan monitoring instructor.
- **Catatan:** Implementasi throttling/debouncing pada event `updateContent` agar tidak overload. Pastikan autentikasi WebSocket dengan JWT.

---

### 2.5. Deteksi Plagiarisme

- **Trigger:** Student/instructor cek plagiarisme.
- **Endpoint:** `POST /submissions/:id/check-plagiarism`
- **Proses:**
  1. Tambah job ke BullMQ queue.
  2. Worker kirim ke Winston AI API.
  3. Simpan hasil ke database.
  4. Notifikasi ke frontend (WebSocket).

---

### 2.6. Monitoring oleh Instructor

- **Endpoint:** `GET /classes/:classId/assignments/:assignmentId/submissions`
- **Proses:**
  1. Verifikasi instructor.
  2. Ambil data submission.
  3. Sertakan ringkasan (wordCount, lastUpdated, skor plagiarisme).
  4. Live monitoring via WebSocket.

---

### 2.7. Riwayat Penulisan

- **Endpoint:** `GET /submissions/history` (student), `GET /classes/:classId/history` (instructor)
- **Proses:**
  - Ambil data Submission & Assignment.
  - Optional: Versioning tulisan.

---

### 2.8. Pembayaran (Subscription Instructor)

#### A. Membuat Transaksi Assignment

- **Trigger:** Instructor membuat assignment di kelas.
- **Endpoint:** `POST /classes/:classId/assignments`
- **Proses:**
  1. Instruktur mengisi jumlah siswa yang akan mengerjakan assignment (`expectedStudentCount`) saat membuat assignment.
  2. Backend menghitung harga (`expectedStudentCount × 2500`).
  3. Request ke Midtrans API.
  4. Simpan transaksi (status: PENDING).
  5. Kirim `snapToken`/`paymentUrl` ke frontend.
  6. Setelah pembayaran sukses, assignment aktif dan mahasiswa bisa mengerjakan.
  7. Siswa yang join setelah assignment dibuat tetap bisa mengerjakan, selama tidak melebihi jumlah yang diinput instruktur (`expectedStudentCount`). Backend dapat melakukan validasi tambahan jika diperlukan.

#### B. Webhook Notifikasi Pembayaran

- **Endpoint:** `POST /payments/webhook`
- **Proses:**
  1. Verifikasi signature key.
  2. Update status transaksi (SUCCESS/FAILED).
  3. Aktifkan assignment jika sukses.

---

### 2.9. Penyimpanan Data

#### A. Database (PostgreSQL)

**Contoh Skema Tabel Utama:**

- **User:** id, email, password, fullName, role, institution, googleId
- **Class:** id, className, description, classToken, instructorId
- **Assignment:** id, title, instructions, deadline, classId
- **Submission:** id, content, status, grade, studentId, assignmentId
- **PaymentTransaction:** id, amount, status, midtransTransactionId, userId
- **PlagiarismCheckResult:** id, score, results, submissionId
- **Pivot Table:** User-Class (many-to-many)

#### B. File Storage (Cloud)

- **Trigger:** User unduh tugas (PDF/DOCX).
- **Endpoint:** `GET /submissions/:id/download`
- **Proses:**
  1. Ambil konten dari database.
  2. Konversi ke PDF/DOCX.
  3. Simpan/stream ke Cloud Storage.
  4. Generate pre-signed URL.
  5. Kirim URL ke frontend.

---

> **Dokumen ini memberikan kerangka kerja komprehensif. Langkah selanjutnya:**  
> Rancang skema database detail & mulai membangun modul per modul di NestJS.
> ℹ️ Untuk detail request/response schema setiap endpoint dan event, silakan lihat langsung di Swagger API Docs pada aplikasi backend.
> Referensi struktur payload event WebSocket dapat dilihat di file `src/realtime/events.ts`.
