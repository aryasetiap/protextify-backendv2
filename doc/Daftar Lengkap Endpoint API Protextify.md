# Daftar Lengkap Endpoint API Protextify

Dokumen ini merinci semua endpoint API yang dibutuhkan oleh backend Protextify, dikelompokkan berdasarkan modul fungsional. Referensi utama untuk pengembangan dan integrasi antara frontend dan backend.

---

## 📦 Modul: Auth

Menangani autentikasi dan otorisasi pengguna.

| Method | Endpoint                     | Deskripsi Singkat                                  | Role Akses |
| ------ | ---------------------------- | -------------------------------------------------- | ---------- |
| POST   | `/auth/register` ✅          | Mendaftarkan user baru (student/instructor)        | Publik     |
| POST   | `/auth/login` ✅             | Login dengan email dan password, mengembalikan JWT | Publik     |
| GET    | `/auth/google` ✅            | Mengarahkan ke halaman login Google                | Publik     |
| GET    | `/auth/google/callback` ✅   | Callback dari Google setelah login berhasil        | Publik     |
| POST   | `/auth/send-verification` ✅ | Mengirim email verifikasi ke user                  | Publik     |
| POST   | `/auth/verify-email` ✅      | Verifikasi email dengan token                      | Publik     |

---

## 👤 Modul: Users

Manajemen data pengguna.

| Method | Endpoint                   | Deskripsi Singkat                              | Role Akses    |
| ------ | -------------------------- | ---------------------------------------------- | ------------- |
| GET    | `/users/me` ✅             | Mengambil data profil user yang sedang login   | Terotentikasi |
| PATCH  | `/users/me` ✅             | Memperbarui data profil user yang sedang login | Terotentikasi |
| GET    | `/users/me/credit-balance` | Mengambil saldo kredit instructor yang login   | INSTRUCTOR    |

---

## 🏫 Modul: Classes

Pembuatan, pengelolaan, dan keanggotaan kelas.

| Method | Endpoint        | Deskripsi Singkat                            | Role Akses    |
| ------ | --------------- | -------------------------------------------- | ------------- |
| POST   | `/classes`      | Instructor membuat kelas baru                | INSTRUCTOR    |
| GET    | `/classes`      | Mendapat daftar kelas (student & instructor) | Terotentikasi |
| GET    | `/classes/:id`  | Mendapat detail sebuah kelas                 | Terotentikasi |
| POST   | `/classes/join` | Student bergabung ke kelas menggunakan token | STUDENT       |

---

## 📝 Modul: Assignments

Mengelola tugas-tugas di dalam kelas.

| Method | Endpoint                        | Deskripsi Singkat                      | Role Akses    |
| ------ | ------------------------------- | -------------------------------------- | ------------- |
| POST   | `/classes/:classId/assignments` | Instructor membuat tugas baru di kelas | INSTRUCTOR    |
| GET    | `/classes/:classId/assignments` | Mendapat daftar semua tugas di kelas   | Terotentikasi |

---

## 📤 Modul: Submissions

Alur kerja pengumpulan tugas oleh siswa.

| Method | Endpoint                                                  | Deskripsi Singkat                                 | Role Akses         |
| ------ | --------------------------------------------------------- | ------------------------------------------------- | ------------------ |
| POST   | `/assignments/:assignmentId/submissions`                  | Student membuat draf submission untuk tugas       | STUDENT            |
| GET    | `/submissions/:id`                                        | Mendapat detail submission (termasuk plagiarisme) | STUDENT/INSTRUCTOR |
| PATCH  | `/submissions/:id/content`                                | Auto-save konten tulisan student                  | STUDENT            |
| POST   | `/submissions/:id/submit`                                 | Student menyelesaikan dan mengirimkan tugas       | STUDENT            |
| PATCH  | `/submissions/:id/grade`                                  | Instructor memberikan nilai pada submission       | INSTRUCTOR         |
| GET    | `/classes/:classId/assignments/:assignmentId/submissions` | Monitoring submission oleh instructor             | INSTRUCTOR         |
| GET    | `/submissions/history`                                    | Mendapat riwayat penulisan student                | STUDENT            |
| GET    | `/classes/:classId/history`                               | Mendapat riwayat penulisan di kelas (instructor)  | INSTRUCTOR         |
| GET    | `/submissions/:id/download`                               | Download tugas (PDF/DOCX)                         | STUDENT/INSTRUCTOR |

---

## 💳 Modul: Payments

Terintegrasi dengan Midtrans untuk transaksi pembelian kredit.

| Method | Endpoint                       | Deskripsi Singkat                                   | Role Akses |
| ------ | ------------------------------ | --------------------------------------------------- | ---------- |
| POST   | `/payments/create-transaction` | Instructor membuat transaksi Midtrans untuk kredit  | INSTRUCTOR |
| POST   | `/payments/webhook`            | Menerima notifikasi status pembayaran dari Midtrans | Publik     |

---

## 🔎 Modul: Plagiarism

Terintegrasi dengan layanan eksternal pengecekan plagiarisme.

| Method | Endpoint                             | Deskripsi Singkat                         | Role Akses         |
| ------ | ------------------------------------ | ----------------------------------------- | ------------------ |
| POST   | `/submissions/:id/check-plagiarism`  | Instructor memicu pengecekan plagiarisme  | INSTRUCTOR         |
| GET    | `/submissions/:id/plagiarism-report` | Mengunduh laporan hasil plagiarisme (PDF) | STUDENT/INSTRUCTOR |

---

## 📡 Event WebSocket (Realtime Integration)

| Event Name              | Deskripsi Singkat                                           | Payload Struktur                                                                                       |
| ----------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `updateContent`         | Auto-save konten editor student                             | `{ submissionId, content, updatedAt }`                                                                 |
| `notification`          | Notifikasi real-time ke user (plagiarisme, pembayaran, dsb) | `{ type, message, data?, createdAt }`                                                                  |
| `submissionUpdated`     | Broadcast perubahan submission (nilai, plagiarisme, dsb)    | `{ submissionId, status, grade?, plagiarismScore?, updatedAt }`                                        |
| `submissionListUpdated` | Update daftar submission untuk monitoring instructor        | `{ assignmentId, submissions: [ { submissionId, studentId, status, plagiarismScore, lastUpdated } ] }` |

> **Catatan:** Event WebSocket adalah bagian penting integrasi frontend-backend untuk fitur auto-save, notifikasi, dan monitoring submission.  
> Referensi struktur payload event dapat dilihat di file `src/realtime/events.ts`.

> ℹ️ Detail request/response schema dapat dilihat langsung di Swagger API Docs pada aplikasi backend.
