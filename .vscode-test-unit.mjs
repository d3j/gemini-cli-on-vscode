import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/unit/**/*.test.js',
  mocha: {
    ui: 'tdd',
    timeout: 20000,
    color: true
  }
});