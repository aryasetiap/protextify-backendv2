# 📚 Dokumentasi API Protextify Backend

Dokumentasi lengkap API backend Protextify - Platform deteksi plagiarisme dan manajemen tugas akademik.

## 📋 Table of Contents

- [📚 Dokumentasi API Protextify Backend](#-dokumentasi-api-protextify-backend)
  - [📋 Table of Contents](#-table-of-contents)
  - [🌐 Informasi Umum](#-informasi-umum)
  - [🔐 Autentikasi](#-autentikasi)
  - [📦 Modul Auth](#-modul-auth)
    - [POST /auth/register](#post-authregister)
    - [POST /auth/login](#post-authlogin)
    - [POST /auth/send-verification](#post-authsend-verification)
    - [POST /auth/verify-email](#post-authverify-email)
    - [GET /auth/google](#get-authgoogle)
    - [GET /auth/google/callback](#get-authgooglecallback)
    - [GET /auth/instructor-only](#get-authinstructor-only)
  - [👤 Modul Users](#-modul-users)
    - [GET /users/me](#get-usersme)
    - [PATCH /users/me](#patch-usersme)
  - [🏫 Modul Classes](#-modul-classes)
    - [POST /classes](#post-classes)
    - [POST /classes/join](#post-classesjoin)
    - [GET /classes](#get-classes)
    - [GET /classes/:id](#get-classesid)
  - [📝 Modul Assignments](#-modul-assignments)
    - [POST /classes/:classId/assignments](#post-classesclassidassignments)
    - [GET /classes/:classId/assignments](#get-classesclassidassignments)
  - [📤 Modul Submissions](#-modul-submissions)
    - [POST /assignments/:assignmentId/submissions](#post-assignmentsassignmentidsubmissions)
    - [GET /submissions/history](#get-submissionshistory)
    - [GET /classes/:classId/history](#get-classesclassidhistory)
    - [GET /submissions/:id/download](#get-submissionsiddownload)
    - [GET /submissions/:id](#get-submissionsid)
    - [PATCH /submissions/:id/content](#patch-submissionsidcontent)
    - [POST /submissions/:id/submit](#post-submissionsidsubmit)
    - [PATCH /submissions/:id/grade](#patch-submissionsidgrade)
    - [GET /classes/:classId/assignments/:assignmentId/submissions](#get-classesclassidassignmentsassignmentidsubmissions)
  - [🔎 Modul Plagiarism](#-modul-plagiarism)
    - [POST /submissions/:id/check-plagiarism](#post-submissionsidcheck-plagiarism)
    - [GET /submissions/:id/plagiarism-report](#get-submissionsidplagiarism-report)
    - [GET /plagiarism/queue-stats](#get-plagiarismqueue-stats)
  - [💳 Modul Payments](#-modul-payments)
    - [POST /payments/create-transaction](#post-paymentscreate-transaction)
    - [POST /payments/webhook](#post-paymentswebhook)
  - [💾 Modul Storage](#-modul-storage)
    - [GET /storage/health](#get-storagehealth)
    - [GET /storage/refresh-url/:cloudKey](#get-storagerefresh-urlcloudkey)
    - [POST /storage/upload](#post-storageupload)
  - [📡 Event WebSocket (Realtime)](#-event-websocket-realtime)
  - [🚨 Error Handling](#-error-handling)

---

## 🌐 Informasi Umum

- **Base URL**: `http://localhost:3000/api`
- **Version**: 2.0.0
- **Content-Type**: `application/json`
- **Documentation**: `http://localhost:3000/api/docs` (Swagger)

## 🔐 Autentikasi

Sebagian besar endpoint memerlukan autentikasi menggunakan JWT Bearer Token:

```

Authorization: Bearer <your-jwt-token>

```

---

## 📦 Modul Auth

Menangani autentikasi dan otorisasi pengguna.

### POST /auth/register

Mendaftarkan user baru (student/instructor).

**Parameters:**

- Body: `RegisterDto`

**Request Body:**

```json
{
  "email": "student@example.com",
  "password": "password123",
  "fullName": "Student Name",
  "role": "STUDENT",
  "institution": "Universitas Protextify"
}
```

**Response Success (201):**

```json
{
  "message": "Registration successful, verification email sent",
  "user": {
    "id": "user-123",
    "email": "student@example.com",
    "fullName": "Student Name",
    "role": "STUDENT",
    "institution": "Universitas Protextify",
    "emailVerified": false,
    "createdAt": "2025-06-01T12:00:00.000Z",
    "updatedAt": "2025-06-01T12:00:00.000Z"
  }
}
```

**Response Error (409):**

```json
{
  "statusCode": 409,
  "message": "Email already registered"
}
```

### POST /auth/login

Login dengan email dan password.

**Parameters:**

- Body: `LoginDto`

**Request Body:**

```json
{
  "email": "student@example.com",
  "password": "password123"
}
```

**Response Success (200):**

```json
{
  "accessToken": "jwt.token.here",
  "user": {
    "id": "user-123",
    "email": "student@example.com",
    "fullName": "Student Name",
    "role": "STUDENT",
    "institution": "Universitas Protextify",
    "emailVerified": true,
    "createdAt": "2025-06-01T12:00:00.000Z",
    "updatedAt": "2025-06-01T12:00:00.000Z"
  }
}
```

**Response Error (401):**

```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

### POST /auth/send-verification

Mengirim email verifikasi ke user.

**Parameters:**

- Body: `SendVerificationDto`

**Request Body:**

```json
{
  "email": "student@example.com"
}
```

**Response Success (200):**

```json
{
  "message": "Verification email sent"
}
```

**Response Error (404):**

```json
{
  "statusCode": 404,
  "message": "User not found"
}
```

### POST /auth/verify-email

Verifikasi email dengan token.

**Parameters:**

- Body: `VerifyEmailDto`

**Request Body:**

```json
{
  "token": "verification_token_123"
}
```

**Response Success (200):**

```json
{
  "message": "Email verified successfully"
}
```

**Response Error (400):**

```json
{
  "statusCode": 400,
  "message": "Invalid or expired token"
}
```

### GET /auth/google

Mengarahkan ke halaman login Google OAuth.

**Parameters:** None

**Response:** Redirect ke Google login page

### GET /auth/google/callback

Callback dari Google setelah login berhasil.

**Parameters:** None

**Response:** Redirect ke frontend dengan JWT token

### GET /auth/instructor-only

Endpoint khusus instructor (contoh role-based access).

**Authentication:** Required (INSTRUCTOR role)

**Response Success (200):**

```json
{
  "message": "Only instructor can access this!"
}
```

**Response Error (403):**

```json
{
  "statusCode": 403,
  "message": "You do not have permission (role) to access this resource"
}
```

---

## 👤 Modul Users

Manajemen data pengguna.

### GET /users/me

Mengambil data profil user yang sedang login.

**Authentication:** Required

**Response Success (200):**

```json
{
  "id": "user-123",
  "email": "test@example.com",
  "fullName": "Test User",
  "institution": "Universitas Test",
  "role": "STUDENT",
  "emailVerified": true,
  "createdAt": "2025-06-01T12:00:00.000Z",
  "updatedAt": "2025-06-01T12:00:00.000Z"
}
```

**Response Error (404):**

```json
{
  "statusCode": 404,
  "message": "User not found"
}
```

### PATCH /users/me

Memperbarui data profil user yang sedang login.

**Authentication:** Required

**Parameters:**

- Body: `UpdateUserDto`

**Request Body:**

```json
{
  "fullName": "Nama Baru",
  "institution": "Universitas Protextify"
}
```

**Response Success (200):**

```json
{
  "id": "user-123",
  "email": "test@example.com",
  "fullName": "Nama Baru",
  "institution": "Universitas Protextify",
  "role": "STUDENT",
  "emailVerified": true,
  "updatedAt": "2025-06-01T13:00:00.000Z"
}
```

---

## 🏫 Modul Classes

Pembuatan, pengelolaan, dan keanggotaan kelas.

### POST /classes

Instructor membuat kelas baru.

**Authentication:** Required (INSTRUCTOR role)

**Parameters:**

- Body: `CreateClassDto`

**Request Body:**

```json
{
  "name": "Kelas Kalkulus",
  "description": "Kelas untuk mata kuliah Kalkulus"
}
```

**Response Success (201):**

```json
{
  "id": "class-abc",
  "name": "Kelas Kalkulus",
  "description": "Kelas untuk mata kuliah Kalkulus",
  "instructorId": "instructor-123",
  "classToken": "8charToken",
  "createdAt": "2025-06-01T12:00:00.000Z"
}
```

### POST /classes/join

Student bergabung ke kelas menggunakan token.

**Authentication:** Required (STUDENT role)

**Parameters:**

- Body: `JoinClassDto`

**Request Body:**

```json
{
  "classToken": "8charToken"
}
```

**Response Success (200):**

```json
{
  "message": "Successfully joined class",
  "class": {
    "id": "class-abc",
    "name": "Kelas Kalkulus",
    "instructorId": "instructor-123",
    "classToken": "8charToken"
  }
}
```

**Response Error (404):**

```json
{
  "statusCode": 404,
  "message": "Class not found"
}
```

**Response Error (409):**

```json
{
  "statusCode": 409,
  "message": "Already joined this class"
}
```

### GET /classes

Mendapat daftar kelas (student & instructor).

**Authentication:** Required

**Response Success (200):**

```json
[
  {
    "id": "class-abc",
    "name": "Kelas Kalkulus",
    "instructorId": "instructor-123",
    "classToken": "8charToken"
  }
]
```

### GET /classes/:id

Mendapat detail sebuah kelas.

**Authentication:** Required

**Parameters:**

- Path: `id` (string) - ID of the class

**Response Success (200):**

```json
{
  "id": "class-abc",
  "name": "Kelas Kalkulus",
  "description": "Kelas untuk mata kuliah Kalkulus",
  "instructor": {
    "id": "instructor-123",
    "fullName": "Nama Instruktur"
  },
  "enrollments": [
    { "student": { "id": "student-1", "fullName": "Siswa 1" } },
    { "student": { "id": "student-2", "fullName": "Siswa 2" } }
  ],
  "assignments": [
    { "id": "assignment-1", "title": "Tugas 1" },
    { "id": "assignment-2", "title": "Tugas 2" }
  ]
}
```

---

## 📝 Modul Assignments

Mengelola tugas-tugas di dalam kelas.

### POST /classes/:classId/assignments

Instructor membuat tugas baru di kelas.

**Authentication:** Required (INSTRUCTOR role)

**Parameters:**

- Path: `classId` (string) - ID of the class
- Body: `CreateAssignmentDto`

**Request Body:**

```json
{
  "title": "Tugas Kalkulus",
  "instructions": "Kerjakan soal halaman 50.",
  "deadline": "2025-12-31T23:59:59Z",
  "expectedStudentCount": 10
}
```

**Response Success (201):**

```json
{
  "assignment": {
    "id": "assignment-xyz",
    "title": "Tugas Kalkulus",
    "instructions": "Kerjakan soal halaman 50.",
    "deadline": "2025-12-31T23:59:59.000Z",
    "classId": "class-123",
    "expectedStudentCount": 10,
    "active": false
  },
  "paymentRequired": true,
  "totalPrice": 25000,
  "pricePerStudent": 2500,
  "expectedStudentCount": 10,
  "message": "Assignment created. Please complete payment to activate.",
  "paymentData": {
    "amount": 25000,
    "assignmentId": "assignment-xyz"
  }
}
```

### GET /classes/:classId/assignments

Mendapat daftar semua tugas di kelas.

**Authentication:** Required

**Parameters:**

- Path: `classId` (string) - ID of the class

**Response Success (200):**

```json
[
  {
    "id": "assignment-xyz",
    "title": "Tugas Kalkulus",
    "instructions": "Kerjakan soal halaman 50.",
    "deadline": "2025-12-31T23:59:59.000Z",
    "classId": "class-123",
    "expectedStudentCount": 10,
    "active": true,
    "submissions": [],
    "_count": { "submissions": 5 }
  }
]
```

---

## 📤 Modul Submissions

Alur kerja pengumpulan tugas oleh siswa.

### POST /assignments/:assignmentId/submissions

Student membuat draf submission untuk tugas.

**Authentication:** Required (STUDENT role)

**Parameters:**

- Path: `assignmentId` (string) - Assignment ID
- Body: `CreateSubmissionDto`

**Request Body:**

```json
{
  "content": "Jawaban tugas saya..."
}
```

**Response Success (201):**

```json
{
  "id": "submission-1",
  "assignmentId": "assignment-1",
  "studentId": "student-1",
  "content": "Jawaban tugas saya...",
  "status": "DRAFT",
  "createdAt": "2025-06-01T12:00:00.000Z"
}
```

### GET /submissions/history

Mendapat riwayat penulisan student.

**Authentication:** Required (STUDENT role)

**Response Success (200):**

```json
[
  {
    "id": "submission-1",
    "assignmentId": "assignment-1",
    "content": "Jawaban tugas saya...",
    "status": "SUBMITTED",
    "createdAt": "2025-06-01T12:00:00.000Z"
  }
]
```

### GET /classes/:classId/history

Mendapat riwayat penulisan di kelas (instructor).

**Authentication:** Required (INSTRUCTOR role)

**Parameters:**

- Path: `classId` (string) - Class ID

**Response Success (200):**

```json
[
  {
    "id": "submission-1",
    "student": { "id": "student-1", "fullName": "Nama Siswa" },
    "assignment": { "id": "assignment-1", "title": "Tugas 1" },
    "status": "SUBMITTED",
    "createdAt": "2025-06-01T12:00:00.000Z"
  }
]
```

### GET /submissions/:id/download

Download tugas (PDF/DOCX).

**Authentication:** Required

**Parameters:**

- Path: `id` (string) - Submission ID
- Query: `format` (string, optional) - File format ('pdf' or 'docx', default: 'pdf')

**Response Success (200):**

```json
{
  "filename": "submission-1.pdf",
  "url": "https://storage.protextify.com/submissions/submission-1.pdf",
  "size": 12345
}
```

### GET /submissions/:id

Mendapat detail submission.

**Authentication:** Required

**Parameters:**

- Path: `id` (string) - Submission ID

**Response Success (200):**

```json
{
  "id": "submission-1",
  "assignmentId": "assignment-1",
  "studentId": "student-1",
  "content": "Jawaban tugas saya...",
  "status": "SUBMITTED",
  "createdAt": "2025-06-01T12:00:00.000Z"
}
```

### PATCH /submissions/:id/content

Auto-save konten tulisan student.

**Authentication:** Required (STUDENT role)

**Parameters:**

- Path: `id` (string) - Submission ID
- Body: `UpdateContentDto`

**Request Body:**

```json
{
  "content": "Konten baru tugas..."
}
```

**Response Success (200):**

```json
{
  "id": "submission-1",
  "content": "Konten baru tugas...",
  "status": "DRAFT",
  "updatedAt": "2025-06-01T13:00:00.000Z"
}
```

### POST /submissions/:id/submit

Student menyelesaikan dan mengirimkan tugas.

**Authentication:** Required (STUDENT role)

**Parameters:**

- Path: `id` (string) - Submission ID

**Response Success (200):**

```json
{
  "id": "submission-1",
  "status": "SUBMITTED",
  "submittedAt": "2025-06-01T13:10:00.000Z"
}
```

### PATCH /submissions/:id/grade

Instructor memberikan nilai pada submission.

**Authentication:** Required (INSTRUCTOR role)

**Parameters:**

- Path: `id` (string) - Submission ID
- Body: Grade data

**Request Body:**

```json
{
  "grade": 90
}
```

**Response Success (200):**

```json
{
  "id": "submission-1",
  "grade": 90,
  "status": "GRADED",
  "updatedAt": "2025-06-01T13:20:00.000Z"
}
```

### GET /classes/:classId/assignments/:assignmentId/submissions

Monitoring submission oleh instructor.

**Authentication:** Required (INSTRUCTOR role)

**Parameters:**

- Path: `classId` (string) - Class ID
- Path: `assignmentId` (string) - Assignment ID

**Response Success (200):**

```json
[
  {
    "id": "submission-1",
    "student": { "id": "student-1", "fullName": "Nama Siswa" },
    "status": "SUBMITTED",
    "updatedAt": "2025-06-01T13:30:00.000Z"
  }
]
```

---

## 🔎 Modul Plagiarism

Terintegrasi dengan layanan eksternal pengecekan plagiarisme.

### POST /submissions/:id/check-plagiarism

Instructor memicu pengecekan plagiarisme.

**Authentication:** Required (INSTRUCTOR role)

**Parameters:**

- Path: `id` (string) - Submission ID (UUID format)
- Body: `CheckPlagiarismDto`

**Request Body:**

```json
{
  "excluded_sources": ["https://source.com", "https://example.com"],
  "language": "id",
  "country": "id"
}
```

**Response Success (200):**

```json
{
  "jobId": "12345",
  "status": "queued",
  "message": "Plagiarism check has been queued"
}
```

### GET /submissions/:id/plagiarism-report

Mengunduh laporan hasil plagiarisme.

**Authentication:** Required

**Parameters:**

- Path: `id` (string) - Submission ID (UUID format)

**Response Success (200):**

```json
{
  "submissionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "completed",
  "score": 27,
  "wordCount": 1419,
  "creditsUsed": 1,
  "checkedAt": "2025-06-01T14:23:00.000Z",
  "pdfReportUrl": "https://storage.protextify.com/reports/plagiarism/f47ac10b-58cc-4372-a567-0e02b2c3d479-1623411231233.pdf",
  "detailedResults": {
    "result": {
      "score": 27,
      "textWordCounts": 1419,
      "totalPlagiarismWords": 300
    },
    "sources": [
      { "title": "Source A", "url": "https://source.com", "score": 80 }
    ],
    "credits_used": 1
  }
}
```

### GET /plagiarism/queue-stats

Monitor status antrian plagiarisme (debugging).

**Authentication:** Required (INSTRUCTOR role)

**Response Success (200):**

```json
{
  "waiting": 1,
  "active": 0,
  "completed": 5,
  "failed": 0,
  "total": 6
}
```

---

## 💳 Modul Payments

Terintegrasi dengan Midtrans untuk transaksi pembelian kredit.

### POST /payments/create-transaction

Instructor membuat transaksi Midtrans.

**Authentication:** Required (INSTRUCTOR role)

**Parameters:**

- Body: `CreateTransactionDto`

**Request Body:**

```json
{
  "amount": 25000,
  "assignmentId": "assignment-xyz"
}
```

**Response Success (201):**

```json
{
  "transactionId": "trans-1",
  "snapToken": "snap-token-xyz",
  "paymentUrl": "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-xyz",
  "status": "PENDING"
}
```

### POST /payments/webhook

Menerima notifikasi status pembayaran dari Midtrans.

**Authentication:** Not required (Webhook endpoint)

**Parameters:**

- Body: `WebhookDto`

**Request Body:**

```json
{
  "order_id": "PROTEXTIFY-1234567890-abc123",
  "transaction_status": "settlement",
  "signature_key": "valid_signature",
  "status_code": "200",
  "gross_amount": "25000.00",
  "fraud_status": "accept"
}
```

**Response Success (200):**

```json
{
  "message": "Webhook processed successfully"
}
```

---

## 💾 Modul Storage

Manajemen file storage dan cloud integration.

### GET /storage/health

Cek status kesehatan layanan storage.

**Authentication:** Not required

**Response Success (200):**

```json
{
  "status": "healthy",
  "timestamp": "2025-06-01T12:00:00.000Z",
  "service": "storage",
  "cloudStorage": {
    "status": "healthy",
    "bucket": "protextify-files",
    "endpoint": "https://r2.cloudflare.com"
  },
  "features": {
    "pdfGeneration": "enabled",
    "docxGeneration": "enabled",
    "cloudUpload": "enabled",
    "presignedUrls": "enabled"
  }
}
```

### GET /storage/refresh-url/:cloudKey

Refresh pre-signed URL untuk file yang ada.

**Authentication:** Required

**Parameters:**

- Path: `cloudKey` (string) - Cloud storage key
- Query: `filename` (string, required) - Original filename
- Query: `expires` (string, optional) - Expiration time in seconds

**Response Success (200):**

```json
{
  "url": "https://r2.cloudflare.com/presigned-url",
  "expiresIn": 7200,
  "expiresAt": "2025-06-01T14:00:00.000Z"
}
```

### POST /storage/upload

Upload file attachment untuk assignment atau submission.

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Parameters:**

- File: `file` (required) - File to upload
- Body: `assignmentId` (optional) - Assignment ID
- Body: `submissionId` (optional) - Submission ID
- Body: `description` (optional) - File description

**Supported File Types:**

- Documents: PDF, DOC, DOCX (max 10MB)
- Images: JPG, PNG (max 5MB)
- Archives: ZIP (max 20MB)

**Response Success (201):**

```json
{
  "id": "file-abc123",
  "filename": "document.pdf",
  "size": 1234567,
  "mimeType": "application/pdf",
  "cloudKey": "attachments/file-abc123.pdf",
  "uploadedAt": "2025-06-01T12:00:00.000Z"
}
```

**Response Error (400):**

```json
{
  "statusCode": 400,
  "message": "Tipe file tidak didukung. Hanya PDF, DOC, DOCX, JPG, PNG, ZIP yang diperbolehkan.",
  "error": "Bad Request"
}
```

---

## 📡 Event WebSocket (Realtime)

| Event Name              | Deskripsi                                            | Payload Struktur                                                                                       |
| ----------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `updateContent`         | Auto-save konten editor student                      | `{ submissionId, content, updatedAt }`                                                                 |
| `notification`          | Notifikasi real-time ke user                         | `{ type, message, data?, createdAt }`                                                                  |
| `submissionUpdated`     | Broadcast perubahan submission                       | `{ submissionId, status, grade?, plagiarismScore?, updatedAt }`                                        |
| `submissionListUpdated` | Update daftar submission untuk monitoring instructor | `{ assignmentId, submissions: [ { submissionId, studentId, status, plagiarismScore, lastUpdated } ] }` |

**WebSocket URL:** `ws://localhost:3000`

---

## 🚨 Error Handling

Semua error response menggunakan format standar:

```json
{
  "statusCode": 400,
  "message": "Error message description",
  "error": "Bad Request"
}
```

**Common Error Codes:**

- `400` - Bad Request (Validasi input gagal)
- `401` - Unauthorized (Token tidak valid/expired)
- `403` - Forbidden (Tidak memiliki permission)
- `404` - Not Found (Resource tidak ditemukan)
- `409` - Conflict (Data sudah ada)
- `500` - Internal Server Error (Error server)

---

> **📝 Catatan:**
>
> - Semua endpoint menggunakan prefix `/api`
> - Timestamp menggunakan format ISO 8601
> - File size dalam bytes
> - Rate limiting diterapkan pada endpoint tertentu
> - Dokumentasi Swagger tersedia di `/api/docs`

> **🔗 Referensi:**
>
> - [Swagger Documentation](http://localhost:3000/api/docs)
> - [Queue Dashboard](http://localhost:3000/admin/queues)
> - [Health Check](http://localhost:3000/health)

```

Dokumentasi ini mencakup semua endpoint yang ada dalam controller yang Anda lampirkan, dengan struktur yang rapi, contoh request/response yang lengkap, dan informasi parameter yang detail. Dokumentasi ini siap digunakan sebagai panduan lengkap untuk pengembangan frontend atau integrasi dengan sistem lain.Dokumentasi ini mencakup semua endpoint yang ada dalam controller yang Anda lampirkan, dengan struktur yang rapi, contoh request/response yang lengkap, dan informasi parameter yang detail. Dokumentasi ini siap digunakan sebagai panduan lengkap untuk pengembangan frontend atau integrasi dengan sistem lain.
```
