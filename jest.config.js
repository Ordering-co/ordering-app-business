const coverageInclude = require('./jest/coverage-include')

module.exports = {
  preset: '@react-native/jest-preset',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFiles: ['<rootDir>/jest/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest/setupAfterEnv.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@ui$': '<rootDir>/src/ui/index.tsx',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@components$': '<rootDir>/src/@/components/native/index.js',
    // The three alert sounds are numbers a test can tell apart (`jest/mocks/sounds`).
    '^.+/assets/sounds/(.+)\\.mp3$': '<rootDir>/jest/mocks/sounds/$1.js',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/jest/mocks/fileMock.js'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react-native|@react-native-community|@react-navigation|styled-components|@orderingco/ordering-theme-engine)'
  ],
  testMatch: [
    '<rootDir>/__tests__/**/*.(test|spec).[jt]s?(x)',
    '<rootDir>/src/**/*.(test|spec).[jt]s?(x)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '<rootDir>/src/@/components/'
  ],
  collectCoverage: false,
  collectCoverageFrom: coverageInclude,
  coverageDirectory: 'coverage',
  // PR CI only needs json (70% gate) and text (job logs). Skip html/lcov.
  coverageReporters: ['text', 'json'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/jest/',
    '/coverage/',
    '/android/',
    '/ios/'
  ]
}
