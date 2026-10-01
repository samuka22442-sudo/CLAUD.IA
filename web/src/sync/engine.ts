import type { AppData } from '@ritmo/shared'
import { ApiError, isTransient } from './api.ts'
import { opToRequest } from './ops.ts'
import type { HttpRequest, Op } from './ops.ts'

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error'

export interface QueuedOp {
  id: string
  op: Op
}

export interface SyncApi {
  send(request: HttpRequest): Promise<unknown>
  fetchData(): Promise<AppData>
}

/** O que o motor precisa do resto do app (implementado pelo store de dados). */
export interface SyncHost {
  pending(): QueuedOp[]
  /** Tira a operação da fila (enviada com sucesso ou recusada em definitivo). */
  confirm(opId: string): void
  /** Substitui o estado pelo do servidor, reaplicando por cima o que ainda está na fila. */
  applySnapshot(data: AppData): void
  setStatus(status: SyncStatus): void
  /** O servidor respondeu 401: a sessão acabou. A fila é preservada para quando o usuário entrar de novo. */
  onUnauthorized(): void
  /** O servidor recusou a operação em definitivo (4xx): ela foi descartada. */
  onRejected(op: Op, error: ApiError): void
}

export interface EngineOptions {
  /** Esperas entre tentativas após falha de rede/servidor. */
  retryDelaysMs?: number[]
}

const DEFAULT_RETRY_MS = [5_000, 15_000, 45_000, 120_000, 300_000]

/**
 * Motor de sincronização: envia a fila em ordem e, com a fila vazia, puxa o estado do servidor.
 * Uma execução por vez; pedidos que chegam no meio viram uma nova volta ao final.
 */
export function createSyncEngine(host: SyncHost, api: SyncApi, options: EngineOptions = {}) {
  const delays = options.retryDelaysMs ?? DEFAULT_RETRY_MS
  let running = false
  let again = false
  let stopped = true
  let attempt = 0
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  function clearRetry() {
    if (retryTimer !== null) clearTimeout(retryTimer)
    retryTimer = null
  }

  function scheduleRetry() {
    clearRetry()
    const delay = delays[Math.min(attempt, delays.length - 1)] ?? 5_000
    attempt += 1
    retryTimer = setTimeout(() => {
      retryTimer = null
      void run()
    }, delay)
  }

  /** Trata uma falha. Retorna true se o ciclo deve parar. */
  function handleFailure(error: unknown): boolean {
    if (error instanceof ApiError && error.status === 401) {
      host.onUnauthorized()
      host.setStatus('idle')
      return true
    }
    if (isTransient(error)) {
      host.setStatus(error instanceof ApiError && error.status === 0 ? 'offline' : 'error')
      scheduleRetry()
      return true
    }
    // Erro inesperado que não é da API: trata como falha temporária.
    host.setStatus('error')
    scheduleRetry()
    return true
  }

  async function cycle(): Promise<void> {
    host.setStatus('syncing')

    for (;;) {
      const next = host.pending()[0]
      if (!next) break
      try {
        await api.send(opToRequest(next.op))
        host.confirm(next.id)
        attempt = 0
      } catch (error) {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500 && !isTransient(error) && error.status !== 401) {
          // Recusa definitiva (dado inválido, item que não existe mais…): descarta e segue.
          host.onRejected(next.op, error)
          host.confirm(next.id)
          continue
        }
        handleFailure(error)
        return
      }
    }

    try {
      host.applySnapshot(await api.fetchData())
      attempt = 0
      host.setStatus('idle')
    } catch (error) {
      handleFailure(error)
    }
  }

  async function run(): Promise<void> {
    if (stopped) return
    if (running) {
      again = true
      return
    }
    running = true
    try {
      do {
        again = false
        await cycle()
      } while (again && !stopped && retryTimer === null)
    } finally {
      running = false
    }
  }

  return {
    /** Começa a sincronizar (e já dispara uma volta). */
    start() {
      stopped = false
      attempt = 0
      void run()
    },
    /** Para tudo: cancela tentativas agendadas. A fila continua guardada. */
    stop() {
      stopped = true
      again = false
      clearRetry()
    },
    /**
     * Pede uma sincronização. Em espera de nova tentativa (rede caiu), pedidos comuns — como o clique
     * em um hábito — não furam a fila; `force` (voltou online, aba voltou ao foco) tenta já.
     */
    kick(opts: { force?: boolean } = {}) {
      if (stopped) return
      if (retryTimer !== null) {
        if (!opts.force) return
        clearRetry()
      }
      void run()
    },
    get isRunning() {
      return running
    },
  }
}

export type SyncEngine = ReturnType<typeof createSyncEngine>
