// jest.setup.js
process.env.DATABASE_URL =
  'postgresql://jest:jest@localhost:5432/jest?schema=public';
process.env.JWT_SECRET = 'test-secret-for-jest';
// Tambahkan variabel lingkungan lain yang mungkin dibutuhkan di sini
