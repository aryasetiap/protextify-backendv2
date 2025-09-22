# Struktur Direktori Proyek NestJS + Prisma

Struktur ini dirancang untuk **skalabilitas** dan **keterbacaan**, dengan memisahkan setiap fitur utama ke dalam modulnya sendiri.

```
/protextify-backend
│
├── prisma/
│   ├── schema.prisma          # Skema database utama Prisma
│   └── migrations/            # Direktori migrasi database
│
├── src/
│   ├── auth/                  # Modul autentikasi
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── register.dto.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── google.strategy.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   └── auth.service.ts
│   │
│   ├── users/                 # Modul manajemen pengguna
│   │   ├── dto/
│   │   │   └── update-user.dto.ts
│   │   ├── users.controller.ts
│   │   ├── users.module.ts
│   │   └── users.service.ts
│   │
│   ├── classes/               # Modul manajemen kelas
│   │   ├── dto/
│   │   ├── classes.controller.ts
│   │   ├── classes.module.ts
│   │   └── classes.service.ts
│   │
│   ├── assignments/           # Modul manajemen tugas
│   │
│   ├── submissions/           # Modul submission tugas
│   │
│   ├── payments/              # Modul pembayaran (Midtrans)
│   │   ├── dto/
│   │   │   └── webhook.dto.ts
│   │   ├── payments.controller.ts
│   │   ├── payments.module.ts
│   │   └── payments.service.ts
│   │
│   ├── plagiarism/            # Modul integrasi Winston AI
│   │   ├── plagiarism.module.ts
│   │   ├── plagiarism.service.ts   # Mengelola antrian (queue)
│   │   └── plagiarism.processor.ts # Worker BullMQ untuk cek plagiarisme
│   │
│   ├── email/                 # Modul email service (verifikasi, notifikasi)
│   │   ├── email.module.ts
│   │   ├── email.service.ts
│   │   └── templates/         # Template email (HTML/TXT)
│   │
│   ├── storage/               # Modul file storage/cloud integration
│   │   ├── storage.module.ts
│   │   ├── storage.service.ts
│   │   └── providers/         # Integrasi AWS S3, GCS, Cloudinary
│   │
│   ├── realtime/              # Modul WebSocket
│   │   ├── realtime.gateway.ts     # Event auto-save, notifikasi
│   │   └── events.ts              # Definisi struktur payload event WebSocket
│   │
│   ├── common/                # Kode yang di-share
│   │   ├── decorators/
│   │   ├── filters/                # Exception filters
│   │   ├── logger/                 # Logger terstruktur (Winston/Pino)
│   │   └── middleware/             # Middleware (helmet, throttler)
│   │
│   ├── config/                # Konfigurasi aplikasi (env variables)
│   │   └── config.ts
│   │
│   ├── prisma/                # Service khusus Prisma Client
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── app.controller.ts
│   ├── app.module.ts          # Root module
│   ├── app.service.ts
│   └── main.ts                # Entry point aplikasi
│
├── .env                       # Environment variables (JANGAN di-commit)
├── .eslintrc.js
├── .prettierrc
├── docker-compose.yml         # Setup development (Postgres, Redis)
├── Dockerfile
├── nest-cli.json
├── package.json
└── tsconfig.json
```

---

### Tips Visualisasi

- **Setiap modul** memiliki folder sendiri untuk menjaga kode tetap terorganisir.
- **Folder `common/`** digunakan untuk kode yang dapat digunakan lintas modul.
- **File konfigurasi** seperti `.env`, `docker-compose.yml`, dan `Dockerfile` berada di root untuk kemudahan akses.
- **Komentar** pada setiap baris membantu memahami fungsi file/folder.

---

> Struktur ini memudahkan pengembangan, pemeliharaan, dan kolaborasi tim pada proyek NestJS berskala besar.
> Event WebSocket (`realtime/events.ts`) adalah bagian penting integrasi frontend-backend untuk fitur auto-save, notifikasi, dan monitoring submission.
> ℹ️ Untuk detail request/response schema setiap endpoint dan event, silakan lihat langsung di Swagger API Docs pada aplikasi backend.
