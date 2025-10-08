# 💾 Dokumentasi Lengkap Modul Storage

Modul Storage menangani file upload, pre-signed URL, dan monitoring status storage.

---

## 🔐 Autentikasi

Sebagian besar endpoint membutuhkan JWT Bearer Token:

```
Authorization: Bearer <your-jwt-token>
```

---

## ✨ Daftar Endpoint

### 1. GET `/storage/health`

**Fungsi:**  
Cek status kesehatan layanan storage dan cloud provider.

**Body:**  
Tidak ada.

**Response Sukses (200):**

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

---

### 2. GET `/storage/refresh-url/:cloudKey`

**Fungsi:**  
Generate pre-signed URL baru untuk file di cloud storage.

**Query Parameters:**

- `filename`: string (required) — Nama file asli untuk download
- `expires`: string (optional, default: 3600) — Waktu kadaluarsa URL (detik, min: 60, max: 86400)

**Body:**  
Tidak ada.

**Response Sukses (200):**

```json
{
  "url": "https://r2.cloudflare.com/presigned-url",
  "expiresIn": 7200,
  "expiresAt": "2025-06-01T14:00:00.000Z"
}
```

---

### 3. POST `/storage/upload`

**Fungsi:**  
Upload file attachment untuk assignment atau submission.

**Content-Type:** `multipart/form-data`

**Body:**

- `file`: binary (PDF, DOC, DOCX, JPG, PNG, ZIP) — File yang di-upload
- `assignmentId`: string (optional)
- `submissionId`: string (optional)
- `description`: string (optional)

**Response Sukses (201):**

```json
{
  "id": "file-abc123",
  "filename": "document.pdf",
  "size": 1234567,
  "mimeType": "application/pdf",
  "cloudKey": "attachments/file-abc123.pdf",
  "uploadedAt": "2025-06-01T12:00:00.000Z"
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
- File yang didukung: PDF, DOC, DOCX (max 10MB), JPG, PNG (max 5MB), ZIP (max 20MB).
- Endpoint upload membutuhkan autentikasi JWT.
- Endpoint health tidak membutuhkan autentikasi.

---

**Referensi kode:** [`StorageController`](src/storage/storage.controller.ts)
