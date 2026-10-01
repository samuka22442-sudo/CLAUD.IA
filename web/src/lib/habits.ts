import type { Habit } from '@ritmo/shared'
import { addDays, rangeISO, toISODate, weekdayOf } from './dates.ts'
import type { ISODate } from './dates.ts'

/** Limite de segurança para varrer o histórico (10 anos). */
const MAX_LOOKBACK_DAYS = 3650

export const isScheduledOn = (habit: Pick<Habit, 'days'>, iso: ISODate): boolean =>
  habit.days.includes(weekdayOf(iso))

export const isDoneOn = (habit: Pick<Habit, 'completions'>, iso: ISODate): boolean =>
  habit.completions.includes(iso)

/** Primeiro dia que conta para o hábito: o mais antigo entre a criação e a primeira conclusão. */
export function habitStartDate(habit: Pick<Habit, 'createdAt' | 'completions'>): ISODate {
  const created = toISODate(new Date(habit.createdAt))
  const first = habit.completions.reduce<ISODate | null>((min, day) => (min === null || day < min ? day : min), null)
  return first !== null && first < created ? first : created
}

/**
 * Sequência atual: dias agendados concluídos seguidos, terminando em `today`.
 * Dias fora da agenda não quebram nem somam. Se hoje ainda não foi feito, a sequência
 * continua valendo até ontem (o dia ainda não acabou).
 */
export function currentStreak(habit: Habit, today: ISODate): number {
  const start = habitStartDate(habit)
  let streak = 0
  let day = today
  for (let i = 0; i < MAX_LOOKBACK_DAYS && day >= start; i++, day = addDays(day, -1)) {
    if (!isScheduledOn(habit, day)) continue
    if (isDoneOn(habit, day)) streak += 1
    else if (day !== today) break
  }
  return streak
}

/** Maior sequência de dias agendados concluídos já alcançada (o dia de hoje, se pendente, não quebra nada). */
export function bestStreak(habit: Habit, today: ISODate): number {
  const start = habitStartDate(habit)
  let best = 0
  let run = 0
  for (const day of rangeISO(start, today)) {
    if (!isScheduledOn(habit, day)) continue
    if (isDoneOn(habit, day)) {
      run += 1
      best = Math.max(best, run)
    } else if (day !== today) {
      run = 0
    }
  }
  return best
}

export interface Tally {
  done: number
  scheduled: number
}

/**
 * Concluídos × agendados de `from` até `to` (inclusive), ignorando dias anteriores ao início do hábito.
 * Hoje, se ainda não foi feito, não conta como falha.
 */
export function tally(habit: Habit, from: ISODate, to: ISODate, today: ISODate): Tally {
  const start = habitStartDate(habit)
  const first = from < start ? start : from
  const result: Tally = { done: 0, scheduled: 0 }
  if (first > to) return result
  for (const day of rangeISO(first, to)) {
    if (!isScheduledOn(habit, day)) continue
    const done = isDoneOn(habit, day)
    if (day === today && !done) continue
    result.scheduled += 1
    if (done) result.done += 1
  }
  return result
}

/** Taxa de conclusão (0–1) nos últimos `days` dias, terminando em `today`. */
export function completionRate(habit: Habit, days: number, today: ISODate): number {
  const { done, scheduled } = tally(habit, addDays(today, -(days - 1)), today, today)
  return scheduled === 0 ? 0 : done / scheduled
}

/** Hábitos ativos e agendados para o dia. */
export const habitsForDay = (habits: Habit[], iso: ISODate): Habit[] =>
  habits.filter((habit) => !habit.archived && isScheduledOn(habit, iso))

/** Progresso do dia: quantos dos hábitos agendados foram concluídos. */
export function dayProgress(habits: Habit[], iso: ISODate): Tally {
  const scheduled = habitsForDay(habits, iso)
  return { scheduled: scheduled.length, done: scheduled.filter((habit) => isDoneOn(habit, iso)).length }
}

/**
 * Concluídos × agendados em UM dia, para os gráficos. Só entram hábitos ativos que já existiam no dia.
 * Diferente de `tally`, o dia de hoje pendente conta como agendado (mostra o progresso parcial do dia).
 */
export function dayTally(habits: Habit[], iso: ISODate): Tally {
  let done = 0
  let scheduled = 0
  for (const habit of habits) {
    if (habit.archived || !isScheduledOn(habit, iso) || iso < habitStartDate(habit)) continue
    scheduled += 1
    if (isDoneOn(habit, iso)) done += 1
  }
  return { done, scheduled }
}

/** Soma de concluídos/agendados de vários hábitos num intervalo (usado nos gráficos). */
export function aggregateTally(habits: Habit[], from: ISODate, to: ISODate, today: ISODate): Tally {
  return habits
    .filter((habit) => !habit.archived)
    .reduce<Tally>(
      (acc, habit) => {
        const t = tally(habit, from, to, today)
        return { done: acc.done + t.done, scheduled: acc.scheduled + t.scheduled }
      },
      { done: 0, scheduled: 0 },
    )
}

/** Marca ou desmarca um dia, mantendo a lista ordenada e sem repetição. Sem mudança → mesma lista. */
export function withDayDone(completions: ISODate[], iso: ISODate, done: boolean): ISODate[] {
  if (completions.includes(iso) === done) return completions
  return done ? [...completions, iso].sort() : completions.filter((day) => day !== iso)
}
