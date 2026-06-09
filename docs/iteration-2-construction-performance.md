# Laporan Teknis Construction Iterasi Kedua

## Ringkasan Dasar Perbaikan

Perbaikan Iterasi Kedua dilakukan berdasarkan hasil performance testing Iterasi Pertama uji ulang VU-adjusted. Seluruh skenario Iterasi Pertama lolos dari sisi reliabilitas karena `checks` mencapai 100,00% dan `http_req_failed` 0,00%, sehingga tidak ditemukan bottleneck kritis pada level infrastruktur.

Temuan utama berada pada level endpoint. Endpoint `GET /api/classes/:classId/history` atau `class_history` beberapa kali muncul sebagai endpoint dengan p95 tertinggi, terutama pada load testing. Endpoint terkait yang juga dicermati adalah `class_assignments`, `class_detail`, `submission_detail`, dan `student_submission_history`. Karena resource VPS tidak menunjukkan saturasi berat, perbaikan difokuskan pada query, payload response, dan index database secara terbatas.

## File Yang Diperiksa

- `src/submissions/submissions.controller.ts`: mendefinisikan endpoint submission, termasuk `GET /api/classes/:classId/history`, `GET /api/submissions/:id`, dan `GET /api/submissions/history`.
- `src/submissions/submissions.service.ts`: berisi query Prisma dan logika akses data untuk submission, history kelas, detail submission, serta student history.
- `src/submissions/dto/get-class-history.dto.ts`: mendefinisikan query parameter history seperti `page`, `limit`, `status`, `sortBy`, dan `sortOrder`.
- `src/classes/classes.controller.ts`: mendefinisikan endpoint `GET /api/classes` dan `GET /api/classes/:id`.
- `src/classes/classes.service.ts`: berisi query Prisma untuk class list, class detail, dan activity feed.
- `src/assignments/assignments.controller.ts`: mendefinisikan endpoint `GET /api/classes/:classId/assignments` dan `GET /api/assignments/:id`.
- `src/assignments/assignments.service.ts`: berisi query Prisma untuk assignment list, recent assignment, detail assignment, analytics, dan submissions overview.
- `prisma/schema.prisma`: mendefinisikan model database dan index yang dipakai Prisma.
- `test/thesis-functional.e2e-spec.ts`: memvalidasi endpoint utama tetap berjalan setelah perubahan.
- `tests/performance/k6/*.js`: memastikan skenario performance tetap read-heavy dan tidak mengubah skenario Iterasi Pertama.

## File Yang Diubah

- `src/submissions/submissions.service.ts`: optimasi query `class_history`, clamp pagination, dan logging durasi endpoint terbatas.
- `src/classes/classes.service.ts`: mengganti query `class_detail` dari `include` luas menjadi `select` eksplisit.
- `src/assignments/assignments.service.ts`: mengganti query assignment list dan assignment detail menjadi `select` eksplisit untuk menghindari pengambilan field besar yang tidak diperlukan.
- `prisma/schema.prisma`: menambahkan index terbatas untuk lookup class dan enrollment.
- `prisma/migrations/20260609000000_add_iteration2_class_lookup_indexes/migration.sql`: migration index database untuk Iterasi Kedua.
- `scripts/performance/run-iteration-2-vu-adjusted.ps1`: runner manual performance testing Iterasi Kedua dengan konfigurasi VU yang sama seperti Iterasi Pertama rerun.
- `scripts/performance/compare_iteration1_rerun_vs_iteration2.py`: script pembanding otomatis setelah hasil Iterasi Kedua tersedia.
- `package.json`: menambahkan script npm untuk runner Iterasi Kedua.
- `scripts/monitoring/*`: menambahkan label `iteration-2-vu-adjusted` pada allowlist result/capture.

## Detail Perubahan Backend

### `GET /api/classes/:classId/history`

Sebelum perubahan, filter default menggunakan relation filter `assignment: { classId }`. Meskipun response sudah menggunakan `select`, pola filter tersebut tetap berpotensi membuat database melakukan join pada assignment untuk mengambil submission history kelas.

Setelah perubahan, service memvalidasi kepemilikan kelas sekaligus mengambil daftar `assignment.id`, lalu query submission menggunakan `assignmentId: { in: assignmentIds }`. Pola ini lebih langsung memanfaatkan index `Submission_assignmentId_updatedAt_idx` yang sudah ada. Pagination juga diclamp secara defensif agar `page` minimal 1 dan `limit` maksimal 100, sesuai DTO.

Perubahan ini backward compatible karena struktur response tetap berisi `data`, `page`, `limit`, `total`, dan `totalPages`. Query parameter lama tetap didukung.

### `GET /api/classes/:id`

Sebelum perubahan, `class_detail` menggunakan `include` untuk mengambil relasi class, instructor, enrollments, student, dan assignments.

Setelah perubahan, query menggunakan `select` eksplisit untuk field class, instructor, enrollment, student, dan assignment yang dibutuhkan response. Tujuannya menghindari payload tidak perlu dan membuat query lebih jelas.

Perubahan ini backward compatible karena field utama yang sudah digunakan pada response tetap dikembalikan.

### `GET /api/classes/:classId/assignments`

Sebelum perubahan, query assignment list mengambil assignment dengan `include` relasi submissions dan `_count`. Submissions sudah memakai `select`, tetapi field assignment utama belum dibatasi secara eksplisit.

Setelah perubahan, assignment list memakai `select` eksplisit untuk field assignment utama, submissions ringkas, dan `_count`. Field besar di submission seperti `content`, `feedback`, attachment, dan plagiarism raw response tidak diambil.

Perubahan ini backward compatible untuk kebutuhan list karena struktur assignment, `submissions`, dan `_count` tetap ada.

### `GET /api/assignments/:id`

Sebelum perubahan, detail assignment memakai `include: { submissions: true }`, sehingga seluruh field submission dapat ikut terbawa, termasuk field besar seperti `content` dan `feedback`.

Setelah perubahan, detail assignment memakai `select` eksplisit pada assignment dan submissions ringkas. Field besar submission tidak diambil pada endpoint detail assignment karena endpoint performance hanya membutuhkan metadata assignment dan ringkasan submissions.

Perubahan ini berisiko rendah, tetapi tetap perlu divalidasi terhadap frontend jika ada halaman yang sebelumnya membaca `content` dari submissions di assignment detail.

## Detail Optimasi Query

- Query `getClassHistory` dioptimasi dari nested relation filter menjadi filter langsung `assignmentId in (...)`.
- `getClassHistory` tetap menggunakan `select` eksplisit dan tidak mengambil `Submission.content`, `Submission.feedback`, `PlagiarismCheck.rawResponse`, attachments, atau metadata file besar.
- Pagination `page` dan `limit` tetap tersedia dan diclamp secara aman.
- `getClassDetail`, `getAssignments`, dan `getAssignmentDetail` memakai `select` eksplisit.
- `_count` tetap digunakan pada assignment list/detail untuk jumlah submissions tanpa mengambil seluruh data hanya untuk counting.
- Tidak ada perubahan pada logic bisnis grading, submission, upload, payment, atau WinstonAI.

## Detail Perubahan Database

Ada perubahan schema database terbatas:

- `Class_instructorId_idx` pada `Class.instructorId`.
  Index ini membantu lookup class milik instructor, termasuk validasi kepemilikan class pada endpoint history dan class-related endpoint.
- `ClassEnrollment_classId_idx` pada `ClassEnrollment.classId`.
  Index ini membantu pengambilan daftar enrollment berdasarkan class pada endpoint class detail.

Index yang sudah ada dan tetap digunakan:

- `Assignment_classId_idx`
- `Submission_assignmentId_updatedAt_idx`
- `Submission_studentId_updatedAt_idx`
- `Submission_status_updatedAt_idx`

Tidak ada constraint baru dan tidak ada perubahan struktur tabel yang mengubah data existing.

## Detail Logging atau Observability

Logging performa ringan ditambahkan pada `getClassHistory`.

Log berisi:

- nama event `performance_endpoint_timing`;
- endpoint `class_history`;
- durasi eksekusi dalam ms;
- `classId`;
- `page`;
- `limit`;
- total data;
- jumlah data yang dikembalikan.

Logging hanya aktif ketika `NODE_ENV` bukan `production`. Log tidak mencetak token, password, request body, content submission, feedback, raw response WinstonAI, atau data rahasia.

## Validasi Setelah Perubahan

Functional testing yang perlu dijalankan:

```bash
npm run thesis:test:functional
```

Jika menggunakan Postman/Newman:

```bash
npm run test:postman:iteration1
```

Performance testing Iterasi Kedua belum boleh disimpulkan sebelum pengujian ulang dilakukan dengan label `iteration-2-vu-adjusted`. Perubahan ini hanya menjelaskan tahap Construction Iterasi Kedua.

## Risiko Perubahan dan Rollback

Risiko utama:

- Frontend tertentu mungkin membaca field submission besar dari `GET /api/assignments/:id` yang sekarang tidak lagi dikirim pada list submissions ringkas.
- Query `class_history` dengan `sortBy=studentName` atau `sortBy=assignmentTitle` tetap membutuhkan relation ordering, sehingga optimasi paling besar berlaku pada default sort `updatedAt`.
- Index baru menambah sedikit overhead write, tetapi endpoint write bukan fokus beban utama dan jumlah index yang ditambahkan terbatas.

Rollback:

- Kembalikan perubahan pada service yang diubah.
- Revert migration `20260609000000_add_iteration2_class_lookup_indexes` jika index perlu dihapus.
- Hapus runner/documentation tambahan jika tidak digunakan.

## Instruksi Performance Testing Iterasi Kedua

Folder hasil:

```text
results/performance/iteration-2-vu-adjusted
```

Command laptop/Git Bash:

```bash
export BASE_URL="http://103.55.37.96:3000"
export TEST_USER_PASSWORD="ISI_PASSWORD_TEST_USER"

npm run thesis:results:prepare -- -Label iteration-2-vu-adjusted

npm run thesis:k6:iteration2:vu-adjusted -- -Scenario smoke -BaseUrl "$BASE_URL"
npm run thesis:k6:iteration2:vu-adjusted -- -Scenario load -BaseUrl "$BASE_URL"
npm run thesis:k6:iteration2:vu-adjusted -- -Scenario stress -BaseUrl "$BASE_URL"
npm run thesis:k6:iteration2:vu-adjusted -- -Scenario spike -BaseUrl "$BASE_URL"
npm run thesis:k6:iteration2:vu-adjusted -- -Scenario endurance -BaseUrl "$BASE_URL"
```

WinstonAI real tidak digunakan. Backend harus memakai:

```text
WINSTON_AI_MODE=mock
PLAGIARISM_REPORT_MODE=metadata
```

Setelah semua hasil Iterasi Kedua tersedia, jalankan:

```bash
python scripts/performance/compare_iteration1_rerun_vs_iteration2.py
```

Output pembanding dibuat ke:

```text
results/performance/comparison-iteration1-vs-iteration2
```

## Rekomendasi Narasi Skripsi

### 4.2 Iterasi Kedua

Iterasi Kedua dilakukan sebagai tindak lanjut dari hasil performance testing Iterasi Pertama. Hasil Iterasi Pertama menunjukkan bahwa seluruh skenario pengujian berhasil memenuhi ambang batas reliabilitas, namun terdapat potensi bottleneck ringan pada beberapa endpoint internal, terutama endpoint riwayat submission kelas. Oleh karena itu, Iterasi Kedua difokuskan pada perbaikan terbatas di level query dan payload response tanpa mengubah arsitektur utama backend.

### 4.2.1 Construction

Pada tahap construction Iterasi Kedua, perbaikan dilakukan pada endpoint yang berkaitan langsung dengan hasil analisis Iterasi Pertama. Endpoint `GET /api/classes/:classId/history` dioptimasi dengan filter berbasis `assignmentId` dan penggunaan `select` eksplisit agar database tidak mengambil field besar yang tidak diperlukan. Endpoint terkait class dan assignment juga disesuaikan agar query lebih eksplisit dan payload yang dikembalikan tetap relevan dengan kebutuhan frontend. Selain itu, ditambahkan index terbatas pada field yang digunakan untuk lookup class dan enrollment. Perubahan ini bersifat terbatas, backward compatible untuk struktur response utama, serta tidak mengubah logic bisnis, skenario pengujian, maupun integrasi WinstonAI.

Hasil performance testing Iterasi Kedua belum dibahas pada subbab ini karena pengujian ulang harus dilakukan terlebih dahulu pada tahap berikutnya.
