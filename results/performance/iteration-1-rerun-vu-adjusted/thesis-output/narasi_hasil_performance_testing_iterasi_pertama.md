# Narasi Hasil Performance Testing Iterasi Pertama

Seluruh skenario pengujian memenuhi kriteria kelulusan berdasarkan indikator checks minimal 95% dan HTTP request failed kurang dari 1%. Pengujian dilakukan pada backend Protextify yang berjalan di VPS dengan beban endpoint RESTful API internal yang dominan read-heavy.

Smoke testing digunakan untuk memastikan skenario dasar dapat berjalan sebelum beban yang lebih besar diberikan. Load testing merepresentasikan satu kelas penuh aktif dengan 40 VU. Stress testing merepresentasikan peningkatan beban secara bertahap hingga 120 VU, yaitu setara dengan tiga kelas aktif. Spike testing merepresentasikan lonjakan mendadak hingga 120 VU. Endurance testing merepresentasikan kestabilan satu kelas penuh aktif dalam durasi lebih panjang, yaitu 30 menit.

Performance testing ini tidak menggunakan WinstonAI real. Endpoint yang berkaitan dengan laporan plagiarisme hanya dibaca dari data PlagiarismCheck yang sudah tersedia atau mode metadata/mock, sehingga hasil pengujian tidak digunakan untuk menilai akurasi WinstonAI.

Kelima skenario (Smoke, Load, Stress, Spike, Endurance) dinyatakan lolos berdasarkan ambang batas penelitian.

Endpoint dengan p95 tertinggi pada ringkasan endpoint adalah `student_submission_history` pada skenario Smoke dengan p95 sebesar 121.96 ms. Endpoint dengan p95 tertinggi dapat digunakan sebagai dasar identifikasi potensi bottleneck dan prioritas analisis optimasi backend.
