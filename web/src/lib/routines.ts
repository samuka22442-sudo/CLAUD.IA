import type { Routine, RoutineStep } from '@ritmo/shared'
import { formatClock, minutesOfDay, weekdayOf } from './dates.ts'
import type { ISODate } from './dates.ts'

export const isRoutineScheduledOn = (routine: Pick<Routine, 'days'>, iso: ISODate): boolean =>
  routine.days.includes(weekdayOf(iso))

export const totalMinutes = (routine: Pick<Routine, 'steps'>): number =>
  routine.steps.reduce((sum, step) => sum + step.minutes, 0)

export interface ScheduledStep {
  step: RoutineStep
  /** Minutos desde 00:00 em que o passo começa e termina. */
  startMin: number
  endMin: number
  start: string
  end: string
}

/** Horário de cada passo, encadeado a partir do horário de início da rotina. */
export function stepSchedule(routine: Pick<Routine, 'startTime' | 'steps'>): ScheduledStep[] {
  let cursor = minutesOfDay(routine.startTime)
  return routine.steps.map((step) => {
    const startMin = cursor
    cursor += step.minutes
    return { step, startMin, endMin: cursor, start: formatClock(startMin), end: formatClock(cursor) }
  })
}

export const routineEndTime = (routine: Pick<Routine, 'startTime' | 'steps'>): string =>
  formatClock(minutesOfDay(routine.startTime) + totalMinutes(routine))

/** Ids dos passos concluídos no dia que ainda existem na rotina. */
export function doneStepIds(routine: Routine, iso: ISODate): string[] {
  const done = new Set(routine.runs[iso] ?? [])
  return routine.steps.filter((step) => done.has(step.id)).map((step) => step.id)
}

export interface RoutineDayProgress {
  done: number
  total: number
  ratio: number
  complete: boolean
}

export function routineProgress(routine: Routine, iso: ISODate): RoutineDayProgress {
  const total = routine.steps.length
  const done = doneStepIds(routine, iso).length
  return { done, total, ratio: total === 0 ? 0 : done / total, complete: total > 0 && done === total }
}

/** Marca/desmarca um passo no dia, devolvendo o novo mapa de execuções (o mesmo mapa se nada mudou). */
export function withStepDone(
  runs: Routine['runs'],
  iso: ISODate,
  stepId: string,
  done: boolean,
): Routine['runs'] {
  const current = runs[iso] ?? []
  if (current.includes(stepId) === done) return runs
  const next = done ? [...current, stepId] : current.filter((id) => id !== stepId)
  const { [iso]: _old, ...rest } = runs
  return next.length > 0 ? { ...rest, [iso]: next } : rest
}

/** Remove das execuções os passos que não existem mais (após editar a rotina). */
export function pruneRuns(runs: Routine['runs'], steps: RoutineStep[]): Routine['runs'] {
  const valid = new Set(steps.map((step) => step.id))
  const out: Routine['runs'] = {}
  for (const [day, ids] of Object.entries(runs)) {
    const kept = ids.filter((id) => valid.has(id))
    if (kept.length > 0) out[day] = kept
  }
  return out
}

/**
 * Rotina "do momento" para o Início: a que está em andamento agora; senão a próxima do dia;
 * senão a última do dia que ainda não foi concluída; senão null.
 */
export function currentRoutine(routines: Routine[], iso: ISODate, nowMin: number): Routine | null {
  const today = routines
    .filter((routine) => !routine.archived && isRoutineScheduledOn(routine, iso))
    .sort((a, b) => minutesOfDay(a.startTime) - minutesOfDay(b.startTime))
  if (today.length === 0) return null

  const running = today.find((routine) => {
    const start = minutesOfDay(routine.startTime)
    return nowMin >= start && nowMin < start + totalMinutes(routine)
  })
  if (running) return running

  const upcoming = today.find((routine) => minutesOfDay(routine.startTime) > nowMin)
  if (upcoming) return upcoming

  const pending = [...today].reverse().find((routine) => !routineProgress(routine, iso).complete)
  return pending ?? today[today.length - 1] ?? null
}
