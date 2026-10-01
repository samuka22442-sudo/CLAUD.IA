import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { migrate } from '../src/migrate.ts'
import { createTestContext } from './helpers.ts'
import type { TestContext } from './helpers.ts'

describe('migrações', () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestContext()
  })
  afterAll(() => ctx.close())

  it('cria todas as tabelas esperadas', async () => {
    const rows = await ctx.sql<{ table_name: string }[]>`
      select table_name from information_schema.tables where table_schema = 'public' order by table_name`
    expect(rows.map((r) => r.table_name)).toEqual([
      'goals',
      'habit_completions',
      'habits',
      'routine_runs',
      'routines',
      'schema_migrations',
      'sessions',
      'users',
    ])
  })

  it('é idempotente: rodar de novo não aplica nada', async () => {
    expect(await migrate(ctx.sql)).toEqual([])
    const rows = await ctx.sql<{ name: string }[]>`select name from schema_migrations`
    expect(rows.map((r) => r.name)).toEqual(['001_init.sql'])
  })

  it('lê colunas date como texto YYYY-MM-DD e numeric como number', async () => {
    const [row] = await ctx.sql<{ d: string; n: number }[]>`select '2026-03-05'::date as d, 12.5::numeric as n`
    expect(row).toEqual({ d: '2026-03-05', n: 12.5 })
  })
})
