import type { AppData } from '@ritmo/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api.ts'
import { createSyncEngine } from './engine.ts'
import type { QueuedOp, SyncApi, SyncHost, SyncStatus } from './engine.ts'
import type { HttpRequest, Op } from './ops.ts'

const mark = (n: number): Op => ({ type: 'habit.mark', id: 'h1', date: `2026-10-0${n}`, done: true })
const SNAPSHOT: AppData = { habits: [], goals: [], routines: [] }

/** Host e API falsos, com tudo observável. */
function harness(initial: Op[] = []) {
  let queue: QueuedOp[] = initial.map((op, i) => ({ id: `q${i + 1}`, op }))
  const state = {
    sent: [] as HttpRequest[],
    statuses: [] as SyncStatus[],
    rejected: [] as Op[],
    snapshots: [] as AppData[],
    unauthorized: 0,
    fetches: 0,
  }
  const behavior = {
    send: async (_req: HttpRequest): Promise<unknown> => undefined,
    fetchData: async (): Promise<AppData> => SNAPSHOT,
  }
  const host: SyncHost = {
    pending: () => queue,
    confirm: (id) => {
      queue = queue.filter((q) => q.id !== id)
    },
    applySnapshot: (data) => state.snapshots.push(data),
    setStatus: (status) => state.statuses.push(status),
    onUnauthorized: () => {
      state.unauthorized += 1
    },
    onRejected: (op) => state.rejected.push(op),
  }
  const api: SyncApi = {
    send: (req) => {
      state.sent.push(req)
      return behavior.send(req)
    },
    fetchData: () => {
      state.fetches += 1
      return behavior.fetchData()
    },
  }
  return {
    state,
    behavior,
    host,
    api,
    queue: () => queue,
    enqueue(op: Op) {
      queue = [...queue, { id: `q${queue.length + 1 + state.sent.length}`, op }]
    },
  }
}

/** Deixa a cadeia de promises do motor terminar. */
const settle = async () => {
  for (let i = 0; i < 50; i++) await Promise.resolve()
}

const networkError = () => new ApiError(0, 'network', 'sem rede')
const serverError = () => new ApiError(503, 'internal', 'fora do ar')

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('motor de sincronização', () => {
  it('envia a fila em ordem e, com a fila vazia, puxa o estado do servidor', async () => {
    const h = harness([mark(1), mark(2), mark(3)])
    const engine = createSyncEngine(h.host, h.api)
    engine.start()
    await settle()

    expect(h.state.sent.map((r) => r.path)).toEqual([
      '/api/habits/h1/completions/2026-10-01',
      '/api/habits/h1/completions/2026-10-02',
      '/api/habits/h1/completions/2026-10-03',
    ])
    expect(h.queue()).toEqual([])
    expect(h.state.fetches).toBe(1)
    expect(h.state.snapshots).toEqual([SNAPSHOT])
    expect(h.state.statuses[0]).toBe('syncing')
    expect(h.state.statuses.at(-1)).toBe('idle')
  })

  it('só puxa o snapshot depois de esvaziar a fila (senão apagaria alterações locais)', async () => {
    const h = harness([mark(1)])
    const order: string[] = []
    h.behavior.send = async () => void order.push('send')
    h.behavior.fetchData = async () => (order.push('fetch'), SNAPSHOT)
    createSyncEngine(h.host, h.api).start()
    await settle()
    expect(order).toEqual(['send', 'fetch'])
  })

  it('sem rede: para na operação que falhou, mantém a fila e tenta de novo depois', async () => {
    const h = harness([mark(1), mark(2), mark(3)])
    let calls = 0
    h.behavior.send = async () => {
      calls += 1
      if (calls === 2) throw networkError() // a 2ª falha, na 1ª tentativa
    }
    const engine = createSyncEngine(h.host, h.api, { retryDelaysMs: [1000] })
    engine.start()
    await settle()

    expect(h.state.sent).toHaveLength(2)
    expect(h.queue().map((q) => q.id)).toEqual(['q2', 'q3']) // a 1ª já foi confirmada
    expect(h.state.statuses.at(-1)).toBe('offline')
    expect(h.state.fetches).toBe(0)

    await vi.advanceTimersByTimeAsync(1000) // dispara a nova tentativa
    await settle()
    // retomou da operação que falhou: não reenviou a 1ª
    expect(h.state.sent.map((r) => r.path.slice(-10))).toEqual(['2026-10-01', '2026-10-02', '2026-10-02', '2026-10-03'])
    expect(h.queue()).toEqual([])
    expect(h.state.statuses.at(-1)).toBe('idle')
  })

  it('erro 5xx marca "error" e também tenta de novo', async () => {
    const h = harness([mark(1)])
    let first = true
    h.behavior.send = async () => {
      if (first) {
        first = false
        throw serverError()
      }
    }
    createSyncEngine(h.host, h.api, { retryDelaysMs: [500] }).start()
    await settle()
    expect(h.state.statuses.at(-1)).toBe('error')
    await vi.advanceTimersByTimeAsync(500)
    await settle()
    expect(h.queue()).toEqual([])
    expect(h.state.statuses.at(-1)).toBe('idle')
  })

  it('o tempo de espera cresce a cada falha seguida', async () => {
    const h = harness([mark(1)])
    h.behavior.send = async () => {
      throw networkError()
    }
    createSyncEngine(h.host, h.api, { retryDelaysMs: [1000, 3000, 9000] }).start()
    await settle()
    expect(h.state.sent).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(999)
    expect(h.state.sent).toHaveLength(1) // ainda esperando
    await vi.advanceTimersByTimeAsync(1)
    await settle()
    expect(h.state.sent).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(2999)
    expect(h.state.sent).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(1)
    await settle()
    expect(h.state.sent).toHaveLength(3)
  })

  it('recusa definitiva (4xx) descarta a operação, avisa e segue com as próximas', async () => {
    const h = harness([mark(1), mark(2), mark(3)])
    h.behavior.send = async (req) => {
      if (req.path.endsWith('2026-10-02')) throw new ApiError(404, 'not_found', 'sumiu')
    }
    createSyncEngine(h.host, h.api).start()
    await settle()

    expect(h.state.rejected).toEqual([mark(2)])
    expect(h.state.sent).toHaveLength(3) // não travou na recusada
    expect(h.queue()).toEqual([])
    expect(h.state.statuses.at(-1)).toBe('idle')
  })

  it('400 (dado inválido) também é descartado, nunca reenviado', async () => {
    const h = harness([mark(1)])
    h.behavior.send = async () => {
      throw new ApiError(400, 'invalid_input', 'inválido')
    }
    createSyncEngine(h.host, h.api, { retryDelaysMs: [100] }).start()
    await settle()
    await vi.advanceTimersByTimeAsync(10_000)
    await settle()
    expect(h.state.sent).toHaveLength(1)
    expect(h.state.rejected).toHaveLength(1)
  })

  it('429 (muitas requisições) é tratado como temporário', async () => {
    const h = harness([mark(1)])
    let first = true
    h.behavior.send = async () => {
      if (first) {
        first = false
        throw new ApiError(429, 'rate_limited', 'devagar')
      }
    }
    createSyncEngine(h.host, h.api, { retryDelaysMs: [200] }).start()
    await settle()
    expect(h.state.rejected).toEqual([])
    await vi.advanceTimersByTimeAsync(200)
    await settle()
    expect(h.queue()).toEqual([])
  })

  it('401: avisa que a sessão acabou, mantém a fila e não agenda nova tentativa', async () => {
    const h = harness([mark(1), mark(2)])
    h.behavior.send = async () => {
      throw new ApiError(401, 'unauthorized', 'faça login')
    }
    createSyncEngine(h.host, h.api, { retryDelaysMs: [100] }).start()
    await settle()
    await vi.advanceTimersByTimeAsync(60_000)
    await settle()

    expect(h.state.unauthorized).toBe(1)
    expect(h.queue()).toHaveLength(2) // preservada para quando o usuário entrar de novo
    expect(h.state.sent).toHaveLength(1)
  })

  it('falha ao puxar o snapshot também vira nova tentativa', async () => {
    const h = harness()
    let fails = 1
    h.behavior.fetchData = async () => {
      if (fails-- > 0) throw networkError()
      return SNAPSHOT
    }
    createSyncEngine(h.host, h.api, { retryDelaysMs: [100] }).start()
    await settle()
    expect(h.state.statuses.at(-1)).toBe('offline')
    await vi.advanceTimersByTimeAsync(100)
    await settle()
    expect(h.state.snapshots).toHaveLength(1)
    expect(h.state.statuses.at(-1)).toBe('idle')
  })

  it('operações que entram durante a sincronização são enviadas na mesma rodada', async () => {
    const h = harness([mark(1)])
    let release!: () => void
    h.behavior.send = (req) =>
      req.path.endsWith('2026-10-01') ? new Promise<void>((resolve) => (release = resolve)) : Promise.resolve()
    const engine = createSyncEngine(h.host, h.api)
    engine.start()
    await settle()
    expect(h.state.sent).toHaveLength(1) // preso na 1ª

    h.enqueue(mark(2)) // o usuário clica de novo enquanto envia
    engine.kick()
    release()
    await settle()

    expect(h.state.sent).toHaveLength(2)
    expect(h.queue()).toEqual([])
    expect(h.state.fetches).toBeGreaterThanOrEqual(1)
  })

  it('em espera de nova tentativa, kick comum não fura a fila; force tenta já', async () => {
    const h = harness([mark(1)])
    let offline = true
    h.behavior.send = async () => {
      if (offline) throw networkError()
    }
    const engine = createSyncEngine(h.host, h.api, { retryDelaysMs: [60_000] })
    engine.start()
    await settle()
    expect(h.state.sent).toHaveLength(1)

    engine.kick() // ex.: o usuário marcou outro hábito
    await settle()
    expect(h.state.sent).toHaveLength(1) // não martelou o servidor

    offline = false
    engine.kick({ force: true }) // ex.: o navegador avisou que voltou online
    await settle()
    expect(h.state.sent).toHaveLength(2)
    expect(h.queue()).toEqual([])
  })

  it('stop cancela tentativas agendadas e ignora novos pedidos', async () => {
    const h = harness([mark(1)])
    h.behavior.send = async () => {
      throw networkError()
    }
    const engine = createSyncEngine(h.host, h.api, { retryDelaysMs: [1000] })
    engine.start()
    await settle()
    engine.stop()
    await vi.advanceTimersByTimeAsync(10_000)
    engine.kick({ force: true })
    await settle()
    expect(h.state.sent).toHaveLength(1)
    expect(h.queue()).toHaveLength(1) // a fila continua guardada
  })
})
