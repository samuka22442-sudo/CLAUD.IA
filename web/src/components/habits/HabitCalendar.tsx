import type { Habit } from '@ritmo/shared'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn.ts'
import { formatLongDate, formatMonthYear, monthMatrix, parseISODate, WEEKDAY_INITIAL } from '../../lib/dates.ts'
import type { ISODate } from '../../lib/dates.ts'
import { isDoneOn, isScheduledOn } from '../../lib/habits.ts'
import { IconButton } from '../ui/IconButton.tsx'

interface HabitCalendarProps {
  habit: Habit
  today: ISODate
  onToggle: (date: ISODate, done: boolean) => void
}

/** Calendário mensal: toque num dia (de hoje para trás) para marcar ou corrigir uma conclusão. */
export function HabitCalendar({ habit, today, onToggle }: HabitCalendarProps) {
  const now = parseISODate(today)
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const weeks = monthMatrix(cursor.year, cursor.month)
  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth()

  const move = (delta: number) => {
    const date = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: date.getFullYear(), month: date.getMonth() })
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <IconButton label="Mês anterior" size="sm" onClick={() => move(-1)}>
          <ChevronLeft className="size-5" />
        </IconButton>
        <p className="text-sm font-bold first-letter:uppercase" aria-live="polite">
          {formatMonthYear(cursor.year, cursor.month)}
        </p>
        <IconButton label="Próximo mês" size="sm" disabled={isCurrentMonth} onClick={() => move(1)}>
          <ChevronRight className="size-5" />
        </IconButton>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center" role="grid" aria-label="Calendário do hábito">
        {WEEKDAY_INITIAL.map((initial, index) => (
          <span key={index} className="pb-1 text-[0.7rem] font-bold text-subtle" role="columnheader">
            {initial}
          </span>
        ))}
        {weeks.flat().map((day, index) => {
          if (day === null) return <span key={`empty-${index}`} role="gridcell" />
          const done = isDoneOn(habit, day)
          const scheduled = isScheduledOn(habit, day)
          const future = day > today
          const isToday = day === today
          const clickable = scheduled && !future
          const dayNumber = Number(day.slice(8))
          return (
            <button
              key={day}
              type="button"
              role="gridcell"
              disabled={!clickable}
              aria-pressed={clickable ? done : undefined}
              aria-label={`${formatLongDate(day)}${done ? ': concluído' : scheduled && !future ? ': não concluído' : ''}`}
              onClick={() => onToggle(day, !done)}
              className={cn(
                'relative grid aspect-square min-h-10 place-items-center rounded-xl text-sm font-bold transition active:scale-90',
                done && 'bg-(--c) text-ink-950 shadow-[0_0_14px_-2px_var(--c)]',
                !done && clickable && !isToday && 'border border-red-400/35 bg-red-400/[0.07] text-red-200/80 hover:bg-red-400/15',
                !done && clickable && isToday && 'border border-(--c) text-fg hover:bg-white/[0.07]',
                !clickable && 'text-white/25',
                isToday && done && 'ring-2 ring-white/70 ring-offset-2 ring-offset-ink-850',
              )}
            >
              {done ? <Check className="size-[1.1rem]" strokeWidth={3.4} aria-hidden /> : dayNumber}
              {done && <span className="sr-only">{dayNumber}</span>}
            </button>
          )
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-subtle">
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-(--c)" /> Concluído
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-red-400/50 bg-red-400/10" /> Não concluído
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-(--c)" /> Hoje
        </li>
      </ul>
    </div>
  )
}
