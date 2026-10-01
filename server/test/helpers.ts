import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.ts'
import { loadConfig } from '../src/config.ts'
import type { Config } from '../src/config.ts'
import { createSql } from '../src/db.ts'
import type { Sql } from '../src/db.ts'
import { migrate } from '../src/migrate.ts'

export interface TestContext {
  app: FastifyInstance
  sql: Sql
  config: Config
  close(): Promise<void>
}

/** Limites altos para os testes não esbarrarem no rate limit (o teste de rate limit usa limites próprios). */
const RELAXED_LIMITS: Config['rateLimits'] = {
  global: { max: 100_000, window: '1 minute' },
  auth: { max: 100_000, window: '15 minutes' },
  register: { max: 100_000, window: '1 hour' },
}

/** Sobe um Postgres real (PGlite via socket), aplica as migrações e monta o app. */
export async function createTestContext(overrides: Partial<Config> = {}): Promise<TestContext> {
  const db = await PGlite.create()
  const socket = new PGLiteSocketServer({ db, port: 0, host: '127.0.0.1', maxConnections: 5 })
  await socket.start()
  const sql = createSql(`postgres://postgres:postgres@${socket.getServerConn()}/postgres`, { max: 1 })
  await migrate(sql)

  const config: Config = {
    ...loadConfig({ NODE_ENV: 'test', STATIC_DIR: 'none', ALLOW_SIGNUP: 'true' }),
    rateLimits: RELAXED_LIMITS,
    ...overrides,
  }
  const app = await buildApp({ sql, config })
  await app.ready()

  return {
    app,
    sql,
    config,
    close: async () => {
      await app.close()
      await sql.end({ timeout: 1 })
      await socket.stop()
      await db.close()
    },
  }
}

export interface ApiResponse<T = any> {
  status: number
  body: T
  headers: Record<string, string | string[] | number | undefined>
  setCookie: string[]
}

export interface RequestOptions {
  body?: unknown
  cookie?: string
  headers?: Record<string, string>
}

export async function api<T = any>(
  app: FastifyInstance,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const response = await app.inject({
    method,
    url,
    ...(options.body !== undefined ? { payload: options.body as object } : {}),
    headers: { ...(options.cookie ? { cookie: options.cookie } : {}), ...options.headers },
  })
  let body: unknown = response.body
  if (response.body) {
    try {
      body = JSON.parse(response.body)
    } catch {
      body = response.body
    }
  }
  const raw = response.headers['set-cookie']
  return {
    status: response.statusCode,
    body: body as T,
    headers: response.headers,
    setCookie: raw === undefined ? [] : Array.isArray(raw) ? raw : [raw],
  }
}

/** "nome=valor; Path=/; HttpOnly" → "nome=valor" (o que o navegador reenvia no header Cookie). */
export function cookieFrom(setCookie: string[]): string {
  const entry = setCookie.find((c) => /ritmo_session=/.test(c))
  if (!entry) throw new Error('Resposta sem cookie de sessão')
  return entry.split(';')[0]!
}

let counter = 0

export interface TestUser {
  id: string
  email: string
  name: string
  password: string
  cookie: string
}

export async function registerUser(app: FastifyInstance, overrides: Partial<TestUser> = {}): Promise<TestUser> {
  counter += 1
  const email = overrides.email ?? `pessoa${counter}-${randomUUID().slice(0, 8)}@exemplo.com`
  const name = overrides.name ?? `Pessoa ${counter}`
  const password = overrides.password ?? 'senha-forte-123'
  const res = await api(app, 'POST', '/api/auth/register', { body: { name, email, password } })
  if (res.status !== 201) throw new Error(`registro falhou: ${res.status} ${JSON.stringify(res.body)}`)
  return { id: res.body.user.id, email, name, password, cookie: cookieFrom(res.setCookie) }
}

/* ------------------------------------------------------------------ Fábricas de payloads válidos */

const now = () => new Date().toISOString()

export const makeHabit = (overrides: Record<string, unknown> = {}) => ({
  id: randomUUID(),
  title: 'Beber água',
  description: '2 litros por dia',
  icon: 'droplets',
  color: 'cyan',
  days: [1, 2, 3, 4, 5],
  time: '08:00',
  archived: false,
  createdAt: now(),
  ...overrides,
})

export const makeGoal = (overrides: Record<string, unknown> = {}) => ({
  id: randomUUID(),
  title: 'Ler 12 livros',
  category: 'study',
  icon: 'book',
  color: 'violet',
  kind: 'numeric',
  target: 12,
  current: 3,
  unit: 'livros',
  milestones: [],
  deadline: '2026-12-31',
  archived: false,
  createdAt: now(),
  ...overrides,
})

export const makeRoutine = (overrides: Record<string, unknown> = {}) => ({
  id: randomUUID(),
  title: 'Rotina da manhã',
  icon: 'sun',
  color: 'amber',
  period: 'morning',
  days: [0, 1, 2, 3, 4, 5, 6],
  startTime: '06:30',
  steps: [
    { id: randomUUID(), title: 'Acordar e beber água', minutes: 5 },
    { id: randomUUID(), title: 'Meditar', minutes: 10 },
    { id: randomUUID(), title: 'Alongar', minutes: 15 },
  ],
  archived: false,
  createdAt: now(),
  ...overrides,
})
