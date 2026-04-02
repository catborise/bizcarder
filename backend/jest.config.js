module.exports = {
  testEnvironment: 'node',
  globalSetup: './__tests__/setup.js',
  globalTeardown: './__tests__/teardown.js',
  testMatch: ['**/__tests__/**/*.test.js'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/'],
  testTimeout: 30000,
  maxWorkers: 1,
  setupFiles: ['<rootDir>/__tests__/setEnv.js'],
  // Transform ESM-only dependencies (otplib → @scure/base)
  transformIgnorePatterns: [
    'node_modules/(?!(@scure|@noble|otplib)/)',
  ],
};
