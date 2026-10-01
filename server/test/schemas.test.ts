import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  goalSchema,
  habitInputSchema,
  isoDateSchema,
  loginInputSchema,
  registerInputSchema,
  routineInputSchema,
} from '@ritmo/shared/schemas'
import { makeGoal, makeHabit, makeRoutine } from './helpers.ts'

describe('schemas compartilhados', () => {
  describe('datas', () => {
    it('aceita datas reais e rejeita inexistentes ou fora do intervalo', () => {
      expect(isoDateSchema.safeParse('2026-10-01').success).toBe(true)
      expect(isoDateSchema.safeParse('2024-02-29').success).toBe(true)
      expect(isoDateSchema.safeParse('2026-02-30').success).toBe(false)
      expect(isoDateSchema.safeParse('2026-1-5').success).toBe(false)
      expect(isoDateSchema.safeParse('0000-01-01').success).toBe(false) // o Postgres não aceita ano 0
      expect(isoDateSchema.safeParse('2101-01-01').success).toBe(false)
    })
  })

  describe('hábito', () => {
    it('aceita um hábito válido e ordena os dias', () => {
      const parsed = habitInputSchema.parse(makeHabit({ days: [5, 1, 3] }))
      expect(parsed.days).toEqual([1, 3, 5])
    })

    it('aparta o título e ignora campos desconhecidos (como completions)', () => {
      const parsed = habitInputSchema.parse(makeHabit({ title: '  Meditar  ', completions: ['2026-01-01'] }))
      expect(parsed.title).toBe('Meditar')
      expect('completions' in parsed).toBe(false)
    })

    it.each([
      ['título vazio', { title: '   ' }],
      ['título longo demais', { title: 'x'.repeat(81) }],
      ['sem dias', { days: [] }],
      ['dias repetidos', { days: [1, 1] }],
      ['dia inválido', { days: [7] }],
      ['cor desconhecida', { color: 'marrom' }],
      ['ícone desconhecido', { icon: 'foguete' }],
      ['horário inválido', { time: '25:61' }],
      ['id que não é uuid', { id: 'abc' }],
      ['caractere NUL', { title: 'oi\u0000tchau' }],
      ['createdAt fora do intervalo', { createdAt: '0001-01-01T00:00:00.000Z' }],
    ])('rejeita: %s', (_name, patch) => {
      expect(habitInputSchema.safeParse(makeHabit(patch)).success).toBe(false)
    })
  })

  describe('meta', () => {
    it('meta numérica exige alvo maior que zero', () => {
      expect(goalSchema.safeParse(makeGoal()).success).toBe(true)
      expect(goalSchema.safeParse(makeGoal({ target: undefined })).success).toBe(false)
      expect(goalSchema.safeParse(makeGoal({ target: 0 })).success).toBe(false)
    })

    it('meta checklist não precisa de alvo', () => {
      const goal = makeGoal({
        kind: 'checklist',
        target: undefined,
        current: undefined,
        unit: undefined,
        milestones: [{ id: randomUUID(), title: 'Primeiro passo', done: false }],
      })
      expect(goalSchema.safeParse(goal).success).toBe(true)
    })

    it('limita valores e quantidade de marcos', () => {
      expect(goalSchema.safeParse(makeGoal({ target: 1_000_000_001 })).success).toBe(false)
      expect(goalSchema.safeParse(makeGoal({ current: -1 })).success).toBe(false)
      const many = Array.from({ length: 51 }, () => ({ id: randomUUID(), title: 'm', done: false }))
      expect(goalSchema.safeParse(makeGoal({ milestones: many })).success).toBe(false)
    })
  })

  describe('rotina', () => {
    it('exige ao menos um passo e limita a duração', () => {
      expect(routineInputSchema.safeParse(makeRoutine()).success).toBe(true)
      expect(routineInputSchema.safeParse(makeRoutine({ steps: [] })).success).toBe(false)
      const bad = [{ id: randomUUID(), title: 'x', minutes: 0 }]
      expect(routineInputSchema.safeParse(makeRoutine({ steps: bad })).success).toBe(false)
      const long = [{ id: randomUUID(), title: 'x', minutes: 601 }]
      expect(routineInputSchema.safeParse(makeRoutine({ steps: long })).success).toBe(false)
    })
  })

  describe('contas', () => {
    it('normaliza o e-mail (minúsculas, sem espaços)', () => {
      const parsed = registerInputSchema.parse({ name: ' Ana ', email: '  Ana@Exemplo.COM ', password: 'senha-forte-1' })
      expect(parsed).toEqual({ name: 'Ana', email: 'ana@exemplo.com', password: 'senha-forte-1' })
    })

    it('rejeita e-mail inválido e senha curta', () => {
      expect(registerInputSchema.safeParse({ name: 'Ana', email: 'ana', password: 'senha-forte-1' }).success).toBe(false)
      expect(registerInputSchema.safeParse({ name: 'Ana', email: 'a@b.co', password: '1234567' }).success).toBe(false)
    })

    it('o login normaliza o e-mail do mesmo jeito', () => {
      const parsed = loginInputSchema.parse({ email: 'ANA@exemplo.com', password: 'x' })
      expect(parsed.email).toBe('ana@exemplo.com')
    })
  })
})
