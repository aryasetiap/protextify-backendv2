# 📦 Dokumentasi Lengkap Modul Auth

Modul Auth menangani autentikasi, otorisasi, dan manajemen akun pengguna (student & instructor).

---

## 🔐 Autentikasi

Semua endpoint yang memerlukan autentikasi menggunakan JWT Bearer Token:

```
Authorization: Bearer <your-jwt-token>
```

---

## ✨ Daftar Endpoint

### 1. POST `/auth/register`

**Fungsi:**  
Mendaftarkan user baru (student/instructor) dan mengirim email verifikasi.

**Body:**

```json
{
  "email": "student@example.com",
  "password": "password123",
  "fullName": "Student Name",
  "role": "STUDENT",
  "institution": "Universitas Protextify"
}
```

**Response Sukses (201):**

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

---

### 2. POST `/auth/login`

**Fungsi:**  
Login dengan email dan password, mengembalikan JWT access token dan data user.

**Body:**

```json
{
  "email": "student@example.com",
  "password": "password123"
}
```

**Response Sukses (200):**

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

---

### 3. POST `/auth/send-verification`

**Fungsi:**  
Mengirim email verifikasi ke user.

**Body:**

```json
{
  "email": "student@example.com"
}
```

**Response Sukses (200):**

```json
{
  "message": "Verification email sent"
}
```

---

### 4. POST `/auth/verify-email`

**Fungsi:**  
Verifikasi email menggunakan token.

**Body:**

```json
{
  "token": "verification_token_123"
}
```

**Response Sukses (200):**

```json
{
  "message": "Email verified successfully"
}
```

---

### 5. GET `/auth/google`

**Fungsi:**  
Redirect ke halaman login Google OAuth.

**Body:**  
Tidak ada.

**Response Sukses (302):**  
Redirect ke Google login.

---

### 6. GET `/auth/google/callback`

**Fungsi:**  
Callback setelah login Google. Mendukung dua format response:

- Redirect ke frontend dengan token di URL.
- Response JSON jika query `?format=json`.

**Body:**  
Tidak ada.

**Response Sukses (302):**  
Redirect ke frontend:  
`<FRONTEND_URL>/auth/callback?token=<jwt.token.here>`

**Response Sukses (200) [format=json]:**

```json
{
  "accessToken": "jwt.token.here",
  "user": {
    "id": "user-123",
    "email": "google@example.com",
    "fullName": "Google User",
    "role": "STUDENT",
    "institution": null,
    "emailVerified": true,
    "createdAt": "2025-06-01T12:00:00.000Z",
    "updatedAt": "2025-06-01T12:00:00.000Z"
  }
}
```

---

### 7. POST `/auth/forgot-password`

**Fungsi:**  
Mengirim link reset password ke email user.

**Body:**

```json
{
  "email": "student@example.com"
}
```

**Response Sukses (200):**

```json
{
  "message": "Reset password link sent to your email"
}
```

---

### 8. POST `/auth/reset-password`

**Fungsi:**  
Reset password menggunakan token dari email.

**Body:**

```json
{
  "token": "reset_token_123",
  "newPassword": "newPassword123"
}
```

**Response Sukses (200):**

```json
{
  "message": "Password reset successful"
}
```

---

### 9. GET `/auth/instructor-only`

**Fungsi:**  
Endpoint khusus untuk user dengan role INSTRUCTOR.

**Body:**  
Tidak ada.

**Response Sukses (200):**

```json
{
  "message": "Only instructor can access this!"
}
```

---

### 10. GET `/auth/google/user`

**Fungsi:**  
Mengambil data user setelah login Google (JWT required).

**Body:**  
Tidak ada.

**Response Sukses (200):**

```json
{
  "accessToken": "jwt.token.here",
  "user": {
    "id": "user-123",
    "email": "google@example.com",
    "fullName": "Google User",
    "role": "STUDENT",
    "institution": null,
    "emailVerified": true,
    "createdAt": "2025-06-01T12:00:00.000Z",
    "updatedAt": "2025-06-01T12:00:00.000Z"
  }
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
- Endpoint Google OAuth membutuhkan konfigurasi environment variable `FRONTEND_URL`.

---

**Referensi kode:** [`AuthController`](src/auth/auth.controller.ts)
