import { ChartColumn, CircleCheckBig, Flame, Percent, Trophy } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { Link } from 'react-router'
import { DayBars } from '../components/stats/DayBars.tsx'
import { Heatmap } from '../components/stats/Heatmap.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { Chip } from '../components/ui/Chip.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { PageHeader, Section } from '../components/ui/PageHeader.tsx'
import { ProgressBar } from '../components/ui/ProgressBar.tsx'
import { ProgressRing } from '../components/ui/ProgressRing.tsx'
import { StatTile } from '../components/ui/StatTile.tsx'
import { useToday } from '../hooks/useToday.ts'
import { colorStyle } from '../lib/colors.ts'
import { addDays, rangeISO } from '../lib/dates.ts'
import { formatPercent, plural } from '../lib/format.ts'
import { goalProgress, goalStatus } from '../lib/goals.ts'
import { aggregateTally, bestStreak, completionRate, currentStreak } from '../lib/habits.ts'
import { isRoutineScheduledOn, routineProgress } from '../lib/routines.ts'
import { useData } from '../store/data.ts'
import { EntityIcon } from '../components/ui/EntityIcon.tsx'

function useWide(): boolean {
  return useSyncExternalStore(
    (callback) => {
      const media = window.matchMedia('(min-width: 1024px)')
      media.addEventListener('change', callback)
      return () => media.removeEventListener('change', callback)
    },
    () => window.matchMedia('(min-width: 1024px)').matches,
    () => false,
  )
}

export function Progress() {
  const { habits, goals, routines } = useData((s) => s.data)
  const today = useToday()
  const wide = useWide()

  const active = habits.filter((h) => !h.archived)

  if (active.length === 0) {
    return (
      <>
        <PageHeader title="Progresso" subtitle="Seus números e sua constância" />
        <EmptyState
          icon={ChartColumn}
          title="Ainda não há o que mostrar"
          description="Crie um hábito e marque algumas conclusões: os gráficos aparecem aqui conforme você avança."
          action={
            <Link to="/habitos?novo=1">
              <Button>Criar um hábito</Button>
            </Link>
          }
        />
      </>
    )
  }

  const week = aggregateTally(habits, addDays(today, -6), today, today)
  const month = aggregateTally(habits, addDays(today, -29), today, today)
  const weekRate = week.scheduled === 0 ? 0 : week.done / week.scheduled
  const monthRate = month.scheduled === 0 ? 0 : month.done / month.scheduled

  const rows = active
    .map((habit) => ({
      habit,
      current: currentStreak(habit, today),
      best: bestStreak(habit, today),
      rate: completionRate(habit, 30, today),
    }))
    .sort((a, b) => b.rate - a.rate || b.current - a.current)

  const topCurrent = rows.reduce((best, row) => (row.current > best.current ? row : best), rows[0]!)
  const topBest = rows.reduce((best, row) => (row.best > best.best ? row : best), rows[0]!)
  const totalDone = habits.reduce((sum, h) => sum + h.completions.length, 0)

  // Metas
  const liveGoals = goals.filter((g) => !g.archived)
  const activeGoals = liveGoals.filter((g) => goalStatus(g, today) !== 'completed')
  const lateGoals = activeGoals.filter((g) => goalStatus(g, today) === 'late')
  const doneGoals = liveGoals.filter((g) => goalStatus(g, today) === 'completed')
  const avgGoal = activeGoals.length === 0 ? 0 : activeGoals.reduce((sum, g) => sum + goalProgress(g), 0) / activeGoals.length

  // Rotinas: nos últimos 7 dias, quantas execuções agendadas foram concluídas por inteiro
  const last7 = rangeISO(addDays(today, -6), today)
  let routineScheduled = 0
  let routineDone = 0
  for (const routine of routines.filter((r) => !r.archived)) {
    for (const day of last7) {
      if (!isRoutineScheduledOn(routine, day)) continue
      if (day === today && !routineProgress(routine, day).complete) continue // hoje ainda pode ser feito
      routineScheduled += 1
      if (routineProgress(routine, day).complete) routineDone += 1
    }
  }
  const routineRate = routineScheduled === 0 ? 0 : routineDone / routineScheduled

  return (
    <>
      <PageHeader title="Progresso" subtitle="Seus números e sua constância" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile icon={Percent} label="7 dias" value={formatPercent(weekRate)} hint={`${week.done} de ${week.scheduled} concluídos`} color="#22d3ee" />
        <StatTile icon={Percent} label="30 dias" value={formatPercent(monthRate)} hint={`${month.done} de ${month.scheduled} concluídos`} color="#9d5cff" />
        <StatTile icon={Flame} label="Sequência" value={`${topCurrent.current}`} hint={topCurrent.current > 0 ? topCurrent.habit.title : 'dias seguidos'} color="#ff8a3d" />
        <StatTile icon={Trophy} label="Recorde" value={`${topBest.best}`} hint={topBest.best > 0 ? topBest.habit.title : 'dias seguidos'} color="#ffc532" />
        <StatTile icon={CircleCheckBig} label="Conclusões" value={`${totalDone}`} hint="desde o início" color="#1ee09a" className="col-span-2 lg:col-span-1" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Section title="Últimos 14 dias">
          <Card>
            <DayBars habits={habits} today={today} days={14} height={150} />
          </Card>
        </Section>

        <div className="space-y-6">
          <Section title="Metas">
            <Card className="flex items-center gap-5">
              <ProgressRing value={avgGoal} size={92} stroke={9} label={`Progresso médio das metas ativas: ${formatPercent(avgGoal)}`}>
                <span className="text-lg font-extrabold tabular-nums">{formatPercent(avgGoal)}</span>
              </ProgressRing>
              <dl className="grid flex-1 grid-cols-3 gap-2 text-center">
                <div>
                  <dd className="text-2xl font-extrabold tabular-nums">{activeGoals.length}</dd>
                  <dt className="text-xs text-subtle">{plural(activeGoals.length, 'ativa', 'ativas')}</dt>
                </div>
                <div>
                  <dd className="text-2xl font-extrabold text-red-300 tabular-nums">{lateGoals.length}</dd>
                  <dt className="text-xs text-subtle">{plural(lateGoals.length, 'atrasada', 'atrasadas')}</dt>
                </div>
                <div>
                  <dd className="text-2xl font-extrabold text-emerald-300 tabular-nums">{doneGoals.length}</dd>
                  <dt className="text-xs text-subtle">{plural(doneGoals.length, 'concluída', 'concluídas')}</dt>
                </div>
              </dl>
            </Card>
          </Section>

          <Section title="Rotinas na semana">
            <Card>
              {routineScheduled > 0 ? (
                <>
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <p className="text-sm text-muted">
                      <strong className="text-lg font-extrabold text-fg tabular-nums">{routineDone}</strong> de {routineScheduled} concluídas por inteiro
                    </p>
                    <span className="text-lg font-extrabold tabular-nums">{formatPercent(routineRate)}</span>
                  </div>
                  <ProgressBar value={routineRate} label="Rotinas concluídas nos últimos 7 dias" />
                </>
              ) : (
                <p className="text-sm text-muted">Quando você usar rotinas, o desempenho da semana aparece aqui.</p>
              )}
            </Card>
          </Section>
        </div>
      </div>

      <Section title="Constância" className="mt-6">
        <Card>
          <Heatmap habits={habits} today={today} weeks={wide ? 26 : 12} />
        </Card>
      </Section>

      <Section title="Seus hábitos (30 dias)" className="mt-6">
        <Card padded={false} className="grid divide-y divide-line lg:grid-cols-2 lg:divide-y-0">
          {rows.map(({ habit, current, rate }, index) => {
            return (
              <div
                key={habit.id}
                style={colorStyle(habit.color)}
                className={`flex items-center gap-3.5 px-4 py-3.5 sm:px-5 ${index >= 2 ? 'lg:border-t lg:border-line' : ''} ${index % 2 === 1 ? 'lg:border-l lg:border-line' : ''}`}
              >
                <span className="tint grid size-11 shrink-0 place-items-center rounded-xl">
                  <EntityIcon name={habit.icon} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-bold">{habit.title}</p>
                    <span className="text-sm font-extrabold tabular-nums text-(--c)">{formatPercent(rate)}</span>
                  </div>
                  <ProgressBar value={rate} tone="entity" label={`Taxa de ${habit.title}`} />
                </div>
                {current > 0 && (
                  <Chip tone="warning" icon={<Flame className="size-3.5" aria-hidden />}>
                    <span className="tabular-nums">{current}</span>
                  </Chip>
                )}
              </div>
            )
          })}
        </Card>
      </Section>
    </>
  )
}
