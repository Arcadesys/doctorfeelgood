// This babel config is only used for Jest tests
// Next.js will use SWC for normal builds
module.exports = {
  presets: ['next/babel'],
  plugins: [],
  // Only apply this config in test environment
  env: {
    test: {
      presets: ['next/babel']
    }
  }
} 