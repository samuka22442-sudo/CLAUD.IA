import type { ApiErrorCode, AppData, PublicConfig, User } from '@ritmo/shared'
import type { HttpRequest } from './ops.ts'

export type ApiErrorKind = ApiErrorCode | 'network' | 'unknown'

/** Erro de uma chamada à API. `status` 0 = sem resposta (offline, timeout, servidor fora). */
export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorKind

  constructor(status: number, code: ApiErrorKind, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/** Falhas que valem uma nova tentativa depois (sem rede, servidor instável, limite de requisições). */
export const isTransient = (error: unknown): boolean =>
  error instanceof ApiError && (error.status === 0 || error.status >= 500 || error.status === 408 || error.status === 429)

const TIMEOUT_MS = 20_000

export async function request<T = void>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method,
      headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      // AbortSignal.timeout não existe em Safari < 16: sem ele a chamada só não tem limite de tempo.
      signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(TIMEOUT_MS) : undefined,
    })
  } catch {
    throw new ApiError(0, 'network', 'Sem conexão com o servidor')
  }

  if (response.status === 204) return undefined as T

  // Ler o corpo também pode falhar (conexão cortada no meio, troca de página): é falha de rede, nunca "sucesso vazio".
  let text: string
  try {
    text = await response.text()
  } catch {
    throw new ApiError(0, 'network', 'A conexão foi interrompida')
  }

  let payload: unknown
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      if (response.ok) throw new ApiError(response.status, 'unknown', 'Resposta inesperada do servidor')
    }
  }
  if (!response.ok) {
    const info = (payload ?? {}) as { error?: ApiErrorCode; message?: string }
    throw new ApiError(response.status, info.error ?? 'unknown', info.message ?? `Erro ${response.status}`)
  }
  return payload as T
}

/** Mensagens em pt-BR para os códigos de erro mais comuns. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Algo deu errado. Tente novamente.'
  switch (error.code) {
    case 'network':
      return 'Sem conexão com o servidor. Verifique sua internet.'
    case 'invalid_credentials':
      return 'E-mail ou senha incorretos.'
    case 'email_taken':
      return 'Este e-mail já está cadastrado.'
    case 'signup_disabled':
      return 'O cadastro de novas contas está desativado neste servidor.'
    case 'rate_limited':
      return 'Muitas tentativas. Aguarde um pouco e tente de novo.'
    case 'wrong_password':
      return error.message
    case 'invalid_input':
      return error.message || 'Confira os dados informados.'
    case 'unauthorized':
      return 'Sua sessão expirou. Entre novamente.'
    default:
      return error.status >= 500 ? 'O servidor teve um problema. Tente de novo em instantes.' : error.message
  }
}

/** O servidor sempre devolve as três listas; qualquer outra coisa é resposta inválida. */
export function isAppData(value: unknown): value is AppData {
  if (typeof value !== 'object' || value === null) return false
  const data = value as Partial<AppData>
  return Array.isArray(data.habits) && Array.isArray(data.goals) && Array.isArray(data.routines)
}

export const syncApi = {
  send: (req: HttpRequest) => request(req.method, req.path, req.body),
  async fetchData(): Promise<AppData> {
    const data = await request<unknown>('GET', '/api/data')
    if (!isAppData(data)) throw new ApiError(200, 'unknown', 'Resposta inesperada do servidor')
    return data
  },
}

export const authApi = {
  config: () => request<PublicConfig>('GET', '/api/config'),
  me: () => request<{ user: User }>('GET', '/api/auth/me'),
  register: (input: { name: string; email: string; password: string }) =>
    request<{ user: User }>('POST', '/api/auth/register', input),
  login: (input: { email: string; password: string; remember: boolean }) =>
    request<{ user: User }>('POST', '/api/auth/login', input),
  logout: () => request('POST', '/api/auth/logout'),
  updateName: (name: string) => request<{ user: User }>('PATCH', '/api/auth/me', { name }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request('POST', '/api/auth/password', { currentPassword, newPassword }),
  deleteAccount: (password: string) => request('DELETE', '/api/auth/me', { password }),
}
