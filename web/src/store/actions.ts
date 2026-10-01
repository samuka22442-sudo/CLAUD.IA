import type { ColorKey, Goal, GoalCategory, GoalKind, Habit, IconKey, Routine, RoutinePeriod, RoutineStep, Weekday } from '@ritmo/shared'
import { todayISO } from '../lib/dates.ts'
import type { ISODate } from '../lib/dates.ts'
import { addProgress, toggleMilestone, withCompletion } from '../lib/goals.ts'
import { dayProgress } from '../lib/habits.ts'
import { newId } from '../lib/ids.ts'
import { useData } from './data.ts'
import { toast } from './toast.ts'

/**
 * Ações de alto nível: montam a operação certa (com ids, datas e regras de negócio)
 * e a entregam ao store, que aplica na tela na hora e enfileira o envio.
 */
const commit = useData.getState().commit
const current = () => useData.getState().data

/* ------------------------------------------------------------------ Hábitos */

export interface HabitDraft {
  id?: string
  title: string
  description?: string
  icon: IconKey
  color: ColorKey
  days: Weekday[]
  time?: string
}

export function saveHabit(draft: HabitDraft): string {
  const existing = draft.id ? current().habits.find((h) => h.id === draft.id) : undefined
  const habit: Habit = {
    id: existing?.id ?? newId(),
    title: draft.title.trim(),
    ...(draft.description?.trim() ? { description: draft.description.trim() } : {}),
    icon: draft.icon,
    color: draft.color,
    days: [...draft.days].sort((a, b) => a - b),
    ...(draft.time ? { time: draft.time } : {}),
    archived: existing?.archived ?? false,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    completions: existing?.completions ?? [],
  }
  commit({ type: 'habit.put', habit })
  return habit.id
}

export function setHabitDay(id: string, date: ISODate, done: boolean): void {
  commit({ type: 'habit.mark', id, date, done })
}

/** Marca/desmarca o hábito HOJE e comemora quando o dia fica completo. */
export function toggleHabitToday(id: string, today: ISODate, done: boolean): void {
  setHabitDay(id, today, done)
  if (!done) return
  const progress = dayProgress(current().habits, today)
  if (progress.scheduled > 1 && progress.done === progress.scheduled) {
    toast.success('Dia completo! Você concluiu todos os hábitos de hoje.')
  }
}

export function setHabitArchived(id: string, archived: boolean): void {
  const habit = current().habits.find((h) => h.id === id)
  if (habit) commit({ type: 'habit.put', habit: { ...habit, archived } })
}

export function deleteHabit(id: string): void {
  commit({ type: 'habit.delete', id })
}

/* ------------------------------------------------------------------ Metas */

export interface GoalDraft {
  id?: string
  title: string
  description?: string
  category: GoalCategory
  icon: IconKey
  color: ColorKey
  kind: GoalKind
  target?: number
  current?: number
  unit?: string
  milestones: { id?: string; title: string; done: boolean }[]
  deadline?: ISODate
}

export function saveGoal(draft: GoalDraft): string {
  const existing = draft.id ? current().goals.find((g) => g.id === draft.id) : undefined
  const numeric = draft.kind === 'numeric'
  const goal: Goal = withCompletion(
    {
      id: existing?.id ?? newId(),
      title: draft.title.trim(),
      ...(draft.description?.trim() ? { description: draft.description.trim() } : {}),
      category: draft.category,
      icon: draft.icon,
      color: draft.color,
      kind: draft.kind,
      ...(numeric ? { target: draft.target ?? 1, current: draft.current ?? 0 } : {}),
      ...(numeric && draft.unit?.trim() ? { unit: draft.unit.trim() } : {}),
      milestones: numeric
        ? []
        : draft.milestones
            .filter((m) => m.title.trim())
            .map((m) => ({ id: m.id ?? newId(), title: m.title.trim(), done: m.done })),
      ...(draft.deadline ? { deadline: draft.deadline } : {}),
      ...(existing?.completedAt ? { completedAt: existing.completedAt } : {}),
      archived: existing?.archived ?? false,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    },
    todayISO(),
  )
  commit({ type: 'goal.put', goal })
  return goal.id
}

export function addGoalProgress(id: string, amount: number): void {
  const goal = current().goals.find((g) => g.id === id)
  if (goal) commit({ type: 'goal.put', goal: addProgress(goal, amount, todayISO()) })
}

export function toggleGoalMilestone(goalId: string, milestoneId: string): void {
  const goal = current().goals.find((g) => g.id === goalId)
  if (goal) commit({ type: 'goal.put', goal: toggleMilestone(goal, milestoneId, todayISO()) })
}

export function setGoalArchived(id: string, archived: boolean): void {
  const goal = current().goals.find((g) => g.id === id)
  if (goal) commit({ type: 'goal.put', goal: { ...goal, archived } })
}

export function deleteGoal(id: string): void {
  commit({ type: 'goal.delete', id })
}

/* ------------------------------------------------------------------ Rotinas */

export interface RoutineDraft {
  id?: string
  title: string
  icon: IconKey
  color: ColorKey
  period: RoutinePeriod
  days: Weekday[]
  startTime: string
  steps: { id?: string; title: string; minutes: number }[]
}

export function saveRoutine(draft: RoutineDraft): string {
  const existing = draft.id ? current().routines.find((r) => r.id === draft.id) : undefined
  const steps: RoutineStep[] = draft.steps
    .filter((s) => s.title.trim())
    .map((s) => ({ id: s.id ?? newId(), title: s.title.trim(), minutes: Math.max(1, Math.round(s.minutes)) }))
  const routine: Routine = {
    id: existing?.id ?? newId(),
    title: draft.title.trim(),
    icon: draft.icon,
    color: draft.color,
    period: draft.period,
    days: [...draft.days].sort((a, b) => a - b),
    startTime: draft.startTime,
    steps,
    archived: existing?.archived ?? false,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    runs: existing?.runs ?? {},
  }
  commit({ type: 'routine.put', routine })
  return routine.id
}

export function setRoutineStep(id: string, date: ISODate, stepId: string, done: boolean): void {
  commit({ type: 'routine.mark', id, date, stepId, done })
}

export function setRoutineArchived(id: string, archived: boolean): void {
  const routine = current().routines.find((r) => r.id === id)
  if (routine) commit({ type: 'routine.put', routine: { ...routine, archived } })
}

export function deleteRoutine(id: string): void {
  commit({ type: 'routine.delete', id })
}

/* ------------------------------------------------------------------ Geral */

export function clearAllData(): void {
  commit({ type: 'data.clear' })
}
