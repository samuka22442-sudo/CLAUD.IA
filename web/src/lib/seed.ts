import type { AppData, ColorKey, Goal, GoalCategory, Habit, IconKey, Routine, RoutinePeriod, Weekday } from '@ritmo/shared'
import { addDays, parseISODate, weekdayOf } from './dates.ts'
import type { ISODate } from './dates.ts'

/** PRNG determinístico (mulberry32): a mesma semente sempre gera os mesmos dados. */
export function mulberry32(seed: number): () => number {
  let state = seed | 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** UUID v4 válido gerado a partir do PRNG (aceito pela API, ao contrário de ids "fake"). */
function seededId(rng: () => number): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) =>
    c === 'x' ? Math.floor(rng() * 16).toString(16) : (8 + Math.floor(rng() * 4)).toString(16),
  )
}

const ALL: Weekday[] = [0, 1, 2, 3, 4, 5, 6]
const WORKDAYS: Weekday[] = [1, 2, 3, 4, 5]

/** Timestamp ISO de `age` dias atrás, às 09:00 locais. */
function createdAt(today: ISODate, age: number): string {
  const date = parseISODate(addDays(today, -age))
  date.setHours(9, 0, 0, 0)
  return date.toISOString()
}

interface HabitSeed {
  title: string
  description?: string
  icon: IconKey
  color: ColorKey
  days: Weekday[]
  time?: string
  /** Chance de ter feito em um dia qualquer do passado. */
  rate: number
  /** Sequência atual desejada (dias agendados seguidos até hoje). */
  streak: number
  doneToday: boolean
  archived?: boolean
}

const HABITS: HabitSeed[] = [
  { title: 'Beber 2 L de água', icon: 'droplets', color: 'cyan', days: ALL, time: '08:00', rate: 0.92, streak: 23, doneToday: true },
  { title: 'Meditar 10 minutos', icon: 'brain', color: 'violet', days: ALL, time: '07:00', rate: 0.72, streak: 9, doneToday: true },
  { title: 'Treinar', description: 'Musculação ou corrida', icon: 'dumbbell', color: 'pink', days: [1, 3, 5, 6], time: '18:30', rate: 0.8, streak: 6, doneToday: false },
  { title: 'Ler 20 páginas', icon: 'book', color: 'amber', days: ALL, time: '21:30', rate: 0.68, streak: 4, doneToday: false },
  { title: 'Estudar inglês', icon: 'languages', color: 'blue', days: WORKDAYS, time: '19:30', rate: 0.76, streak: 12, doneToday: true },
  { title: 'Caminhar ao ar livre', icon: 'footprints', color: 'lime', days: [0, 2, 4], time: '17:00', rate: 0.82, streak: 3, doneToday: false },
  { title: 'Dormir antes das 23h', icon: 'moon', color: 'fuchsia', days: ALL, time: '22:30', rate: 0.58, streak: 2, doneToday: false },
  { title: 'Sem celular após as 22h', icon: 'phone-off', color: 'red', days: ALL, rate: 0.42, streak: 0, doneToday: false },
  { title: 'Aprender violão', icon: 'music', color: 'orange', days: [2, 6], rate: 0.5, streak: 0, doneToday: false, archived: true },
]

/** Conclusões dos últimos `history` dias respeitando a agenda e a sequência atual pedida. */
function buildCompletions(seed: HabitSeed, today: ISODate, history: number, rng: () => number): ISODate[] {
  const done: ISODate[] = []
  let streakLeft = seed.streak
  let streakClosed = false
  for (let i = 0; i <= history; i++) {
    const day = addDays(today, -i)
    if (!seed.days.includes(weekdayOf(day))) continue
    if (i === 0) {
      if (seed.doneToday) {
        done.push(day)
        streakLeft -= 1
      }
      continue
    }
    if (!streakClosed) {
      if (streakLeft > 0) {
        done.push(day)
        streakLeft -= 1
      } else {
        streakClosed = true // este dia fica em branco e encerra a sequência
      }
      continue
    }
    if (rng() < seed.rate) done.push(day)
  }
  return done.sort()
}

interface GoalSeed {
  title: string
  description?: string
  category: GoalCategory
  icon: IconKey
  color: ColorKey
  kind: 'numeric' | 'checklist'
  target?: number
  current?: number
  unit?: string
  milestones?: { title: string; done: boolean }[]
  /** Dias a partir de hoje (negativo = já passou). */
  deadlineIn?: number
  completedAgo?: number
  age: number
}

const GOALS: GoalSeed[] = [
  { title: 'Ler 12 livros neste ano', category: 'study', icon: 'book', color: 'violet', kind: 'numeric', target: 12, current: 8, unit: 'livros', deadlineIn: 95, age: 270 },
  { title: 'Correr 5 km sem parar', description: 'Treino progressivo, 3x por semana', category: 'health', icon: 'footprints', color: 'pink', kind: 'numeric', target: 5, current: 3.5, unit: 'km', deadlineIn: 42, age: 60 },
  { title: 'Reserva de emergência', description: 'Seis meses de custo de vida', category: 'finance', icon: 'wallet', color: 'emerald', kind: 'numeric', target: 10000, current: 6200, unit: 'R$', deadlineIn: 120, age: 150 },
  {
    title: 'Concluir o curso de React',
    category: 'career',
    icon: 'code',
    color: 'cyan',
    kind: 'checklist',
    milestones: [
      { title: 'Fundamentos e JSX', done: true },
      { title: 'Hooks e estado', done: true },
      { title: 'Roteamento', done: true },
      { title: 'Testes', done: true },
      { title: 'Projeto final', done: false },
      { title: 'Publicar o portfólio', done: false },
    ],
    deadlineIn: 30,
    age: 75,
  },
  {
    title: 'Viagem para a Bahia',
    category: 'leisure',
    icon: 'sparkles',
    color: 'amber',
    kind: 'checklist',
    milestones: [
      { title: 'Definir datas', done: true },
      { title: 'Comprar passagens', done: true },
      { title: 'Reservar hospedagem', done: false },
      { title: 'Montar roteiro', done: false },
      { title: 'Fazer as malas', done: false },
    ],
    deadlineIn: 88,
    age: 40,
  },
  {
    title: 'Organizar documentos',
    category: 'personal',
    icon: 'briefcase',
    color: 'orange',
    kind: 'checklist',
    milestones: [
      { title: 'Digitalizar contratos', done: true },
      { title: 'Atualizar cadastros', done: true },
      { title: 'Arquivar notas fiscais', done: false },
    ],
    deadlineIn: -6,
    age: 50,
  },
  { title: 'Ler “Hábitos Atômicos”', category: 'study', icon: 'trophy', color: 'lime', kind: 'numeric', target: 320, current: 320, unit: 'páginas', deadlineIn: -12, completedAgo: 14, age: 55 },
]

interface RoutineSeed {
  title: string
  icon: IconKey
  color: ColorKey
  period: RoutinePeriod
  days: Weekday[]
  startTime: string
  steps: { title: string; minutes: number }[]
  /** Passos já concluídos hoje. */
  doneToday: number
  age: number
}

const ROUTINES: RoutineSeed[] = [
  {
    title: 'Manhã energizada',
    icon: 'sun',
    color: 'amber',
    period: 'morning',
    days: ALL,
    startTime: '06:30',
    steps: [
      { title: 'Acordar e beber água', minutes: 5 },
      { title: 'Alongamento', minutes: 10 },
      { title: 'Meditação guiada', minutes: 10 },
      { title: 'Banho', minutes: 15 },
      { title: 'Café da manhã', minutes: 20 },
      { title: 'Planejar o dia', minutes: 10 },
    ],
    doneToday: 3,
    age: 60,
  },
  {
    title: 'Foco da tarde',
    icon: 'target',
    color: 'violet',
    period: 'afternoon',
    days: WORKDAYS,
    startTime: '14:00',
    steps: [
      { title: 'Revisar prioridades', minutes: 5 },
      { title: 'Bloco de foco profundo', minutes: 50 },
      { title: 'Pausa ativa', minutes: 10 },
      { title: 'Bloco de foco profundo', minutes: 50 },
      { title: 'Registrar o que avançou', minutes: 5 },
    ],
    doneToday: 0,
    age: 45,
  },
  {
    title: 'Desacelerar à noite',
    icon: 'moon',
    color: 'fuchsia',
    period: 'evening',
    days: ALL,
    startTime: '21:30',
    steps: [
      { title: 'Arrumar a casa', minutes: 10 },
      { title: 'Skincare', minutes: 10 },
      { title: 'Ler um capítulo', minutes: 20 },
      { title: 'Diário de gratidão', minutes: 5 },
      { title: 'Desligar as telas', minutes: 5 },
    ],
    doneToday: 0,
    age: 30,
  },
]

/**
 * Dados de demonstração realistas, relativos a `today`: hábitos com sequências variadas,
 * metas em estados diferentes (andamento, atrasada, concluída) e rotinas com histórico.
 * Determinístico: o mesmo `today` e a mesma `seed` geram sempre o mesmo resultado.
 */
export function buildDemoData(today: ISODate, seed = 20261001): AppData {
  const rng = mulberry32(seed)

  const habits: Habit[] = HABITS.map((h) => ({
    id: seededId(rng),
    title: h.title,
    ...(h.description ? { description: h.description } : {}),
    icon: h.icon,
    color: h.color,
    days: h.days,
    ...(h.time ? { time: h.time } : {}),
    archived: h.archived ?? false,
    createdAt: createdAt(today, 190),
    completions: buildCompletions(h, today, 179, rng),
  }))

  const goals: Goal[] = GOALS.map((g) => {
    const milestones = (g.milestones ?? []).map((m) => ({ id: seededId(rng), title: m.title, done: m.done }))
    return {
      id: seededId(rng),
      title: g.title,
      ...(g.description ? { description: g.description } : {}),
      category: g.category,
      icon: g.icon,
      color: g.color,
      kind: g.kind,
      ...(g.target !== undefined ? { target: g.target } : {}),
      ...(g.current !== undefined ? { current: g.current } : {}),
      ...(g.unit ? { unit: g.unit } : {}),
      milestones,
      ...(g.deadlineIn !== undefined ? { deadline: addDays(today, g.deadlineIn) } : {}),
      ...(g.completedAgo !== undefined ? { completedAt: addDays(today, -g.completedAgo) } : {}),
      archived: false,
      createdAt: createdAt(today, g.age),
    }
  })

  const routines: Routine[] = ROUTINES.map((r) => {
    const steps = r.steps.map((s) => ({ id: seededId(rng), title: s.title, minutes: s.minutes }))
    const runs: Routine['runs'] = {}
    for (let i = 1; i <= 21; i++) {
      const day = addDays(today, -i)
      if (!r.days.includes(weekdayOf(day))) continue
      const roll = rng()
      if (roll < 0.7) runs[day] = steps.map((s) => s.id)
      else if (roll < 0.9) runs[day] = steps.slice(0, 1 + Math.floor(rng() * (steps.length - 1))).map((s) => s.id)
    }
    if (r.doneToday > 0 && r.days.includes(weekdayOf(today))) {
      runs[today] = steps.slice(0, r.doneToday).map((s) => s.id)
    }
    return {
      id: seededId(rng),
      title: r.title,
      icon: r.icon,
      color: r.color,
      period: r.period,
      days: r.days,
      startTime: r.startTime,
      steps,
      archived: false,
      createdAt: createdAt(today, r.age),
      runs,
    }
  })

  return { habits, goals, routines }
}
