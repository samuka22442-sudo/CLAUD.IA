import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export interface RateLimitRule {
  max: number
  /** Janela no formato aceito pelo @fastify/rate-limit, ex.: '15 minutes'. */
  window: string
}

export interface Config {
  env: 'development' | 'production' | 'test'
  host: string
  port: number
  databaseUrl: string
  /** URL pública do app (https://ritmo.seudominio.com). Define cookie Secure e a origem aceita. */
  publicUrl: string
  /** Origens aceitas em requisições que alteram dados (defesa extra contra CSRF). */
  allowedOrigins: string[]
  /** Se true, rejeita requisições de escrita vindas de outra origem. Ligado em produção. */
  strictOrigin: boolean
  allowSignup: boolean
  /** Atrás de Nginx/Caddy: confia em X-Forwarded-For para descobrir o IP real. */
  trustProxy: boolean
  cookieSecure: boolean
  /** Pasta do front buildado (web/dist). null = só API. */
  staticDir: string | null
  logLevel: string
  rateLimits: {
    global: RateLimitRule
    auth: RateLimitRule
    register: RateLimitRule
  }
}

const DEV_DATABASE_URL = 'postgres://postgres:postgres@127.0.0.1:54329/postgres'

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback
  return ['1', 'true', 'yes', 'on', 'sim'].includes(value.trim().toLowerCase())
}

function int(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value.trim() === '') return fallback
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) throw new Error(`${name} precisa ser um número inteiro (recebido: "${value}")`)
  return n
}

function defaultStaticDir(): string | null {
  // Tanto src/ quanto dist/ ficam um nível abaixo de server/, então o caminho é o mesmo nos dois casos.
  const dir = fileURLToPath(new URL('../../web/dist', import.meta.url))
  return existsSync(dir) ? dir : null
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const mode = env.NODE_ENV === 'production' ? 'production' : env.NODE_ENV === 'test' ? 'test' : 'development'
  const isProd = mode === 'production'
  const port = int(env.PORT, 3000, 'PORT')

  const databaseUrl = env.DATABASE_URL?.trim() || (isProd ? '' : DEV_DATABASE_URL)
  if (!databaseUrl) throw new Error('DATABASE_URL é obrigatório em produção (ex.: postgres://usuario:senha@db:5432/ritmo)')

  const publicUrl = (env.PUBLIC_URL?.trim() || (isProd ? '' : 'http://localhost:5173')).replace(/\/+$/, '')
  if (!publicUrl) throw new Error('PUBLIC_URL é obrigatório em produção (ex.: https://ritmo.seudominio.com)')
  let publicOrigin: string
  try {
    publicOrigin = new URL(publicUrl).origin
  } catch {
    throw new Error(`PUBLIC_URL inválida: "${publicUrl}"`)
  }

  const extraOrigins = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  const allowedOrigins = [...new Set([publicOrigin, ...extraOrigins])]

  const staticEnv = env.STATIC_DIR?.trim()
  const staticDir = staticEnv ? (staticEnv.toLowerCase() === 'none' ? null : staticEnv) : defaultStaticDir()

  return {
    env: mode,
    host: env.HOST?.trim() || (isProd ? '0.0.0.0' : '127.0.0.1'),
    port,
    databaseUrl,
    publicUrl,
    allowedOrigins,
    strictOrigin: bool(env.STRICT_ORIGIN, isProd),
    allowSignup: bool(env.ALLOW_SIGNUP, true),
    trustProxy: bool(env.TRUST_PROXY, false),
    cookieSecure: bool(env.COOKIE_SECURE, publicUrl.startsWith('https://')),
    staticDir,
    logLevel: env.LOG_LEVEL?.trim() || 'info',
    rateLimits: {
      global: { max: 600, window: '1 minute' },
      auth: { max: 10, window: '15 minutes' },
      register: { max: 10, window: '1 hour' },
    },
  }
}
