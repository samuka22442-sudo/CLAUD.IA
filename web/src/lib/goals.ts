import type { Goal } from '@ritmo/shared'
import { diffDays } from './dates.ts'
import type { ISODate } from './dates.ts'

export type GoalStatus = 'completed' | 'late' | 'active'

/** Progresso de 0 a 1: valor atual ÷ alvo (numérica) ou marcos feitos ÷ total (checklist). */
export function goalProgress(goal: Goal): number {
  if (goal.kind === 'numeric') {
    const target = goal.target ?? 0
    if (target <= 0) return 0
    return Math.min(1, Math.max(0, (goal.current ?? 0) / target))
  }
  if (goal.milestones.length === 0) return 0
  return goal.milestones.filter((milestone) => milestone.done).length / goal.milestones.length
}

export const isGoalComplete = (goal: Goal): boolean => goalProgress(goal) >= 1

/** Dias até o prazo (negativo = já passou). `null` se não há prazo. */
export function daysLeft(goal: Goal, today: ISODate): number | null {
  return goal.deadline ? diffDays(today, goal.deadline) : null
}

export function goalStatus(goal: Goal, today: ISODate): GoalStatus {
  if (goal.completedAt || isGoalComplete(goal)) return 'completed'
  const left = daysLeft(goal, today)
  return left !== null && left < 0 ? 'late' : 'active'
}

/** Mantém `completedAt` coerente com o progresso: define ao chegar a 100% e remove se voltar abaixo. */
export function withCompletion(goal: Goal, today: ISODate): Goal {
  const complete = isGoalComplete(goal)
  if (complete && !goal.completedAt) return { ...goal, completedAt: today }
  if (!complete && goal.completedAt) {
    const { completedAt: _removed, ...rest } = goal
    return rest
  }
  return goal
}

/** Soma `amount` ao valor atual de uma meta numérica (nunca abaixo de zero). */
export function addProgress(goal: Goal, amount: number, today: ISODate): Goal {
  const current = Math.max(0, Math.round(((goal.current ?? 0) + amount) * 1_000_000) / 1_000_000)
  return withCompletion({ ...goal, current }, today)
}

export function toggleMilestone(goal: Goal, milestoneId: string, today: ISODate): Goal {
  const milestones = goal.milestones.map((m) => (m.id === milestoneId ? { ...m, done: !m.done } : m))
  return withCompletion({ ...goal, milestones }, today)
}
