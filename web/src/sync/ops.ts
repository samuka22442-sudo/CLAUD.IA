import type { AppData, Goal, Habit, Routine } from '@ritmo/shared'
import { withDayDone } from '../lib/habits.ts'
import { pruneRuns, withStepDone } from '../lib/routines.ts'

/**
 * Toda alteração de dados é uma operação. A mesma operação é:
 *  1. aplicada na hora no estado local (otimismo) por `applyOp`;
 *  2. enfileirada e enviada ao servidor (`opToRequest`), que aplica a mesma regra.
 * Como `applyOp` espelha o servidor, "snapshot do servidor + operações pendentes" é igual ao estado
 * que o servidor terá depois de receber a fila.
 */
export type Op =
  | { type: 'habit.put'; habit: Habit }
  | { type: 'habit.delete'; id: string }
  | { type: 'habit.mark'; id: string; date: string; done: boolean }
  | { type: 'goal.put'; goal: Goal }
  | { type: 'goal.delete'; id: string }
  | { type: 'routine.put'; routine: Routine }
  | { type: 'routine.delete'; id: string }
  | { type: 'routine.mark'; id: string; date: string; stepId: string; done: boolean }
  | { type: 'data.clear' }

export const EMPTY_DATA: AppData = { habits: [], goals: [], routines: [] }

/** Troca o item de mesmo id; se não existir, adiciona ao final. */
function upsert<T extends { id: string }>(list: T[], next: T, merge?: (existing: T) => T): T[] {
  const exists = list.some((item) => item.id === next.id)
  if (!exists) return [...list, next]
  return list.map((item) => (item.id === next.id ? (merge ? merge(item) : next) : item))
}

/** Aplica `fn` ao item de `id`. Se nada mudou, devolve a MESMA lista (evita re-render à toa). */
function mapById<T extends { id: string }>(list: T[], id: string, fn: (item: T) => T): T[] {
  let changed = false
  const next = list.map((item) => {
    if (item.id !== id) return item
    const updated = fn(item)
    if (updated !== item) changed = true
    return updated
  })
  return changed ? next : list
}

/** Aplica a operação sem mutar `data`. Itens que não mudam mantêm a mesma referência. */
export function applyOp(data: AppData, op: Op): AppData {
  switch (op.type) {
    case 'habit.put':
      return {
        ...data,
        // O servidor ignora `completions` no PUT: item novo nasce sem conclusões, existente mantém as suas.
        habits: upsert(data.habits, { ...op.habit, completions: [] }, (old) => ({ ...op.habit, completions: old.completions })),
      }
    case 'habit.delete':
      return { ...data, habits: data.habits.filter((habit) => habit.id !== op.id) }
    case 'habit.mark': {
      const habits = mapById(data.habits, op.id, (habit) => {
        const completions = withDayDone(habit.completions, op.date, op.done)
        return completions === habit.completions ? habit : { ...habit, completions }
      })
      return habits === data.habits ? data : { ...data, habits }
    }
    case 'goal.put':
      return { ...data, goals: upsert(data.goals, op.goal) }
    case 'goal.delete':
      return { ...data, goals: data.goals.filter((goal) => goal.id !== op.id) }
    case 'routine.put':
      return {
        ...data,
        // Passos removidos na edição levam junto as conclusões deles (como no servidor).
        routines: upsert(data.routines, { ...op.routine, runs: {} }, (old) => ({
          ...op.routine,
          runs: pruneRuns(old.runs, op.routine.steps),
        })),
      }
    case 'routine.delete':
      return { ...data, routines: data.routines.filter((routine) => routine.id !== op.id) }
    case 'routine.mark': {
      const routines = mapById(data.routines, op.id, (routine) => {
        if (!routine.steps.some((step) => step.id === op.stepId)) return routine
        const runs = withStepDone(routine.runs, op.date, op.stepId, op.done)
        return runs === routine.runs ? routine : { ...routine, runs }
      })
      return routines === data.routines ? data : { ...data, routines }
    }
    case 'data.clear':
      return EMPTY_DATA
  }
}

export const applyOps = (data: AppData, ops: Op[]): AppData => ops.reduce(applyOp, data)

export interface HttpRequest {
  method: 'PUT' | 'DELETE'
  path: string
  body?: unknown
}

/** Requisição HTTP que leva a operação ao servidor (todas idempotentes). */
export function opToRequest(op: Op): HttpRequest {
  switch (op.type) {
    case 'habit.put': {
      const { completions: _completions, ...input } = op.habit
      return { method: 'PUT', path: `/api/habits/${op.habit.id}`, body: input }
    }
    case 'habit.delete':
      return { method: 'DELETE', path: `/api/habits/${op.id}` }
    case 'habit.mark':
      return { method: 'PUT', path: `/api/habits/${op.id}/completions/${op.date}`, body: { done: op.done } }
    case 'goal.put':
      return { method: 'PUT', path: `/api/goals/${op.goal.id}`, body: op.goal }
    case 'goal.delete':
      return { method: 'DELETE', path: `/api/goals/${op.id}` }
    case 'routine.put': {
      const { runs: _runs, ...input } = op.routine
      return { method: 'PUT', path: `/api/routines/${op.routine.id}`, body: input }
    }
    case 'routine.delete':
      return { method: 'DELETE', path: `/api/routines/${op.id}` }
    case 'routine.mark':
      return {
        method: 'PUT',
        path: `/api/routines/${op.id}/runs/${op.date}/${op.stepId}`,
        body: { done: op.done },
      }
    case 'data.clear':
      return { method: 'DELETE', path: '/api/data' }
  }
}
