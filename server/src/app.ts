import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import Fastify from 'fastify'
import type { FastifyError, FastifyInstance } from 'fastify'
import { ZodError } from 'zod'
import { createAuth } from './auth/index.ts'
import type { Config } from './config.ts'
import type { RouteContext } from './context.ts'
import type { Sql } from './db.ts'
import { AppError } from './errors.ts'
import { authRoutes } from './routes/auth.ts'
import { dataRoutes } from './routes/data.ts'
import { publicRoutes } from './routes/public.ts'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export interface AppDeps {
  sql: Sql
  config: Config
}

export async function buildApp({ sql, config }: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      config.env === 'test'
        ? false
        : { level: config.logLevel, redact: ['req.headers.cookie', 'req.headers.authorization'] },
    trustProxy: config.trustProxy,
    bodyLimit: 1_048_576,
  })

  // A API só fala JSON. Sem o parser de text/plain, um formulário de outro site não consegue enviar corpo "válido".
  app.removeContentTypeParser('text/plain')

  /* ---------------------------------------------------------------- Segurança */

  await app.register(helmet, {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // o React usa style="" inline (cores dinâmicas)
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    // HSTS só quando o site é HTTPS, e sem includeSubDomains (não afeta outros subdomínios seus).
    strictTransportSecurity: config.cookieSecure ? { maxAge: 15_552_000, includeSubDomains: false } : false,
    crossOriginEmbedderPolicy: false,
  })

  await app.register(cookie)

  await app.register(rateLimit, {
    global: true,
    max: config.rateLimits.global.max,
    timeWindow: config.rateLimits.global.window,
    errorResponseBuilder: () =>
      new AppError(429, 'rate_limited', 'Muitas tentativas. Aguarde um pouco e tente de novo.'),
  })

  // CSRF, camada extra (o cookie já é SameSite=Lax): requisições que alteram dados precisam vir de uma origem conhecida.
  if (config.strictOrigin) {
    const allowed = new Set(config.allowedOrigins)
    app.addHook('onRequest', async (req) => {
      if (SAFE_METHODS.has(req.method)) return
      const origin = req.headers.origin
      if (origin !== undefined) {
        if (!allowed.has(origin)) throw new AppError(403, 'forbidden', 'Origem não permitida')
        return
      }
      const site = req.headers['sec-fetch-site']
      if (typeof site === 'string' && site !== 'same-origin' && site !== 'none') {
        throw new AppError(403, 'forbidden', 'Origem não permitida')
      }
    })
  }

  app.decorateRequest('user', null)
  app.decorateRequest('sessionId', null)

  /* ---------------------------------------------------------------- Erros */

  app.setErrorHandler((error: Error, req, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.status).send({
        error: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      })
    }
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: 'invalid_input', message: 'Dados inválidos' })
    }
    // Erros 4xx do próprio Fastify (JSON malformado, corpo grande demais, content-type não suportado…).
    const status = (error as FastifyError).statusCode
    if (typeof status === 'number' && status >= 400 && status < 500) {
      return reply.code(status).send({ error: 'invalid_input', message: 'Requisição inválida' })
    }
    req.log.error({ err: error }, 'erro inesperado')
    return reply.code(500).send({ error: 'internal', message: 'Erro interno do servidor' })
  })

  /* ---------------------------------------------------------------- Rotas da API */

  const context: RouteContext = { sql, config, auth: createAuth(sql, config) }
  await app.register(
    async (api) => {
      publicRoutes(api, context)
      authRoutes(api, context)
      dataRoutes(api, context)
    },
    { prefix: '/api' },
  )

  /* ---------------------------------------------------------------- Front buildado (SPA) */

  const serveSpa = config.staticDir !== null
  if (config.staticDir !== null) {
    await app.register(fastifyStatic, {
      root: config.staticDir,
      prefix: '/',
      index: ['index.html'],
      cacheControl: false,
      setHeaders: (reply, filePath) => {
        // Arquivos com hash no nome (assets/) nunca mudam → cache longo. O resto (index.html, sw.js,
        // manifest, ícones) precisa ser revalidado, senão o service worker não atualiza.
        reply.header(
          'Cache-Control',
          /[\\/]assets[\\/]/.test(filePath) ? 'public, max-age=31536000, immutable' : 'no-cache',
        )
      },
    })
  }

  app.setNotFoundHandler((req, reply) => {
    const path = req.url.split('?')[0] ?? ''
    const isApi = path === '/api' || path.startsWith('/api/')
    const wantsHtml = (req.headers.accept ?? '').includes('text/html')
    // Navegação do navegador para uma rota do front (/habitos, /metas…) → devolve o index.html.
    if (serveSpa && !isApi && wantsHtml && (req.method === 'GET' || req.method === 'HEAD')) {
      return reply.code(200).sendFile('index.html')
    }
    return reply.code(404).send({ error: 'not_found', message: 'Não encontrado' })
  })

  return app
}
