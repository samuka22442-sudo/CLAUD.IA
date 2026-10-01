import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts', cli: 'src/cli.ts' },
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  clean: true,
  sourcemap: true,
  // O pacote compartilhado é TypeScript puro: entra no bundle. O resto fica como dependência.
  noExternal: [/^@ritmo\//],
})
