# 🏫 Dokumentasi Lengkap Modul Classes

Modul Classes menangani pembuatan, keanggotaan, dan detail kelas untuk instructor & student.

---

## 🔐 Autentikasi

Sebagian besar endpoint membutuhkan JWT Bearer Token:

```
Authorization: Bearer <your-jwt-token>
```

---

## ✨ Daftar Endpoint

### 1. POST `/classes`

**Fungsi:**  
Instructor membuat kelas baru. Token kelas unik akan dihasilkan.

**Body:**

```json
{
  "name": "Kelas Kalkulus",
  "description": "Kelas untuk mata kuliah Kalkulus"
}
```

**Response Sukses (201):**

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

---

### 2. POST `/classes/join`

**Fungsi:**  
Student bergabung ke kelas menggunakan token kelas.

**Body:**

```json
{
  "classToken": "8charToken"
}
```

**Response Sukses (200):**

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

---

### 3. GET `/classes`

**Fungsi:**  
Mengambil daftar kelas untuk user.

- Instructor: kelas yang dibuat.
- Student: kelas yang diikuti.

**Body:**  
Tidak ada.

**Response Sukses (200):**

```json
[
  {
    "id": "class-abc",
    "name": "Kelas Kalkulus",
    "description": "Kelas untuk mata kuliah Kalkulus",
    "classToken": "8charToken",
    "instructorId": "instructor-123",
    "createdAt": "2025-06-01T12:00:00.000Z",
    "updatedAt": "2025-06-01T12:00:00.000Z",
    "instructor": {
      "id": "instructor-123",
      "fullName": "Nama Instruktur"
    },
    "enrollments": [
      {
        "student": {
          "id": "student-1",
          "fullName": "Siswa 1"
        }
      }
    ],
    "assignments": [
      {
        "id": "assignment-1",
        "title": "Tugas 1",
        "deadline": "2025-06-10T23:59:59.000Z",
        "active": true
      }
    ],
    "currentUserEnrollment": {
      "id": "enrollment-xyz",
      "joinedAt": "2025-06-01T12:00:00.000Z"
    }
  }
]
```

---

### 4. GET `/classes/:id`

**Fungsi:**  
Mengambil detail sebuah kelas.

**Body:**  
Tidak ada.

**Response Sukses (200):**

```json
{
  "id": "class-abc",
  "name": "Kelas Kalkulus",
  "description": "Kelas untuk mata kuliah Kalkulus",
  "classToken": "8charToken",
  "instructorId": "instructor-123",
  "createdAt": "2025-06-01T12:00:00.000Z",
  "updatedAt": "2025-06-01T12:00:00.000Z",
  "instructor": {
    "id": "instructor-123",
    "fullName": "Nama Instruktur"
  },
  "enrollments": [
    { "student": { "id": "student-1", "fullName": "Siswa 1" } },
    { "student": { "id": "student-2", "fullName": "Siswa 2" } }
  ],
  "assignments": [
    {
      "id": "assignment-1",
      "title": "Tugas 1",
      "instructions": "Kerjakan soal halaman 50.",
      "deadline": "2025-06-10T23:59:59.000Z",
      "active": true,
      "createdAt": "2025-06-01T12:00:00.000Z"
    }
  ],
  "currentUserEnrollment": {
    "id": "enrollment-xyz",
    "joinedAt": "2025-06-01T12:00:00.000Z"
  }
}
```

---

### 5. GET `/classes/preview/:classToken`

**Fungsi:**  
Preview informasi kelas sebelum bergabung (public endpoint, tidak perlu autentikasi).

**Body:**  
Tidak ada.

**Response Sukses (200):**

```json
{
  "id": "class-abc",
  "name": "Kelas Kalkulus",
  "description": "Kelas untuk mata kuliah Kalkulus",
  "instructor": {
    "id": "instructor-123",
    "fullName": "Dr. Ahmad Suharto",
    "institution": "Universitas Indonesia"
  },
  "studentsCount": 25,
  "assignmentsCount": 3,
  "createdAt": "2025-06-01T12:00:00.000Z"
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
- Token kelas (`classToken`) digunakan untuk join dan preview kelas.
- Endpoint preview tidak memerlukan autentikasi.

---

**Referensi kode:** [`ClassesController`](src/classes/classes.controller.ts)
