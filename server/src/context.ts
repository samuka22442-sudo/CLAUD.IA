import type { FastifyRequest } from 'fastify'
import type { Auth } from './auth/index.ts'
import type { SessionUser } from './auth/session.ts'
import type { Config } from './config.ts'
import type { Sql } from './db.ts'
import { unauthorized } from './errors.ts'

/** O que cada módulo de rotas recebe. */
export interface RouteContext {
  sql: Sql
  config: Config
  auth: Auth
}

/** Usuário autenticado da requisição (as rotas protegidas já passaram por `auth.authenticate`). */
export function requireUser(req: FastifyRequest): SessionUser {
  if (!req.user) throw unauthorized()
  return req.user
}
