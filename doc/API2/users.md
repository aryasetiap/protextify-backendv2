# 👤 Dokumentasi Lengkap Modul Users

Modul Users menangani pengambilan dan update data profil user (student & instructor).

---

## 🔐 Autentikasi

Semua endpoint membutuhkan JWT Bearer Token:

```
Authorization: Bearer <your-jwt-token>
```

---

## ✨ Daftar Endpoint

### 1. GET `/users/me`

**Fungsi:**  
Mengambil data profil user yang sedang login.

**Body:**  
Tidak ada.

**Response Sukses (200):**

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

**Response Error (401):**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

### 2. PATCH `/users/me`

**Fungsi:**  
Update data profil user yang sedang login (fullName, institution).

**Body:**

```json
{
  "fullName": "Nama Baru",
  "institution": "Universitas Protextify"
}
```

_Semua field optional, bisa update salah satu atau keduanya._

**Response Sukses (200):**

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

**Response Error (404):**

```json
{
  "statusCode": 404,
  "message": "User not found"
}
```

**Response Error (401):**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
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
- Endpoint hanya bisa diakses oleh user yang sudah login (JWT valid).

---

**Referensi kode:** [`UsersController`](src/users/users.controller.ts)
