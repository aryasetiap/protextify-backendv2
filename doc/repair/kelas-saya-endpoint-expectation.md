# Analisis Endpoint untuk Student Dashboard - Classes Page

## 1. GET /classes

**Tujuan:** Mengambil daftar semua kelas yang diikuti oleh student untuk ditampilkan dalam grid kelas

**Metode:** `GET`

**File Pemanggilan:**

- Classes.jsx (line 28)
- classes.js (line 5)
- useAsyncData.js

**Struktur Response yang Diharapkan:**

```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "createdAt": "ISO date string",
    "instructor": {
      "id": "string",
      "fullName": "string"
    },
    "assignments": [
      {
        "id": "string",
        "title": "string",
        "deadline": "ISO date string",
        "active": "boolean"
      }
    ],
    "enrollments": [
      {
        "student": {
          "id": "string",
          "fullName": "string"
        }
      }
    ],
    "currentUserEnrollment": {
      "id": "string",
      "joinedAt": "ISO date string"
    }
  }
]
```

## 2. GET /classes/:id

**Tujuan:** Mengambil detail kelas tertentu ketika user mengklik tombol "Detail" pada ClassCard

**Metode:** `GET`

**File Pemanggilan:**

- Classes.jsx (line 265 - navigate action)
- classes.js (line 60)
- StudentClassDetail.jsx (line 39)

**Struktur Response yang Diharapkan:**

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "createdAt": "ISO date string",
  "instructor": {
    "id": "string",
    "fullName": "string"
  },
  "assignments": [
    {
      "id": "string",
      "title": "string",
      "instructions": "string",
      "deadline": "ISO date string",
      "active": "boolean",
      "createdAt": "ISO date string"
    }
  ],
  "enrollments": [
    {
      "student": {
        "id": "string",
        "fullName": "string"
      }
    }
  ],
  "currentUserEnrollment": {
    "id": "string",
    "joinedAt": "ISO date string"
  }
}
```

## 3. GET /classes/:classId/assignments

**Tujuan:** Mengambil daftar tugas dalam kelas tertentu ketika user mengklik tombol "Tugas" atau navigasi assignments

**Metode:** `GET`

**File Pemanggilan:**

- Classes.jsx (line 273-277 - button action)
- classes.js (belum diimplementasi di service, tapi dibutuhkan)

**Struktur Response yang Diharapkan:**

```json
[
  {
    "id": "string",
    "title": "string",
    "instructions": "string",
    "deadline": "ISO date string",
    "classId": "string",
    "active": "boolean",
    "expectedStudentCount": "number",
    "createdAt": "ISO date string",
    "updatedAt": "ISO date string",
    "submissions": [
      {
        "id": "string",
        "studentId": "string",
        "status": "DRAFT | SUBMITTED | GRADED"
      }
    ],
    "_count": {
      "submissions": "number"
    }
  }
]
```

## 4. POST /classes/join

**Tujuan:** Bergabung ke kelas baru menggunakan token (redirect dari Join Class page)

**Metode:** `POST`

**File Pemanggilan:**

- Classes.jsx (line 97 - button navigation)
- JoinClass.jsx (referenced)
- classes.js (line 75)

**Request Body:**

```json
{
  "classToken": "string"
}
```

**Struktur Response yang Diharapkan:**

```json
{
  "message": "Successfully joined class",
  "class": {
    "id": "string",
    "name": "string",
    "description": "string",
    "instructorId": "string",
    "classToken": "string"
  }
}
```

## 5. GET /classes/preview/:classToken

**Tujuan:** Preview informasi kelas sebelum bergabung (untuk validasi token di Join Class)

**Metode:** `GET`

**File Pemanggilan:**

- classes.js (line 85)
- JoinClass.jsx (referenced untuk preview)

**Struktur Response yang Diharapkan:**

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "instructor": {
    "id": "string",
    "fullName": "string",
    "institution": "string"
  },
  "studentsCount": "number",
  "assignmentsCount": "number",
  "createdAt": "ISO date string"
}
```

## Pemrosesan Tambahan yang Dilakukan FE:

### 1. Computed Fields dalam ClassCard:

- **studentsCount**: Dihitung dari `classData.enrollments.length`
- **assignmentsCount**: Dihitung dari `classData.assignments.length`
- **activeAssignments**: Filter assignments dengan `active: true`
- **instructorName**: Fallback ke "Instruktur" jika `classData.instructor?.fullName` tidak ada
- **joinedDate**: Prioritas `currentUserEnrollment.joinedAt` > `createdAt`

### 2. Data Transformation dalam classes.js:

- Mapping response untuk memastikan struktur konsisten
- Fallback handling untuk field yang mungkin `null/undefined`
- Array validation untuk `assignments` dan `enrollments`

### 3. Navigation Logic:

- Filter assignments aktif untuk enable/disable tombol "Tugas"
- Conditional rendering berdasarkan jumlah assignments
- State management untuk success message dari join class

### 4. Display Logic:

- Formatting tanggal menggunakan `formatDate()` helper
- Conditional styling untuk new class indicator
- Responsive grid layout untuk class cards

## Endpoint Tambahan yang Mungkin Dibutuhkan:

### 6. GET /assignments/recent (untuk Dashboard)

**Tujuan:** Mengambil recent assignments untuk ditampilkan di dashboard overview

### 7. GET /submissions/history (untuk Dashboard)

**Tujuan:** Mengambil riwayat submissions student untuk statistik

### 8. WebSocket Events

**Tujuan:** Real-time updates untuk status kelas dan assignments

- `classUpdated`
- `assignmentCreated`
- `enrollmentUpdated`

---

**Catatan Implementasi:**

- Semua endpoint memerlukan authentication dengan JWT Bearer token
- Response harus konsisten dengan struktur di atas untuk kompatibilitas FE
- Field `currentUserEnrollment` penting untuk menentukan status user dalam kelas
- Field `active` pada assignments menentukan visibility untuk student
