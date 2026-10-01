import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Fixa o fuso (UTC-3, sem horário de verão) para os testes de data serem determinísticos
    // e pegarem o bug clássico de `toISOString()` deslocando o dia à noite.
    globalSetup: ['./test/global-setup.ts'],
  },
})
