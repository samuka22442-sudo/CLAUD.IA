/**
 * Schemas zod: fonte única de verdade para o formato dos dados.
 * - O server valida toda entrada com eles.
 * - O web usa apenas os TIPOS (via `@ritmo/shared`), então o zod não entra no bundle do front.
 *
 * Datas de calendário (`ISODate`) são sempre strings `YYYY-MM-DD` — nunca `Date` — para
 * não haver deslocamento de fuso horário.
 */
import { z } from 'zod'
import {
  COLOR_KEYS,
  GOAL_CATEGORIES,
  GOAL_KINDS,
  ICON_KEYS,
  LIMITS,
  ROUTINE_PERIODS,
} from './constants.ts'

/** Intervalo aceito para datas de calendário: protege o Postgres de valores absurdos (ex.: ano 0000 → erro 500). */
const DATE_MIN = '2000-01-01'
const DATE_MAX = '2100-12-31'

export const isoDateSchema = z
  .iso.date()
  .refine((date) => date >= DATE_MIN && date <= DATE_MAX, 'Data fora do intervalo aceito')

/** Instante em UTC (ex.: createdAt), com o mesmo intervalo de anos. */
export const timestampSchema = z
  .iso.datetime()
  .refine((value) => value.slice(0, 4) >= '2000' && value.slice(0, 4) <= '2100', 'Data fora do intervalo aceito')

export const uuidSchema = z.uuid()

/** Texto aparado, com limite de tamanho e sem o caractere NUL (que o Postgres não aceita em text/jsonb). */
const safeText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((value) => !value.includes('\u0000'), 'Caractere inválido')

export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use o formato HH:mm')

const weekdaySchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
])

/** Dias da semana sem repetição, em ordem crescente. */
export const daysSchema = z
  .array(weekdaySchema)
  .min(1, 'Escolha ao menos um dia')
  .max(7)
  .refine((days) => new Set(days).size === days.length, 'Dias repetidos')
  .transform((days) => [...days].sort((a, b) => a - b))

const titleSchema = safeText(LIMITS.title).refine((v) => v.length > 0, 'Informe um título')
const descriptionSchema = safeText(LIMITS.description)
const colorSchema = z.enum(COLOR_KEYS)
const iconSchema = z.enum(ICON_KEYS)

/* ------------------------------------------------------------------ Hábitos */

export const habitInputSchema = z.object({
  id: uuidSchema,
  title: titleSchema,
  description: descriptionSchema.optional(),
  icon: iconSchema,
  color: colorSchema,
  days: daysSchema,
  time: timeSchema.optional(),
  archived: z.boolean(),
  createdAt: timestampSchema,
})
export type HabitInput = z.infer<typeof habitInputSchema>

export const habitSchema = habitInputSchema.extend({
  /** Dias (YYYY-MM-DD) em que o hábito foi concluído. */
  completions: z.array(isoDateSchema),
})
export type Habit = z.infer<typeof habitSchema>

/* -------------------------------------------------------------------- Metas */

export const milestoneSchema = z.object({
  id: uuidSchema,
  title: safeText(LIMITS.milestoneTitle).refine((v) => v.length > 0, 'Informe o marco'),
  done: z.boolean(),
})
export type Milestone = z.infer<typeof milestoneSchema>

const goalValueSchema = z.number().min(0).max(LIMITS.maxGoalValue)

export const goalSchema = z
  .object({
    id: uuidSchema,
    title: titleSchema,
    description: descriptionSchema.optional(),
    category: z.enum(GOAL_CATEGORIES),
    icon: iconSchema,
    color: colorSchema,
    kind: z.enum(GOAL_KINDS),
    /** Metas numéricas: alvo, valor atual e unidade ("livros", "km", "R$"…). */
    target: goalValueSchema.optional(),
    current: goalValueSchema.optional(),
    unit: safeText(LIMITS.unit).optional(),
    /** Metas em checklist: marcos a cumprir. */
    milestones: z.array(milestoneSchema).max(LIMITS.maxMilestones),
    deadline: isoDateSchema.optional(),
    completedAt: isoDateSchema.optional(),
    archived: z.boolean(),
    createdAt: timestampSchema,
  })
  .superRefine((goal, ctx) => {
    if (goal.kind === 'numeric' && !(goal.target !== undefined && goal.target > 0)) {
      ctx.addIssue({ code: 'custom', path: ['target'], message: 'Informe um alvo maior que zero' })
    }
  })
export type Goal = z.infer<typeof goalSchema>

/* ------------------------------------------------------------------ Rotinas */

export const routineStepSchema = z.object({
  id: uuidSchema,
  title: safeText(LIMITS.stepTitle).refine((v) => v.length > 0, 'Informe o passo'),
  minutes: z.number().int().min(1).max(LIMITS.maxStepMinutes),
})
export type RoutineStep = z.infer<typeof routineStepSchema>

export const routineInputSchema = z.object({
  id: uuidSchema,
  title: titleSchema,
  icon: iconSchema,
  color: colorSchema,
  period: z.enum(ROUTINE_PERIODS),
  days: daysSchema,
  startTime: timeSchema,
  steps: z.array(routineStepSchema).min(1, 'Adicione ao menos um passo').max(LIMITS.maxSteps),
  archived: z.boolean(),
  createdAt: timestampSchema,
})
export type RoutineInput = z.infer<typeof routineInputSchema>

export const routineSchema = routineInputSchema.extend({
  /** Por dia (YYYY-MM-DD), os ids dos passos concluídos. */
  runs: z.record(isoDateSchema, z.array(uuidSchema)),
})
export type Routine = z.infer<typeof routineSchema>

/** Tudo o que pertence a um usuário (resposta de GET /api/data). */
export const appDataSchema = z.object({
  habits: z.array(habitSchema),
  goals: z.array(goalSchema),
  routines: z.array(routineSchema),
})
export type AppData = z.infer<typeof appDataSchema>

/** Corpo de PUT .../completions/:date e PUT .../runs/:date/:stepId. */
export const doneBodySchema = z.object({ done: z.boolean() })

/* ------------------------------------------------------------------- Contas */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(LIMITS.email)
  .pipe(z.email('E-mail inválido'))

export const passwordSchema = z
  .string()
  .min(LIMITS.passwordMin, `A senha precisa ter ao menos ${LIMITS.passwordMin} caracteres`)
  .max(LIMITS.passwordMax)

const nameSchema = safeText(LIMITS.name).refine((v) => v.length > 0, 'Informe seu nome')

export const registerInputSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
})
export type RegisterInput = z.infer<typeof registerInputSchema>

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(LIMITS.passwordMax),
  /** true → sessão de 30 dias; false → sessão curta (cookie de sessão). */
  remember: z.boolean().optional(),
})
export type LoginInput = z.infer<typeof loginInputSchema>

export const profileUpdateSchema = z.object({ name: nameSchema })
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(LIMITS.passwordMax),
  newPassword: passwordSchema,
})
export type PasswordChange = z.infer<typeof passwordChangeSchema>

export const userSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  email: z.string(),
  createdAt: timestampSchema,
})
export type User = z.infer<typeof userSchema>

export interface PublicConfig {
  appName: string
  allowSignup: boolean
}
