# 📊 Dokumentasi Lengkap Modul Dashboard

Modul ini menyediakan endpoint agregat untuk halaman utama dashboard instruktur.

---

## 🔐 Autentikasi

Semua endpoint dalam modul ini memerlukan autentikasi menggunakan JWT Bearer Token dan role `INSTRUCTOR`.

---

## ✨ Daftar Endpoint

### 1. GET `/instructor/dashboard`

**Fungsi:**  
Mengambil data ringkasan lengkap untuk halaman utama dashboard instruktur. Endpoint ini mengagregasi statistik, daftar item terbaru (kelas, submission, transaksi), dan data untuk chart dalam satu panggilan.

**Query Parameters:**  
Tidak ada.

**Response Sukses (200):**

```json
{
  "stats": {
    "totalClasses": 10,
    "totalStudents": 150,
    "activeAssignments": 5,
    "pendingGrading": 8,
    "completionRate": 85,
    "averageGrade": 88,
    "totalRevenue": 500000,
    "monthlyRevenue": 150000
  },
  "recentClasses": [
    {
      "id": "class-1",
      "name": "Kelas Kalkulus",
      "_count": { "enrollments": 30 }
    }
  ],
  "recentSubmissions": [
    {
      "id": "sub-1",
      "student": { "fullName": "Budi Santoso" },
      "assignment": { "title": "Tugas Kalkulus Lanjutan" },
      "status": "SUBMITTED"
    }
  ],
  "recentTransactions": [
    {
      "id": "trx-1",
      "amount": 50000,
      "status": "SUCCESS",
      "assignment": { "title": "Tugas Basis Data" }
    }
  ],
  "analyticsData": {
    "classActivity": [
      { "name": "Kelas Kalkulus", "submissions": 46 },
      { "name": "Kelas AI", "submissions": 38 }
    ],
    "submissionTrends": [
      { "date": "2025-10-01", "submissions": 10, "graded": 8 },
      { "date": "2025-10-02", "submissions": 12, "graded": 9 }
    ],
    "gradingTrends": [
      { "date": "2025-10-01", "avgHours": 22 },
      { "date": "2025-10-02", "avgHours": 20 }
    ]
  }
}
```

---

## 📝 Catatan

- Semua response error menggunakan format standar:
  ```json
  {
    "statusCode": 403,
    "message": "Forbidden"
  }
  ```
- Tanggal menggunakan format ISO 8601.

---

**Referensi kode:** [`AnalyticsController`](src/analytics/analytics.controller.ts)
