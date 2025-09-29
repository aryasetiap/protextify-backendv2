module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  // PERBAIKAN: Fokuskan coverage hanya pada file di dalam `src`
  collectCoverageFrom: ['src/**/*.(t|j)s'],

  // PERBAIKAN: Tambahkan pola untuk mengecualikan file yang tidak relevan
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    'main.ts',
    '.module.ts',
    '.dto.ts',
    '.interface.ts',
    '.decorator.ts',
    '.guard.ts',
    '.strategy.ts',
    '.entity.ts',
    '.mock.ts',
    'jest.config.js',
    'jest.setup.js',
    'test-r2-connection.js',
    'root.controller.ts', // Jika ada file root controller yang tidak perlu di-test
    'app.controller.ts',
    'app.service.ts',
    'logger.ts', // Jika ada file logger custom
    'api.controller.ts', // File API gateway jika ada
  ],

  coverageDirectory: './coverage',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
