/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-setup/jest.setup.ts'],
  clearMocks: true,       // auto clear mock.calls / mock.instances before every test
  restoreMocks: true,     // auto restore spied implementations before every test
  testPathIgnorePatterns: ['/node_modules/'],
};
