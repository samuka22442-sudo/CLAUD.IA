import type { Goal } from '@ritmo/shared'
import { Archive, ArchiveRestore, CalendarClock, CircleCheck, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { colorStyle } from '../../lib/colors.ts'
import { cn } from '../../lib/cn.ts'
import { formatShortDate } from '../../lib/dates.ts'
import type { ISODate } from '../../lib/dates.ts'
import { formatNumber, formatPercent, plural } from '../../lib/format.ts'
import { daysLeft, goalProgress, goalStatus } from '../../lib/goals.ts'
import { GOAL_CATEGORY_LABELS } from '../../lib/labels.ts'
import { ActionMenu } from '../ui/ActionMenu.tsx'
import { Button } from '../ui/Button.tsx'
import { Chip } from '../ui/Chip.tsx'
import { ProgressBar } from '../ui/ProgressBar.tsx'
import { EntityIcon } from '../ui/EntityIcon.tsx'

interface GoalCardProps {
  goal: Goal
  today: ISODate
  onEdit: () => void
  onProgress: () => void
  onArchive: () => void
  onDelete: () => void
  onToggleMilestone: (milestoneId: string) => void
}

/** Chip de prazo: concluída, atrasada ou quanto falta. */
export function DeadlineChip({ goal, today }: { goal: Goal; today: ISODate }) {
  const status = goalStatus(goal, today)
  if (status === 'completed') {
    return (
      <Chip tone="success" icon={<CircleCheck className="size-3.5" aria-hidden />}>
        {goal.completedAt ? `Concluída em ${formatShortDate(goal.completedAt)}` : 'Concluída'}
      </Chip>
    )
  }
  const left = daysLeft(goal, today)
  if (left === null) return null
  if (status === 'late') {
    return (
      <Chip tone="danger" icon={<TriangleAlert className="size-3.5" aria-hidden />}>
        Atrasada há {-left} {plural(-left, 'dia', 'dias')}
      </Chip>
    )
  }
  const label = left === 0 ? 'Vence hoje' : left === 1 ? 'Vence amanhã' : `Faltam ${left} dias`
  return (
    <Chip tone={left <= 7 ? 'warning' : 'neutral'} icon={<CalendarClock className="size-3.5" aria-hidden />}>
      {label}
      {left > 7 && goal.deadline && ` · ${formatShortDate(goal.deadline)}`}
    </Chip>
  )
}

export function GoalCard({ goal, today, onEdit, onProgress, onArchive, onDelete, onToggleMilestone }: GoalCardProps) {
  const progress = goalProgress(goal)
  const status = goalStatus(goal, today)
  const completed = status === 'completed'
  const doneCount = goal.milestones.filter((m) => m.done).length

  const valueLabel =
    goal.kind === 'numeric'
      ? `${formatNumber(goal.current ?? 0)} de ${formatNumber(goal.target ?? 0)}${goal.unit ? ` ${goal.unit}` : ''}`
      : `${doneCount} de ${goal.milestones.length} ${plural(goal.milestones.length, 'etapa', 'etapas')}`

  return (
    <article style={colorStyle(goal.color)} className={cn('glass flex flex-col rounded-3xl p-4 sm:p-5', goal.archived && 'opacity-70')}>
      <header className="flex items-start gap-3">
        <span className="tint c-glow grid size-12 shrink-0 place-items-center rounded-2xl">
          <EntityIcon name={goal.icon} className="size-6" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className={cn('leading-snug font-bold', completed && 'text-muted')}>{goal.title}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip>{GOAL_CATEGORY_LABELS[goal.category]}</Chip>
            <DeadlineChip goal={goal} today={today} />
          </div>
        </div>
        <ActionMenu
          label={`Opções da meta ${goal.title}`}
          items={[
            { label: 'Editar', icon: <Pencil className="size-4" />, onClick: onEdit },
            {
              label: goal.archived ? 'Restaurar' : 'Arquivar',
              icon: goal.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />,
              onClick: onArchive,
            },
            { label: 'Excluir', icon: <Trash2 className="size-4" />, onClick: onDelete, tone: 'danger' },
          ]}
        />
      </header>

      {goal.description && <p className="mt-3 text-sm leading-relaxed text-muted">{goal.description}</p>}

      <div className="mt-4">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold text-muted">{valueLabel}</span>
          <span className="text-lg font-extrabold tabular-nums text-(--c)">{formatPercent(progress)}</span>
        </div>
        <ProgressBar value={progress} tone="entity" label={`Progresso de ${goal.title}`} />
      </div>

      {goal.kind === 'numeric' && !goal.archived && (
        <Button variant="secondary" size="sm" className="mt-4 self-start" icon={<Plus className="size-4" />} onClick={onProgress}>
          Registrar progresso
        </Button>
      )}

      {goal.kind === 'checklist' && goal.milestones.length > 0 && (
        <ul className="mt-4 space-y-1">
          {goal.milestones.map((milestone) => (
            <li key={milestone.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={milestone.done}
                disabled={goal.archived}
                onClick={() => onToggleMilestone(milestone.id)}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-1 text-left transition hover:bg-white/[0.05] active:scale-[0.99] disabled:opacity-60"
              >
                <span
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full border-2 transition',
                    milestone.done ? 'border-transparent bg-(--c) text-ink-950' : 'border-[color-mix(in_oklab,var(--c)_55%,transparent)]',
                  )}
                >
                  {milestone.done && <CircleCheck className="size-4" strokeWidth={3} aria-hidden />}
                </span>
                <span className={cn('text-sm font-medium', milestone.done && 'text-subtle line-through decoration-white/25')}>
                  {milestone.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
