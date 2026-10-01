import type { Goal } from '@ritmo/shared'
import { describe, expect, it } from 'vitest'
import { addProgress, daysLeft, goalProgress, goalStatus, isGoalComplete, toggleMilestone, withCompletion } from './goals.ts'

const TODAY = '2026-10-01'

const numeric = (over: Partial<Goal> = {}): Goal => ({
  id: 'g1',
  title: 'Ler 12 livros',
  category: 'study',
  icon: 'book',
  color: 'violet',
  kind: 'numeric',
  target: 12,
  current: 3,
  unit: 'livros',
  milestones: [],
  archived: false,
  createdAt: '2026-01-01T12:00:00.000Z',
  ...over,
})

const checklist = (done: boolean[], over: Partial<Goal> = {}): Goal => ({
  id: 'g2',
  title: 'Curso',
  category: 'career',
  icon: 'code',
  color: 'cyan',
  kind: 'checklist',
  milestones: done.map((d, i) => ({ id: `m${i}`, title: `Etapa ${i + 1}`, done: d })),
  archived: false,
  createdAt: '2026-01-01T12:00:00.000Z',
  ...over,
})

describe('goalProgress', () => {
  it('numérica: atual ÷ alvo, limitada entre 0 e 1', () => {
    expect(goalProgress(numeric())).toBe(0.25)
    expect(goalProgress(numeric({ current: 12 }))).toBe(1)
    expect(goalProgress(numeric({ current: 30 }))).toBe(1)
    expect(goalProgress(numeric({ current: undefined }))).toBe(0)
    expect(goalProgress(numeric({ target: 0 }))).toBe(0)
  })

  it('checklist: marcos feitos ÷ total', () => {
    expect(goalProgress(checklist([true, true, false, false]))).toBe(0.5)
    expect(goalProgress(checklist([true, true]))).toBe(1)
    expect(goalProgress(checklist([]))).toBe(0)
  })
})

describe('prazo e status', () => {
  it('daysLeft conta dias até o prazo (negativo se passou, null sem prazo)', () => {
    expect(daysLeft(numeric({ deadline: '2026-10-11' }), TODAY)).toBe(10)
    expect(daysLeft(numeric({ deadline: '2026-09-29' }), TODAY)).toBe(-2)
    expect(daysLeft(numeric(), TODAY)).toBeNull()
  })

  it('goalStatus: concluída, atrasada ou em andamento', () => {
    expect(goalStatus(numeric({ deadline: '2026-12-31' }), TODAY)).toBe('active')
    expect(goalStatus(numeric({ deadline: '2026-09-30' }), TODAY)).toBe('late')
    expect(goalStatus(numeric({ deadline: '2026-10-01' }), TODAY)).toBe('active') // vence hoje ainda não está atrasada
    expect(goalStatus(numeric({ current: 12, deadline: '2026-09-01' }), TODAY)).toBe('completed')
    expect(goalStatus(numeric({ completedAt: '2026-09-15', deadline: '2026-09-01' }), TODAY)).toBe('completed')
  })

  it('isGoalComplete', () => {
    expect(isGoalComplete(numeric({ current: 12 }))).toBe(true)
    expect(isGoalComplete(numeric())).toBe(false)
  })
})

describe('completedAt coerente com o progresso', () => {
  it('define ao chegar a 100% e remove se voltar abaixo', () => {
    const done = withCompletion(numeric({ current: 12 }), TODAY)
    expect(done.completedAt).toBe(TODAY)

    const reopened = withCompletion({ ...done, current: 5 }, TODAY)
    expect(reopened).not.toHaveProperty('completedAt')
  })

  it('não troca a data de conclusão já existente', () => {
    const goal = numeric({ current: 12, completedAt: '2026-09-01' })
    expect(withCompletion(goal, TODAY).completedAt).toBe('2026-09-01')
  })
})

describe('addProgress', () => {
  it('soma sem erro de ponto flutuante e nunca fica negativo', () => {
    expect(addProgress(numeric({ current: 0.1 }), 0.2, TODAY).current).toBe(0.3)
    expect(addProgress(numeric({ current: 3 }), -10, TODAY).current).toBe(0)
  })

  it('conclui a meta ao atingir o alvo', () => {
    const goal = addProgress(numeric({ current: 11 }), 1, TODAY)
    expect(goal.current).toBe(12)
    expect(goal.completedAt).toBe(TODAY)
  })
})

describe('toggleMilestone', () => {
  it('alterna o marco e conclui a meta no último', () => {
    const goal = checklist([true, false])
    const after = toggleMilestone(goal, 'm1', TODAY)
    expect(after.milestones[1]!.done).toBe(true)
    expect(after.completedAt).toBe(TODAY)

    const undone = toggleMilestone(after, 'm0', TODAY)
    expect(undone.milestones[0]!.done).toBe(false)
    expect(undone).not.toHaveProperty('completedAt')
  })
})
