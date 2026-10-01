import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import type { Sql } from './db.ts'

// Tanto src/ quanto dist/ ficam um nível abaixo de server/, então ../migrations vale nos dois casos.
export const defaultMigrationsDir = fileURLToPath(new URL('../migrations', import.meta.url))

/** Número fixo usado no advisory lock para serializar migrações concorrentes. */
const MIGRATION_LOCK_ID = 727_274

/**
 * Aplica, em ordem alfabética, os arquivos `.sql` da pasta que ainda não foram aplicados.
 * Cada arquivo roda numa única transação junto com o registro em `schema_migrations`.
 * Retorna os nomes aplicados nesta execução.
 */
export async function migrate(sql: Sql, dir: string = defaultMigrationsDir): Promise<string[]> {
  await sql`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `
  const files = (await readdir(dir)).filter((file) => file.endsWith('.sql')).sort()
  const applied: string[] = []

  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${MIGRATION_LOCK_ID})`
    const rows = await tx<{ name: string }[]>`select name from schema_migrations`
    const done = new Set(rows.map((row) => row.name))

    for (const file of files) {
      if (done.has(file)) continue
      const text = await readFile(join(dir, file), 'utf8')
      await tx.unsafe(text).simple()
      await tx`insert into schema_migrations (name) values (${file})`
      applied.push(file)
    }
  })

  return applied
}
