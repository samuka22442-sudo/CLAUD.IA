// Servidor do NetDiagram: login de usuário único, projetos em SQLite e arquivos estáticos.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const here = path.dirname(fileURLToPath(import.meta.url))
const env = process.env
const PORT = Number(env.PORT ?? 3000)
const DATA_DIR = env.DATA_DIR ?? path.join(here, '..', 'data')
const DIST_DIR = env.DIST_DIR ?? path.join(here, '..', 'dist')
const COOKIE_SECURE = (env.COOKIE_SECURE ?? 'true') !== 'false'
const TRUST_PROXY = env.TRUST_PROXY === '1'
const SESSION_DAYS = 7

const { ADMIN_USER, ADMIN_PASSWORD, SESSION_SECRET } = env
if (!ADMIN_USER || !ADMIN_PASSWORD || !SESSION_SECRET || SESSION_SECRET.length < 16) {
  console.error('Defina ADMIN_USER, ADMIN_PASSWORD e SESSION_SECRET (mínimo 16 caracteres).')
  process.exit(1)
}

fs.mkdirSync(DATA_DIR, { recursive: true })
const db = new DatabaseSync(path.join(DATA_DIR, 'netdiagram.db'))
db.exec(`CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL)`)
const qList = db.prepare('SELECT data FROM projects ORDER BY updated_at DESC')
const qUpsert = db.prepare(
  'INSERT INTO projects (id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
)
const qDelete = db.prepare('DELETE FROM projects WHERE id = ?')

// --- sessão (cookie assinado, sem estado no servidor) ---
const sign = (v) => crypto.createHmac('sha256', SESSION_SECRET).update(v).digest('base64url')
const sha = (v) => crypto.createHash('sha256').update(String(v)).digest()
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b))

function makeToken() {
  const exp = String(Date.now() + SESSION_DAYS * 864e5)
  return `${exp}.${sign(exp)}`
}
function validToken(t) {
  if (!t) return false
  const [exp, sig] = t.split('.')
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false
  return Number(exp) > Date.now()
}
function cookieOf(req, name) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
}
const setCookie = (res, value, maxAge) =>
  res.setHeader('Set-Cookie', `nd_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${COOKIE_SECURE ? '; Secure' : ''}`)

// --- limite de tentativas de login ---
const attempts = new Map()
function ipOf(req) {
  if (TRUST_PROXY) return String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket.remoteAddress
  return req.socket.remoteAddress
}
function tooMany(ip) {
  const a = attempts.get(ip)
  return !!a && a.resetAt > Date.now() && a.count >= 8
}
function fail(ip) {
  const a = attempts.get(ip)
  if (!a || a.resetAt <= Date.now()) attempts.set(ip, { count: 1, resetAt: Date.now() + 10 * 60e3 })
  else a.count++
}

// --- utilidades HTTP ---
const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(body === undefined ? '' : JSON.stringify(body))
}
function readJson(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) { reject(Object.assign(new Error('Corpo grande demais'), { status: 413 })); req.destroy() }
      else chunks.push(c)
    })
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString() || 'null')) }
      catch { reject(Object.assign(new Error('JSON inválido'), { status: 400 })) }
    })
    req.on('error', reject)
  })
}

const isProject = (p) =>
  p && typeof p === 'object' && typeof p.name === 'string' && p.name.length <= 200 &&
  Array.isArray(p.devices) && Array.isArray(p.cables) && Array.isArray(p.notes)

async function api(req, res, url) {
  const route = url.pathname
  const method = req.method

  // proteção CSRF extra: em escrita, a origem precisa ser o próprio site
  if (method !== 'GET' && req.headers.origin) {
    let host
    try { host = new URL(req.headers.origin).host } catch { host = '' }
    const own = TRUST_PROXY ? req.headers['x-forwarded-host'] ?? req.headers.host : req.headers.host
    if (host !== own) return send(res, 403, { error: 'Origem não permitida' })
  }

  if (route === '/api/login' && method === 'POST') {
    const ip = ipOf(req)
    if (tooMany(ip)) return send(res, 429, { error: 'Muitas tentativas. Aguarde alguns minutos.' })
    const b = await readJson(req, 4096)
    const okUser = safeEqual(b?.user ?? '', ADMIN_USER)
    const okPass = safeEqual(b?.password ?? '', ADMIN_PASSWORD)
    if (!(okUser && okPass)) {
      fail(ip)
      return send(res, 401, { error: 'Usuário ou senha incorretos.' })
    }
    attempts.delete(ip)
    setCookie(res, makeToken(), SESSION_DAYS * 86400)
    return send(res, 200, { user: ADMIN_USER })
  }
  if (route === '/api/logout' && method === 'POST') {
    setCookie(res, '', 0)
    return send(res, 204)
  }

  if (!validToken(cookieOf(req, 'nd_session'))) return send(res, 401, { error: 'Não autenticado' })

  if (route === '/api/me' && method === 'GET') return send(res, 200, { user: ADMIN_USER })
  if (route === '/api/projects' && method === 'GET') return send(res, 200, qList.all().map((r) => JSON.parse(r.data)))

  const m = /^\/api\/projects\/([\w-]{1,40})$/.exec(route)
  if (m && method === 'PUT') {
    const p = await readJson(req)
    if (!isProject(p)) return send(res, 400, { error: 'Projeto inválido' })
    qUpsert.run(m[1], JSON.stringify({ ...p, id: m[1] }), Date.now())
    return send(res, 204)
  }
  if (m && method === 'DELETE') {
    qDelete.run(m[1])
    return send(res, 204)
  }
  return send(res, 404, { error: 'Não encontrado' })
}

// --- arquivos estáticos ---
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.map': 'application/json',
}
const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-ancestors 'none'",
}

function serveStatic(req, res, url) {
  let file = path.join(DIST_DIR, path.normalize(decodeURIComponent(url.pathname)))
  if (!file.startsWith(DIST_DIR)) return send(res, 403, { error: 'Proibido' })
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST_DIR, 'index.html')
  if (!fs.existsSync(file)) return send(res, 404, { error: 'Build não encontrado. Rode npm run build.' })
  const ext = path.extname(file)
  const immutable = file.includes(`${path.sep}assets${path.sep}`)
  res.writeHead(200, {
    ...SECURITY,
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  })
  fs.createReadStream(file).pipe(res)
}

http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost')
      if (url.pathname.startsWith('/api/')) {
        for (const [k, v] of Object.entries(SECURITY)) res.setHeader(k, v)
        return await api(req, res, url)
      }
      serveStatic(req, res, url)
    } catch (e) {
      if (!res.headersSent) send(res, e.status ?? 500, { error: e.status ? e.message : 'Erro interno' })
      if (!e.status) console.error(e)
    }
  })
  .listen(PORT, () => console.log(`NetDiagram em http://localhost:${PORT}`))
