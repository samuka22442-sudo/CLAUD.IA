import type { Habit } from '@ritmo/shared'
import { describe, expect, it } from 'vitest'
import {
  aggregateTally,
  bestStreak,
  completionRate,
  currentStreak,
  dayProgress,
  dayTally,
  habitStartDate,
  isScheduledOn,
  tally,
  withDayDone,
} from './habits.ts'

const TODAY = '2026-10-01' // quinta-feira

const mk = (over: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  title: 'Hábito',
  icon: 'star',
  color: 'violet',
  days: [0, 1, 2, 3, 4, 5, 6],
  archived: false,
  createdAt: '2026-01-01T12:00:00.000Z', // 09:00 em São Paulo
  completions: [],
  ...over,
})

describe('agenda', () => {
  it('isScheduledOn usa os dias da semana do hábito', () => {
    const habit = mk({ days: [1, 3, 5] }) // seg, qua, sex
    expect(isScheduledOn(habit, '2026-10-01')).toBe(false) // quinta
    expect(isScheduledOn(habit, '2026-10-02')).toBe(true) // sexta
  })

  it('o início do hábito é o mais antigo entre a criação e a primeira conclusão', () => {
    expect(habitStartDate(mk({ createdAt: '2026-09-20T12:00:00.000Z' }))).toBe('2026-09-20')
    expect(habitStartDate(mk({ createdAt: '2026-09-20T12:00:00.000Z', completions: ['2026-09-10'] }))).toBe('2026-09-10')
  })

  it('a criação à noite conta como o dia local, não o dia UTC', () => {
    // 23:30 do dia 30/09 em São Paulo = 02:30 UTC do dia 01/10
    expect(habitStartDate(mk({ createdAt: '2026-10-01T02:30:00.000Z' }))).toBe('2026-09-30')
  })
})

describe('currentStreak', () => {
  it('conta dias seguidos até hoje', () => {
    const habit = mk({ completions: ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01'] })
    expect(currentStreak(habit, TODAY)).toBe(4)
  })

  it('hoje ainda pendente não quebra a sequência', () => {
    const habit = mk({ completions: ['2026-09-28', '2026-09-29', '2026-09-30'] })
    expect(currentStreak(habit, TODAY)).toBe(3)
  })

  it('um dia agendado perdido quebra a sequência', () => {
    const habit = mk({ completions: ['2026-09-27', '2026-09-29', '2026-09-30'] }) // falta o dia 28
    expect(currentStreak(habit, TODAY)).toBe(2)
  })

  it('ontem perdido e hoje feito → sequência de 1', () => {
    expect(currentStreak(mk({ completions: ['2026-09-29', '2026-10-01'] }), TODAY)).toBe(1)
  })

  it('dias fora da agenda não quebram nem somam', () => {
    // dias úteis; hoje é segunda 05/10; sábado e domingo não contam
    const habit = mk({ days: [1, 2, 3, 4, 5], completions: ['2026-10-01', '2026-10-02', '2026-10-05'] })
    expect(currentStreak(habit, '2026-10-05')).toBe(3)
  })

  it('sem conclusões → 0, e para no início do hábito', () => {
    expect(currentStreak(mk(), TODAY)).toBe(0)
    const young = mk({ createdAt: '2026-09-29T12:00:00.000Z', completions: ['2026-09-29', '2026-09-30', '2026-10-01'] })
    expect(currentStreak(young, TODAY)).toBe(3)
  })

  it('sequência longa, até o dia em que o hábito começou', () => {
    const days = Array.from({ length: 12 }, (_, i) => `2026-09-${String(20 + i).padStart(2, '0')}`).filter((d) => d <= '2026-09-30')
    const habit = mk({ createdAt: '2026-09-20T12:00:00.000Z', completions: [...days, '2026-10-01'] })
    expect(currentStreak(habit, TODAY)).toBe(12)
  })
})

describe('bestStreak', () => {
  it('devolve a maior sequência de todos os tempos', () => {
    const run5 = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05']
    const run3 = ['2026-09-10', '2026-09-11', '2026-09-12']
    expect(bestStreak(mk({ completions: [...run5, ...run3] }), TODAY)).toBe(5)
  })

  it('hoje pendente não zera a última sequência', () => {
    const habit = mk({ createdAt: '2026-09-25T12:00:00.000Z', completions: ['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30'] })
    expect(bestStreak(habit, TODAY)).toBe(4)
  })

  it('ignora dias fora da agenda', () => {
    const habit = mk({ days: [1, 2, 3, 4, 5], createdAt: '2026-09-28T12:00:00.000Z', completions: ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'] })
    expect(bestStreak(habit, '2026-10-05')).toBe(5)
  })

  it('nunca é menor que a sequência atual', () => {
    const habit = mk({ completions: ['2026-09-29', '2026-09-30', '2026-10-01'] })
    expect(bestStreak(habit, TODAY)).toBeGreaterThanOrEqual(currentStreak(habit, TODAY))
  })
})

describe('taxa de conclusão', () => {
  it('conta só dias agendados e não penaliza o dia de hoje pendente', () => {
    const habit = mk({ createdAt: '2026-09-01T12:00:00.000Z', completions: ['2026-09-26', '2026-09-28', '2026-09-30'] })
    // janela de 7 dias: 25/09 a 01/10; hoje (01/10) pendente é ignorado → 6 dias agendados, 3 feitos
    expect(tally(habit, '2026-09-25', TODAY, TODAY)).toEqual({ done: 3, scheduled: 6 })
    expect(completionRate(habit, 7, TODAY)).toBe(0.5)
  })

  it('hoje concluído entra no cálculo', () => {
    const habit = mk({ createdAt: '2026-09-01T12:00:00.000Z', completions: ['2026-10-01'] })
    expect(tally(habit, '2026-09-25', TODAY, TODAY)).toEqual({ done: 1, scheduled: 7 })
  })

  it('não conta dias anteriores à criação do hábito', () => {
    const habit = mk({ createdAt: '2026-09-29T12:00:00.000Z', completions: ['2026-09-29', '2026-09-30'] })
    expect(tally(habit, '2026-09-01', TODAY, TODAY)).toEqual({ done: 2, scheduled: 2 })
    expect(completionRate(habit, 30, TODAY)).toBe(1)
  })

  it('respeita a agenda semanal', () => {
    const habit = mk({ days: [1, 3], createdAt: '2026-09-01T12:00:00.000Z', completions: ['2026-09-28'] })
    // 28/09 é segunda, 30/09 é quarta → dois dias agendados na semana
    expect(tally(habit, '2026-09-27', '2026-10-01', TODAY)).toEqual({ done: 1, scheduled: 2 })
  })

  it('sem dias agendados na janela, a taxa é 0 (sem dividir por zero)', () => {
    expect(completionRate(mk({ createdAt: '2026-10-01T12:00:00.000Z' }), 7, TODAY)).toBe(0)
  })
})

describe('progresso do dia', () => {
  it('considera só hábitos ativos agendados para o dia', () => {
    const habits = [
      mk({ id: 'a', completions: [TODAY] }),
      mk({ id: 'b' }),
      mk({ id: 'c', archived: true, completions: [TODAY] }), // arquivado: fora
      mk({ id: 'd', days: [1], completions: [TODAY] }), // só às segundas: fora numa quinta
    ]
    expect(dayProgress(habits, TODAY)).toEqual({ done: 1, scheduled: 2 })
  })

  it('aggregateTally soma vários hábitos e ignora arquivados', () => {
    const habits = [
      mk({ id: 'a', createdAt: '2026-09-01T12:00:00.000Z', completions: ['2026-09-30'] }),
      mk({ id: 'b', createdAt: '2026-09-01T12:00:00.000Z', completions: ['2026-09-30', '2026-09-29'] }),
      mk({ id: 'c', archived: true, createdAt: '2026-09-01T12:00:00.000Z', completions: ['2026-09-30'] }),
    ]
    expect(aggregateTally(habits, '2026-09-29', '2026-09-30', TODAY)).toEqual({ done: 3, scheduled: 4 })
  })
})

describe('withDayDone', () => {
  it('adiciona mantendo a ordem e sem repetir; remove ao desmarcar', () => {
    expect(withDayDone(['2026-09-30'], '2026-09-29', true)).toEqual(['2026-09-29', '2026-09-30'])
    expect(withDayDone(['2026-09-29'], '2026-09-29', true)).toEqual(['2026-09-29'])
    expect(withDayDone(['2026-09-29', '2026-09-30'], '2026-09-29', false)).toEqual(['2026-09-30'])
    expect(withDayDone([], '2026-09-29', false)).toEqual([])
  })
})

describe('dayTally (gráficos)', () => {
  it('conta hoje pendente como agendado (progresso parcial do dia)', () => {
    const habits = [mk({ id: 'a', completions: [TODAY] }), mk({ id: 'b' })]
    expect(dayTally(habits, TODAY)).toEqual({ done: 1, scheduled: 2 })
  })

  it('só considera hábitos que já existiam no dia e ignora arquivados', () => {
    const habits = [
      mk({ id: 'velho', createdAt: '2026-09-01T12:00:00.000Z', completions: ['2026-09-20'] }),
      mk({ id: 'novo', createdAt: '2026-09-25T12:00:00.000Z' }), // ainda não existia em 20/09
      mk({ id: 'arq', archived: true, createdAt: '2026-09-01T12:00:00.000Z', completions: ['2026-09-20'] }),
    ]
    expect(dayTally(habits, '2026-09-20')).toEqual({ done: 1, scheduled: 1 })
    expect(dayTally(habits, '2026-09-26')).toEqual({ done: 0, scheduled: 2 })
  })

  it('respeita os dias da semana e usa o dia local de criação (não o UTC)', () => {
    // criado às 23:30 de 30/09 em São Paulo (02:30 UTC do dia 01/10): já existe em 30/09
    const lateNight = mk({ createdAt: '2026-10-01T02:30:00.000Z' })
    expect(dayTally([lateNight], '2026-09-30')).toEqual({ done: 0, scheduled: 1 })
    expect(dayTally([mk({ days: [1] })], '2026-10-01')).toEqual({ done: 0, scheduled: 0 }) // quinta, hábito só às segundas
  })
})
