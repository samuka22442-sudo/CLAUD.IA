import { create } from 'zustand'
import { syncApi } from '../sync/api.ts'
import { createSyncEngine } from '../sync/engine.ts'
import type { SyncEngine, SyncHost, SyncStatus } from '../sync/engine.ts'
import { useData } from './data.ts'

interface SyncState {
  status: SyncStatus
  lastSyncAt: number | null
  /** Operações descartadas pelo servidor nesta sessão (dado inválido ou item que não existe mais). */
  rejected: number
}

export const useSync = create<SyncState>(() => ({ status: 'idle', lastSyncAt: null, rejected: 0 }))

let engine: SyncEngine | null = null
let teardown: (() => void) | null = null

/** Liga a sincronização com o servidor (modo remoto). `onUnauthorized` é chamado se a sessão expirar. */
export function startSync(onUnauthorized: () => void): void {
  if (engine) return

  const host: SyncHost = {
    pending: () => useData.getState().queue,
    confirm: (id) => useData.getState().confirm(id),
    applySnapshot: (data) => {
      useData.getState().applySnapshot(data)
      useSync.setState({ lastSyncAt: Date.now() })
    },
    setStatus: (status) => useSync.setState({ status }),
    onUnauthorized,
    onRejected: () => useSync.setState((s) => ({ rejected: s.rejected + 1 })),
  }
  const current = createSyncEngine(host, syncApi)
  engine = current

  // Nova operação na fila → sincroniza.
  const unsubscribe = useData.subscribe((state, prev) => {
    if (state.queue.length > prev.queue.length) current.kick()
  })

  let lastFocusKick = 0
  const onOnline = () => current.kick({ force: true })
  const onVisible = () => {
    if (document.visibilityState !== 'visible') return
    const now = Date.now()
    if (now - lastFocusKick < 15_000) return
    lastFocusKick = now
    current.kick({ force: true })
  }
  const interval = setInterval(() => {
    if (document.visibilityState === 'visible') current.kick()
  }, 60_000)

  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisible)

  teardown = () => {
    unsubscribe()
    clearInterval(interval)
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisible)
  }

  useSync.setState({ status: 'idle', rejected: 0 })
  current.start()
}

export function stopSync(): void {
  engine?.stop()
  teardown?.()
  engine = null
  teardown = null
  useSync.setState({ status: 'idle' })
}

/** Força uma sincronização agora (botão "tentar de novo"). */
export function syncNow(): void {
  engine?.kick({ force: true })
}
