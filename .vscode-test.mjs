import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: [
    'out/test/unit/**/*.test.js',
    'out/test/*.test.js'
  ],
  mocha: {
    ui: 'bdd',
    timeout: 20000,
    color: true
  },
  coverage: {
    reporter: ['text', 'html', 'lcov'],
    output: './coverage',
    includeAll: true,
    include: ['out/**/*.js'],
    exclude: [
      'out/test/**',
      'out/**/*.test.js'
    ]
  }
});