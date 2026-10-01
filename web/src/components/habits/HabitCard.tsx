import type { Habit } from '@ritmo/shared'
import { Clock, Flame } from 'lucide-react'
import { colorStyle } from '../../lib/colors.ts'
import type { ISODate } from '../../lib/dates.ts'
import { currentStreak, isDoneOn, isScheduledOn } from '../../lib/habits.ts'
import { scheduleLabel } from '../../lib/labels.ts'
import { cn } from '../../lib/cn.ts'
import { Chip } from '../ui/Chip.tsx'
import { CheckToggle } from '../ui/CheckToggle.tsx'
import { WeekDots } from './WeekDots.tsx'
import { EntityIcon } from '../ui/EntityIcon.tsx'

interface HabitCardProps {
  habit: Habit
  today: ISODate
  onOpen: () => void
  onToggle: (done: boolean) => void
}

export function HabitCard({ habit, today, onOpen, onToggle }: HabitCardProps) {
  const scheduledToday = isScheduledOn(habit, today)
  const doneToday = isDoneOn(habit, today)
  const streak = currentStreak(habit, today)

  return (
    <article
      style={colorStyle(habit.color)}
      className={cn('glass flex items-center gap-3 rounded-3xl p-3 pr-4 transition sm:gap-4 sm:p-4', habit.archived && 'opacity-70')}
    >
      {habit.archived || !scheduledToday ? (
        <span className="grid size-11 shrink-0 place-items-center" title={habit.archived ? 'Arquivado' : 'Não é dia deste hábito'} aria-hidden>
          <span className="size-2.5 rounded-full bg-white/15" />
        </span>
      ) : (
        <CheckToggle checked={doneToday} onChange={onToggle} color={habit.color} label={`${doneToday ? 'Desmarcar' : 'Concluir'} ${habit.title} hoje`} />
      )}

      <button
        type="button"
        onClick={onOpen}
        aria-label={`Abrir detalhes de ${habit.title}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-left transition active:scale-[0.99] sm:gap-4"
      >
        <span className="tint grid size-12 shrink-0 place-items-center rounded-2xl">
          <EntityIcon name={habit.icon} className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-[0.97rem] font-bold', doneToday && 'text-muted')}>{habit.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-subtle">
            <span>{scheduleLabel(habit.days)}</span>
            {habit.time && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" aria-hidden />
                {habit.time}
              </span>
            )}
          </span>
        </span>
      </button>

      <div className="hidden shrink-0 sm:block">
        <WeekDots habit={habit} today={today} />
      </div>

      {streak > 0 && (
        <Chip tone="warning" className="shrink-0" icon={<Flame className="size-3.5" aria-hidden />}>
          <span className="tabular-nums">{streak}</span>
        </Chip>
      )}
    </article>
  )
}
