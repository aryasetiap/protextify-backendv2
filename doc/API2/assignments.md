# 📝 Dokumentasi Lengkap Modul Assignments

Modul Assignments menangani pembuatan tugas, daftar tugas per kelas, dan tugas terbaru untuk student.

---

## 🔐 Autentikasi

Sebagian besar endpoint membutuhkan JWT Bearer Token:

```
Authorization: Bearer <your-jwt-token>
```

---

## ✨ Daftar Endpoint

### 1. POST `/classes/:classId/assignments`

**Fungsi:**  
Instructor membuat assignment baru di kelas. Assignment akan berstatus inaktif sampai pembayaran selesai.

**Body:**

```json
{
  "title": "Tugas Kalkulus",
  "instructions": "Kerjakan soal halaman 50.",
  "deadline": "2025-12-31T23:59:59Z",
  "expectedStudentCount": 10
}
```

**Response Sukses (201):**

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
  "totalPrice": 27000,
  "pricePerStudent": 2700,
  "expectedStudentCount": 10,
  "message": "Assignment created. Please complete payment to activate.",
  "paymentData": {
    "amount": 27000,
    "assignmentId": "assignment-xyz"
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

**Response Error (403):**

```json
{
  "statusCode": 403,
  "message": "Not your class"
}
```

---

### 2. GET `/classes/:classId/assignments`

**Fungsi:**  
Mengambil daftar semua assignment di kelas. Student hanya melihat assignment yang aktif.

**Body:**  
Tidak ada.

**Response Sukses (200):**

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
    "createdAt": "2025-06-01T12:00:00.000Z",
    "submissions": [
      {
        "id": "submission-1",
        "status": "SUBMITTED",
        "grade": 90,
        "updatedAt": "2025-06-01T13:00:00.000Z"
      }
    ],
    "_count": { "submissions": 5 }
  },
  {
    "id": "assignment-abc",
    "title": "Tugas Fisika",
    "instructions": "Kerjakan soal halaman 25.",
    "deadline": "2025-12-25T23:59:59.000Z",
    "classId": "class-123",
    "expectedStudentCount": 10,
    "active": true,
    "createdAt": "2025-06-02T12:00:00.000Z",
    "submissions": [],
    "_count": { "submissions": 0 }
  }
]
```

**Response Error (404):**

```json
{
  "statusCode": 404,
  "message": "Class not found"
}
```

**Response Error (403):**

```json
{
  "statusCode": 403,
  "message": "Not your class"
}
```

---

### 3. GET `/assignments/recent`

**Fungsi:**  
Student mengambil daftar tugas terbaru dari semua kelas yang diikuti.

**Query Parameters:**

- `limit`: number (optional, default: 10)

**Body:**  
Tidak ada.

**Response Sukses (200):**

```json
[
  {
    "id": "assignment-xyz",
    "title": "Tugas Kalkulus",
    "instructions": "Kerjakan soal halaman 50.",
    "deadline": "2025-12-31T23:59:59.000Z",
    "classId": "class-123",
    "class": { "name": "Kelas Kalkulus" },
    "active": true,
    "submissions": [],
    "_count": { "submissions": 5 }
  }
]
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
- Endpoint pembuatan assignment hanya dapat diakses oleh instructor.
- Endpoint recent assignments hanya dapat diakses oleh student.

---

**Referensi kode:** [`AssignmentsController`](src/assignments/assignments.controller.ts)
