import type { AppData } from '@ritmo/shared'
import { create } from 'zustand'
import { todayISO } from '../lib/dates.ts'
import { newId } from '../lib/ids.ts'
import { buildDemoData } from '../lib/seed.ts'
import { KEYS, readJSON, removeKey, writeJSON } from '../lib/storage.ts'
import { applyOp, applyOps, EMPTY_DATA } from '../sync/ops.ts'
import type { Op } from '../sync/ops.ts'
import type { QueuedOp } from '../sync/engine.ts'

export type DataMode = 'remote' | 'demo'

interface Persisted {
  v: 1
  data: AppData
  queue: QueuedOp[]
}

interface DataState {
  /** null = ninguém logado. */
  mode: DataMode | null
  userId: string | null
  data: AppData
  /** Operações ainda não confirmadas pelo servidor (sempre vazia no modo demonstração). */
  queue: QueuedOp[]

  load: (userId: string, mode: DataMode) => void
  /** Limpa a memória (o cache em disco permanece). */
  unload: () => void
  /** Aplica a operação na hora e, no modo remoto, enfileira o envio. */
  commit: (op: Op) => void
  /** Chamado pelo motor de sync. */
  confirm: (opId: string) => void
  applySnapshot: (snapshot: AppData) => void
  /** Outra aba gravou o cache: adota o conteúdo dela. */
  adoptCache: (raw: string) => void
}

export const cacheKey = (mode: DataMode, userId: string): string => (mode === 'demo' ? KEYS.demo : KEYS.data(userId))

function isPersisted(value: unknown): value is Persisted {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<Persisted>
  return (
    v.v === 1 &&
    Array.isArray(v.queue) &&
    typeof v.data === 'object' &&
    v.data !== null &&
    Array.isArray(v.data.habits) &&
    Array.isArray(v.data.goals) &&
    Array.isArray(v.data.routines)
  )
}

export const useData = create<DataState>((set, get) => ({
  mode: null,
  userId: null,
  data: EMPTY_DATA,
  queue: [],

  load(userId, mode) {
    const cached = readJSON<unknown>(cacheKey(mode, userId))
    if (isPersisted(cached)) {
      set({ mode, userId, data: cached.data, queue: mode === 'remote' ? cached.queue : [] })
    } else if (mode === 'demo') {
      set({ mode, userId, data: buildDemoData(todayISO()), queue: [] })
    } else {
      set({ mode, userId, data: EMPTY_DATA, queue: [] })
    }
    persistNow()
  },

  unload() {
    persistNow()
    set({ mode: null, userId: null, data: EMPTY_DATA, queue: [] })
  },

  commit(op) {
    const { mode, data, queue } = get()
    if (mode === null) return
    set({
      data: applyOp(data, op),
      queue: mode === 'remote' ? [...queue, { id: newId(), op }] : queue,
    })
  },

  confirm(opId) {
    set({ queue: get().queue.filter((item) => item.id !== opId) })
  },

  applySnapshot(snapshot) {
    set({ data: applyOps(snapshot, get().queue.map((item) => item.op)) })
  },

  adoptCache(raw) {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!isPersisted(parsed)) return
      set({ data: parsed.data, queue: get().mode === 'remote' ? parsed.queue : [] })
    } catch {
      // conteúdo ilegível: ignora
    }
  },
}))

/* ------------------------------------------------------------------ Persistência */

/** Grava dados + fila numa única chave, para o estado e a fila nunca ficarem dessincronizados. */
export function persistNow(): void {
  const { mode, userId, data, queue } = useData.getState()
  if (mode === null || userId === null) return
  writeJSON(cacheKey(mode, userId), { v: 1, data, queue } satisfies Persisted)
}

/** Apaga o cache local de um usuário (logout). */
export function wipeCache(mode: DataMode, userId: string): void {
  removeKey(cacheKey(mode, userId))
}

/**
 * Liga a gravação automática (com debounce) e a leitura do cache quando OUTRA aba grava.
 * Retorna a função que desfaz tudo.
 */
export function installPersistence(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null

  const unsubscribe = useData.subscribe((state, prev) => {
    if (state.data === prev.data && state.queue === prev.queue) return
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      persistNow()
    }, 120)
  })

  const flush = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    persistNow()
  }
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') flush()
  }
  const onStorage = (event: StorageEvent) => {
    const { mode, userId } = useData.getState()
    if (mode === null || userId === null || event.newValue === null) return
    if (event.key === cacheKey(mode, userId)) useData.getState().adoptCache(event.newValue)
  }

  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('storage', onStorage)

  return () => {
    unsubscribe()
    flush()
    window.removeEventListener('pagehide', flush)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('storage', onStorage)
  }
}
