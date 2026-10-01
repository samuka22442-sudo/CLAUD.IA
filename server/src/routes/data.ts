import type { FastifyInstance } from 'fastify'
import type {
  AppData,
  ColorKey,
  Goal,
  GoalCategory,
  GoalKind,
  Habit,
  IconKey,
  Milestone,
  Routine,
  RoutinePeriod,
  RoutineStep,
  Weekday,
} from '@ritmo/shared'
import {
  doneBodySchema,
  goalSchema,
  habitInputSchema,
  isoDateSchema,
  routineInputSchema,
  uuidSchema,
} from '@ritmo/shared/schemas'
import { z } from 'zod'
import { requireUser } from '../context.ts'
import type { RouteContext } from '../context.ts'
import type { Sql } from '../db.ts'
import { AppError, notFound, parse } from '../errors.ts'

/* ------------------------------------------------------------------ Linhas do banco */

interface HabitRow {
  id: string
  title: string
  description: string | null
  icon: string
  color: string
  days: number[]
  time_of_day: string | null
  archived: boolean
  created_at: Date
}

interface GoalRow {
  id: string
  title: string
  description: string | null
  category: string
  icon: string
  color: string
  kind: string
  target_value: number | null
  current_value: number | null
  unit: string | null
  milestones: Milestone[]
  deadline: string | null
  completed_at: string | null
  archived: boolean
  created_at: Date
}

interface RoutineRow {
  id: string
  title: string
  icon: string
  color: string
  period: string
  days: number[]
  start_time: string
  steps: RoutineStep[]
  archived: boolean
  created_at: Date
}

/* ------------------------------------------------------------------ Linha → objeto da API (sem campos nulos) */

const toHabit = (row: HabitRow, completions: string[]): Habit => ({
  id: row.id,
  title: row.title,
  ...(row.description ? { description: row.description } : {}),
  icon: row.icon as IconKey,
  color: row.color as ColorKey,
  days: row.days as Weekday[],
  ...(row.time_of_day ? { time: row.time_of_day } : {}),
  archived: row.archived,
  createdAt: row.created_at.toISOString(),
  completions,
})

const toGoal = (row: GoalRow): Goal => ({
  id: row.id,
  title: row.title,
  ...(row.description ? { description: row.description } : {}),
  category: row.category as GoalCategory,
  icon: row.icon as IconKey,
  color: row.color as ColorKey,
  kind: row.kind as GoalKind,
  ...(row.target_value !== null ? { target: row.target_value } : {}),
  ...(row.current_value !== null ? { current: row.current_value } : {}),
  ...(row.unit ? { unit: row.unit } : {}),
  milestones: row.milestones,
  ...(row.deadline ? { deadline: row.deadline } : {}),
  ...(row.completed_at ? { completedAt: row.completed_at } : {}),
  archived: row.archived,
  createdAt: row.created_at.toISOString(),
})

const toRoutine = (row: RoutineRow, runs: Record<string, string[]>): Routine => ({
  id: row.id,
  title: row.title,
  icon: row.icon as IconKey,
  color: row.color as ColorKey,
  period: row.period as RoutinePeriod,
  days: row.days as Weekday[],
  startTime: row.start_time,
  steps: row.steps,
  archived: row.archived,
  createdAt: row.created_at.toISOString(),
  runs,
})

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const k = key(row)
    const list = map.get(k)
    if (list) list.push(row)
    else map.set(k, [row])
  }
  return map
}

/* ------------------------------------------------------------------ Parâmetros */

const idParams = z.object({ id: uuidSchema })
const dayParams = z.object({ id: uuidSchema, date: isoDateSchema })
const runParams = z.object({ id: uuidSchema, date: isoDateSchema, stepId: uuidSchema })

/** O id do corpo precisa ser o mesmo da URL (evita gravar um item em outro endereço). */
function assertSameId(bodyId: string, paramId: string) {
  if (bodyId !== paramId) throw new AppError(400, 'invalid_input', 'O id do corpo precisa ser igual ao da URL')
}

async function loadAppData(sql: Sql, userId: string): Promise<AppData> {
  const [habitRows, completionRows, goalRows, routineRows, runRows] = await Promise.all([
    sql<HabitRow[]>`
      select id, title, description, icon, color, days, time_of_day, archived, created_at
      from habits where user_id = ${userId} order by created_at, id`,
    sql<{ habit_id: string; day: string }[]>`
      select c.habit_id, c.day
      from habit_completions c join habits h on h.id = c.habit_id
      where h.user_id = ${userId} order by c.day`,
    sql<GoalRow[]>`
      select id, title, description, category, icon, color, kind, target_value, current_value, unit,
             milestones, deadline, completed_at, archived, created_at
      from goals where user_id = ${userId} order by created_at, id`,
    sql<RoutineRow[]>`
      select id, title, icon, color, period, days, start_time, steps, archived, created_at
      from routines where user_id = ${userId} order by created_at, id`,
    sql<{ routine_id: string; day: string; step_id: string }[]>`
      select r.routine_id, r.day, r.step_id
      from routine_runs r join routines x on x.id = r.routine_id
      where x.user_id = ${userId} order by r.day`,
  ])

  const completionsByHabit = groupBy(completionRows, (row) => row.habit_id)
  const runsByRoutine = groupBy(runRows, (row) => row.routine_id)

  return {
    habits: habitRows.map((row) =>
      toHabit(row, (completionsByHabit.get(row.id) ?? []).map((c) => c.day)),
    ),
    goals: goalRows.map(toGoal),
    routines: routineRows.map((row) => {
      const runs: Record<string, string[]> = {}
      for (const run of runsByRoutine.get(row.id) ?? []) (runs[run.day] ??= []).push(run.step_id)
      return toRoutine(row, runs)
    }),
  }
}

export function dataRoutes(app: FastifyInstance, { sql, auth }: RouteContext) {
  const protectedRoute = { preHandler: auth.authenticate }

  /* -------------------------------------------------------------- Tudo de uma vez */

  app.get('/data', protectedRoute, async (req) => loadAppData(sql, requireUser(req).id))

  // Apaga todos os dados do usuário (a conta continua existindo).
  app.delete('/data', protectedRoute, async (req, reply) => {
    const user = requireUser(req)
    await sql.begin(async (tx) => {
      await tx`delete from habits where user_id = ${user.id}`
      await tx`delete from goals where user_id = ${user.id}`
      await tx`delete from routines where user_id = ${user.id}`
    })
    return reply.code(204).send()
  })

  /* -------------------------------------------------------------- Hábitos */

  app.put('/habits/:id', protectedRoute, async (req, reply) => {
    const user = requireUser(req)
    const { id } = parse(idParams, req.params)
    const habit = parse(habitInputSchema, req.body)
    assertSameId(habit.id, id)

    // Upsert que só atualiza se a linha for do próprio usuário: o WHERE do DO UPDATE barra o uso de um id alheio.
    const rows = await sql`
      insert into habits (id, user_id, title, description, icon, color, days, time_of_day, archived, created_at)
      values (${habit.id}, ${user.id}, ${habit.title}, ${habit.description || null}, ${habit.icon}, ${habit.color},
              ${habit.days}::smallint[], ${habit.time ?? null}, ${habit.archived}, ${habit.createdAt}::timestamptz)
      on conflict (id) do update set
        title = excluded.title, description = excluded.description, icon = excluded.icon, color = excluded.color,
        days = excluded.days, time_of_day = excluded.time_of_day, archived = excluded.archived, updated_at = now()
      where habits.user_id = excluded.user_id
      returning id`
    if (rows.length === 0) throw notFound()
    return reply.code(204).send()
  })

  app.delete('/habits/:id', protectedRoute, async (req, reply) => {
    const user = requireUser(req)
    const { id } = parse(idParams, req.params)
    await sql`delete from habits where id = ${id} and user_id = ${user.id}`
    return reply.code(204).send()
  })

  // Marca/desmarca um dia. Idempotente: repetir a mesma operação não muda nada.
  app.put('/habits/:id/completions/:date', protectedRoute, async (req, reply) => {
    const user = requireUser(req)
    const { id, date } = parse(dayParams, req.params)
    const { done } = parse(doneBodySchema, req.body)

    const owned = await sql`select 1 from habits where id = ${id} and user_id = ${user.id}`
    if (owned.length === 0) throw notFound()

    if (done) {
      await sql`insert into habit_completions (habit_id, day) values (${id}, ${date}::date) on conflict do nothing`
    } else {
      await sql`delete from habit_completions where habit_id = ${id} and day = ${date}::date`
    }
    return reply.code(204).send()
  })

  /* -------------------------------------------------------------- Metas */

  app.put('/goals/:id', protectedRoute, async (req, reply) => {
    const user = requireUser(req)
    const { id } = parse(idParams, req.params)
    const goal = parse(goalSchema, req.body)
    assertSameId(goal.id, id)

    const rows = await sql`
      insert into goals (id, user_id, title, description, category, icon, color, kind, target_value, current_value,
                         unit, milestones, deadline, completed_at, archived, created_at)
      values (${goal.id}, ${user.id}, ${goal.title}, ${goal.description || null}, ${goal.category}, ${goal.icon},
              ${goal.color}, ${goal.kind}, ${goal.target ?? null}::numeric, ${goal.current ?? null}::numeric,
              ${goal.unit || null}, ${sql.json(goal.milestones)}, ${goal.deadline ?? null}::date,
              ${goal.completedAt ?? null}::date, ${goal.archived}, ${goal.createdAt}::timestamptz)
      on conflict (id) do update set
        title = excluded.title, description = excluded.description, category = excluded.category,
        icon = excluded.icon, color = excluded.color, kind = excluded.kind,
        target_value = excluded.target_value, current_value = excluded.current_value, unit = excluded.unit,
        milestones = excluded.milestones, deadline = excluded.deadline, completed_at = excluded.completed_at,
        archived = excluded.archived, updated_at = now()
      where goals.user_id = excluded.user_id
      returning id`
    if (rows.length === 0) throw notFound()
    return reply.code(204).send()
  })

  app.delete('/goals/:id', protectedRoute, async (req, reply) => {
    const user = requireUser(req)
    const { id } = parse(idParams, req.params)
    await sql`delete from goals where id = ${id} and user_id = ${user.id}`
    return reply.code(204).send()
  })

  /* -------------------------------------------------------------- Rotinas */

  app.put('/routines/:id', protectedRoute, async (req, reply) => {
    const user = requireUser(req)
    const { id } = parse(idParams, req.params)
    const routine = parse(routineInputSchema, req.body)
    assertSameId(routine.id, id)

    await sql.begin(async (tx) => {
      const rows = await tx`
        insert into routines (id, user_id, title, icon, color, period, days, start_time, steps, archived, created_at)
        values (${routine.id}, ${user.id}, ${routine.title}, ${routine.icon}, ${routine.color}, ${routine.period},
                ${routine.days}::smallint[], ${routine.startTime}, ${tx.json(routine.steps)}, ${routine.archived},
                ${routine.createdAt}::timestamptz)
        on conflict (id) do update set
          title = excluded.title, icon = excluded.icon, color = excluded.color, period = excluded.period,
          days = excluded.days, start_time = excluded.start_time, steps = excluded.steps,
          archived = excluded.archived, updated_at = now()
        where routines.user_id = excluded.user_id
        returning id`
      if (rows.length === 0) throw notFound()

      // Passos removidos na edição não deixam conclusões órfãs.
      const stepIds = routine.steps.map((step) => step.id)
      await tx`delete from routine_runs where routine_id = ${routine.id} and not (step_id = any(${stepIds}::uuid[]))`
    })
    return reply.code(204).send()
  })

  app.delete('/routines/:id', protectedRoute, async (req, reply) => {
    const user = requireUser(req)
    const { id } = parse(idParams, req.params)
    await sql`delete from routines where id = ${id} and user_id = ${user.id}`
    return reply.code(204).send()
  })

  // Marca/desmarca um passo da rotina em um dia. Idempotente.
  app.put('/routines/:id/runs/:date/:stepId', protectedRoute, async (req, reply) => {
    const user = requireUser(req)
    const { id, date, stepId } = parse(runParams, req.params)
    const { done } = parse(doneBodySchema, req.body)

    const rows = await sql<{ steps: RoutineStep[] }[]>`
      select steps from routines where id = ${id} and user_id = ${user.id}`
    const routine = rows[0]
    if (!routine) throw notFound()
    if (!routine.steps.some((step) => step.id === stepId)) throw notFound('Passo não encontrado')

    if (done) {
      await sql`
        insert into routine_runs (routine_id, day, step_id) values (${id}, ${date}::date, ${stepId}::uuid)
        on conflict do nothing`
    } else {
      await sql`delete from routine_runs where routine_id = ${id} and day = ${date}::date and step_id = ${stepId}::uuid`
    }
    return reply.code(204).send()
  })
}
