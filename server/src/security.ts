import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto'
import type { ScryptOptions } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>

// Custo do scrypt: ~100 ms e 32 MiB por verificação. O rate limit de login protege contra abuso.
const COST = { N: 32_768, r: 8, p: 1, keylen: 64 }
const MAXMEM = 64 * 1024 * 1024

const normalize = (password: string) => password.normalize('NFKC')

/** Formato guardado: scrypt$N$r$p$salt(base64)$hash(base64). Os parâmetros ficam junto, então o custo pode subir no futuro. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptAsync(normalize(password), salt, COST.keylen, {
    N: COST.N,
    r: COST.r,
    p: COST.p,
    maxmem: MAXMEM,
  })
  return ['scrypt', COST.N, COST.r, COST.p, salt.toString('base64'), key.toString('base64')].join('$')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, nRaw, rRaw, pRaw, saltB64, hashB64] = parts
  const N = Number(nRaw)
  const r = Number(rRaw)
  const p = Number(pRaw)
  if (!saltB64 || !hashB64) return false
  // Sanidade dos parâmetros vindos do banco (evita custo absurdo caso a linha seja adulterada).
  if (!Number.isInteger(N) || N < 2 || N > 2 ** 20 || (N & (N - 1)) !== 0) return false
  if (!Number.isInteger(r) || r < 1 || r > 16 || !Number.isInteger(p) || p < 1 || p > 4) return false

  const expected = Buffer.from(hashB64, 'base64')
  const actual = await scryptAsync(normalize(password), Buffer.from(saltB64, 'base64'), expected.length, {
    N,
    r,
    p,
    maxmem: 128 * N * r * 2 + 1024 * 1024,
  })
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

let dummyHash: Promise<string> | undefined

/** Gasta o mesmo tempo de uma verificação real, para o login não revelar se o e-mail existe. */
export async function dummyVerify(password: string): Promise<void> {
  dummyHash ??= hashPassword('senha-que-ninguem-usa')
  await verifyPassword(password, await dummyHash)
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** `token` vai no cookie; só o `id` (sha256 do token) é guardado no banco. */
export function newSessionToken(): { token: string; id: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, id: hashToken(token) }
}

const PASSWORD_ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Senha aleatória legível (sem 0/O, 1/l/I) para o comando de reset do administrador. */
export function generatePassword(length = 16): string {
  let out = ''
  for (let i = 0; i < length; i++) out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]
  return out
}
