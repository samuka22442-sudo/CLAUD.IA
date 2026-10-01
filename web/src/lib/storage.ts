/**
 * Acesso seguro ao localStorage. Ele pode lançar exceção ou não existir (janela privada, dados
 * bloqueados, armazenamento cheio), então tudo aqui falha em silêncio e o app segue funcionando em memória.
 */
function store(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function readString(key: string): string | null {
  try {
    return store()?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function writeString(key: string, value: string): boolean {
  try {
    store()?.setItem(key, value)
    return store() !== null
  } catch {
    return false
  }
}

export function readJSON<T>(key: string): T | null {
  const raw = readString(key)
  if (raw === null) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export const writeJSON = (key: string, value: unknown): boolean => writeString(key, JSON.stringify(value))

export function removeKey(key: string): void {
  try {
    store()?.removeItem(key)
  } catch {
    // sem armazenamento: nada a remover
  }
}

/** Chaves usadas pelo app (versionadas para permitir migrações futuras). */
export const KEYS = {
  me: 'ritmo:v1:me',
  mode: 'ritmo:v1:mode',
  demo: 'ritmo:v1:demo',
  pendingLogout: 'ritmo:v1:pending-logout',
  data: (userId: string) => `ritmo:v1:data:${userId}`,
} as const
