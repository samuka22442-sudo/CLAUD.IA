import type { Sql } from '../db.ts'
import { hashToken, newSessionToken } from '../security.ts'

const HOUR = 3_600_000

/** "Manter conectado" → 30 dias; sem marcar → 24 horas. */
export const SESSION_TTL_MS = { remember: 30 * 24 * HOUR, short: 24 * HOUR }

export const ttlMs = (remember: boolean) => (remember ? SESSION_TTL_MS.remember : SESSION_TTL_MS.short)

export interface SessionUser {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface FoundSession {
  sessionId: string
  remember: boolean
  expiresAt: Date
  user: SessionUser
}

interface SessionRow {
  session_id: string
  remember: boolean
  expires_at: Date
  id: string
  name: string
  email: string
  created_at: Date
}

export async function createSession(sql: Sql, userId: string, remember: boolean, userAgent?: string) {
  const { token, id } = newSessionToken()
  const expiresAt = new Date(Date.now() + ttlMs(remember))
  await sql`
    insert into sessions (id, user_id, remember, expires_at, user_agent)
    values (${id}, ${userId}, ${remember}, ${expiresAt}, ${userAgent?.slice(0, 300) ?? null})
  `
  return { token, sessionId: id, remember, expiresAt }
}

export async function findSession(sql: Sql, token: string): Promise<FoundSession | null> {
  const rows = await sql<SessionRow[]>`
    select s.id as session_id, s.remember, s.expires_at, u.id, u.name, u.email, u.created_at
    from sessions s
    join users u on u.id = s.user_id
    where s.id = ${hashToken(token)} and s.expires_at > now()
  `
  const row = rows[0]
  if (!row) return null
  return {
    sessionId: row.session_id,
    remember: row.remember,
    expiresAt: row.expires_at,
    user: { id: row.id, name: row.name, email: row.email, createdAt: row.created_at.toISOString() },
  }
}

/** Renovação deslizante: devolve a nova expiração. */
export async function renewSession(sql: Sql, sessionId: string, remember: boolean): Promise<Date> {
  const expiresAt = new Date(Date.now() + ttlMs(remember))
  await sql`update sessions set expires_at = ${expiresAt} where id = ${sessionId}`
  return expiresAt
}

export async function deleteSessionByToken(sql: Sql, token: string): Promise<void> {
  await sql`delete from sessions where id = ${hashToken(token)}`
}

export async function deleteOtherSessions(sql: Sql, userId: string, keepSessionId: string): Promise<void> {
  await sql`delete from sessions where user_id = ${userId} and id <> ${keepSessionId}`
}

export async function purgeExpiredSessions(sql: Sql): Promise<void> {
  await sql`delete from sessions where expires_at < now()`
}
