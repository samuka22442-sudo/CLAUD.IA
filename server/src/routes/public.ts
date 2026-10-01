import type { FastifyInstance } from 'fastify'
import { APP_NAME } from '@ritmo/shared'
import type { PublicConfig } from '@ritmo/shared'
import type { RouteContext } from '../context.ts'

export function publicRoutes(app: FastifyInstance, { sql, config }: RouteContext) {
  // Usado pelo healthcheck do Docker: sem rate limit, e responde 503 se o banco não responde.
  app.get('/health', { config: { rateLimit: false } }, async (_req, reply) => {
    try {
      await sql`select 1`
      return { ok: true }
    } catch {
      return reply.code(503).send({ ok: false })
    }
  })

  app.get('/config', async (): Promise<PublicConfig> => ({
    appName: APP_NAME,
    allowSignup: config.allowSignup,
  }))
}
