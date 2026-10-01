import type { GoalCategory, RoutinePeriod, Weekday } from '@ritmo/shared'
import { WEEKDAY_ABBR } from './dates.ts'

export const GOAL_CATEGORY_LABELS: Record<GoalCategory, string> = {
  health: 'Saúde',
  study: 'Estudos',
  finance: 'Finanças',
  career: 'Carreira',
  personal: 'Pessoal',
  relationships: 'Relacionamentos',
  leisure: 'Lazer',
}

export const PERIOD_LABELS: Record<RoutinePeriod, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  evening: 'Noite',
  custom: 'Personalizada',
}

const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((d) => b.includes(d))

/** "Todos os dias", "Dias úteis", "Fins de semana" ou "Seg, qua e sex". */
export function scheduleLabel(days: Weekday[]): string {
  if (days.length === 7) return 'Todos os dias'
  if (sameSet(days, [1, 2, 3, 4, 5])) return 'Dias úteis'
  if (sameSet(days, [0, 6])) return 'Fins de semana'
  const names = [...days].sort((a, b) => a - b).map((d) => WEEKDAY_ABBR[d]!)
  const capitalized = names.map((n, i) => (i === 0 ? n[0]!.toUpperCase() + n.slice(1) : n))
  return capitalized.length === 1 ? capitalized[0]! : `${capitalized.slice(0, -1).join(', ')} e ${capitalized.at(-1)}`
}
