import type { Habit } from '@ritmo/shared'
import { addDays, formatLongDate, WEEKDAY_INITIAL, weekdayOf } from '../../lib/dates.ts'
import type { ISODate } from '../../lib/dates.ts'
import { formatPercent } from '../../lib/format.ts'
import { dayTally } from '../../lib/habits.ts'
import { cn } from '../../lib/cn.ts'

interface DayBarsProps {
  habits: Habit[]
  today: ISODate
  /** Quantos dias mostrar, terminando em hoje. */
  days: number
  /** Altura da área das barras, em px. */
  height?: number
}

/** Barras da taxa de conclusão por dia (concluídos ÷ agendados de todos os hábitos ativos). */
export function DayBars({ habits, today, days, height = 132 }: DayBarsProps) {
  const items = Array.from({ length: days }, (_, i) => {
    const day = addDays(today, i - (days - 1))
    const { done, scheduled } = dayTally(habits, day)
    return { day, ratio: scheduled === 0 ? 0 : done / scheduled, done, scheduled }
  })

  return (
    <div className="flex items-end gap-1.5 sm:gap-2" style={{ height: height + 44 }} role="img" aria-label={`Taxa de conclusão dos últimos ${days} dias`}>
      {items.map(({ day, ratio, done, scheduled }) => {
        const isToday = day === today
        return (
          <div key={day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${formatLongDate(day)}: ${done} de ${scheduled} (${formatPercent(ratio)})`}>
            <span className={cn('text-[0.65rem] leading-none font-bold tabular-nums', isToday ? 'text-fg' : 'text-subtle', days > 7 && 'max-sm:hidden')}>
              {scheduled > 0 ? Math.round(ratio * 100) : ''}
            </span>
            <div className="flex w-full flex-1 items-end rounded-lg bg-white/[0.04]">
              <div
                className={cn('w-full rounded-lg transition-[height] duration-700 ease-out', ratio > 0 && 'gradient-brand')}
                style={{
                  height: `${Math.max(ratio > 0 ? 6 : 0, ratio * 100)}%`,
                  boxShadow: ratio > 0 ? '0 0 16px -2px rgb(139 61 255 / 0.75)' : undefined,
                  opacity: isToday ? 1 : 0.85,
                }}
              />
            </div>
            <span className={cn('text-[0.7rem] leading-none font-bold', isToday ? 'text-brand-200' : 'text-subtle')}>
              {days <= 7 ? WEEKDAY_INITIAL[weekdayOf(day)] : Number(day.slice(8))}
            </span>
          </div>
        )
      })}
    </div>
  )
}
