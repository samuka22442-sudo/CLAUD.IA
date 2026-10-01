import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, errorMessage, isAppData, isTransient, request, syncApi } from './api.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

afterEach(() => vi.unstubAllGlobals())

describe('request', () => {
  it('devolve o JSON de uma resposta 2xx e envia JSON no corpo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(request('POST', '/api/x', { a: 1 })).resolves.toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/x')
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin', body: '{"a":1}' })
    expect(init.headers).toEqual({ 'content-type': 'application/json' })
  })

  it('204 vira undefined', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    await expect(request('DELETE', '/api/x')).resolves.toBeUndefined()
  })

  it('traduz o erro da API em ApiError com status e código', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: 'invalid_credentials', message: 'E-mail ou senha incorretos' }, 401)))
    const error = await request('POST', '/api/auth/login', {}).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 401, code: 'invalid_credentials', message: 'E-mail ou senha incorretos' })
  })

  it('sem rede (fetch rejeita) → ApiError status 0, tratado como temporário', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const error = await request('GET', '/api/data').catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 0, code: 'network' })
    expect(isTransient(error)).toBe(true)
  })

  it('conexão cortada NO MEIO da leitura do corpo é falha de rede, nunca "sucesso vazio"', async () => {
    const broken = { ok: true, status: 200, text: () => Promise.reject(new TypeError('network error')) }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(broken))
    const error = await request('GET', '/api/data').catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 0, code: 'network' })
  })

  it('resposta 200 que não é JSON é um erro (ex.: página HTML no lugar da API)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>oi</html>', { status: 200 })))
    await expect(request('GET', '/api/data')).rejects.toMatchObject({ status: 200, code: 'unknown' })
  })

  it('erro com corpo que não é JSON ainda vira ApiError com o status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', { status: 502 })))
    const error = await request('GET', '/api/data').catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 502, code: 'unknown' })
    expect(isTransient(error)).toBe(true)
  })
})

describe('isTransient', () => {
  it('só falhas de rede, 5xx, 408 e 429 valem nova tentativa', () => {
    const make = (status: number) => new ApiError(status, 'unknown', '')
    for (const status of [0, 500, 502, 503, 408, 429]) expect(isTransient(make(status)), String(status)).toBe(true)
    for (const status of [400, 401, 403, 404, 409, 413]) expect(isTransient(make(status)), String(status)).toBe(false)
    expect(isTransient(new Error('x'))).toBe(false)
  })
})

describe('fetchData', () => {
  it('só aceita as três listas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ habits: [], goals: [], routines: [] })))
    await expect(syncApi.fetchData()).resolves.toEqual({ habits: [], goals: [], routines: [] })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ habits: [] })))
    await expect(syncApi.fetchData()).rejects.toBeInstanceOf(ApiError)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(null)))
    await expect(syncApi.fetchData()).rejects.toBeInstanceOf(ApiError)
  })

  it('isAppData rejeita lixo', () => {
    expect(isAppData(undefined)).toBe(false)
    expect(isAppData('x')).toBe(false)
    expect(isAppData({ habits: 1, goals: [], routines: [] })).toBe(false)
    expect(isAppData({ habits: [], goals: [], routines: [] })).toBe(true)
  })
})

describe('errorMessage', () => {
  it('mostra mensagens em português para os erros comuns', () => {
    expect(errorMessage(new ApiError(0, 'network', ''))).toMatch(/Sem conexão/)
    expect(errorMessage(new ApiError(401, 'invalid_credentials', ''))).toBe('E-mail ou senha incorretos.')
    expect(errorMessage(new ApiError(409, 'email_taken', ''))).toBe('Este e-mail já está cadastrado.')
    expect(errorMessage(new ApiError(429, 'rate_limited', ''))).toMatch(/Muitas tentativas/)
    expect(errorMessage(new ApiError(500, 'internal', ''))).toMatch(/servidor/)
    expect(errorMessage(new Error('x'))).toBe('Algo deu errado. Tente novamente.')
  })
})
