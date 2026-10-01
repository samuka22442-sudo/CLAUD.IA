/**
 * Banco de desenvolvimento sem Docker: PGlite (Postgres real compilado para WASM) exposto por um
 * socket TCP, no mesmo protocolo do PostgreSQL. Os dados ficam em ./.pgdata na raiz do projeto.
 *
 *   npm run dev:db      →  postgres://postgres:postgres@127.0.0.1:54329/postgres
 *
 * Só para desenvolvimento e testes. Em produção o app usa o container postgres:17 do docker-compose.
 */
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'

const dataDir = process.env.PGLITE_DIR ?? fileURLToPath(new URL('../../.pgdata', import.meta.url))
const port = Number(process.env.PGLITE_PORT ?? 54329)

const db = await PGlite.create(dataDir)
const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 10 })
await server.start()
console.log(`PGlite pronto em postgres://postgres:postgres@127.0.0.1:${port}/postgres (dados em ${dataDir})`)

const stop = async () => {
  await server.stop()
  await db.close()
  process.exit(0)
}
process.on('SIGINT', () => void stop())
process.on('SIGTERM', () => void stop())
