module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    // Handle module aliases (important for Next.js)
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    // Handle CSS imports (if you're using CSS modules)
    '^.+\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  transform: {
    // Handle TypeScript with babel-jest
    '^.+\\.(ts|tsx)$': ['babel-jest', { 
      configFile: './babel.config.js', // Explicitly point to our babel config
      presets: ['next/babel']
    }],
  },
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: true,
}; 