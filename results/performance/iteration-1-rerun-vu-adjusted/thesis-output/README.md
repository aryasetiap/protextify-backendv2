# Thesis Output Performance Testing Iterasi Pertama

## Sumber Input

Script ini membaca file hasil k6 dari:

```text
D:/00_WORKSPACE/01_ACTIVE_PROJECTS/PROTEXTIFY/protextify-backendv2/results/performance/iteration-1-rerun-vu-adjusted
```

Input yang digunakan meliputi `*-summary.json`, `*-summary.txt`, `*-endpoint-metrics.csv`, dan raw JSON k6 jika tersedia di folder tersebut. Endpoint `auth_login` dikeluarkan dari Tabel 4.57 karena login hanya digunakan pada fase setup untuk memperoleh token dan bukan bagian dari beban utama read-heavy.

## Output

Folder ini berisi tabel CSV/Markdown, grafik PNG 300 dpi, template resource monitoring VPS, dan narasi hasil untuk Bab IV subbab 4.1.4.3.

## Cara Menjalankan

Dari root project:

```bash
python scripts/performance/generate_iteration1_rerun_thesis_outputs.py
```

## Catatan Pembacaan

- Tidak ada warning pembacaan file.

Jika file smoke atau file skenario lain tidak ditemukan, script tetap berjalan dan menuliskan warning di terminal serta README ini.
