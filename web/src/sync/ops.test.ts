import type { AppData, Goal, Habit, Routine } from '@ritmo/shared'
import { describe, expect, it } from 'vitest'
import { applyOp, applyOps, EMPTY_DATA, opToRequest } from './ops.ts'

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

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g1',
  title: 'Meta',
  category: 'study',
  icon: 'book',
  color: 'violet',
  kind: 'numeric',
  target: 10,
  current: 1,
  milestones: [],
  archived: false,
  createdAt: '2026-01-01T12:00:00.000Z',
  ...over,
})

const routine = (over: Partial<Routine> = {}): Routine => ({
  id: 'r1',
  title: 'Manhã',
  icon: 'sun',
  color: 'amber',
  period: 'morning',
  days: [1, 2, 3],
  startTime: '06:30',
  steps: [
    { id: 's1', title: 'Água', minutes: 5 },
    { id: 's2', title: 'Alongar', minutes: 10 },
  ],
  archived: false,
  createdAt: '2026-01-01T12:00:00.000Z',
  runs: {},
  ...over,
})

const base = (): AppData => ({ habits: [habit()], goals: [goal()], routines: [routine()] })

describe('applyOp: hábitos', () => {
  it('habit.put cria um hábito novo sempre sem conclusões (o servidor ignora completions no PUT)', () => {
    const next = applyOp(EMPTY_DATA, { type: 'habit.put', habit: habit({ completions: ['2026-09-01'] }) })
    expect(next.habits).toHaveLength(1)
    expect(next.habits[0]!.completions).toEqual([])
  })

  it('habit.put em hábito existente atualiza os campos e preserva as conclusões', () => {
    const start = { ...base(), habits: [habit({ completions: ['2026-09-30'] })] }
    const next = applyOp(start, { type: 'habit.put', habit: habit({ title: 'Mais água', completions: [] }) })
    expect(next.habits[0]!.title).toBe('Mais água')
    expect(next.habits[0]!.completions).toEqual(['2026-09-30'])
  })

  it('habit.mark é idempotente e ignora ids desconhecidos', () => {
    const once = applyOp(base(), { type: 'habit.mark', id: 'h1', date: '2026-10-01', done: true })
    const twice = applyOp(once, { type: 'habit.mark', id: 'h1', date: '2026-10-01', done: true })
    expect(twice.habits[0]!.completions).toEqual(['2026-10-01'])
    const off = applyOp(twice, { type: 'habit.mark', id: 'h1', date: '2026-10-01', done: false })
    expect(off.habits[0]!.completions).toEqual([])
    expect(applyOp(base(), { type: 'habit.mark', id: 'nao-existe', date: '2026-10-01', done: true })).toEqual(base())
  })

  it('habit.delete remove o hábito (e é idempotente)', () => {
    const next = applyOp(base(), { type: 'habit.delete', id: 'h1' })
    expect(next.habits).toEqual([])
    expect(applyOp(next, { type: 'habit.delete', id: 'h1' }).habits).toEqual([])
  })
})

describe('applyOp: metas', () => {
  it('goal.put substitui a meta inteira ou adiciona', () => {
    const edited = applyOp(base(), { type: 'goal.put', goal: goal({ current: 7 }) })
    expect(edited.goals).toHaveLength(1)
    expect(edited.goals[0]!.current).toBe(7)
    const added = applyOp(base(), { type: 'goal.put', goal: goal({ id: 'g2' }) })
    expect(added.goals.map((g) => g.id)).toEqual(['g1', 'g2'])
  })

  it('goal.delete', () => {
    expect(applyOp(base(), { type: 'goal.delete', id: 'g1' }).goals).toEqual([])
  })
})

describe('applyOp: rotinas', () => {
  it('routine.mark marca passos do dia e ignora passo que não existe', () => {
    const marked = applyOp(base(), { type: 'routine.mark', id: 'r1', date: '2026-10-01', stepId: 's1', done: true })
    expect(marked.routines[0]!.runs).toEqual({ '2026-10-01': ['s1'] })
    const unknownStep = applyOp(marked, { type: 'routine.mark', id: 'r1', date: '2026-10-01', stepId: 'fantasma', done: true })
    expect(unknownStep).toBe(marked) // nenhuma mudança → mesma referência
  })

  it('routine.put removendo um passo apaga as conclusões dele (como o servidor)', () => {
    const start = { ...base(), routines: [routine({ runs: { '2026-10-01': ['s1', 's2'] } })] }
    const next = applyOp(start, {
      type: 'routine.put',
      routine: routine({ steps: [{ id: 's1', title: 'Água', minutes: 5 }] }),
    })
    expect(next.routines[0]!.steps).toHaveLength(1)
    expect(next.routines[0]!.runs).toEqual({ '2026-10-01': ['s1'] })
  })

  it('routine.put novo nasce sem execuções; routine.delete remove', () => {
    const added = applyOp(EMPTY_DATA, { type: 'routine.put', routine: routine({ runs: { '2026-10-01': ['s1'] } }) })
    expect(added.routines[0]!.runs).toEqual({})
    expect(applyOp(added, { type: 'routine.delete', id: 'r1' }).routines).toEqual([])
  })
})

describe('applyOp: geral', () => {
  it('data.clear esvazia tudo', () => {
    expect(applyOp(base(), { type: 'data.clear' })).toEqual(EMPTY_DATA)
  })

  it('não muta o estado original e preserva referências do que não mudou', () => {
    const start: AppData = { habits: [habit({ id: 'a' }), habit({ id: 'b' })], goals: [goal()], routines: [] }
    const frozen = JSON.stringify(start)
    const next = applyOp(start, { type: 'habit.mark', id: 'a', date: '2026-10-01', done: true })
    expect(JSON.stringify(start)).toBe(frozen)
    expect(next.habits[1]).toBe(start.habits[1]) // hábito "b" não mudou
    expect(next.habits[0]).not.toBe(start.habits[0])
    expect(next.goals).toBe(start.goals)
  })

  it('applyOps aplica em ordem', () => {
    const next = applyOps(EMPTY_DATA, [
      { type: 'habit.put', habit: habit() },
      { type: 'habit.mark', id: 'h1', date: '2026-10-01', done: true },
      { type: 'habit.mark', id: 'h1', date: '2026-10-02', done: true },
      { type: 'habit.mark', id: 'h1', date: '2026-10-01', done: false },
    ])
    expect(next.habits[0]!.completions).toEqual(['2026-10-02'])
  })
})

describe('opToRequest', () => {
  it('mapeia cada operação para a rota da API, sem enviar completions/runs', () => {
    const put = opToRequest({ type: 'habit.put', habit: habit({ completions: ['2026-10-01'] }) })
    expect(put).toMatchObject({ method: 'PUT', path: '/api/habits/h1' })
    expect(put.body).not.toHaveProperty('completions')
    expect(put.body).toMatchObject({ id: 'h1', title: 'Água' })

    expect(opToRequest({ type: 'habit.delete', id: 'h1' })).toEqual({ method: 'DELETE', path: '/api/habits/h1' })
    expect(opToRequest({ type: 'habit.mark', id: 'h1', date: '2026-10-01', done: true })).toEqual({
      method: 'PUT',
      path: '/api/habits/h1/completions/2026-10-01',
      body: { done: true },
    })
    expect(opToRequest({ type: 'goal.put', goal: goal() })).toMatchObject({ method: 'PUT', path: '/api/goals/g1' })
    expect(opToRequest({ type: 'goal.delete', id: 'g1' }).path).toBe('/api/goals/g1')

    const routinePut = opToRequest({ type: 'routine.put', routine: routine({ runs: { '2026-10-01': ['s1'] } }) })
    expect(routinePut).toMatchObject({ method: 'PUT', path: '/api/routines/r1' })
    expect(routinePut.body).not.toHaveProperty('runs')
    expect(opToRequest({ type: 'routine.delete', id: 'r1' }).path).toBe('/api/routines/r1')
    expect(opToRequest({ type: 'routine.mark', id: 'r1', date: '2026-10-01', stepId: 's1', done: false })).toEqual({
      method: 'PUT',
      path: '/api/routines/r1/runs/2026-10-01/s1',
      body: { done: false },
    })
    expect(opToRequest({ type: 'data.clear' })).toEqual({ method: 'DELETE', path: '/api/data' })
  })
})
