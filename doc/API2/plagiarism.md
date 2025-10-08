# 🔎 Dokumentasi Lengkap Modul Plagiarism

Modul Plagiarism menangani pengecekan plagiarisme, pengambilan hasil, dan monitoring antrian pengecekan.

---

## 🔐 Autentikasi

Sebagian besar endpoint membutuhkan JWT Bearer Token:

```
Authorization: Bearer <your-jwt-token>
```

---

## ✨ Daftar Endpoint

### 1. POST `/submissions/:id/check-plagiarism`

**Fungsi:**  
Instructor memicu pengecekan plagiarisme pada submission student.  
Menambahkan job ke queue dan mengembalikan status antrian.

**Body:**

```json
{
  "excluded_sources": ["https://source.com", "https://example.com"],
  "language": "id",
  "country": "id"
}
```

_Body dapat dikosongkan jika tidak ingin mengecualikan sumber._

**Response Sukses (200):**

```json
{
  "jobId": "12345",
  "status": "queued",
  "message": "Plagiarism check has been queued"
}
```

---

### 2. GET `/submissions/:id/plagiarism-report`

**Fungsi:**  
Mengambil hasil pengecekan plagiarisme dan URL download laporan PDF.

**Body:**  
Tidak ada.

**Response Sukses (200):**

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

---

### 3. GET `/plagiarism/queue-stats`

**Fungsi:**  
Monitoring status antrian pengecekan plagiarisme (khusus instructor, debugging/monitoring).

**Body:**  
Tidak ada.

**Response Sukses (200):**

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

## 📝 Catatan

- Semua response error menggunakan format standar:
  ```json
  {
    "statusCode": 400,
    "message": "Error message"
  }
  ```
- Tanggal menggunakan format ISO 8601.
- Endpoint pengecekan plagiarisme hanya dapat diakses oleh instructor.
- Endpoint report dapat diakses oleh student/instructor yang memiliki akses ke submission.

---

**Referensi kode:** [`PlagiarismController`](src/plagiarism/plagiarism.controller.ts)
