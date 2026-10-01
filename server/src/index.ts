import { buildApp } from './app.ts'
import { purgeExpiredSessions } from './auth/session.ts'
import { loadConfig } from './config.ts'
import { createSql, waitForDb } from './db.ts'
import { migrate } from './migrate.ts'

async function main() {
  const config = loadConfig()
  const sql = createSql(config.databaseUrl)

  await waitForDb(sql)
  const applied = await migrate(sql)

  const app = await buildApp({ sql, config })
  if (applied.length > 0) app.log.info({ applied }, 'migrações aplicadas')

  // Limpeza de sessões vencidas: na subida e a cada 6 horas.
  await purgeExpiredSessions(sql)
  const cleanup = setInterval(() => {
    purgeExpiredSessions(sql).catch((error) => app.log.warn({ err: error }, 'falha ao limpar sessões'))
  }, 6 * 3_600_000)
  cleanup.unref()

  await app.listen({ host: config.host, port: config.port })
  app.log.info(
    { publicUrl: config.publicUrl, allowSignup: config.allowSignup, staticDir: config.staticDir },
    'Ritmo no ar',
  )

  let stopping = false
  const stop = async (signal: string) => {
    if (stopping) return
    stopping = true
    app.log.info({ signal }, 'encerrando')
    clearInterval(cleanup)
    await app.close()
    await sql.end({ timeout: 5 })
    process.exit(0)
  }
  process.on('SIGINT', () => void stop('SIGINT'))
  process.on('SIGTERM', () => void stop('SIGTERM'))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
