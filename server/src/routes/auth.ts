import type { FastifyInstance } from 'fastify'
import {
  loginInputSchema,
  passwordChangeSchema,
  profileUpdateSchema,
  registerInputSchema,
} from '@ritmo/shared/schemas'
import { z } from 'zod'
import { createSession, deleteOtherSessions, deleteSessionByToken, purgeExpiredSessions } from '../auth/session.ts'
import type { SessionUser } from '../auth/session.ts'
import type { RateLimitRule } from '../config.ts'
import { requireUser } from '../context.ts'
import type { RouteContext } from '../context.ts'
import { AppError, parse } from '../errors.ts'
import { dummyVerify, hashPassword, verifyPassword } from '../security.ts'

interface UserRow {
  id: string
  name: string
  email: string
  password_hash: string
  created_at: Date
}

const toUser = (row: Pick<UserRow, 'id' | 'name' | 'email' | 'created_at'>): SessionUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  createdAt: row.created_at.toISOString(),
})

const rateLimitOf = (rule: RateLimitRule) => ({ rateLimit: { max: rule.max, timeWindow: rule.window } })

const deleteAccountSchema = z.object({ password: z.string().min(1).max(128) })

export function authRoutes(app: FastifyInstance, { sql, config, auth }: RouteContext) {
  app.post('/auth/register', { config: rateLimitOf(config.rateLimits.register) }, async (req, reply) => {
    if (!config.allowSignup) throw new AppError(403, 'signup_disabled', 'O cadastro de novas contas está desativado')
    const input = parse(registerInputSchema, req.body)

    const passwordHash = await hashPassword(input.password)
    const rows = await sql<UserRow[]>`
      insert into users (name, email, password_hash)
      values (${input.name}, ${input.email}, ${passwordHash})
      on conflict (email) do nothing
      returning id, name, email, password_hash, created_at
    `
    const row = rows[0]
    if (!row) throw new AppError(409, 'email_taken', 'Este e-mail já está cadastrado')

    const session = await createSession(sql, row.id, true, req.headers['user-agent'])
    auth.setCookie(reply, session.token, session.remember)
    return reply.code(201).send({ user: toUser(row) })
  })

  app.post('/auth/login', { config: rateLimitOf(config.rateLimits.auth) }, async (req, reply) => {
    const { email, password, remember } = parse(loginInputSchema, req.body)

    const rows = await sql<UserRow[]>`
      select id, name, email, password_hash, created_at from users where email = ${email}
    `
    const row = rows[0]
    // Mesmo custo de tempo exista o e-mail ou não, e a mesma mensagem nos dois casos.
    const valid = row ? await verifyPassword(password, row.password_hash) : (await dummyVerify(password), false)
    if (!row || !valid) throw new AppError(401, 'invalid_credentials', 'E-mail ou senha incorretos')

    await purgeExpiredSessions(sql)
    const session = await createSession(sql, row.id, remember ?? false, req.headers['user-agent'])
    auth.setCookie(reply, session.token, session.remember)
    return { user: toUser(row) }
  })

  // Idempotente e sem exigir login: sempre encerra a sessão do cookie, se houver.
  app.post('/auth/logout', async (req, reply) => {
    const token = req.cookies[auth.cookieName]
    if (token) await deleteSessionByToken(sql, token)
    auth.clearCookie(reply)
    return reply.code(204).send()
  })

  app.get('/auth/me', { preHandler: auth.authenticate }, async (req) => ({ user: requireUser(req) }))

  app.patch('/auth/me', { preHandler: auth.authenticate }, async (req) => {
    const user = requireUser(req)
    const { name } = parse(profileUpdateSchema, req.body)
    const rows = await sql<UserRow[]>`
      update users set name = ${name} where id = ${user.id}
      returning id, name, email, password_hash, created_at
    `
    const row = rows[0]
    if (!row) throw new AppError(404, 'not_found', 'Usuário não encontrado')
    return { user: toUser(row) }
  })

  app.post(
    '/auth/password',
    { preHandler: auth.authenticate, config: rateLimitOf(config.rateLimits.auth) },
    async (req, reply) => {
      const user = requireUser(req)
      const { currentPassword, newPassword } = parse(passwordChangeSchema, req.body)

      const rows = await sql<Pick<UserRow, 'password_hash'>[]>`select password_hash from users where id = ${user.id}`
      const row = rows[0]
      if (!row || !(await verifyPassword(currentPassword, row.password_hash))) {
        throw new AppError(400, 'wrong_password', 'A senha atual está incorreta')
      }
      await sql`update users set password_hash = ${await hashPassword(newPassword)} where id = ${user.id}`
      // Trocou a senha: derruba as sessões dos outros aparelhos, mantém a atual.
      if (req.sessionId) await deleteOtherSessions(sql, user.id, req.sessionId)
      return reply.code(204).send()
    },
  )

  // Exclui a conta e todos os dados (cascade). Exige a senha como confirmação.
  app.delete(
    '/auth/me',
    { preHandler: auth.authenticate, config: rateLimitOf(config.rateLimits.auth) },
    async (req, reply) => {
      const user = requireUser(req)
      const { password } = parse(deleteAccountSchema, req.body)
      const rows = await sql<Pick<UserRow, 'password_hash'>[]>`select password_hash from users where id = ${user.id}`
      const row = rows[0]
      if (!row || !(await verifyPassword(password, row.password_hash))) {
        throw new AppError(400, 'wrong_password', 'A senha está incorreta')
      }
      await sql`delete from users where id = ${user.id}`
      auth.clearCookie(reply)
      return reply.code(204).send()
    },
  )
}
