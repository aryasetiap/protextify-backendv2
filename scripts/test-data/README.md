# Test Data Scripts

Folder ini berisi script setup dan cleanup data uji skripsi.

Script yang tersedia:

- `setup-test-data.ts`
- `cleanup-test-data.ts`

Aturan utama:

- memakai data dummy;
- idempotent;
- hanya menyentuh data dengan prefix `thesis-perf` / `THESIS_PERF`;
- tidak menghapus data asli;
- tidak menampilkan secret;
- menolak berjalan pada `NODE_ENV=production`.
