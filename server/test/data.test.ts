import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { api, createTestContext, makeGoal, makeHabit, makeRoutine, registerUser } from './helpers.ts'
import type { TestContext, TestUser } from './helpers.ts'

let ctx: TestContext
let ana: TestUser
let bia: TestUser

beforeAll(async () => {
  ctx = await createTestContext()
  ana = await registerUser(ctx.app, { name: 'Ana' })
  bia = await registerUser(ctx.app, { name: 'Bia' })
})
afterAll(() => ctx.close())

const get = (user: TestUser) => api(ctx.app, 'GET', '/api/data', { cookie: user.cookie })
const put = (user: TestUser, path: string, body: unknown) => api(ctx.app, 'PUT', path, { cookie: user.cookie, body })
const del = (user: TestUser, path: string) => api(ctx.app, 'DELETE', path, { cookie: user.cookie })

describe('autenticação obrigatória', () => {
  it.each([
    ['GET', '/api/data'],
    ['DELETE', '/api/data'],
    ['PUT', `/api/habits/${randomUUID()}`],
    ['DELETE', `/api/habits/${randomUUID()}`],
    ['PUT', `/api/habits/${randomUUID()}/completions/2026-10-01`],
    ['PUT', `/api/goals/${randomUUID()}`],
    ['DELETE', `/api/goals/${randomUUID()}`],
    ['PUT', `/api/routines/${randomUUID()}`],
    ['DELETE', `/api/routines/${randomUUID()}`],
    ['PUT', `/api/routines/${randomUUID()}/runs/2026-10-01/${randomUUID()}`],
  ] as const)('%s %s sem login → 401', async (method, url) => {
    const res = await api(ctx.app, method, url, { body: {} })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('unauthorized')
  })
})

describe('hábitos', () => {
  it('cria, lê, atualiza (preservando createdAt) e exclui', async () => {
    const user = await registerUser(ctx.app)
    const habit = makeHabit({ createdAt: '2026-01-15T10:00:00.000Z' })

    expect((await put(user, `/api/habits/${habit.id}`, habit)).status).toBe(204)
    let data = (await get(user)).body
    expect(data.habits).toHaveLength(1)
    expect(data.habits[0]).toEqual({ ...habit, completions: [] })

    const edited = { ...habit, title: 'Beber mais água', days: [6, 0], time: undefined, description: '', archived: true }
    expect((await put(user, `/api/habits/${habit.id}`, { ...edited, createdAt: '2030-05-05T00:00:00.000Z' })).status).toBe(204)
    data = (await get(user)).body
    expect(data.habits).toHaveLength(1)
    expect(data.habits[0]).toEqual({
      id: habit.id,
      title: 'Beber mais água',
      icon: 'droplets',
      color: 'cyan',
      days: [0, 6], // ordenados
      archived: true,
      createdAt: '2026-01-15T10:00:00.000Z', // não muda na edição
      completions: [],
    })

    expect((await del(user, `/api/habits/${habit.id}`)).status).toBe(204)
    expect((await get(user)).body.habits).toEqual([])
    expect((await del(user, `/api/habits/${habit.id}`)).status).toBe(204) // idempotente
  })

  it('o id do corpo precisa ser o da URL', async () => {
    const res = await put(ana, `/api/habits/${randomUUID()}`, makeHabit())
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('invalid_input')
  })

  it('valida o corpo e a URL sem nunca dar 500', async () => {
    const bad = makeHabit({ color: 'marrom' })
    const invalidBody = await put(ana, `/api/habits/${bad.id}`, bad)
    expect(invalidBody.status).toBe(400)
    expect(invalidBody.body.details[0].path).toBe('color')

    expect((await put(ana, '/api/habits/nao-e-uuid', makeHabit())).status).toBe(400)

    const nul = makeHabit({ title: 'a\u0000b' })
    expect((await put(ana, `/api/habits/${nul.id}`, nul)).status).toBe(400)
  })

  it('marca e desmarca dias de forma idempotente, com a data exata', async () => {
    const user = await registerUser(ctx.app)
    const habit = makeHabit()
    await put(user, `/api/habits/${habit.id}`, habit)
    const day = (d: string) => `/api/habits/${habit.id}/completions/${d}`

    expect((await put(user, day('2026-10-01'), { done: true })).status).toBe(204)
    expect((await put(user, day('2026-10-01'), { done: true })).status).toBe(204) // repetir não duplica
    expect((await put(user, day('2026-09-30'), { done: true })).status).toBe(204)
    expect((await put(user, day('2026-12-31'), { done: true })).status).toBe(204)

    // sem nenhum deslocamento de fuso: as strings voltam exatamente como foram enviadas
    expect((await get(user)).body.habits[0].completions).toEqual(['2026-09-30', '2026-10-01', '2026-12-31'])

    expect((await put(user, day('2026-10-01'), { done: false })).status).toBe(204)
    expect((await put(user, day('2026-10-01'), { done: false })).status).toBe(204)
    expect((await get(user)).body.habits[0].completions).toEqual(['2026-09-30', '2026-12-31'])
  })

  it('recusa data inválida e hábito inexistente', async () => {
    const habit = makeHabit()
    await put(ana, `/api/habits/${habit.id}`, habit)
    expect((await put(ana, `/api/habits/${habit.id}/completions/2026-02-30`, { done: true })).status).toBe(400)
    expect((await put(ana, `/api/habits/${habit.id}/completions/0000-01-01`, { done: true })).status).toBe(400)
    expect((await put(ana, `/api/habits/${habit.id}/completions/2026-10-01`, { done: 'sim' })).status).toBe(400)
    const missing = await put(ana, `/api/habits/${randomUUID()}/completions/2026-10-01`, { done: true })
    expect(missing.status).toBe(404)
    expect(missing.body.error).toBe('not_found')
  })

  it('excluir o hábito apaga as conclusões (cascade)', async () => {
    const user = await registerUser(ctx.app)
    const habit = makeHabit()
    await put(user, `/api/habits/${habit.id}`, habit)
    await put(user, `/api/habits/${habit.id}/completions/2026-10-01`, { done: true })
    await del(user, `/api/habits/${habit.id}`)
    const [row] = await ctx.sql<{ n: number }[]>`select count(*)::int as n from habit_completions where habit_id = ${habit.id}`
    expect(row!.n).toBe(0)
  })
})

describe('metas', () => {
  it('meta numérica: ida e volta com números e datas exatos', async () => {
    const user = await registerUser(ctx.app)
    const goal = makeGoal({ target: 12.5, current: 3.25, deadline: '2026-12-31', completedAt: '2026-10-01' })
    expect((await put(user, `/api/goals/${goal.id}`, goal)).status).toBe(204)
    const [stored] = (await get(user)).body.goals
    expect(stored).toEqual(goal)
    expect(typeof stored.target).toBe('number')
  })

  it('meta checklist guarda os marcos e aceita atualizar', async () => {
    const user = await registerUser(ctx.app)
    const milestones = [
      { id: randomUUID(), title: 'Pesquisar', done: true },
      { id: randomUUID(), title: 'Comprar', done: false },
    ]
    const goal = makeGoal({ kind: 'checklist', target: undefined, current: undefined, unit: undefined, milestones, deadline: undefined })
    await put(user, `/api/goals/${goal.id}`, goal)
    expect((await get(user)).body.goals[0].milestones).toEqual(milestones)

    const updated = { ...goal, milestones: milestones.map((m) => ({ ...m, done: true })) }
    await put(user, `/api/goals/${goal.id}`, updated)
    const [stored] = (await get(user)).body.goals
    expect(stored.milestones.every((m: { done: boolean }) => m.done)).toBe(true)
    expect(stored).not.toHaveProperty('target')
    expect(stored).not.toHaveProperty('deadline')

    expect((await del(user, `/api/goals/${goal.id}`)).status).toBe(204)
    expect((await get(user)).body.goals).toEqual([])
  })

  it('recusa meta numérica sem alvo, valores absurdos e datas impossíveis', async () => {
    const noTarget = makeGoal({ target: undefined })
    expect((await put(ana, `/api/goals/${noTarget.id}`, noTarget)).status).toBe(400)
    const huge = makeGoal({ target: 1e12 })
    expect((await put(ana, `/api/goals/${huge.id}`, huge)).status).toBe(400)
    const badDate = makeGoal({ deadline: '0000-01-01' })
    expect((await put(ana, `/api/goals/${badDate.id}`, badDate)).status).toBe(400)
    const nulInMilestone = makeGoal({ kind: 'checklist', milestones: [{ id: randomUUID(), title: 'x\u0000y', done: false }] })
    expect((await put(ana, `/api/goals/${nulInMilestone.id}`, nulInMilestone)).status).toBe(400)
  })
})

describe('rotinas', () => {
  it('cria, lê com os passos e exclui', async () => {
    const user = await registerUser(ctx.app)
    const routine = makeRoutine()
    expect((await put(user, `/api/routines/${routine.id}`, routine)).status).toBe(204)
    const [stored] = (await get(user)).body.routines
    expect(stored).toEqual({ ...routine, runs: {} })

    expect((await del(user, `/api/routines/${routine.id}`)).status).toBe(204)
    expect((await get(user)).body.routines).toEqual([])
  })

  it('marca e desmarca passos por dia, de forma idempotente', async () => {
    const user = await registerUser(ctx.app)
    const routine = makeRoutine()
    await put(user, `/api/routines/${routine.id}`, routine)
    const [s1, s2] = routine.steps
    const run = (date: string, step: string) => `/api/routines/${routine.id}/runs/${date}/${step}`

    expect((await put(user, run('2026-10-01', s1!.id), { done: true })).status).toBe(204)
    expect((await put(user, run('2026-10-01', s1!.id), { done: true })).status).toBe(204)
    expect((await put(user, run('2026-10-01', s2!.id), { done: true })).status).toBe(204)
    expect((await put(user, run('2026-10-02', s1!.id), { done: true })).status).toBe(204)

    const runs = (await get(user)).body.routines[0].runs
    expect(Object.keys(runs).sort()).toEqual(['2026-10-01', '2026-10-02'])
    expect([...runs['2026-10-01']].sort()).toEqual([s1!.id, s2!.id].sort())
    expect(runs['2026-10-02']).toEqual([s1!.id])

    await put(user, run('2026-10-01', s1!.id), { done: false })
    expect((await get(user)).body.routines[0].runs['2026-10-01']).toEqual([s2!.id])
  })

  it('recusa passo que não pertence à rotina', async () => {
    const routine = makeRoutine()
    await put(ana, `/api/routines/${routine.id}`, routine)
    const res = await put(ana, `/api/routines/${routine.id}/runs/2026-10-01/${randomUUID()}`, { done: true })
    expect(res.status).toBe(404)
  })

  it('editar a rotina removendo um passo apaga as conclusões órfãs', async () => {
    const user = await registerUser(ctx.app)
    const routine = makeRoutine()
    await put(user, `/api/routines/${routine.id}`, routine)
    const [keep, drop] = routine.steps
    await put(user, `/api/routines/${routine.id}/runs/2026-10-01/${keep!.id}`, { done: true })
    await put(user, `/api/routines/${routine.id}/runs/2026-10-01/${drop!.id}`, { done: true })

    const edited = { ...routine, steps: routine.steps.filter((s) => s.id !== drop!.id) }
    expect((await put(user, `/api/routines/${routine.id}`, edited)).status).toBe(204)

    const [stored] = (await get(user)).body.routines
    expect(stored.steps).toHaveLength(2)
    expect(stored.runs['2026-10-01']).toEqual([keep!.id])
  })

  it('exige ao menos um passo', async () => {
    const routine = makeRoutine({ steps: [] })
    expect((await put(ana, `/api/routines/${routine.id}`, routine)).status).toBe(400)
  })
})

describe('apagar todos os dados', () => {
  it('DELETE /api/data limpa hábitos, metas e rotinas, mas mantém a conta', async () => {
    const user = await registerUser(ctx.app)
    const habit = makeHabit()
    const goal = makeGoal()
    const routine = makeRoutine()
    await put(user, `/api/habits/${habit.id}`, habit)
    await put(user, `/api/habits/${habit.id}/completions/2026-10-01`, { done: true })
    await put(user, `/api/goals/${goal.id}`, goal)
    await put(user, `/api/routines/${routine.id}`, routine)

    expect((await del(user, '/api/data')).status).toBe(204)
    expect((await get(user)).body).toEqual({ habits: [], goals: [], routines: [] })
    expect((await api(ctx.app, 'GET', '/api/auth/me', { cookie: user.cookie })).status).toBe(200)
  })
})

describe('isolamento entre usuários', () => {
  it('um usuário nunca enxerga nem altera dados de outro', async () => {
    const habit = makeHabit({ title: 'Segredo da Ana' })
    const goal = makeGoal({ title: 'Meta da Ana' })
    const routine = makeRoutine({ title: 'Rotina da Ana' })
    await put(ana, `/api/habits/${habit.id}`, habit)
    await put(ana, `/api/habits/${habit.id}/completions/2026-10-01`, { done: true })
    await put(ana, `/api/goals/${goal.id}`, goal)
    await put(ana, `/api/routines/${routine.id}`, routine)
    await put(ana, `/api/routines/${routine.id}/runs/2026-10-01/${routine.steps[0]!.id}`, { done: true })

    // Bia não vê nada da Ana
    const biaData = (await get(bia)).body
    expect(JSON.stringify(biaData)).not.toContain('Ana')
    expect(biaData.habits.find((h: { id: string }) => h.id === habit.id)).toBeUndefined()

    // Bia tenta sobrescrever os itens da Ana usando os mesmos ids → 404 e nada muda
    expect((await put(bia, `/api/habits/${habit.id}`, { ...habit, title: 'Invadido' })).status).toBe(404)
    expect((await put(bia, `/api/goals/${goal.id}`, { ...goal, title: 'Invadido' })).status).toBe(404)
    expect((await put(bia, `/api/routines/${routine.id}`, { ...routine, title: 'Invadido' })).status).toBe(404)

    // Bia tenta marcar conclusões nos itens da Ana → 404
    expect((await put(bia, `/api/habits/${habit.id}/completions/2026-10-02`, { done: true })).status).toBe(404)
    const step = routine.steps[1]!.id
    expect((await put(bia, `/api/routines/${routine.id}/runs/2026-10-02/${step}`, { done: true })).status).toBe(404)

    // Bia tenta apagar os itens da Ana → responde 204 (idempotente), mas nada é apagado
    expect((await del(bia, `/api/habits/${habit.id}`)).status).toBe(204)
    expect((await del(bia, `/api/goals/${goal.id}`)).status).toBe(204)
    expect((await del(bia, `/api/routines/${routine.id}`)).status).toBe(204)
    await del(bia, '/api/data') // limpar os dados da Bia não toca nos da Ana

    // Tudo da Ana continua intacto
    const anaData = (await get(ana)).body
    const h = anaData.habits.find((x: { id: string }) => x.id === habit.id)
    expect(h.title).toBe('Segredo da Ana')
    expect(h.completions).toEqual(['2026-10-01'])
    expect(anaData.goals.find((x: { id: string }) => x.id === goal.id).title).toBe('Meta da Ana')
    const r = anaData.routines.find((x: { id: string }) => x.id === routine.id)
    expect(r.title).toBe('Rotina da Ana')
    expect(r.runs).toEqual({ '2026-10-01': [routine.steps[0]!.id] })
  })

  it('a ordem de listagem é estável (por criação)', async () => {
    const user = await registerUser(ctx.app)
    const first = makeHabit({ title: 'Primeiro', createdAt: '2026-01-01T00:00:00.000Z' })
    const second = makeHabit({ title: 'Segundo', createdAt: '2026-02-01T00:00:00.000Z' })
    await put(user, `/api/habits/${second.id}`, second)
    await put(user, `/api/habits/${first.id}`, first)
    expect((await get(user)).body.habits.map((h: { title: string }) => h.title)).toEqual(['Primeiro', 'Segundo'])
  })
})
