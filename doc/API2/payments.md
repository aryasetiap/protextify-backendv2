# 💳 Dokumentasi Lengkap Modul Payments

Modul Payments menangani transaksi pembayaran (Midtrans), webhook notifikasi, dan riwayat transaksi instruktur.

---

## 🔐 Autentikasi

Sebagian besar endpoint membutuhkan JWT Bearer Token:

```
Authorization: Bearer <your-jwt-token>
```

---

## ✨ Daftar Endpoint

### 1. POST `/payments/create-transaction`

**Fungsi:**  
Membuat transaksi pembayaran untuk aktivasi assignment atau top-up kredit.  
Mengembalikan Snap token dan payment URL dari Midtrans.

**Body:**

```json
{
  "amount": 25000,
  "assignmentId": "assignment-xyz"
}
```

atau untuk top-up kredit:

```json
{
  "amount": 50000
}
```

**Response Sukses (201):**

```json
{
  "transactionId": "trans-1",
  "snapToken": "snap-token-xyz",
  "paymentUrl": "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-xyz",
  "status": "PENDING"
}
```

---

### 2. POST `/payments/webhook`

**Fungsi:**  
Endpoint untuk menerima notifikasi status pembayaran dari Midtrans.  
Validasi signature dan update status transaksi/assignment.

**Body:**

```json
{
  "order_id": "PROTEXTIFY-1234567890-abc123",
  "transaction_status": "settlement",
  "signature_key": "valid_signature",
  "status_code": "200",
  "gross_amount": "25000.00",
  "fraud_status": "accept"
}
```

**Response Sukses (200):**

```json
{
  "message": "Webhook processed successfully"
}
```

---

### 3. GET `/payments/transactions`

**Fungsi:**  
Mengambil riwayat transaksi pembayaran instruktur (dengan pagination & filter).

**Query Parameters (opsional):**

- `page`: number (default: 1)
- `limit`: number (default: 10)
- `status`: string (misal: "SUCCESS")
- `startDate`: string (format: YYYY-MM-DD)
- `endDate`: string (format: YYYY-MM-DD)
- `assignmentId`: string

**Body:**  
Tidak ada.

**Response Sukses (200):**

```json
{
  "data": [
    {
      "id": "transaction-id",
      "orderId": "PROTEXTIFY-xxx",
      "amount": 25000,
      "status": "SUCCESS",
      "paymentMethod": "bank_transfer",
      "createdAt": "2025-01-XX",
      "assignment": {
        "id": "assignment-id",
        "title": "Assignment Title",
        "class": { "name": "Class Name" }
      },
      "expectedStudentCount": 10
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 50,
  "totalPages": 5
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
- Endpoint webhook tidak memerlukan autentikasi (khusus Midtrans).
- Snap token dan payment URL digunakan untuk proses pembayaran di frontend.

---

**Referensi kode:** [`PaymentsController`](src/payments/payments.controller.ts)
