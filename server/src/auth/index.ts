import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Config } from '../config.ts'
import type { Sql } from '../db.ts'
import { unauthorized } from '../errors.ts'
import { findSession, renewSession, SESSION_TTL_MS, ttlMs } from './session.ts'
import type { SessionUser } from './session.ts'

declare module 'fastify' {
  interface FastifyRequest {
    /** Usuário autenticado (preenchido por `auth.authenticate`). */
    user: SessionUser | null
    sessionId: string | null
  }
}

/** Cookie de sessão + hook de autenticação. */
export function createAuth(sql: Sql, config: Config) {
  // Com HTTPS usamos o prefixo __Host-: o navegador só aceita se for Secure, Path=/ e sem Domain.
  const cookieName = config.cookieSecure ? '__Host-ritmo_session' : 'ritmo_session'
  const base = { httpOnly: true, secure: config.cookieSecure, sameSite: 'lax' as const, path: '/' }

  function setCookie(reply: FastifyReply, token: string, remember: boolean) {
    // Sem "manter conectado": cookie de sessão (some ao fechar o navegador); o servidor ainda expira em 24 h.
    reply.setCookie(cookieName, token, remember ? { ...base, maxAge: SESSION_TTL_MS.remember / 1000 } : base)
  }

  function clearCookie(reply: FastifyReply) {
    reply.clearCookie(cookieName, base)
  }

  async function authenticate(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const token = req.cookies[cookieName]
    if (!token) throw unauthorized()

    const found = await findSession(sql, token)
    if (!found) {
      clearCookie(reply)
      throw unauthorized()
    }
    req.user = found.user
    req.sessionId = found.sessionId

    // Renovação deslizante: passou de metade da validade → estende e reemite o cookie.
    const remaining = found.expiresAt.getTime() - Date.now()
    if (remaining < ttlMs(found.remember) / 2) {
      await renewSession(sql, found.sessionId, found.remember)
      setCookie(reply, token, found.remember)
    }
  }

  return { cookieName, setCookie, clearCookie, authenticate }
}

export type Auth = ReturnType<typeof createAuth>
