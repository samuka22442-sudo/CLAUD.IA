import { goalSchema, habitSchema, routineSchema } from '@ritmo/shared/schemas'
import { describe, expect, it } from 'vitest'
import { currentStreak, dayProgress } from './habits.ts'
import { goalStatus } from './goals.ts'
import { routineProgress } from './routines.ts'
import { buildDemoData } from './seed.ts'

const TODAY = '2026-10-01' // quinta-feira

describe('dados de demonstração', () => {
  const data = buildDemoData(TODAY)

  it('é determinístico', () => {
    expect(buildDemoData(TODAY)).toEqual(data)
    expect(buildDemoData(TODAY, 123)).not.toEqual(data)
  })

  it('só gera dados que a API aceita (mesmos schemas do servidor)', () => {
    for (const habit of data.habits) expect(() => habitSchema.parse(habit), habit.title).not.toThrow()
    for (const goal of data.goals) expect(() => goalSchema.parse(goal), goal.title).not.toThrow()
    for (const routine of data.routines) expect(() => routineSchema.parse(routine), routine.title).not.toThrow()
  })

  it('usa ids únicos', () => {
    const ids = [
      ...data.habits.map((h) => h.id),
      ...data.goals.map((g) => g.id),
      ...data.routines.map((r) => r.id),
      ...data.routines.flatMap((r) => r.steps.map((s) => s.id)),
      ...data.goals.flatMap((g) => g.milestones.map((m) => m.id)),
    ]
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('as sequências atuais batem com o que foi pedido na semente', () => {
    const streaks = data.habits.map((habit) => currentStreak(habit, TODAY))
    expect(streaks).toEqual([23, 9, 6, 4, 12, 3, 2, 0, 0])
  })

  it('hoje (quinta): 3 de 7 hábitos concluídos; o arquivado fica de fora', () => {
    expect(dayProgress(data.habits, TODAY)).toEqual({ done: 3, scheduled: 7 })
    expect(data.habits.some((h) => h.archived)).toBe(true)
  })

  it('metas em estados variados: andamento, atrasada e concluída', () => {
    const statuses = data.goals.map((goal) => goalStatus(goal, TODAY))
    expect(statuses).toContain('active')
    expect(statuses).toContain('late')
    expect(statuses).toContain('completed')
  })

  it('a rotina da manhã já tem 3 passos feitos hoje', () => {
    const morning = data.routines.find((r) => r.period === 'morning')!
    expect(routineProgress(morning, TODAY)).toMatchObject({ done: 3, total: 6 })
  })

  it('todas as datas geradas são datas de calendário válidas', () => {
    const dates = [
      ...data.habits.flatMap((h) => h.completions),
      ...data.goals.flatMap((g) => [g.deadline, g.completedAt].filter((d): d is string => !!d)),
      ...data.routines.flatMap((r) => Object.keys(r.runs)),
    ]
    for (const date of dates) expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
