import type { User } from '@ritmo/shared'
import { create } from 'zustand'
import { DEMO_BUILD } from '../lib/env.ts'
import { KEYS, readJSON, readString, removeKey, writeJSON, writeString } from '../lib/storage.ts'
import { ApiError, authApi } from '../sync/api.ts'
import { useData, wipeCache } from './data.ts'
import { startSync, stopSync } from './sync.ts'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

/** Usuário fictício do modo demonstração (dados só neste aparelho, sem servidor). */
export const DEMO_USER: User = { id: 'demo', name: 'Visitante', email: '', createdAt: new Date(0).toISOString() }

interface Credentials {
  email: string
  password: string
  remember: boolean
}

interface AuthState {
  status: AuthStatus
  user: User | null
  mode: 'remote' | 'demo'
  /** Se o servidor aceita novos cadastros (GET /api/config). */
  allowSignup: boolean
  /** A sessão expirou com o app aberto: a tela de login mostra um aviso. */
  sessionExpired: boolean

  init: () => Promise<void>
  login: (input: Credentials) => Promise<void>
  register: (input: { name: string; email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  enterDemo: () => void
  updateName: (name: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  deleteAccount: (password: string) => Promise<void>
  expire: () => void
}

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,
  mode: 'remote',
  allowSignup: true,
  sessionExpired: false,

  init() {
    // Idempotente: o StrictMode do React roda os efeitos duas vezes em desenvolvimento.
    return (initPromise ??= doInit())
  },

  async login(input) {
    const { user } = await authApi.login(input)
    removeKey(KEYS.pendingLogout)
    activate(user)
  },

  async register(input) {
    const { user } = await authApi.register(input)
    removeKey(KEYS.pendingLogout)
    activate(user)
  },

  async logout() {
    const { mode, user } = get()
    stopSync()
    useData.getState().unload() // grava o cache uma última vez e limpa a memória; o apagão vem abaixo

    if (mode === 'demo') {
      wipeCache('demo', 'demo')
      removeKey(KEYS.mode)
    } else {
      // O cookie de sessão é HttpOnly (o JS não consegue apagá-lo): se estiver sem rede, o servidor é
      // avisado na próxima abertura, e até lá o app não "reloga" sozinho.
      writeString(KEYS.pendingLogout, '1')
      try {
        await authApi.logout()
        removeKey(KEYS.pendingLogout)
      } catch {
        // sem conexão: fica marcado como pendente
      }
      removeKey(KEYS.me)
      if (user) wipeCache('remote', user.id)
    }
    set({ status: 'anonymous', user: null, mode: 'remote', sessionExpired: false })
  },

  enterDemo() {
    writeString(KEYS.mode, 'demo')
    useData.getState().load(DEMO_USER.id, 'demo')
    set({ status: 'authenticated', user: DEMO_USER, mode: 'demo', sessionExpired: false })
  },

  async updateName(name) {
    if (get().mode === 'demo') {
      set({ user: { ...DEMO_USER, name } })
      return
    }
    const { user } = await authApi.updateName(name)
    writeJSON(KEYS.me, { user })
    set({ user })
  },

  async changePassword(currentPassword, newPassword) {
    await authApi.changePassword(currentPassword, newPassword)
  },

  async deleteAccount(password) {
    const { user } = get()
    await authApi.deleteAccount(password)
    stopSync()
    useData.getState().unload()
    removeKey(KEYS.me)
    if (user) wipeCache('remote', user.id)
    set({ status: 'anonymous', user: null, mode: 'remote', sessionExpired: false })
  },

  expire() {
    stopSync()
    useData.getState().unload() // mantém o cache em disco: ao entrar de novo, as pendências são retomadas
    removeKey(KEYS.me)
    set({ status: 'anonymous', user: null, mode: 'remote', sessionExpired: true })
  },
}))

let initPromise: Promise<void> | null = null

/** Entra no modo remoto: carrega o cache do usuário e liga a sincronização. */
function activate(user: User): void {
  writeJSON(KEYS.me, { user })
  removeKey(KEYS.mode)
  useData.getState().load(user.id, 'remote')
  useAuth.setState({ status: 'authenticated', user, mode: 'remote', sessionExpired: false })
  startSync(() => useAuth.getState().expire())
}

async function doInit(): Promise<void> {
  // Versão estática (sem servidor): abre direto na demonstração.
  if (DEMO_BUILD) {
    useAuth.getState().enterDemo()
    return
  }

  // Configuração pública (cadastro aberto?) — não bloqueia a abertura.
  authApi
    .config()
    .then((config) => useAuth.setState({ allowSignup: config.allowSignup }))
    .catch(() => {})

  // Um logout feito sem rede ainda precisa chegar ao servidor.
  if (readString(KEYS.pendingLogout)) {
    try {
      await authApi.logout()
      removeKey(KEYS.pendingLogout)
    } catch {
      // continua sem rede
    }
    useAuth.setState({ status: 'anonymous' })
    return
  }

  if (readString(KEYS.mode) === 'demo') {
    useAuth.getState().enterDemo()
    return
  }

  // Abre na hora com o usuário em cache (funciona offline) e confirma a sessão em segundo plano.
  const cached = readJSON<{ user?: User }>(KEYS.me)
  if (cached?.user?.id) {
    activate(cached.user)
    authApi
      .me()
      .then(({ user }) => {
        writeJSON(KEYS.me, { user })
        useAuth.setState({ user })
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) useAuth.getState().expire()
      })
    return
  }

  // Sem cache: o cookie de sessão ainda pode valer (ex.: dados do site limpos).
  try {
    const { user } = await authApi.me()
    activate(user)
  } catch {
    useAuth.setState({ status: 'anonymous' })
  }
}
