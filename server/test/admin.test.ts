import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { listUsers, resetPassword } from '../src/admin.ts'
import { api, createTestContext, registerUser } from './helpers.ts'
import type { TestContext } from './helpers.ts'

let ctx: TestContext
beforeAll(async () => {
  ctx = await createTestContext()
})
afterAll(() => ctx.close())

describe('comandos de administração', () => {
  it('resetPassword troca a senha, ignora maiúsculas no e-mail e derruba as sessões', async () => {
    const user = await registerUser(ctx.app, { email: 'esqueci@exemplo.com' })
    expect((await api(ctx.app, 'GET', '/api/auth/me', { cookie: user.cookie })).status).toBe(200)

    expect(await resetPassword(ctx.sql, 'Esqueci@Exemplo.com', 'senha-nova-789')).toBe(true)

    expect((await api(ctx.app, 'GET', '/api/auth/me', { cookie: user.cookie })).status).toBe(401)
    const oldLogin = await api(ctx.app, 'POST', '/api/auth/login', { body: { email: user.email, password: user.password } })
    expect(oldLogin.status).toBe(401)
    const newLogin = await api(ctx.app, 'POST', '/api/auth/login', { body: { email: user.email, password: 'senha-nova-789' } })
    expect(newLogin.status).toBe(200)
  })

  it('resetPassword devolve false para e-mail inexistente', async () => {
    expect(await resetPassword(ctx.sql, 'ninguem@exemplo.com', 'senha-nova-789')).toBe(false)
  })

  it('listUsers lista as contas por ordem de criação, sem expor hash', async () => {
    await registerUser(ctx.app, { email: 'a-lista@exemplo.com', name: 'Primeira' })
    await registerUser(ctx.app, { email: 'b-lista@exemplo.com', name: 'Segunda' })
    const users = await listUsers(ctx.sql)
    const emails = users.map((u) => u.email)
    expect(emails.indexOf('a-lista@exemplo.com')).toBeLessThan(emails.indexOf('b-lista@exemplo.com'))
    expect(JSON.stringify(users)).not.toMatch(/scrypt|password/i)
  })
})
