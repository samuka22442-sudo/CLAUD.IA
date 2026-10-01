import type { Habit } from '@ritmo/shared'
import { addDays, WEEKDAY_INITIAL, weekdayOf } from '../../lib/dates.ts'
import type { ISODate } from '../../lib/dates.ts'
import { isDoneOn, isScheduledOn } from '../../lib/habits.ts'
import { cn } from '../../lib/cn.ts'

/** Tira dos últimos 7 dias: feito · perdido · pendente (hoje) · fora da agenda. */
export function WeekDots({ habit, today }: { habit: Habit; today: ISODate }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  return (
    <ol className="flex items-end gap-1.5" aria-label="Últimos 7 dias">
      {days.map((day) => {
        const scheduled = isScheduledOn(habit, day)
        const done = isDoneOn(habit, day)
        const isToday = day === today
        const state = done ? 'feito' : !scheduled ? 'fora da agenda' : isToday ? 'pendente' : 'perdido'
        return (
          <li key={day} className="flex flex-col items-center gap-1" aria-label={`${day}: ${state}`}>
            <span
              className={cn(
                'size-3.5 rounded-full border-[1.5px] transition',
                done && 'border-transparent bg-(--c) shadow-[0_0_10px_-1px_var(--c)]',
                !done && scheduled && !isToday && 'border-red-400/55 bg-red-400/10',
                !done && scheduled && isToday && 'border-(--c)',
                !scheduled && 'border-transparent bg-white/10',
              )}
            />
            <span className={cn('text-[0.62rem] leading-none font-bold', isToday ? 'text-fg' : 'text-subtle')}>
              {WEEKDAY_INITIAL[weekdayOf(day)]}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
