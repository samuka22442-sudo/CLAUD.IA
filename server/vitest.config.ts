import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // PGlite sobe em WASM: a primeira inicialização é mais lenta.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
