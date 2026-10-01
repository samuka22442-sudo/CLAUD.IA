import type { Routine } from '@ritmo/shared'
import { describe, expect, it } from 'vitest'
import {
  currentRoutine,
  doneStepIds,
  pruneRuns,
  routineEndTime,
  routineProgress,
  stepSchedule,
  totalMinutes,
  withStepDone,
} from './routines.ts'

const TODAY = '2026-10-01' // quinta

const mk = (over: Partial<Routine> = {}): Routine => ({
  id: 'r1',
  title: 'Manhã',
  icon: 'sun',
  color: 'amber',
  period: 'morning',
  days: [0, 1, 2, 3, 4, 5, 6],
  startTime: '06:30',
  steps: [
    { id: 's1', title: 'Água', minutes: 5 },
    { id: 's2', title: 'Alongar', minutes: 10 },
    { id: 's3', title: 'Meditar', minutes: 15 },
  ],
  archived: false,
  createdAt: '2026-01-01T12:00:00.000Z',
  runs: {},
  ...over,
})

describe('horários', () => {
  it('encadeia os passos a partir do horário de início', () => {
    const schedule = stepSchedule(mk())
    expect(schedule.map((s) => [s.start, s.end])).toEqual([
      ['06:30', '06:35'],
      ['06:35', '06:45'],
      ['06:45', '07:00'],
    ])
    expect(totalMinutes(mk())).toBe(30)
    expect(routineEndTime(mk())).toBe('07:00')
  })

  it('dá a volta na meia-noite', () => {
    const night = mk({ startTime: '23:50', steps: [{ id: 'a', title: 'Ler', minutes: 20 }] })
    expect(routineEndTime(night)).toBe('00:10')
  })
})

describe('progresso do dia', () => {
  it('conta passos concluídos e ignora ids que não existem mais', () => {
    const routine = mk({ runs: { [TODAY]: ['s1', 's3', 'fantasma'] } })
    expect(doneStepIds(routine, TODAY)).toEqual(['s1', 's3'])
    expect(routineProgress(routine, TODAY)).toEqual({ done: 2, total: 3, ratio: 2 / 3, complete: false })
    expect(routineProgress(mk({ runs: { [TODAY]: ['s1', 's2', 's3'] } }), TODAY).complete).toBe(true)
    expect(routineProgress(mk(), TODAY)).toEqual({ done: 0, total: 3, ratio: 0, complete: false })
  })

  it('withStepDone adiciona, remove e descarta dias vazios', () => {
    let runs = withStepDone({}, TODAY, 's1', true)
    runs = withStepDone(runs, TODAY, 's1', true) // idempotente
    expect(runs).toEqual({ [TODAY]: ['s1'] })
    runs = withStepDone(runs, TODAY, 's2', true)
    expect(runs[TODAY]).toEqual(['s1', 's2'])
    runs = withStepDone(runs, TODAY, 's1', false)
    runs = withStepDone(runs, TODAY, 's2', false)
    expect(runs).toEqual({})
  })

  it('pruneRuns remove passos que saíram da rotina', () => {
    const runs = { '2026-09-30': ['s1', 's2'], '2026-10-01': ['s2'] }
    expect(pruneRuns(runs, [{ id: 's1', title: 'Água', minutes: 5 }])).toEqual({ '2026-09-30': ['s1'] })
  })
})

describe('currentRoutine (a rotina do momento)', () => {
  const morning = mk({ id: 'm', startTime: '06:30' }) // 06:30–07:00
  const noon = mk({ id: 'n', title: 'Foco', startTime: '14:00', period: 'afternoon' }) // 14:00–14:30
  const night = mk({ id: 'o', title: 'Noite', startTime: '21:30', period: 'evening' }) // 21:30–22:00
  const all = [night, noon, morning] // fora de ordem de propósito

  it('devolve a que está em andamento agora', () => {
    expect(currentRoutine(all, TODAY, 6 * 60 + 40)?.id).toBe('m')
    expect(currentRoutine(all, TODAY, 14 * 60 + 5)?.id).toBe('n')
  })

  it('senão, a próxima do dia', () => {
    expect(currentRoutine(all, TODAY, 5 * 60)?.id).toBe('m')
    expect(currentRoutine(all, TODAY, 10 * 60)?.id).toBe('n')
  })

  it('depois de todas, a última ainda não concluída', () => {
    expect(currentRoutine(all, TODAY, 23 * 60)?.id).toBe('o')
    const nightDone = { ...night, runs: { [TODAY]: ['s1', 's2', 's3'] } }
    expect(currentRoutine([nightDone, noon, morning], TODAY, 23 * 60)?.id).toBe('n')
  })

  it('ignora arquivadas e as que não são do dia; null se não sobrar nenhuma', () => {
    expect(currentRoutine([{ ...morning, archived: true }], TODAY, 6 * 60 + 40)).toBeNull()
    expect(currentRoutine([{ ...morning, days: [1] }], TODAY, 6 * 60 + 40)).toBeNull() // só segundas
    expect(currentRoutine([], TODAY, 600)).toBeNull()
  })
})
