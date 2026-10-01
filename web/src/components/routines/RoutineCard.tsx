import type { Routine } from '@ritmo/shared'
import { Archive, ArchiveRestore, CircleCheck, Pencil, Play, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn.ts'
import { colorStyle } from '../../lib/colors.ts'
import type { ISODate } from '../../lib/dates.ts'
import { formatDuration } from '../../lib/format.ts'
import { scheduleLabel } from '../../lib/labels.ts'
import { isRoutineScheduledOn, routineEndTime, routineProgress, stepSchedule, totalMinutes } from '../../lib/routines.ts'
import { ActionMenu } from '../ui/ActionMenu.tsx'
import { Button } from '../ui/Button.tsx'
import { CheckToggle } from '../ui/CheckToggle.tsx'
import { Chip } from '../ui/Chip.tsx'
import { ProgressRing } from '../ui/ProgressRing.tsx'
import { EntityIcon } from '../ui/EntityIcon.tsx'

interface RoutineCardProps {
  routine: Routine
  today: ISODate
  onStart: () => void
  onToggleStep: (stepId: string, done: boolean) => void
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
}

const COLLAPSED_STEPS = 4

export function RoutineCard({ routine, today, onStart, onToggleStep, onEdit, onArchive, onDelete }: RoutineCardProps) {
  const [expanded, setExpanded] = useState(false)
  const scheduledToday = isRoutineScheduledOn(routine, today)
  const progress = routineProgress(routine, today)
  const doneToday = new Set(routine.runs[today] ?? [])
  const schedule = stepSchedule(routine)
  const hidden = !expanded && schedule.length > COLLAPSED_STEPS + 1 ? schedule.length - COLLAPSED_STEPS : 0
  const visible = hidden > 0 ? schedule.slice(0, COLLAPSED_STEPS) : schedule

  return (
    <article style={colorStyle(routine.color)} className={cn('glass flex flex-col rounded-3xl p-4 sm:p-5', routine.archived && 'opacity-70')}>
      <header className="flex items-start gap-3">
        <span className="tint c-glow grid size-12 shrink-0 place-items-center rounded-2xl">
          <EntityIcon name={routine.icon} className="size-6" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="leading-snug font-bold">{routine.title}</h3>
          <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-subtle">
            <span className="whitespace-nowrap tabular-nums">
              {routine.startTime} – {routineEndTime(routine)}
            </span>
            <span className="whitespace-nowrap">{formatDuration(totalMinutes(routine))}</span>
            <span className="whitespace-nowrap">{scheduleLabel(routine.days)}</span>
          </p>
        </div>
        {scheduledToday && !routine.archived && (
          <ProgressRing value={progress.ratio} size={48} stroke={5} color="var(--c)" label={`${progress.done} de ${progress.total} passos hoje`}>
            <span className="text-[0.7rem] font-extrabold tabular-nums">
              {progress.done}/{progress.total}
            </span>
          </ProgressRing>
        )}
        <ActionMenu
          label={`Opções da rotina ${routine.title}`}
          items={[
            { label: 'Editar', icon: <Pencil className="size-4" />, onClick: onEdit },
            {
              label: routine.archived ? 'Restaurar' : 'Arquivar',
              icon: routine.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />,
              onClick: onArchive,
            },
            { label: 'Excluir', icon: <Trash2 className="size-4" />, onClick: onDelete, tone: 'danger' },
          ]}
        />
      </header>

      <ol className="mt-4 space-y-1">
        {visible.map(({ step, start }) => {
          const done = doneToday.has(step.id)
          return (
            <li key={step.id} className="flex items-center gap-3 rounded-2xl px-1 py-0.5">
              {scheduledToday && !routine.archived ? (
                <CheckToggle checked={done} onChange={(value) => onToggleStep(step.id, value)} color={routine.color} label={`${done ? 'Desmarcar' : 'Concluir'} ${step.title}`} />
              ) : (
                <span className="grid size-11 shrink-0 place-items-center" aria-hidden>
                  <span className="size-2 rounded-full bg-white/20" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm font-semibold', done && 'text-subtle line-through decoration-white/25')}>{step.title}</p>
                <p className="text-xs text-subtle tabular-nums">
                  {start} · {step.minutes} min
                </p>
              </div>
            </li>
          )
        })}
      </ol>

      {hidden > 0 && (
        <button type="button" onClick={() => setExpanded(true)} className="mt-1 self-start rounded-lg px-3 py-2 text-sm font-semibold text-brand-300 hover:text-brand-200">
          Ver mais {hidden} {hidden === 1 ? 'passo' : 'passos'}
        </button>
      )}
      {expanded && schedule.length > COLLAPSED_STEPS + 1 && (
        <button type="button" onClick={() => setExpanded(false)} className="mt-1 self-start rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-fg">
          Mostrar menos
        </button>
      )}

      {!routine.archived && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {scheduledToday ? (
            <>
              <Button icon={<Play className="size-4 fill-current" />} onClick={onStart}>
                {progress.complete ? 'Fazer de novo' : progress.done > 0 ? 'Continuar' : 'Iniciar'}
              </Button>
              {progress.complete && (
                <Chip tone="success" icon={<CircleCheck className="size-3.5" aria-hidden />}>
                  Concluída hoje
                </Chip>
              )}
            </>
          ) : (
            <Chip>Não é dia desta rotina</Chip>
          )}
        </div>
      )}
    </article>
  )
}
