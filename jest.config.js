module.exports = {
  projects: [
    {
      displayName: 'react-native',
      preset: 'jest-expo',
      setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
      testMatch: ['<rootDir>/src/**/__tests__/**/*.(ts|tsx|js)', '<rootDir>/src/**/*.(test|spec).(ts|tsx|js)'],
      testEnvironment: 'jsdom',
      collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/test/**/*',
      ],
    },
    {
      displayName: 'convex-utils',
      testMatch: ['<rootDir>/convex/utils/**/__tests__/**/*.(ts|tsx|js)', '<rootDir>/convex/utils/**/*.(test|spec).(ts|tsx|js)'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      collectCoverageFrom: [
        'convex/utils/**/*.{ts,tsx}',
        '!convex/_generated/**/*',
      ],
    },
  ],
};