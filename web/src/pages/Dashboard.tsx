import type { Habit, Routine } from '@ritmo/shared'
import { ArrowRight, CalendarCheck, CircleCheckBig, Clock, Flame, ListChecks, Play, Target, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { HabitDetail } from '../components/habits/HabitDetail.tsx'
import { HabitFormModal } from '../components/habits/HabitFormModal.tsx'
import { DayBars } from '../components/stats/DayBars.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { Chip } from '../components/ui/Chip.tsx'
import { CheckToggle } from '../components/ui/CheckToggle.tsx'
import { ProgressBar } from '../components/ui/ProgressBar.tsx'
import { ProgressRing } from '../components/ui/ProgressRing.tsx'
import { Section } from '../components/ui/PageHeader.tsx'
import { DeadlineChip } from '../components/goals/GoalCard.tsx'
import { useNow } from '../hooks/useNow.ts'
import { useToday } from '../hooks/useToday.ts'
import { colorStyle } from '../lib/colors.ts'
import { addDays, formatLongDate, minutesOfDay, nowMinutes } from '../lib/dates.ts'
import { firstName, formatPercent, greeting, plural } from '../lib/format.ts'
import { goalProgress, goalStatus } from '../lib/goals.ts'
import { aggregateTally, currentStreak, dayProgress, habitsForDay, isDoneOn } from '../lib/habits.ts'
import { cn } from '../lib/cn.ts'
import { currentRoutine, routineEndTime, routineProgress, stepSchedule, totalMinutes } from '../lib/routines.ts'
import { toggleHabitToday } from '../store/actions.ts'
import { useAuth } from '../store/auth.ts'
import { useData } from '../store/data.ts'
import { EntityIcon } from '../components/ui/EntityIcon.tsx'

const MAX_HABITS = 6

function encouragement(scheduled: number, ratio: number): string {
  if (scheduled === 0) return 'Nada agendado para hoje. Aproveite o descanso!'
  if (ratio === 0) return 'Comece pelo hábito mais fácil e ganhe embalo.'
  if (ratio < 0.5) return 'Bom começo! Continue assim.'
  if (ratio < 1) return 'Mais da metade feita. Falta pouco para fechar o dia!'
  return 'Dia completo! Você está no ritmo.'
}

export function Dashboard() {
  const user = useAuth((s) => s.user)
  const data = useData((s) => s.data)
  const today = useToday()
  const now = useNow()
  const navigate = useNavigate()
  const [detailId, setDetailId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Habit | null>(null)

  const { habits, goals, routines } = data
  const empty = habits.length === 0 && goals.length === 0 && routines.length === 0

  const progress = dayProgress(habits, today)
  const ratio = progress.scheduled === 0 ? 0 : progress.done / progress.scheduled

  const activeHabits = habits.filter((h) => !h.archived)
  const streaks = activeHabits.map((habit) => ({ habit, streak: currentStreak(habit, today) }))
  const top = streaks.reduce<{ habit: Habit; streak: number } | null>((best, item) => (best === null || item.streak > best.streak ? item : best), null)
  const week = aggregateTally(habits, addDays(today, -6), today, today)
  const weekRate = week.scheduled === 0 ? 0 : week.done / week.scheduled

  const activeGoals = goals
    .filter((g) => !g.archived && goalStatus(g, today) !== 'completed')
    .sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'))

  const time = (h: Habit) => (h.time ? minutesOfDay(h.time) : 24 * 60)
  const todayHabits = habitsForDay(habits, today).sort((a, b) => Number(isDoneOn(a, today)) - Number(isDoneOn(b, today)) || time(a) - time(b))
  const shownHabits = todayHabits.slice(0, MAX_HABITS)

  const routine = currentRoutine(routines, today, nowMinutes(now))

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[1.65rem] leading-tight font-extrabold tracking-tight sm:text-3xl">
          {greeting(now.getHours())}, <span className="text-gradient">{firstName(user?.name ?? '')}</span>
        </h1>
        <p className="mt-1 text-sm text-muted first-letter:uppercase">{formatLongDate(today)}</p>
      </div>

      {empty ? (
        <GettingStarted />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            {/* Resumo do dia */}
            <Card className="relative overflow-hidden">
              <div className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-brand-500/25 blur-[90px]" aria-hidden />
              <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                <ProgressRing value={ratio} size={150} stroke={14} label={`${progress.done} de ${progress.scheduled} hábitos concluídos hoje`}>
                  <div className="text-center">
                    <p className="text-4xl font-extrabold tabular-nums">{formatPercent(ratio)}</p>
                    <p className="text-xs font-medium text-muted">do dia</p>
                  </div>
                </ProgressRing>
                <div className="w-full min-w-0 flex-1 text-center sm:text-left">
                  <h2 className="text-xl font-extrabold sm:text-2xl">
                    {progress.done} de {progress.scheduled} {plural(progress.scheduled, 'hábito concluído', 'hábitos concluídos')}
                  </h2>
                  <p className="mt-1 text-sm text-muted">{encouragement(progress.scheduled, ratio)}</p>
                  <div className="mt-5 grid grid-cols-3 gap-2.5 text-left">
                    <MiniStat icon={Flame} color="#ff8a3d" label="Sequência" value={top ? `${top.streak}` : '0'} hint={top && top.streak > 0 ? top.habit.title : 'dias'} />
                    <MiniStat icon={TrendingUp} color="#22d3ee" label="7 dias" value={formatPercent(weekRate)} hint="concluído" />
                    <MiniStat icon={Target} color="#ff3d9a" label="Metas" value={`${activeGoals.length}`} hint="ativas" />
                  </div>
                </div>
              </div>
            </Card>

            {/* Hábitos de hoje */}
            <Section
              title="Hábitos de hoje"
              action={
                <Link to="/habitos" className="flex items-center gap-1 text-sm font-semibold text-brand-300 hover:text-brand-200">
                  Ver todos <ArrowRight className="size-4" aria-hidden />
                </Link>
              }
            >
              {shownHabits.length > 0 ? (
                <Card padded={false} className="divide-y divide-line">
                  {shownHabits.map((habit) => (
                    <HabitRow
                      key={habit.id}
                      habit={habit}
                      today={today}
                      onOpen={() => setDetailId(habit.id)}
                      onToggle={(done) => toggleHabitToday(habit.id, today, done)}
                    />
                  ))}
                  {todayHabits.length > MAX_HABITS && (
                    <Link to="/habitos" className="block px-5 py-3.5 text-center text-sm font-semibold text-brand-300 hover:bg-white/[0.03]">
                      + {todayHabits.length - MAX_HABITS} {plural(todayHabits.length - MAX_HABITS, 'hábito', 'hábitos')} hoje
                    </Link>
                  )}
                </Card>
              ) : (
                <Card className="flex items-center gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-500/15 text-brand-300">
                    <CalendarCheck className="size-6" aria-hidden />
                  </span>
                  <p className="text-sm text-muted">Nenhum hábito agendado para hoje. Crie um em Hábitos ou aproveite o descanso.</p>
                </Card>
              )}
            </Section>
          </div>

          <div className="space-y-6">
            <Section
              title={routine ? routineLabel(routine, nowMinutes(now)) : 'Rotina de hoje'}
              action={
                <Link to="/rotinas" className="flex items-center gap-1 text-sm font-semibold text-brand-300 hover:text-brand-200">
                  Rotinas <ArrowRight className="size-4" aria-hidden />
                </Link>
              }
            >
              {routine ? (
                <RoutineNow routine={routine} today={today} onStart={() => navigate(`/rotinas?iniciar=${routine.id}`)} />
              ) : (
                <Card className="flex items-center gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-500/15 text-brand-300">
                    <ListChecks className="size-6" aria-hidden />
                  </span>
                  <p className="text-sm text-muted">Nenhuma rotina para hoje. Monte uma para guiar o seu dia.</p>
                </Card>
              )}
            </Section>

            <Section
              title="Metas em andamento"
              action={
                <Link to="/metas" className="flex items-center gap-1 text-sm font-semibold text-brand-300 hover:text-brand-200">
                  Ver metas <ArrowRight className="size-4" aria-hidden />
                </Link>
              }
            >
              {activeGoals.length > 0 ? (
                <div className="space-y-3">
                  {activeGoals.slice(0, 3).map((goal) => {
                    return (
                      <Link key={goal.id} to="/metas" style={colorStyle(goal.color)} className="glass block rounded-2xl p-4 transition hover:border-line-strong active:scale-[0.99]">
                        <div className="flex items-center gap-3">
                          <span className="tint grid size-10 shrink-0 place-items-center rounded-xl">
                            <EntityIcon name={goal.icon} className="size-5" />
                          </span>
                          <p className="min-w-0 flex-1 truncate text-sm font-bold">{goal.title}</p>
                          <span className="text-sm font-extrabold tabular-nums text-(--c)">{formatPercent(goalProgress(goal))}</span>
                        </div>
                        <ProgressBar value={goalProgress(goal)} tone="entity" className="mt-3" label={`Progresso de ${goal.title}`} />
                        <div className="mt-2.5">
                          <DeadlineChip goal={goal} today={today} />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <Card className="flex items-center gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-500/15 text-brand-300">
                    <Target className="size-6" aria-hidden />
                  </span>
                  <p className="text-sm text-muted">Nenhuma meta em andamento. Defina onde quer chegar.</p>
                </Card>
              )}
            </Section>

            <Section title="Sua semana">
              <Card>
                <DayBars habits={habits} today={today} days={7} height={110} />
              </Card>
            </Section>
          </div>
        </div>
      )}

      {detailId && (
        <HabitDetail
          habitId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(habit) => {
            setDetailId(null)
            setEditing(habit)
          }}
        />
      )}
      {editing && <HabitFormModal habit={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

/** Título do bloco de rotina conforme o momento do dia. */
function routineLabel(routine: Routine, nowMin: number): string {
  const start = minutesOfDay(routine.startTime)
  if (nowMin >= start && nowMin < start + totalMinutes(routine)) return 'Rotina em andamento'
  return nowMin < start ? 'Próxima rotina' : 'Rotina de hoje'
}

function MiniStat({ icon: Icon, color, label, value, hint }: { icon: typeof Flame; color: string; label: string; value: string; hint: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-white/[0.035] p-2.5 sm:p-3" style={{ ['--c' as string]: color }}>
      <div className="flex items-center gap-1.5 text-[0.7rem] font-semibold text-muted sm:text-xs">
        <Icon className="hidden size-3.5 shrink-0 text-(--c) sm:block" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1.5 text-xl leading-none font-extrabold tabular-nums">{value}</p>
      <p className="mt-1 truncate text-[0.7rem] text-subtle">{hint}</p>
    </div>
  )
}

function HabitRow({ habit, today, onOpen, onToggle }: { habit: Habit; today: string; onOpen: () => void; onToggle: (done: boolean) => void }) {
  const done = isDoneOn(habit, today)
  const streak = currentStreak(habit, today)
  return (
    <div style={colorStyle(habit.color)} className="flex items-center gap-3 px-3.5 py-2.5 sm:px-4">
      <CheckToggle checked={done} onChange={onToggle} color={habit.color} label={`${done ? 'Desmarcar' : 'Concluir'} ${habit.title} hoje`} />
      <button type="button" onClick={onOpen} aria-label={`Abrir detalhes de ${habit.title}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left active:scale-[0.99]">
        <span className="tint grid size-10 shrink-0 place-items-center rounded-xl">
          <EntityIcon name={habit.icon} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-sm font-bold', done && 'text-muted')}>{habit.title}</span>
          {habit.time && (
            <span className="mt-0.5 flex items-center gap-1 text-xs text-subtle">
              <Clock className="size-3" aria-hidden />
              {habit.time}
            </span>
          )}
        </span>
      </button>
      {streak > 0 && (
        <Chip tone="warning" icon={<Flame className="size-3.5" aria-hidden />}>
          <span className="tabular-nums">{streak}</span>
        </Chip>
      )}
    </div>
  )
}

function RoutineNow({ routine, today, onStart }: { routine: Routine; today: string; onStart: () => void }) {
  const progress = routineProgress(routine, today)
  const done = new Set(routine.runs[today] ?? [])
  const schedule = stepSchedule(routine)
  return (
    <Card style={colorStyle(routine.color)} className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-10 -bottom-16 size-48 rounded-full blur-[70px]" style={{ background: 'color-mix(in oklab, var(--c) 30%, transparent)' }} aria-hidden />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="tint c-glow grid size-12 shrink-0 place-items-center rounded-2xl">
            <EntityIcon name={routine.icon} className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{routine.title}</p>
            <p className="text-xs text-subtle">
              {routine.startTime} – {routineEndTime(routine)}
            </p>
          </div>
          <ProgressRing value={progress.ratio} size={52} stroke={5} color="var(--c)" label={`${progress.done} de ${progress.total} passos`}>
            <span className="text-[0.7rem] font-extrabold tabular-nums">
              {progress.done}/{progress.total}
            </span>
          </ProgressRing>
        </div>

        <ul className="mt-4 space-y-1.5">
          {schedule.slice(0, 3).map(({ step, start }) => (
            <li key={step.id} className="flex items-center gap-2.5 text-sm">
              <span className={cn('grid size-5 shrink-0 place-items-center rounded-full border-2', done.has(step.id) ? 'border-transparent bg-(--c) text-ink-950' : 'border-white/20')}>
                {done.has(step.id) && <CircleCheckBig className="size-3.5" strokeWidth={3} aria-hidden />}
              </span>
              <span className={cn('min-w-0 flex-1 truncate', done.has(step.id) && 'text-subtle line-through decoration-white/25')}>{step.title}</span>
              <span className="text-xs text-subtle tabular-nums">{start}</span>
            </li>
          ))}
          {schedule.length > 3 && <li className="pl-7 text-xs text-subtle">+ {schedule.length - 3} {plural(schedule.length - 3, 'passo', 'passos')}</li>}
        </ul>

        <Button className="mt-5" fullWidth icon={<Play className="size-4 fill-current" />} onClick={onStart}>
          {progress.complete ? 'Fazer de novo' : progress.done > 0 ? 'Continuar rotina' : 'Iniciar rotina'}
        </Button>
      </div>
    </Card>
  )
}

/** Conta nova, sem nada ainda: três caminhos para começar. */
function GettingStarted() {
  const steps = [
    { to: '/habitos?novo=1', icon: CircleCheckBig, color: '#22d3ee', title: 'Crie um hábito', text: 'Algo simples para repetir todo dia, como beber água.' },
    { to: '/metas?novo=1', icon: Target, color: '#ff3d9a', title: 'Defina uma meta', text: 'Com número ou em etapas, e um prazo para chegar lá.' },
    { to: '/rotinas?novo=1', icon: ListChecks, color: '#ffc532', title: 'Monte uma rotina', text: 'Passos com duração, para seguir no modo foco.' },
  ]
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-brand-500/25 blur-[90px]" aria-hidden />
      <div className="relative">
        <h2 className="text-xl font-extrabold">Vamos começar?</h2>
        <p className="mt-1 text-sm text-muted">Escolha por onde quer começar. Dá para mudar tudo depois.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {steps.map(({ to, icon: Icon, color, title, text }) => (
            <Link key={to} to={to} style={{ ['--c' as string]: color }} className="rounded-2xl border border-line bg-white/[0.035] p-4 transition hover:border-line-strong active:scale-[0.99]">
              <span className="tint grid size-11 place-items-center rounded-xl">
                <Icon className="size-5" aria-hidden />
              </span>
              <p className="mt-3 font-bold">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
            </Link>
          ))}
        </div>
      </div>
    </Card>
  )
}
