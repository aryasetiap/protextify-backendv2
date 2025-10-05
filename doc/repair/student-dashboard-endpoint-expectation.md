# 📚 Student Dashboard Endpoint Expectation

Dokumentasi ini berisi daftar endpoint yang **dibutuhkan atau digunakan oleh Frontend** untuk page Dashboard Overview (role Student).  
Setiap endpoint dilengkapi dengan detail method, fungsi, struktur request/response, dan catatan status implementasi di Backend.

---

## 1. GET /classes

### Deskripsi

Mengambil daftar semua kelas yang diikuti oleh student.  
Digunakan untuk menampilkan statistik jumlah kelas, daftar kelas terbaru, dan quick actions.

### Method

`GET`

### Request

- **Headers:**
  - Authorization: Bearer `<accessToken>`

- **Query/Params:**
  - Tidak ada

### Response (Expected by FE)

```json
[
  {
    "id": "class-abc",
    "name": "Kelas Kalkulus",
    "description": "Kelas untuk mata kuliah Kalkulus",
    "instructor": {
      "id": "instructor-123",
      "fullName": "Nama Instruktur"
    },
    "assignments": [
      {
        "id": "assignment-1",
        "title": "Tugas 1",
        "deadline": "2025-06-01T12:00:00.000Z",
        "active": true
      }
    ],
    "enrollments": [
      { "student": { "id": "student-1", "fullName": "Siswa 1" } }
    ],
    "createdAt": "2025-06-01T12:00:00.000Z",
    "classToken": "8charToken",
    "currentUserEnrollment": {
      "id": "enrollment-xyz",
      "joinedAt": "2025-06-01T12:00:00.000Z"
    }
  }
]
```

### Catatan

- **Sudah tersedia di BE** (lihat `/classes`).
- Response harus berupa array kelas dengan struktur di atas.

---

## 2. GET /submissions/history

### Deskripsi

Mengambil riwayat pengumpulan tugas (submission) oleh student.  
Digunakan untuk statistik tugas selesai, draft, dan aktivitas terbaru.

### Method

`GET`

### Request

- **Headers:**
  - Authorization: Bearer `<accessToken>`

- **Query/Params:**
  - Tidak ada

### Response (Expected by FE)

```json
[
  {
    "id": "submission-1",
    "assignmentId": "assignment-1",
    "content": "Jawaban tugas saya...",
    "status": "DRAFT | SUBMITTED | GRADED",
    "createdAt": "2025-06-01T12:00:00.000Z",
    "updatedAt": "2025-06-01T13:00:00.000Z",
    "assignment": {
      "id": "assignment-1",
      "title": "Tugas 1",
      "deadline": "2025-06-10T23:59:59.000Z",
      "class": { "name": "Kelas Kalkulus" }
    },
    "grade": 90,
    "plagiarismScore": 5.2
  }
]
```

### Catatan

- **Sudah tersedia di BE** (lihat `/submissions/history`).
- Response harus berupa array submission dengan assignment detail.

---

## 3. GET /assignments/recent

### Deskripsi

Mengambil daftar tugas terbaru yang relevan untuk student.  
Digunakan untuk menampilkan "Tugas Terbaru" di dashboard.

### Method

`GET`

### Request

- **Headers:**
  - Authorization: Bearer `<accessToken>`

- **Query/Params:**
  - Optional: `limit` (jumlah tugas terbaru, default 3)

### Response (Expected by FE)

```json
[
  {
    "id": "assignment-xyz",
    "title": "Tugas Kalkulus",
    "deadline": "2025-12-31T23:59:59.000Z",
    "class": { "name": "Kelas Kalkulus" },
    "active": true
  }
]
```

### Catatan

- **Belum tersedia di BE** (perlu dibuat).
- Response harus berupa array tugas terbaru, urut berdasarkan deadline atau waktu pembuatan.

---

## 4. WebSocket ws://localhost:3000

### Deskripsi

Digunakan untuk notifikasi real-time, update submission, dan status koneksi dashboard.

### Method

`WebSocket`

### Request

- **Auth:**
  - JWT token dikirim via auth handshake

### Events (Expected by FE)

- `notification`
  ```json
  {
    "type": "success | error | info | warning",
    "message": "string",
    "data": {}
  }
  ```
- `submissionUpdated`
  ```json
  {
    "submissionId": "string",
    "status": "DRAFT | SUBMITTED | GRADED",
    "updatedAt": "ISO date string"
  }
  ```
- `submissionListUpdated`
  ```json
  {
    "assignmentId": "string",
    "submissions": [
      {
        "submissionId": "string",
        "studentId": "string",
        "status": "string",
        "plagiarismScore": 5.2,
        "lastUpdated": "ISO date string"
      }
    ]
  }
  ```

### Catatan

- **Sudah tersedia di BE** (lihat dokumentasi WebSocket event).
- Pastikan event dan payload sesuai kebutuhan FE.

---

## 5. GET /users/me

### Deskripsi

Mengambil data profil user yang sedang login.  
Digunakan untuk menampilkan nama, role, dan personalisasi dashboard.

### Method

`GET`

### Request

- **Headers:**
  - Authorization: Bearer `<accessToken>`

### Response (Expected by FE)

```json
{
  "id": "user-123",
  "email": "student@example.com",
  "fullName": "Student Name",
  "institution": "Universitas Test",
  "role": "STUDENT",
  "emailVerified": true,
  "createdAt": "2025-06-01T12:00:00.000Z",
  "updatedAt": "2025-06-01T12:00:00.000Z"
}
```

### Catatan

- **Sudah tersedia di BE**.

---

## 6. GET /classes/:id

### Deskripsi

Mengambil detail sebuah kelas (untuk statistik, assignments, classmates, dsb).

### Method

`GET`

### Request

- **Headers:**
  - Authorization: Bearer `<accessToken>`
- **Params:**
  - `id` (Class ID)

### Response (Expected by FE)

```json
{
  "id": "class-abc",
  "name": "Kelas Kalkulus",
  "description": "Kelas untuk mata kuliah Kalkulus",
  "instructor": {
    "id": "instructor-123",
    "fullName": "Nama Instruktur"
  },
  "enrollments": [{ "student": { "id": "student-1", "fullName": "Siswa 1" } }],
  "assignments": [
    {
      "id": "assignment-1",
      "title": "Tugas 1",
      "deadline": "2025-06-01T12:00:00.000Z",
      "active": true
    }
  ],
  "createdAt": "2025-06-01T12:00:00.000Z"
}
```

### Catatan

- **Sudah tersedia di BE**.

---

## 7. GET /classes/:classId/assignments

### Deskripsi

Mengambil daftar semua tugas di kelas tertentu.

### Method

`GET`

### Request

- **Headers:**
  - Authorization: Bearer `<accessToken>`
- **Params:**
  - `classId` (Class ID)

### Response (Expected by FE)

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

### Catatan

- **Sudah tersedia di BE**.

---

## 8. GET /submissions/:id

### Deskripsi

Mengambil detail submission tertentu (untuk menampilkan status, isi, dsb).

### Method

`GET`

### Request

- **Headers:**
  - Authorization: Bearer `<accessToken>`
- **Params:**
  - `id` (Submission ID)

### Response (Expected by FE)

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

### Catatan

- **Sudah tersedia di BE**.

---

## 9. PATCH /submissions/:id/content

### Deskripsi

Auto-save konten tulisan student (draft).

### Method

`PATCH`

### Request

- **Headers:**
  - Authorization: Bearer `<accessToken>`
- **Params:**
  - `id` (Submission ID)
- **Body:**
  ```json
  {
    "content": "Konten baru tugas..."
  }
  ```

### Response (Expected by FE)

```json
{
  "id": "submission-1",
  "content": "Konten baru tugas...",
  "status": "DRAFT",
  "updatedAt": "2025-06-01T13:00:00.000Z"
}
```

### Catatan

- **Sudah tersedia di BE**.

---

## 10. POST /submissions/:id/submit

### Deskripsi

Student mengirimkan tugas untuk dinilai.

### Method

`POST`

### Request

- **Headers:**
  - Authorization: Bearer `<accessToken>`
- **Params:**
  - `id` (Submission ID)

### Response (Expected by FE)

```json
{
  "id": "submission-1",
  "status": "SUBMITTED",
  "submittedAt": "2025-06-01T13:10:00.000Z"
}
```

### Catatan

- **Sudah tersedia di BE**.

---

## 11. GET /storage/health

### Deskripsi

Cek status kesehatan layanan storage (opsional, untuk monitoring file upload).

### Method

`GET`

### Request

- Tidak ada

### Response (Expected by FE)

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

### Catatan

- **Sudah tersedia di BE**.

---

## 12. GET /submissions/:id/download

### Deskripsi

Download submission sebagai PDF atau DOCX.

### Method

`GET`

### Request

- **Headers:**
  - Authorization: Bearer `<accessToken>`
- **Params:**
  - `id` (Submission ID)
- **Query:**
  - `format` (pdf | docx, default: pdf)

### Response (Expected by FE)

```json
{
  "filename": "submission-1.pdf",
  "url": "https://r2.cloudflare.com/protextify-files/submission-1.pdf",
  "size": 102400,
  "format": "pdf",
  "cloudKey": "submission-1.pdf",
  "generatedAt": "2025-06-01T13:00:00.000Z"
}
```

### Catatan

- **Sudah tersedia di BE**.

---

# 📌 Summary

- Semua endpoint di atas **dibutuhkan oleh FE** untuk page Dashboard Overview (role Student).
- Endpoint `/assignments/recent` **perlu dibuat di BE** untuk fitur tugas terbaru.
- Struktur response harus mengikuti contoh di atas agar integrasi FE berjalan lancar.
- Endpoint lain sudah tersedia di BE, pastikan field dan format response konsisten.

---
