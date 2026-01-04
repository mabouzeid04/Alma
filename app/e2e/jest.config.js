const { resolve } = require('path');

module.exports = {
  rootDir: resolve(__dirname, '..'),
  testMatch: ['<rootDir>/e2e/**/*.e2e.ts'],
  testTimeout: 120000,
  testRunner: 'jest-circus/runner',
  reporters: ['detox/runners/jest/reporter'],
  setupFilesAfterEnv: ['<rootDir>/e2e/init.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.e2e.json',
        isolatedModules: true,
      },
    ],
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.e2e.json',
    },
  },
};

