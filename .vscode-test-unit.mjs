import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/unit/**/*.test.js',
  mocha: {
    ui: 'bdd',  // Changed from 'tdd' to 'bdd' to match describe/it syntax
    timeout: 20000,
    color: true
  },
  coverage: {
    reporter: ['text', 'html', 'lcov'],
    output: './coverage',
    includeAll: false,
    include: ['out/**/*.js'],
    exclude: [
      'out/test/**',
      'out/**/*.test.js',
      'out/multiAI/**',
      'out/ui/webviewUtils.js'
    ]
  }
});
