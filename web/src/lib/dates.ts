import type { Weekday } from '@ritmo/shared'

/**
 * Datas de calendário são sempre strings 'YYYY-MM-DD' no fuso LOCAL do aparelho.
 * Nunca use `toISOString()` para isso: ele converte para UTC e, à noite no Brasil, devolve o dia seguinte.
 */
export type ISODate = string

const pad = (n: number) => String(n).padStart(2, '0')

/** Date → 'YYYY-MM-DD' pelos campos locais. */
export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 'YYYY-MM-DD' → Date à meia-noite local. */
export function parseISODate(iso: ISODate): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year!, month! - 1, day!)
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now)
}

/** Soma dias de calendário (seguro com horário de verão: mexe no dia, não em milissegundos). */
export function addDays(iso: ISODate, amount: number): ISODate {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + amount)
  return toISODate(date)
}

export function weekdayOf(iso: ISODate): Weekday {
  return parseISODate(iso).getDay() as Weekday
}

/** Quantos dias de `a` até `b` (positivo se b é depois de a). */
export function diffDays(a: ISODate, b: ISODate): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by!, bm! - 1, bd!) - Date.UTC(ay!, am! - 1, ad!)) / 86_400_000)
}

/** Todas as datas de `from` até `to`, inclusive. */
export function rangeISO(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = []
  for (let day = from; day <= to; day = addDays(day, 1)) out.push(day)
  return out
}

/** Início da semana (domingo por padrão) que contém `iso`. */
export function startOfWeek(iso: ISODate, weekStartsOn: Weekday = 0): ISODate {
  const back = (weekdayOf(iso) - weekStartsOn + 7) % 7
  return addDays(iso, -back)
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/** Grade de um mês para calendário: semanas começando no domingo, com `null` nos dias de fora do mês. */
export function monthMatrix(year: number, monthIndex: number): (ISODate | null)[][] {
  const first = new Date(year, monthIndex, 1).getDay()
  const total = daysInMonth(year, monthIndex)
  const cells: (ISODate | null)[] = Array.from({ length: first }, () => null)
  for (let day = 1; day <= total; day++) cells.push(toISODate(new Date(year, monthIndex, day)))
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (ISODate | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/* ------------------------------------------------------------------ Rótulos (pt-BR) */

export const WEEKDAY_INITIAL = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const
export const WEEKDAY_ABBR = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const
export const WEEKDAY_NAME = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
] as const

const longDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })
const fullDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
const monthYear = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

/** "quinta-feira, 1 de outubro" */
export const formatLongDate = (iso: ISODate) => longDate.format(parseISODate(iso))
/** "1 de out." */
export const formatShortDate = (iso: ISODate) => shortDate.format(parseISODate(iso))
/** "1 de out. de 2026" */
export const formatFullDate = (iso: ISODate) => fullDate.format(parseISODate(iso))
/** "outubro de 2026" */
export const formatMonthYear = (year: number, monthIndex: number) => monthYear.format(new Date(year, monthIndex, 1))

/* ------------------------------------------------------------------ Horários 'HH:mm' */

export function minutesOfDay(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h! * 60 + m!
}

/** Minutos desde 00:00 → 'HH:mm' (dá a volta após as 24 h). */
export function formatClock(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`
}

/** Horário atual do aparelho em minutos desde 00:00. */
export const nowMinutes = (now: Date = new Date()) => now.getHours() * 60 + now.getMinutes()
