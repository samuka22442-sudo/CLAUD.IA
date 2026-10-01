import { ROUTINE_PERIODS } from '@ritmo/shared'
import type { Routine, RoutinePeriod } from '@ritmo/shared'
import { Archive, Clock, ListChecks, Moon, Plus, Sun, Sunrise } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { RoutineCard } from '../components/routines/RoutineCard.tsx'
import { RoutineFormModal } from '../components/routines/RoutineFormModal.tsx'
import { RoutineRunner } from '../components/routines/RoutineRunner.tsx'
import { Button } from '../components/ui/Button.tsx'
import { ConfirmDialog } from '../components/ui/ConfirmDialog.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { Tabs } from '../components/ui/Tabs.tsx'
import { useCreateParam } from '../hooks/useCreateParam.ts'
import { useToday } from '../hooks/useToday.ts'
import { formatLongDate, minutesOfDay } from '../lib/dates.ts'
import { PERIOD_LABELS } from '../lib/labels.ts'
import { isRoutineScheduledOn, routineProgress } from '../lib/routines.ts'
import { deleteRoutine, setRoutineArchived, setRoutineStep } from '../store/actions.ts'
import { useData } from '../store/data.ts'
import { toast } from '../store/toast.ts'

type Filter = 'today' | 'all' | 'archived'

const PERIOD_ICONS: Record<RoutinePeriod, LucideIcon> = { morning: Sunrise, afternoon: Sun, evening: Moon, custom: Clock }

const byStart = (a: Routine, b: Routine) => minutesOfDay(a.startTime) - minutesOfDay(b.startTime)

export function Routines() {
  const routines = useData((s) => s.data.routines)
  const today = useToday()
  const [filter, setFilter] = useState<Filter>('today')
  const [form, setForm] = useState<{ routine?: Routine } | null>(null)
  const [runnerId, setRunnerId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Routine | null>(null)
  const [params, setParams] = useSearchParams()
  useCreateParam(() => setForm({}))

  // /rotinas?iniciar=<id> (vindo do Início) abre o modo foco direto: o parâmetro da URL vale como "rotina aberta".
  const urlRunnerId = params.get('iniciar')
  const activeRunnerId = runnerId ?? urlRunnerId
  const closeRunner = () => {
    setRunnerId(null)
    if (urlRunnerId !== null) {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          next.delete('iniciar')
          return next
        },
        { replace: true },
      )
    }
  }

  const active = routines.filter((r) => !r.archived)
  const archived = routines.filter((r) => r.archived)
  const scheduledToday = active.filter((r) => isRoutineScheduledOn(r, today))
  const completedToday = scheduledToday.filter((r) => routineProgress(r, today).complete).length

  const list = (filter === 'today' ? scheduledToday : filter === 'all' ? active : archived).slice().sort(byStart)
  const groups = ROUTINE_PERIODS.map((period) => ({ period, items: list.filter((r) => r.period === period) })).filter((g) => g.items.length > 0)

  const renderCard = (routine: Routine) => (
    <RoutineCard
      key={routine.id}
      routine={routine}
      today={today}
      onStart={() => setRunnerId(routine.id)}
      onToggleStep={(stepId, done) => setRoutineStep(routine.id, today, stepId, done)}
      onEdit={() => setForm({ routine })}
      onArchive={() => {
        setRoutineArchived(routine.id, !routine.archived)
        toast.success(routine.archived ? 'Rotina restaurada' : 'Rotina arquivada')
      }}
      onDelete={() => setDeleting(routine)}
    />
  )

  return (
    <>
      <PageHeader
        title="Rotinas"
        subtitle={
          scheduledToday.length > 0
            ? `${formatLongDate(today)} · ${completedToday} de ${scheduledToday.length} concluída${scheduledToday.length > 1 ? 's' : ''} hoje`
            : formatLongDate(today)
        }
        actions={
          <Button className="max-lg:hidden" icon={<Plus className="size-5" />} onClick={() => setForm({})}>
            Nova rotina
          </Button>
        }
      />

      <Tabs<Filter>
        ariaLabel="Filtrar rotinas"
        className="mb-5"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'today', label: 'Hoje', count: scheduledToday.length },
          { value: 'all', label: 'Todas', count: active.length },
          { value: 'archived', label: 'Arquivadas', count: archived.length },
        ]}
      />

      {groups.length > 0 ? (
        // Quadro por período do dia: colunas lado a lado quando há espaço, empilhadas no celular.
        <div className="grid items-start gap-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,20rem),1fr))]">
          {groups.map(({ period, items }) => {
            const PeriodIcon = PERIOD_ICONS[period as RoutinePeriod]
            return (
              <section key={period} aria-label={PERIOD_LABELS[period as RoutinePeriod]} className="min-w-0">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wider text-subtle uppercase">
                  <PeriodIcon className="size-4 text-brand-300" aria-hidden />
                  {PERIOD_LABELS[period as RoutinePeriod]}
                </h2>
                <div className="space-y-4">{items.map(renderCard)}</div>
              </section>
            )
          })}
        </div>
      ) : routines.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Monte sua primeira rotina"
          description="Organize o dia em passos com duração, siga no modo foco e deixe o cronômetro cuidar do ritmo."
          action={
            <Button icon={<Plus className="size-5" />} onClick={() => setForm({})}>
              Nova rotina
            </Button>
          }
        />
      ) : filter === 'archived' ? (
        <EmptyState icon={Archive} title="Nenhuma rotina arquivada" description="Rotinas que você pausar ficam guardadas aqui." />
      ) : (
        <EmptyState
          icon={ListChecks}
          title="Nenhuma rotina para hoje"
          description="Nenhuma das suas rotinas cai neste dia da semana."
          action={
            <Button variant="secondary" onClick={() => setFilter('all')}>
              Ver todas as rotinas
            </Button>
          }
        />
      )}

      {form && <RoutineFormModal routine={form.routine} onClose={() => setForm(null)} />}
      {activeRunnerId && <RoutineRunner routineId={activeRunnerId} onClose={closeRunner} />}
      <ConfirmDialog
        open={deleting !== null}
        title="Excluir rotina?"
        message={<p>“{deleting?.title}” e o histórico dela serão apagados. Se só quiser pausar, use <strong className="text-fg">Arquivar</strong>.</p>}
        confirmLabel="Excluir"
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteRoutine(deleting.id)
          toast.success('Rotina excluída')
          setDeleting(null)
        }}
      />
    </>
  )
}
