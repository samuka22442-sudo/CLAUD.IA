// @vitest-environment jsdom
import type { Habit } from '@ritmo/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { KEYS } from '../lib/storage.ts'
import { EMPTY_DATA } from '../sync/ops.ts'
import { cacheKey, persistNow, useData, wipeCache } from './data.ts'

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  title: 'Água',
  icon: 'droplets',
  color: 'cyan',
  days: [0, 1, 2, 3, 4, 5, 6],
  archived: false,
  createdAt: '2026-01-01T12:00:00.000Z',
  completions: [],
  ...over,
})

const reset = () => useData.setState({ mode: null, userId: null, data: EMPTY_DATA, queue: [] })

beforeEach(() => {
  localStorage.clear()
  reset()
})

describe('store de dados (modo remoto)', () => {
  it('commit aplica na hora e enfileira para o servidor', () => {
    useData.getState().load('u1', 'remote')
    useData.getState().commit({ type: 'habit.put', habit: habit() })
    useData.getState().commit({ type: 'habit.mark', id: 'h1', date: '2026-10-01', done: true })

    const { data, queue } = useData.getState()
    expect(data.habits[0]!.completions).toEqual(['2026-10-01'])
    expect(queue.map((q) => q.op.type)).toEqual(['habit.put', 'habit.mark'])
    expect(new Set(queue.map((q) => q.id)).size).toBe(2) // ids de fila únicos
  })

  it('sobrevive a recarregar a página: dados e fila voltam do cache', () => {
    useData.getState().load('u1', 'remote')
    useData.getState().commit({ type: 'habit.put', habit: habit() })
    persistNow()

    reset() // simula fechar e abrir o app
    useData.getState().load('u1', 'remote')

    const { data, queue } = useData.getState()
    expect(data.habits).toHaveLength(1)
    expect(queue).toHaveLength(1)
  })

  it('cada usuário tem o seu cache', () => {
    useData.getState().load('ana', 'remote')
    useData.getState().commit({ type: 'habit.put', habit: habit({ title: 'Da Ana' }) })
    persistNow()

    reset()
    useData.getState().load('bia', 'remote')
    expect(useData.getState().data.habits).toEqual([])
    expect(localStorage.getItem(KEYS.data('ana'))).not.toBeNull()
  })

  it('confirm tira a operação da fila', () => {
    useData.getState().load('u1', 'remote')
    useData.getState().commit({ type: 'habit.put', habit: habit() })
    const [first] = useData.getState().queue
    useData.getState().confirm(first!.id)
    expect(useData.getState().queue).toEqual([])
    expect(useData.getState().data.habits).toHaveLength(1) // o dado continua
  })

  it('applySnapshot troca o estado pelo do servidor, mas reaplica o que ainda está na fila', () => {
    useData.getState().load('u1', 'remote')
    useData.getState().commit({ type: 'habit.put', habit: habit() })
    useData.getState().confirm(useData.getState().queue[0]!.id) // o servidor já tem o hábito
    useData.getState().commit({ type: 'habit.mark', id: 'h1', date: '2026-10-01', done: true }) // ainda pendente

    // snapshot do servidor: hábito existe, mas sem a marcação pendente
    useData.getState().applySnapshot({ habits: [habit({ title: 'Água (servidor)' })], goals: [], routines: [] })

    const [h] = useData.getState().data.habits
    expect(h!.title).toBe('Água (servidor)') // veio do servidor
    expect(h!.completions).toEqual(['2026-10-01']) // pendência reaplicada por cima
    expect(useData.getState().queue).toHaveLength(1)
  })

  it('applySnapshot remove o que foi apagado em outro aparelho', () => {
    useData.getState().load('u1', 'remote')
    useData.getState().commit({ type: 'habit.put', habit: habit() })
    useData.getState().confirm(useData.getState().queue[0]!.id)
    useData.getState().applySnapshot(EMPTY_DATA)
    expect(useData.getState().data.habits).toEqual([])
  })

  it('cache corrompido é ignorado (começa vazio)', () => {
    localStorage.setItem(KEYS.data('u1'), '{lixo')
    useData.getState().load('u1', 'remote')
    expect(useData.getState().data).toEqual(EMPTY_DATA)

    localStorage.setItem(KEYS.data('u2'), JSON.stringify({ v: 1, data: { habits: 'x' }, queue: [] }))
    useData.getState().load('u2', 'remote')
    expect(useData.getState().data).toEqual(EMPTY_DATA)
  })

  it('unload limpa a memória mas mantém o cache em disco; wipeCache apaga', () => {
    useData.getState().load('u1', 'remote')
    useData.getState().commit({ type: 'habit.put', habit: habit() })
    useData.getState().unload()
    expect(useData.getState().data).toEqual(EMPTY_DATA)
    expect(useData.getState().mode).toBeNull()
    expect(localStorage.getItem(KEYS.data('u1'))).not.toBeNull()

    wipeCache('remote', 'u1')
    expect(localStorage.getItem(KEYS.data('u1'))).toBeNull()
  })

  it('sem usuário carregado, commit não faz nada', () => {
    useData.getState().commit({ type: 'habit.put', habit: habit() })
    expect(useData.getState().data).toEqual(EMPTY_DATA)
    expect(useData.getState().queue).toEqual([])
  })

  it('adoptCache (outra aba gravou) adota dados e fila, ignorando lixo', () => {
    useData.getState().load('u1', 'remote')
    const other = { v: 1, data: { habits: [habit({ title: 'Veio da outra aba' })], goals: [], routines: [] }, queue: [] }
    useData.getState().adoptCache(JSON.stringify(other))
    expect(useData.getState().data.habits[0]!.title).toBe('Veio da outra aba')

    useData.getState().adoptCache('nem é json')
    useData.getState().adoptCache(JSON.stringify({ v: 2 }))
    expect(useData.getState().data.habits[0]!.title).toBe('Veio da outra aba') // intacto
  })
})

describe('store de dados (modo demonstração)', () => {
  it('semeia dados de exemplo na primeira vez e nunca enfileira para o servidor', () => {
    useData.getState().load('demo', 'demo')
    const { data, queue, mode } = useData.getState()
    expect(mode).toBe('demo')
    expect(data.habits.length).toBeGreaterThan(5)
    expect(data.goals.length).toBeGreaterThan(3)
    expect(data.routines.length).toBeGreaterThan(1)

    useData.getState().commit({ type: 'habit.mark', id: data.habits[0]!.id, date: '2026-10-01', done: true })
    expect(useData.getState().queue).toEqual([])
    expect(queue).toEqual([])
  })

  it('guarda as alterações no cache do demo e as restaura depois', () => {
    useData.getState().load('demo', 'demo')
    const id = useData.getState().data.habits[0]!.id
    useData.getState().commit({ type: 'habit.delete', id })
    persistNow()

    reset()
    useData.getState().load('demo', 'demo')
    expect(useData.getState().data.habits.some((h) => h.id === id)).toBe(false)
    expect(localStorage.getItem(cacheKey('demo', 'demo'))).not.toBeNull()
  })
})
