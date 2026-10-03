import type { Project } from './types'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) {
    const msg = await r.json().then((j) => j.error as string).catch(() => '')
    throw new ApiError(r.status, msg || `Erro ${r.status}`)
  }
  return r.status === 204 ? (undefined as T) : r.json()
}

export const api = {
  me: () => req<{ user: string }>('GET', '/api/me'),
  login: (user: string, password: string) => req<{ user: string }>('POST', '/api/login', { user, password }),
  logout: () => req<void>('POST', '/api/logout'),
  list: () => req<Project[]>('GET', '/api/projects'),
  save: (p: Project) => req<void>('PUT', `/api/projects/${p.id}`, p),
  remove: (id: string) => req<void>('DELETE', `/api/projects/${id}`),
}
