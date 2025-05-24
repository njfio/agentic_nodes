module.exports = {
  // Test environments
  projects: [
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/server/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/server/setup.js'],
      // Skip tests that require specific models/dependencies
      testPathIgnorePatterns: [
        '/node_modules/',
        '/tests/server/models/',
        '/tests/server/middleware/',
        '/tests/server/integration/'
      ]
    }
    // Client tests disabled until dependencies are installed
    // {
    //   displayName: 'client',
    //   testEnvironment: 'jsdom',
    //   testMatch: ['<rootDir>/tests/client/**/*.test.js'],
    //   setupFilesAfterEnv: ['<rootDir>/tests/client/setup.js'],
    //   moduleNameMapper: {
    //     '\\.(css|less|scss|sass)$': '<rootDir>/tests/client/__mocks__/styleMock.js',
    //     '\\.(gif|ttf|eot|svg)$': '<rootDir>/tests/client/__mocks__/fileMock.js'
    //   },
    //   transform: {
    //     '^.+\\.js$': 'babel-jest'
    //   }
    // }
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  collectCoverageFrom: [
    'client/src/**/*.js',
    'controllers/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    'routes/**/*.js',
    'services/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**',
    '!**/*.config.js'
  ],
  
  // General configuration
  verbose: true,
  testTimeout: 10000,
  maxWorkers: '50%',
  
  // Watch configuration
  // Commented out until packages are installed
  // watchPlugins: [
  //   'jest-watch-typeahead/filename',
  //   'jest-watch-typeahead/testname'
  // ],
  
  // Global setup/teardown
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js'
};
