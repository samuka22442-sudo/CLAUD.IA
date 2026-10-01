import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.ts'
import { api, createTestContext } from './helpers.ts'
import type { TestContext } from './helpers.ts'

const ORIGIN = 'https://ritmo.exemplo.com'

let ctx: TestContext
let staticDir: string
let prod: FastifyInstance // configuração parecida com a de produção: HTTPS, origem estrita e front estático

beforeAll(async () => {
  ctx = await createTestContext()

  staticDir = await mkdtemp(join(tmpdir(), 'ritmo-static-'))
  await mkdir(join(staticDir, 'assets'))
  await writeFile(join(staticDir, 'index.html'), '<!doctype html><title>Ritmo</title><div id="root"></div>')
  await writeFile(join(staticDir, 'assets', 'app-abc123.js'), 'console.log("ritmo")')
  await writeFile(join(staticDir, 'sw.js'), 'self.addEventListener("fetch", () => {})')
  await writeFile(join(staticDir, 'manifest.webmanifest'), '{"name":"Ritmo"}')

  prod = await buildApp({
    sql: ctx.sql,
    config: {
      ...ctx.config,
      publicUrl: ORIGIN,
      allowedOrigins: [ORIGIN],
      strictOrigin: true,
      cookieSecure: true,
      trustProxy: true,
      staticDir,
    },
  })
  await prod.ready()
})

afterAll(async () => {
  await prod.close()
  await ctx.close()
  await rm(staticDir, { recursive: true, force: true })
})

describe('rotas públicas', () => {
  it('GET /api/health responde ok quando o banco responde', async () => {
    const res = await api(ctx.app, 'GET', '/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('GET /api/config informa nome e se o cadastro está aberto', async () => {
    const res = await api(ctx.app, 'GET', '/api/config')
    expect(res.body).toEqual({ appName: 'Ritmo', allowSignup: true })
  })

  it('rota desconhecida da API → 404 em JSON', async () => {
    const res = await api(prod, 'GET', '/api/nao-existe', { headers: { accept: 'text/html' } })
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('not_found')
  })
})

describe('cabeçalhos de segurança', () => {
  it('envia CSP restritiva, nosniff e esconde x-powered-by', async () => {
    const res = await api(prod, 'GET', '/api/health')
    const csp = String(res.headers['content-security-policy'])
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-powered-by']).toBeUndefined()
  })

  it('HSTS só em HTTPS e sem includeSubDomains', async () => {
    const secure = await api(prod, 'GET', '/api/health')
    expect(String(secure.headers['strict-transport-security'])).toMatch(/max-age=15552000/)
    expect(String(secure.headers['strict-transport-security'])).not.toMatch(/includeSubDomains/i)

    const plain = await api(ctx.app, 'GET', '/api/health')
    expect(plain.headers['strict-transport-security']).toBeUndefined()
  })

  it('em HTTPS o cookie usa o prefixo __Host- e o atributo Secure', async () => {
    const res = await api(prod, 'POST', '/api/auth/register', {
      headers: { origin: ORIGIN },
      body: { name: 'Seg', email: 'seg@exemplo.com', password: 'senha-forte-1' },
    })
    expect(res.status).toBe(201)
    expect(res.setCookie[0]).toMatch(/^__Host-ritmo_session=/)
    expect(res.setCookie[0]).toMatch(/Secure/i)
    expect(res.setCookie[0]).toMatch(/HttpOnly/i)
  })
})

describe('proteção contra CSRF (origem)', () => {
  const login = (headers: Record<string, string>) =>
    api(prod, 'POST', '/api/auth/login', { headers, body: { email: 'x@exemplo.com', password: 'qualquer-coisa' } })

  it('bloqueia escrita vinda de outra origem', async () => {
    const res = await login({ origin: 'https://evil.example' })
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('forbidden')
  })

  it('bloqueia Origin: null', async () => {
    expect((await login({ origin: 'null' })).status).toBe(403)
  })

  it('aceita a origem pública (chega até a validação de credenciais)', async () => {
    expect((await login({ origin: ORIGIN })).status).toBe(401)
  })

  it('sem Origin, usa Sec-Fetch-Site: cross-site é barrado, same-origin passa', async () => {
    expect((await login({ 'sec-fetch-site': 'cross-site' })).status).toBe(403)
    expect((await login({ 'sec-fetch-site': 'same-site' })).status).toBe(403)
    expect((await login({ 'sec-fetch-site': 'same-origin' })).status).toBe(401)
  })

  it('clientes sem cabeçalhos de navegador (curl) continuam funcionando', async () => {
    expect((await login({})).status).toBe(401)
  })

  it('leituras (GET) não são afetadas pela checagem', async () => {
    const res = await api(prod, 'GET', '/api/health', { headers: { origin: 'https://evil.example' } })
    expect(res.status).toBe(200)
  })
})

describe('corpo da requisição', () => {
  it('só aceita JSON: text/plain → 415', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: '{"email":"a@b.co","password":"x"}',
      headers: { 'content-type': 'text/plain' },
    })
    expect(res.statusCode).toBe(415)
    expect(res.json().error).toBe('invalid_input')
  })

  it('JSON malformado → 400', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: '{"email": ',
      headers: { 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('corpo acima de 1 MB → 413', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: JSON.stringify({ email: 'a@b.co', password: 'x'.repeat(1_200_000) }),
      headers: { 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(413)
  })
})

describe('front buildado (SPA)', () => {
  const html = { accept: 'text/html,application/xhtml+xml' }

  it('serve o index.html na raiz sem cache longo', async () => {
    const res = await prod.inject({ method: 'GET', url: '/', headers: html })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/html/)
    expect(res.headers['cache-control']).toBe('no-cache')
    expect(res.body).toContain('<title>Ritmo</title>')
  })

  it('assets com hash ganham cache imutável de 1 ano', async () => {
    const res = await prod.inject({ method: 'GET', url: '/assets/app-abc123.js' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable')
  })

  it('service worker e manifest nunca ficam em cache (senão o app não atualiza)', async () => {
    for (const url of ['/sw.js', '/manifest.webmanifest']) {
      const res = await prod.inject({ method: 'GET', url })
      expect(res.statusCode).toBe(200)
      expect(res.headers['cache-control']).toBe('no-cache')
    }
  })

  it('revalida com ETag (304)', async () => {
    const first = await prod.inject({ method: 'GET', url: '/sw.js' })
    const etag = String(first.headers.etag)
    expect(etag).toBeTruthy()
    const second = await prod.inject({ method: 'GET', url: '/sw.js', headers: { 'if-none-match': etag } })
    expect(second.statusCode).toBe(304)
  })

  it('rotas do front (/habitos…) devolvem o index.html quando o navegador navega', async () => {
    for (const url of ['/habitos', '/metas', '/rotinas/qualquer?x=1', '/entrar']) {
      const res = await prod.inject({ method: 'GET', url, headers: html })
      expect(res.statusCode, url).toBe(200)
      expect(res.body, url).toContain('<title>Ritmo</title>')
    }
  })

  it('não "inventa" HTML para quem não pediu HTML', async () => {
    const asset = await prod.inject({ method: 'GET', url: '/assets/ausente.js', headers: { accept: '*/*' } })
    expect(asset.statusCode).toBe(404)
    const json = await prod.inject({ method: 'GET', url: '/habitos', headers: { accept: 'application/json' } })
    expect(json.statusCode).toBe(404)
  })

  it('a API nunca cai no fallback do front', async () => {
    const res = await prod.inject({ method: 'GET', url: '/api/nada', headers: html })
    expect(res.statusCode).toBe(404)
    expect(res.headers['content-type']).toMatch(/application\/json/)
    expect(res.json().error).toBe('not_found')
  })
})
