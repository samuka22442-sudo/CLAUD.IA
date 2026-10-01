import { describe, expect, it } from 'vitest'
import { generatePassword, hashPassword, hashToken, newSessionToken, verifyPassword } from '../src/security.ts'

describe('senhas (scrypt)', () => {
  it('verifica a senha correta e rejeita a errada', async () => {
    const hash = await hashPassword('minha-senha-forte')
    expect(hash.startsWith('scrypt$32768$8$1$')).toBe(true)
    expect(await verifyPassword('minha-senha-forte', hash)).toBe(true)
    expect(await verifyPassword('minha-senha-fortE', hash)).toBe(false)
  })

  it('usa um salt diferente a cada hash', async () => {
    const [a, b] = await Promise.all([hashPassword('igual'), hashPassword('igual')])
    expect(a).not.toBe(b)
    expect(await verifyPassword('igual', a)).toBe(true)
    expect(await verifyPassword('igual', b)).toBe(true)
  })

  it('trata formas Unicode equivalentes como a mesma senha (NFKC)', async () => {
    const hash = await hashPassword('café-secreto') // é composto
    expect(await verifyPassword('café-secreto', hash)).toBe(true) // e + acento combinante
  })

  it.each([
    ['vazio', ''],
    ['sem separadores', 'lixo'],
    ['algoritmo errado', 'bcrypt$1$2$3$AAAA$BBBB'],
    ['parâmetro N absurdo', 'scrypt$1073741824$8$1$AAAA$BBBB'],
    ['N que não é potência de 2', 'scrypt$1000$8$1$AAAA$BBBB'],
    ['sem salt', 'scrypt$16384$8$1$$BBBB'],
  ])('hash guardado malformado (%s) nunca valida', async (_name, stored) => {
    expect(await verifyPassword('qualquer', stored)).toBe(false)
  })
})

describe('tokens de sessão', () => {
  it('gera tokens únicos e guarda só o sha256', () => {
    const a = newSessionToken()
    const b = newSessionToken()
    expect(a.token).not.toBe(b.token)
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/) // 32 bytes em base64url
    expect(a.id).toMatch(/^[0-9a-f]{64}$/)
    expect(a.id).toBe(hashToken(a.token))
    expect(a.id).not.toContain(a.token)
  })
})

describe('generatePassword', () => {
  it('gera senhas legíveis do tamanho pedido', () => {
    const password = generatePassword(20)
    expect(password).toHaveLength(20)
    expect(password).toMatch(/^[a-km-zA-HJ-NP-Z2-9]+$/) // sem 0 O 1 l I
    expect(generatePassword()).not.toBe(generatePassword())
  })
})
