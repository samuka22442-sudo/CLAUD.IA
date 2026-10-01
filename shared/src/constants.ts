/** Constantes compartilhadas entre o front (web) e a API (server). Sem dependências de runtime. */

export const APP_NAME = 'Ritmo'

/** Chaves de cor; os valores hex ficam no front (web/src/lib/colors.ts). */
export const COLOR_KEYS = [
  'violet',
  'fuchsia',
  'pink',
  'cyan',
  'blue',
  'emerald',
  'lime',
  'amber',
  'orange',
  'red',
] as const
export type ColorKey = (typeof COLOR_KEYS)[number]

/** Chaves de ícone; o mapeamento para componentes lucide fica no front (web/src/lib/icons.ts). */
export const ICON_KEYS = [
  'dumbbell',
  'book',
  'droplets',
  'moon',
  'sun',
  'coffee',
  'brain',
  'heart',
  'apple',
  'bike',
  'footprints',
  'pencil',
  'music',
  'code',
  'wallet',
  'target',
  'flame',
  'sparkles',
  'bed',
  'smile',
  'languages',
  'leaf',
  'briefcase',
  'graduation',
  'salad',
  'pill',
  'timer',
  'phone-off',
  'shower',
  'sprout',
  'trophy',
  'star',
] as const
export type IconKey = (typeof ICON_KEYS)[number]

export const GOAL_CATEGORIES = [
  'health',
  'study',
  'finance',
  'career',
  'personal',
  'relationships',
  'leisure',
] as const
export type GoalCategory = (typeof GOAL_CATEGORIES)[number]

export const GOAL_KINDS = ['numeric', 'checklist'] as const
export type GoalKind = (typeof GOAL_KINDS)[number]

export const ROUTINE_PERIODS = ['morning', 'afternoon', 'evening', 'custom'] as const
export type RoutinePeriod = (typeof ROUTINE_PERIODS)[number]

/** 0 = domingo … 6 = sábado (mesmo padrão de Date#getDay). */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const
export type Weekday = (typeof WEEKDAYS)[number]

export const LIMITS = {
  name: 60,
  email: 254,
  passwordMin: 8,
  passwordMax: 128,
  title: 80,
  description: 300,
  unit: 20,
  milestoneTitle: 120,
  maxMilestones: 50,
  stepTitle: 80,
  maxSteps: 30,
  maxStepMinutes: 600,
  maxGoalValue: 1_000_000_000,
} as const

/** Códigos de erro devolvidos pela API (`{ error: code }`); o front traduz para pt-BR. */
export const API_ERROR_CODES = [
  'invalid_input',
  'invalid_credentials',
  'email_taken',
  'signup_disabled',
  'unauthorized',
  'forbidden',
  'not_found',
  'rate_limited',
  'wrong_password',
  'internal',
] as const
export type ApiErrorCode = (typeof API_ERROR_CODES)[number]
