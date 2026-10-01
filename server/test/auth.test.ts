import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.ts'
import { api, cookieFrom, createTestContext, makeHabit, registerUser } from './helpers.ts'
import type { TestContext } from './helpers.ts'

let ctx: TestContext
beforeAll(async () => {
  ctx = await createTestContext()
})
afterAll(() => ctx.close())

describe('cadastro', () => {
  it('cria a conta, abre a sessão e nunca devolve a senha', async () => {
    const res = await api(ctx.app, 'POST', '/api/auth/register', {
      body: { name: 'Ana Souza', email: 'ANA@Exemplo.com', password: 'senha-forte-1' },
    })
    expect(res.status).toBe(201)
    expect(res.body.user).toMatchObject({ name: 'Ana Souza', email: 'ana@exemplo.com' })
    expect(res.body.user.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(JSON.stringify(res.body)).not.toMatch(/senha-forte|password|hash/i)
    expect(res.setCookie).toHaveLength(1)

    // a senha foi guardada como hash scrypt, nunca em texto
    const [row] = await ctx.sql<{ password_hash: string }[]>`select password_hash from users where email = 'ana@exemplo.com'`
    expect(row!.password_hash.startsWith('scrypt$')).toBe(true)
    expect(row!.password_hash).not.toContain('senha-forte-1')
  })

  it('o cookie é HttpOnly, SameSite=Lax e dura 30 dias', async () => {
    const user = await registerUser(ctx.app)
    const res = await api(ctx.app, 'POST', '/api/auth/login', {
      body: { email: user.email, password: user.password, remember: true },
    })
    const cookie = res.setCookie[0]!
    expect(cookie).toMatch(/^ritmo_session=/)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
    expect(cookie).toMatch(/Path=\//)
    expect(cookie).toMatch(/Max-Age=2592000/)
    expect(cookie).not.toMatch(/Secure/i) // ambiente de teste é http
  })

  it('só guarda o hash do token no banco, nunca o token', async () => {
    const user = await registerUser(ctx.app)
    const token = user.cookie.split('=')[1]!
    const rows = await ctx.sql<{ id: string }[]>`select id from sessions where user_id = ${user.id}`
    expect(rows).toHaveLength(1)
    expect(rows[0]!.id).not.toBe(token)
    expect(rows[0]!.id).toMatch(/^[0-9a-f]{64}$/)
  })

  it('recusa e-mail repetido, sem diferenciar maiúsculas', async () => {
    const user = await registerUser(ctx.app, { email: 'repetido@exemplo.com' })
    const res = await api(ctx.app, 'POST', '/api/auth/register', {
      body: { name: 'Outra', email: 'REPETIDO@exemplo.com', password: 'senha-forte-1' },
    })
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('email_taken')
    expect(user.email).toBe('repetido@exemplo.com')
  })

  it.each([
    ['e-mail inválido', { name: 'Ana', email: 'ana', password: 'senha-forte-1' }],
    ['senha curta', { name: 'Ana', email: 'curta@exemplo.com', password: '123' }],
    ['sem nome', { name: ' ', email: 'sem-nome@exemplo.com', password: 'senha-forte-1' }],
    ['corpo vazio', {}],
  ])('valida a entrada: %s', async (_name, body) => {
    const res = await api(ctx.app, 'POST', '/api/auth/register', { body })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('invalid_input')
    expect(Array.isArray(res.body.details)).toBe(true)
  })

  it('respeita ALLOW_SIGNUP=false', async () => {
    ctx.config.allowSignup = false
    try {
      const res = await api(ctx.app, 'POST', '/api/auth/register', {
        body: { name: 'Ana', email: 'fechado@exemplo.com', password: 'senha-forte-1' },
      })
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('signup_disabled')
      const cfg = await api(ctx.app, 'GET', '/api/config')
      expect(cfg.body.allowSignup).toBe(false)
    } finally {
      ctx.config.allowSignup = true
    }
  })
})

describe('login', () => {
  it('entra com e-mail em qualquer caixa e devolve o usuário', async () => {
    const user = await registerUser(ctx.app, { email: 'login@exemplo.com' })
    const res = await api(ctx.app, 'POST', '/api/auth/login', {
      body: { email: 'LOGIN@Exemplo.com', password: user.password },
    })
    expect(res.status).toBe(200)
    expect(res.body.user.id).toBe(user.id)
    expect(cookieFrom(res.setCookie)).toMatch(/^ritmo_session=/)
  })

  it('sem "manter conectado" o cookie é de sessão (sem Max-Age) e a sessão dura 24 h', async () => {
    const user = await registerUser(ctx.app)
    const res = await api(ctx.app, 'POST', '/api/auth/login', {
      body: { email: user.email, password: user.password, remember: false },
    })
    expect(res.setCookie[0]).not.toMatch(/Max-Age|Expires/i)
    // a sessão mais recente é a do login (o cadastro criou outra, de 30 dias)
    const [row] = await ctx.sql<{ hours: number }[]>`
      select extract(epoch from (expires_at - now())) / 3600 as hours
      from sessions where user_id = ${user.id} order by created_at desc limit 1`
    expect(row!.hours).toBeGreaterThan(23)
    expect(row!.hours).toBeLessThan(25)
  })

  it('usa a mesma resposta para senha errada e e-mail inexistente', async () => {
    const user = await registerUser(ctx.app)
    const wrongPassword = await api(ctx.app, 'POST', '/api/auth/login', {
      body: { email: user.email, password: 'senha-errada-123' },
    })
    const unknownEmail = await api(ctx.app, 'POST', '/api/auth/login', {
      body: { email: 'ninguem@exemplo.com', password: 'senha-errada-123' },
    })
    expect(wrongPassword.status).toBe(401)
    expect(unknownEmail.status).toBe(401)
    expect(wrongPassword.body).toEqual(unknownEmail.body)
    expect(wrongPassword.body.error).toBe('invalid_credentials')
    expect(wrongPassword.setCookie).toHaveLength(0)
  })
})

describe('sessão', () => {
  it('GET /me exige cookie válido', async () => {
    const user = await registerUser(ctx.app)
    const ok = await api(ctx.app, 'GET', '/api/auth/me', { cookie: user.cookie })
    expect(ok.status).toBe(200)
    expect(ok.body.user).toMatchObject({ id: user.id, email: user.email, name: user.name })

    expect((await api(ctx.app, 'GET', '/api/auth/me')).status).toBe(401)
    const garbage = await api(ctx.app, 'GET', '/api/auth/me', { cookie: 'ritmo_session=lixo' })
    expect(garbage.status).toBe(401)
    expect(garbage.body.error).toBe('unauthorized')
  })

  it('logout encerra a sessão no servidor e é idempotente', async () => {
    const user = await registerUser(ctx.app)
    const out = await api(ctx.app, 'POST', '/api/auth/logout', { cookie: user.cookie })
    expect(out.status).toBe(204)
    expect((await api(ctx.app, 'GET', '/api/auth/me', { cookie: user.cookie })).status).toBe(401)
    expect((await api(ctx.app, 'POST', '/api/auth/logout')).status).toBe(204)
  })

  it('sessão vencida é recusada', async () => {
    const user = await registerUser(ctx.app)
    await ctx.sql`update sessions set expires_at = now() - interval '1 minute' where user_id = ${user.id}`
    expect((await api(ctx.app, 'GET', '/api/auth/me', { cookie: user.cookie })).status).toBe(401)
  })

  it('renova a sessão quando passou de metade da validade', async () => {
    const user = await registerUser(ctx.app)
    await ctx.sql`update sessions set expires_at = now() + interval '1 day' where user_id = ${user.id}`
    const res = await api(ctx.app, 'GET', '/api/auth/me', { cookie: user.cookie })
    expect(res.status).toBe(200)
    expect(res.setCookie[0]).toMatch(/Max-Age=2592000/) // cookie reemitido
    const [row] = await ctx.sql<{ days: number }[]>`
      select extract(epoch from (expires_at - now())) / 86400 as days from sessions where user_id = ${user.id}`
    expect(row!.days).toBeGreaterThan(29)
  })

  it('não renova uma sessão que ainda tem mais da metade da validade', async () => {
    const user = await registerUser(ctx.app)
    const res = await api(ctx.app, 'GET', '/api/auth/me', { cookie: user.cookie })
    expect(res.setCookie).toHaveLength(0)
  })
})

describe('perfil e senha', () => {
  it('PATCH /me troca o nome', async () => {
    const user = await registerUser(ctx.app)
    const res = await api(ctx.app, 'PATCH', '/api/auth/me', { cookie: user.cookie, body: { name: '  Novo Nome ' } })
    expect(res.status).toBe(200)
    expect(res.body.user.name).toBe('Novo Nome')
    expect((await api(ctx.app, 'PATCH', '/api/auth/me', { cookie: user.cookie, body: { name: '' } })).status).toBe(400)
  })

  it('troca de senha exige a atual, vale no próximo login e derruba as outras sessões', async () => {
    const user = await registerUser(ctx.app)
    const second = await api(ctx.app, 'POST', '/api/auth/login', {
      body: { email: user.email, password: user.password, remember: true },
    })
    const otherDevice = cookieFrom(second.setCookie)

    const wrong = await api(ctx.app, 'POST', '/api/auth/password', {
      cookie: user.cookie,
      body: { currentPassword: 'errada-errada', newPassword: 'nova-senha-456' },
    })
    expect(wrong.status).toBe(400)
    expect(wrong.body.error).toBe('wrong_password')

    const ok = await api(ctx.app, 'POST', '/api/auth/password', {
      cookie: user.cookie,
      body: { currentPassword: user.password, newPassword: 'nova-senha-456' },
    })
    expect(ok.status).toBe(204)

    expect((await api(ctx.app, 'GET', '/api/auth/me', { cookie: user.cookie })).status).toBe(200) // atual continua
    expect((await api(ctx.app, 'GET', '/api/auth/me', { cookie: otherDevice })).status).toBe(401) // outro aparelho caiu

    const oldLogin = await api(ctx.app, 'POST', '/api/auth/login', { body: { email: user.email, password: user.password } })
    expect(oldLogin.status).toBe(401)
    const newLogin = await api(ctx.app, 'POST', '/api/auth/login', { body: { email: user.email, password: 'nova-senha-456' } })
    expect(newLogin.status).toBe(200)
  })

  it('excluir a conta exige a senha e apaga tudo (cascade)', async () => {
    const user = await registerUser(ctx.app)
    const habit = makeHabit()
    expect((await api(ctx.app, 'PUT', `/api/habits/${habit.id}`, { cookie: user.cookie, body: habit })).status).toBe(204)

    const wrong = await api(ctx.app, 'DELETE', '/api/auth/me', { cookie: user.cookie, body: { password: 'nao-e-essa' } })
    expect(wrong.status).toBe(400)

    const ok = await api(ctx.app, 'DELETE', '/api/auth/me', { cookie: user.cookie, body: { password: user.password } })
    expect(ok.status).toBe(204)

    expect((await api(ctx.app, 'GET', '/api/auth/me', { cookie: user.cookie })).status).toBe(401)
    const [counts] = await ctx.sql<{ users: number; habits: number; sessions: number }[]>`
      select (select count(*)::int from users where id = ${user.id}) as users,
             (select count(*)::int from habits where user_id = ${user.id}) as habits,
             (select count(*)::int from sessions where user_id = ${user.id}) as sessions`
    expect(counts).toEqual({ users: 0, habits: 0, sessions: 0 })
  })
})

describe('rate limit', () => {
  it('bloqueia tentativas de login em excesso com 429', async () => {
    const strict = await buildApp({
      sql: ctx.sql,
      config: {
        ...ctx.config,
        rateLimits: { ...ctx.config.rateLimits, auth: { max: 3, window: '1 minute' } },
      },
    })
    await strict.ready()
    try {
      const attempt = () =>
        api(strict, 'POST', '/api/auth/login', { body: { email: 'alguem@exemplo.com', password: 'tentativa-1' } })
      expect((await attempt()).status).toBe(401)
      expect((await attempt()).status).toBe(401)
      expect((await attempt()).status).toBe(401)
      const blocked = await attempt()
      expect(blocked.status).toBe(429)
      expect(blocked.body.error).toBe('rate_limited')
      expect(blocked.headers['retry-after']).toBeDefined()
    } finally {
      await strict.close()
    }
  })
})
