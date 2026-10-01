import postgres from 'postgres'

/**
 * Cria o cliente PostgreSQL.
 *
 * Duas conversões importantes:
 * - `date` (1082) volta como texto 'YYYY-MM-DD' — nunca como `Date` do JS, que deslocaria o dia por fuso horário.
 * - `numeric` (1700) volta como number (os valores das metas são pequenos, sem risco de perda de precisão).
 */
export function createSql(url: string, options: { max?: number } = {}) {
  return postgres(url, {
    max: options.max ?? 10,
    idle_timeout: 30,
    connect_timeout: 10,
    onnotice: () => {},
    transform: { undefined: null },
    types: {
      date: {
        to: 1082,
        from: [1082],
        serialize: (value: string) => value,
        parse: (value: string) => value,
      },
      numeric: {
        to: 1700,
        from: [1700],
        serialize: (value: number) => String(value),
        parse: (value: string) => Number(value),
      },
    },
  })
}

export type Sql = ReturnType<typeof createSql>

/** Espera o banco aceitar conexões (o container do Postgres pode demorar a ficar pronto). */
export async function waitForDb(sql: Sql, { attempts = 30, delayMs = 1000 } = {}): Promise<void> {
  let lastError: unknown
  for (let i = 1; i <= attempts; i++) {
    try {
      await sql`select 1`
      return
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  throw new Error(`Não foi possível conectar ao banco após ${attempts} tentativas: ${String(lastError)}`)
}
