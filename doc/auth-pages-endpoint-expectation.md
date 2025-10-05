### POST /auth/login

**Expected Response (FE):**

```json
{
  "accessToken": "string",
  "user": {
    "id": "string",
    "email": "string",
    "fullName": "string",
    "role": "STUDENT | INSTRUCTOR",
    "institution": "string",
    "emailVerified": true,
    "createdAt": "ISO date string",
    "updatedAt": "ISO date string"
  }
}
```

**Used for:**

- Menyimpan `accessToken` di localStorage untuk autentikasi selanjutnya.
- Menyimpan data `user` di context/state untuk navigasi dan personalisasi dashboard.

---

### POST /auth/register

**Expected Response (FE):**

```json
{
  "message": "Registration successful, verification email sent",
  "user": {
    "id": "string",
    "email": "string",
    "fullName": "string",
    "role": "STUDENT | INSTRUCTOR",
    "institution": "string",
    "emailVerified": false,
    "createdAt": "ISO date string",
    "updatedAt": "ISO date string"
  }
}
```

**Used for:**

- Menampilkan notifikasi sukses registrasi.
- Redirect ke halaman verifikasi email.
- Tidak menyimpan token, hanya data user untuk feedback.

---

### POST /auth/verify-email

**Expected Response (FE):**

```json
{
  "message": "Email verified successfully"
}
```

**Used for:**

- Menampilkan notifikasi sukses verifikasi email.
- Redirect ke halaman login.

---

### POST /auth/send-verification

**Expected Response (FE):**

```json
{
  "message": "Verification email sent"
}
```

**Used for:**

- Menampilkan notifikasi bahwa email verifikasi telah dikirim ulang.

---

### GET /auth/google/callback

**Expected Response (FE):**

```json
{
  "accessToken": "string",
  "user": {
    "id": "string",
    "email": "string",
    "fullName": "string",
    "role": "STUDENT | INSTRUCTOR",
    "institution": "string",
    "emailVerified": true,
    "createdAt": "ISO date string",
    "updatedAt": "ISO date string"
  }
}
```

**Used for:**

- Menyimpan `accessToken` di localStorage.
- Menyimpan data `user` di context/state.
- Redirect ke dashboard sesuai role.

**Catatan:**  
FE menerima token dari URL parameter, lalu memanggil `/users/me` untuk mendapatkan data user.

---

### GET /users/me

**Expected Response (FE):**

```json
{
  "id": "string",
  "email": "string",
  "fullName": "string",
  "role": "STUDENT | INSTRUCTOR",
  "institution": "string",
  "emailVerified": true,
  "createdAt": "ISO date string",
  "updatedAt": "ISO date string"
}
```

**Used for:**

- Menyimpan data user di context/state setelah login Google atau refresh halaman.

---

### POST /auth/forgot-password

**Expected Response (FE):**

```json
{
  "message": "Reset password link sent to your email"
}
```

**Used for:**

- Menampilkan notifikasi sukses permintaan reset password.

---

### POST /auth/reset-password

**Expected Response (FE):**

```json
{
  "message": "Password reset successful"
}
```

**Used for:**

- Menampilkan notifikasi sukses reset password.
- Redirect ke halaman login.

---

### **Catatan Perbedaan/Perlu Penyesuaian**

- Pastikan field `accessToken` konsisten di semua endpoint login (bukan hanya `token`).
- Field `user` harus lengkap: `id`, `email`, `fullName`, `role`, `institution`, `emailVerified`, `createdAt`, `updatedAt`.
- Semua endpoint yang mengirim pesan sukses harus punya field `message` yang jelas untuk feedback FE.
