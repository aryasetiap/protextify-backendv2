# 📤 Dokumentasi Lengkap Modul Submissions

Modul Submissions menangani proses pengumpulan tugas, auto-save, penilaian, riwayat, dan download file submission.

---

## 🔐 Autentikasi

Sebagian besar endpoint membutuhkan JWT Bearer Token:

```
Authorization: Bearer <your-jwt-token>
```

---

## ✨ Daftar Endpoint

### 1. POST `/assignments/:assignmentId/submissions`

**Fungsi:**  
Student membuat submission baru untuk assignment.

**Body:**

```json
{
  "content": "Jawaban tugas saya..."
}
```

**Response Sukses (201):**

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

---

### 2. GET `/submissions/history`

**Fungsi:**  
Mengambil riwayat submission milik student yang sedang login.

**Body:**  
Tidak ada.

**Response Sukses (200):**

```json
[
  {
    "id": "submission-1",
    "assignmentId": "assignment-1",
    "content": "Jawaban tugas saya...",
    "status": "GRADED",
    "grade": 90,
    "createdAt": "2025-06-01T12:00:00.000Z",
    "updatedAt": "2025-06-01T13:00:00.000Z",
    "assignment": {
      "id": "assignment-1",
      "title": "Tugas 1",
      "deadline": "2025-06-10T23:59:59.000Z",
      "class": { "name": "Kelas Kalkulus" }
    },
    "plagiarismChecks": { "score": 5.2 }
  }
]
```

---

### 3. GET `/classes/:classId/history`

**Fungsi:**  
Mengambil riwayat submission di kelas tertentu (hanya untuk instructor).

**Body:**  
Tidak ada.

**Response Sukses (200):**

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

---

### 4. GET `/submissions/:id/download?format=pdf|docx`

**Fungsi:**  
Download submission sebagai PDF atau DOCX.

**Query Parameters:**

- `format`: pdf | docx (default: pdf)

**Body:**  
Tidak ada.

**Response Sukses (200):**

```json
{
  "filename": "submission-1.pdf",
  "url": "https://storage.protextify.com/submissions/submission-1.pdf",
  "size": 12345
}
```

---

### 5. GET `/submissions/:id`

**Fungsi:**  
Mengambil detail submission tertentu.

**Body:**  
Tidak ada.

**Response Sukses (200):**

```json
{
  "id": "submission-1",
  "assignmentId": "assignment-1",
  "studentId": "student-1",
  "content": "Jawaban tugas saya...",
  "status": "SUBMITTED",
  "grade": 90,
  "createdAt": "2025-06-01T12:00:00.000Z",
  "updatedAt": "2025-06-01T13:00:00.000Z",
  "assignment": {
    "id": "assignment-1",
    "title": "Tugas 1",
    "deadline": "2025-06-10T23:59:59.000Z"
  },
  "plagiarismChecks": {
    "score": 5.2,
    "status": "completed"
  }
}
```

---

### 6. PATCH `/submissions/:id/content`

**Fungsi:**  
Student mengupdate konten submission (auto-save).

**Body:**

```json
{
  "content": "Konten baru tugas..."
}
```

**Response Sukses (200):**

```json
{
  "id": "submission-1",
  "content": "Konten baru tugas...",
  "status": "DRAFT",
  "updatedAt": "2025-06-01T13:00:00.000Z"
}
```

---

### 7. POST `/submissions/:id/submit`

**Fungsi:**  
Student mengirimkan tugas untuk dinilai.

**Body:**  
Tidak ada.

**Response Sukses (200):**

```json
{
  "id": "submission-1",
  "status": "SUBMITTED",
  "submittedAt": "2025-06-01T13:10:00.000Z"
}
```

---

### 8. PATCH `/submissions/:id/grade`

**Fungsi:**  
Instructor memberikan nilai pada submission.

**Body:**

```json
{
  "grade": 90
}
```

**Response Sukses (200):**

```json
{
  "id": "submission-1",
  "grade": 90,
  "status": "GRADED",
  "updatedAt": "2025-06-01T13:20:00.000Z"
}
```

---

### 9. GET `/classes/:classId/assignments/:assignmentId/submissions`

**Fungsi:**  
Instructor mengambil semua submission untuk assignment tertentu di kelas.

**Body:**  
Tidak ada.

**Response Sukses (200):**

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

### 10. GET `/submissions/:id/versions`

**Fungsi:**  
Mengambil semua versi konten submission.

**Body:**  
Tidak ada.

**Response Sukses (200):**

```json
[
  {
    "version": 1,
    "content": "Isi tugas versi 1",
    "updatedAt": "2025-06-01T12:00:00.000Z"
  },
  {
    "version": 2,
    "content": "Isi tugas versi 2",
    "updatedAt": "2025-06-01T13:00:00.000Z"
  }
]
```

---

### 11. GET `/submissions/:id/versions/:version`

**Fungsi:**  
Mengambil detail versi spesifik dari submission.

**Body:**  
Tidak ada.

**Response Sukses (200):**

```json
{
  "version": 1,
  "content": "Isi tugas versi 1",
  "updatedAt": "2025-06-01T12:00:00.000Z"
}
```

---

## 📝 Catatan

- Semua response error menggunakan format standar:
  ```json
  {
    "statusCode": 400,
    "message": "Error message"
  }
  ```
- Tanggal menggunakan format ISO 8601.
- Endpoint grading dan monitoring hanya dapat diakses oleh instructor.
- Endpoint auto-save, submit, dan riwayat hanya dapat diakses oleh student.

---

**Referensi kode:** [`SubmissionsController`](src/submissions/submissions.controller.ts)
