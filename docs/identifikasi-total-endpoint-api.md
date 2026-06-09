# Identifikasi Total Endpoint API Protextify Backend

Dokumen ini mengidentifikasi endpoint HTTP yang tersedia pada backend Protextify berdasarkan pembacaan controller di folder `src`. Global prefix API pada aplikasi adalah `/api`, dengan pengecualian route root `/` dan `/health`.

## Ringkasan Total

| Kategori | Total | Keterangan |
|---|---:|---|
| Endpoint unik teridentifikasi | 67 | Endpoint HTTP unik yang disajikan pada tabel inventaris |
| Endpoint di bawah prefix `/api` | 65 | Endpoint utama aplikasi |
| Endpoint root tanpa prefix `/api` | 2 | `GET /` dan `GET /health` |
| Route tambahan non-controller | 2 mount | Swagger UI `/api/docs` dan Bull Board `/admin/queues` |
| Definisi route controller mentah | 68 | Jumlah decorator route di source; ada 1 route root legacy yang overlap sehingga tidak dihitung sebagai endpoint unik terpisah |

Catatan: route tambahan non-controller dihitung sebagai mount aplikasi, bukan endpoint controller individual, karena Swagger dan Bull Board dapat memiliki sub-route internal masing-masing.

## Rekap per Method

| Method | Total |
|---|---:|
| GET | 39 |
| POST | 21 |
| PATCH | 5 |
| DELETE | 2 |
| PUT | 0 |
| **Total** | **67** |

## Rekap per Modul

| Modul/Controller | Base Path | Total Endpoint | Keterangan |
|---|---|---:|---|
| RootController | `/` | 2 | Root dan health check publik tanpa prefix `/api` |
| ApiController/AppController | `/api` | 4 | Informasi API, health, readiness, dan health-check |
| AuthController | `/api/auth` | 11 | Registrasi, login, OAuth, verifikasi, reset password |
| UsersController | `/api/users` | 2 | Profil user |
| ClassesController | `/api/classes` | 10 | Manajemen kelas |
| AssignmentsController | `/api` | 6 | Assignment per kelas dan detail assignment |
| SubmissionsController | `/api` | 13 | Submission, grading, download, versioning |
| PlagiarismController | `/api` | 3 | Cek plagiarisme, report, queue stats |
| StorageController | `/api/storage` | 3 | Storage health, refresh URL, upload |
| PaymentsController | `/api/payments` | 9 | Transaksi, webhook, invoice, export |
| AnalyticsController | `/api/instructor` | 2 | Dashboard dan analytics instructor |
| AdminController | `/api/admin` | 2 | Dashboard admin |
| **Total** |  | **67** |  |

## Tabel Endpoint Lengkap

| No | Modul | Method | Endpoint | Akses | Fungsi Ringkas |
|---:|---|---|---|---|---|
| 1 | Root | GET | `/` | Public | Root welcome endpoint backend |
| 2 | Root | GET | `/health` | Public | Health check root tanpa prefix API |
| 3 | API/System | GET | `/api` | Public | Informasi API, versi, daftar endpoint, status service |
| 4 | API/System | GET | `/api/health` | Public | Health status API dengan info memory dan runtime |
| 5 | API/System | GET | `/api/health/readiness` | Public | Readiness check API, PostgreSQL, Redis, dan queue |
| 6 | API/System | GET | `/api/health-check` | Public | Health check sederhana dari AppController |
| 7 | Auth | POST | `/api/auth/register` | Public | Registrasi user student/instructor |
| 8 | Auth | POST | `/api/auth/login` | Public | Login user dan penerbitan JWT |
| 9 | Auth | POST | `/api/auth/admin/login` | Public | Login khusus admin |
| 10 | Auth | POST | `/api/auth/send-verification` | Public | Kirim email verifikasi |
| 11 | Auth | POST | `/api/auth/verify-email` | Public | Verifikasi email menggunakan token |
| 12 | Auth | GET | `/api/auth/google` | Public/OAuth | Redirect ke Google OAuth |
| 13 | Auth | GET | `/api/auth/google/callback` | Public/OAuth | Callback Google OAuth, redirect atau JSON |
| 14 | Auth | POST | `/api/auth/forgot-password` | Public | Kirim link reset password |
| 15 | Auth | POST | `/api/auth/reset-password` | Public | Reset password menggunakan token |
| 16 | Auth | GET | `/api/auth/instructor-only` | JWT, INSTRUCTOR | Endpoint validasi akses role instructor |
| 17 | Auth | GET | `/api/auth/google/user` | JWT | Ambil data user Google yang sedang login |
| 18 | Users | GET | `/api/users/me` | JWT | Ambil profil user login |
| 19 | Users | PATCH | `/api/users/me` | JWT | Update profil user login |
| 20 | Classes | POST | `/api/classes` | JWT, INSTRUCTOR | Membuat kelas baru |
| 21 | Classes | POST | `/api/classes/join` | JWT, STUDENT | Student bergabung ke kelas memakai token |
| 22 | Classes | GET | `/api/classes` | JWT | Daftar kelas milik instructor atau yang diikuti student |
| 23 | Classes | GET | `/api/classes/:id` | JWT | Detail kelas |
| 24 | Classes | PATCH | `/api/classes/:id` | JWT, INSTRUCTOR | Update data kelas |
| 25 | Classes | POST | `/api/classes/:id/regenerate-token` | JWT, INSTRUCTOR | Generate ulang token kelas |
| 26 | Classes | DELETE | `/api/classes/:id/students/:studentId` | JWT, INSTRUCTOR | Menghapus student dari kelas |
| 27 | Classes | DELETE | `/api/classes/:id` | JWT, INSTRUCTOR | Menghapus kelas |
| 28 | Classes | GET | `/api/classes/:id/activity-feed` | JWT, INSTRUCTOR | Mengambil activity feed kelas |
| 29 | Classes | GET | `/api/classes/preview/:classToken` | Public | Preview kelas sebelum join |
| 30 | Assignments | POST | `/api/classes/:classId/assignments` | JWT, INSTRUCTOR | Membuat assignment untuk kelas |
| 31 | Assignments | GET | `/api/classes/:classId/assignments` | JWT | Daftar assignment pada kelas |
| 32 | Assignments | GET | `/api/assignments/recent` | JWT, STUDENT | Daftar assignment terbaru untuk student |
| 33 | Assignments | GET | `/api/assignments/:id` | JWT | Detail assignment |
| 34 | Assignments | GET | `/api/assignments/:id/analytics` | JWT, INSTRUCTOR | Analytics assignment |
| 35 | Assignments | GET | `/api/assignments/:id/submissions-overview` | JWT, INSTRUCTOR | Overview assignment dan submission |
| 36 | Submissions | POST | `/api/assignments/:assignmentId/submissions` | JWT, STUDENT | Membuat submission baru |
| 37 | Submissions | GET | `/api/submissions/history` | JWT, STUDENT | Riwayat submission student |
| 38 | Submissions | GET | `/api/classes/:classId/history` | JWT, INSTRUCTOR | Riwayat submission dalam kelas |
| 39 | Submissions | GET | `/api/submissions/:id/download` | JWT | Generate/download submission sebagai PDF atau DOCX |
| 40 | Submissions | GET | `/api/submissions/:id` | JWT | Detail submission |
| 41 | Submissions | PATCH | `/api/submissions/:id/content` | JWT, STUDENT | Update/autosave konten submission |
| 42 | Submissions | POST | `/api/submissions/:id/submit` | JWT, STUDENT | Submit tugas dan feedback student |
| 43 | Submissions | PATCH | `/api/submissions/:id/grade` | JWT, INSTRUCTOR | Memberikan nilai submission |
| 44 | Submissions | PATCH | `/api/submissions/bulk-grade` | JWT, INSTRUCTOR | Bulk grade beberapa submission |
| 45 | Submissions | POST | `/api/submissions/bulk-download` | JWT, INSTRUCTOR | Export/download massal submission |
| 46 | Submissions | GET | `/api/classes/:classId/assignments/:assignmentId/submissions` | JWT, INSTRUCTOR | Daftar submission pada assignment tertentu |
| 47 | Submissions | GET | `/api/submissions/:id/versions` | JWT | Daftar versi konten submission |
| 48 | Submissions | GET | `/api/submissions/:id/versions/:version` | JWT | Detail versi tertentu dari submission |
| 49 | Plagiarism | POST | `/api/submissions/:id/check-plagiarism` | JWT, INSTRUCTOR | Memicu pengecekan plagiarisme |
| 50 | Plagiarism | GET | `/api/submissions/:id/plagiarism-report` | JWT | Mengambil hasil/report plagiarisme |
| 51 | Plagiarism | GET | `/api/plagiarism/queue-stats` | JWT, INSTRUCTOR | Statistik queue plagiarisme |
| 52 | Storage | GET | `/api/storage/health` | Public | Health check storage dan cloud provider |
| 53 | Storage | GET | `/api/storage/refresh-url/:cloudKey` | JWT | Membuat pre-signed URL baru |
| 54 | Storage | POST | `/api/storage/upload` | JWT | Upload attachment file |
| 55 | Payments | POST | `/api/payments/create-transaction` | JWT, INSTRUCTOR | Membuat transaksi pembayaran |
| 56 | Payments | POST | `/api/payments/webhook` | Public/provider | Webhook notifikasi pembayaran Midtrans |
| 57 | Payments | GET | `/api/payments/webhook` | Public/provider | Health check reachability webhook |
| 58 | Payments | GET | `/api/payments/transactions/:id` | JWT, INSTRUCTOR | Detail transaksi pembayaran |
| 59 | Payments | POST | `/api/payments/transactions/:id/download-invoice` | JWT, INSTRUCTOR | Generate URL download invoice PDF |
| 60 | Payments | POST | `/api/payments/transactions/:id/email-invoice` | JWT, INSTRUCTOR | Kirim invoice transaksi via email |
| 61 | Payments | POST | `/api/payments/transactions/export` | JWT, INSTRUCTOR | Export riwayat transaksi ke CSV |
| 62 | Payments | GET | `/api/payments/status/:orderId` | JWT, INSTRUCTOR | Cek status transaksi berdasarkan order ID |
| 63 | Payments | GET | `/api/payments/transactions` | JWT, INSTRUCTOR | Riwayat transaksi instructor dengan filter dan pagination |
| 64 | Instructor Analytics | GET | `/api/instructor/dashboard` | JWT, INSTRUCTOR | Ringkasan dashboard instructor |
| 65 | Instructor Analytics | GET | `/api/instructor/analytics` | JWT, INSTRUCTOR | Data analytics instructor |
| 66 | Admin | GET | `/api/admin/dashboard/overview` | JWT, ADMIN | Ringkasan dashboard admin |
| 67 | Admin | GET | `/api/admin/dashboard/charts` | JWT, ADMIN | Data chart dashboard admin |

## Catatan Hitungan

Tabel endpoint lengkap memuat **67 endpoint unik**. Pembacaan decorator route mentah dari source menemukan **68 definisi route**, karena ada satu handler root legacy pada `AppController` yang overlap dengan root API/system. Untuk inventaris Bab IV, gunakan angka **67 endpoint unik** dan jelaskan bahwa Swagger/Bull Board tidak dihitung sebagai endpoint bisnis.

## Route Tambahan Non-Controller

| Route | Jenis | Akses | Keterangan |
|---|---|---|---|
| `/api/docs` | Swagger UI | Public/internal sesuai deployment | Dokumentasi interaktif API |
| `/admin/queues` | Bull Board mount | Sesuai konfigurasi deployment | Dashboard queue Bull/BullMQ |

## Catatan Prefix dan Keamanan

- Semua endpoint utama memakai prefix `/api`.
- Endpoint `/` dan `/health` sengaja dikecualikan dari prefix global.
- Endpoint dengan akses `JWT` membutuhkan header `Authorization: Bearer <token>`.
- Endpoint dengan akses `INSTRUCTOR`, `STUDENT`, atau `ADMIN` membutuhkan JWT dengan role sesuai.
- Endpoint webhook payment bersifat public untuk menerima notifikasi provider, tetapi tetap melakukan validasi payload/signature di service.
- Endpoint storage upload menerima `multipart/form-data`.

## Sumber Identifikasi

Endpoint diidentifikasi dari file controller berikut:

| Controller | File |
|---|---|
| RootController | `src/root.controller.ts` |
| ApiController | `src/api.controller.ts` |
| AppController | `src/app.controller.ts` |
| AuthController | `src/auth/auth.controller.ts` |
| UsersController | `src/users/users.controller.ts` |
| ClassesController | `src/classes/classes.controller.ts` |
| AssignmentsController | `src/assignments/assignments.controller.ts` |
| SubmissionsController | `src/submissions/submissions.controller.ts` |
| PlagiarismController | `src/plagiarism/plagiarism.controller.ts` |
| StorageController | `src/storage/storage.controller.ts` |
| PaymentsController | `src/payments/payments.controller.ts` |
| AnalyticsController | `src/analytics/analytics.controller.ts` |
| AdminController | `src/admin/admin.controller.ts` |
