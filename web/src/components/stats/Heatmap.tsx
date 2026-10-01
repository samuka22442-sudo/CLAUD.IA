import type { Habit } from '@ritmo/shared'
import { addDays, formatLongDate, startOfWeek } from '../../lib/dates.ts'
import type { ISODate } from '../../lib/dates.ts'
import { formatPercent } from '../../lib/format.ts'
import { dayTally } from '../../lib/habits.ts'
import { cn } from '../../lib/cn.ts'

interface HeatmapProps {
  habits: Habit[]
  today: ISODate
  weeks?: number
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const DAY_LABELS = ['', 'seg', '', 'qua', '', 'sex', '']

/** Intensidade 0–4 a partir da taxa do dia. */
const level = (ratio: number): 0 | 1 | 2 | 3 | 4 => (ratio <= 0 ? 0 : ratio < 0.34 ? 1 : ratio < 0.67 ? 2 : ratio < 1 ? 3 : 4)

const LEVEL_STYLE: Record<number, string> = {
  0: 'bg-white/[0.06]',
  1: 'bg-brand-500/30',
  2: 'bg-brand-500/55',
  3: 'bg-brand-400/85',
  4: 'bg-brand-300 shadow-[0_0_12px_-1px_rgb(171_116_255/0.9)]',
}

/** Mapa de calor estilo "contribuições": uma coluna por semana, uma linha por dia da semana. */
export function Heatmap({ habits, today, weeks = 12 }: HeatmapProps) {
  const firstWeek = addDays(startOfWeek(today), -(weeks - 1) * 7)

  const columns = Array.from({ length: weeks }, (_, w) => {
    const weekStart = addDays(firstWeek, w * 7)
    return Array.from({ length: 7 }, (_, d) => {
      const day = addDays(weekStart, d)
      if (day > today) return { day, future: true as const }
      const { done, scheduled } = dayTally(habits, day)
      return { day, future: false as const, scheduled, done, ratio: scheduled === 0 ? 0 : done / scheduled }
    })
  })

  // Rótulo do mês na primeira coluna em que ele aparece.
  const monthLabels = columns.map((col, w) => {
    const month = Number(col[0]!.day.slice(5, 7)) - 1
    const prev = w > 0 ? Number(columns[w - 1]![0]!.day.slice(5, 7)) - 1 : -1
    return month !== prev ? MONTHS[month]! : ''
  })

  return (
    <div>
      <div className="flex gap-2">
        <div className="mt-5 grid shrink-0 grid-rows-7 gap-1 text-[0.62rem] font-semibold text-subtle sm:gap-1.5" aria-hidden>
          {DAY_LABELS.map((label, i) => (
            <span key={i} className="flex items-center">
              {label}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 grid gap-1 text-[0.62rem] font-semibold text-subtle sm:gap-1.5" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }} aria-hidden>
            {monthLabels.map((label, i) => (
              <span key={i} className="whitespace-nowrap">
                {label}
              </span>
            ))}
          </div>
          <div className="grid gap-1 sm:gap-1.5" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }} role="img" aria-label={`Mapa de conclusão das últimas ${weeks} semanas`}>
            {columns.map((col, w) => (
              <div key={w} className="grid grid-rows-7 gap-1 sm:gap-1.5">
                {col.map((cell) =>
                  cell.future ? (
                    <span key={cell.day} className="aspect-square" />
                  ) : (
                    <span
                      key={cell.day}
                      title={cell.scheduled === 0 ? `${formatLongDate(cell.day)}: nada agendado` : `${formatLongDate(cell.day)}: ${cell.done} de ${cell.scheduled} (${formatPercent(cell.ratio)})`}
                      className={cn('aspect-square rounded-[0.3rem] sm:rounded-md', cell.scheduled === 0 ? 'bg-white/[0.025]' : LEVEL_STYLE[level(cell.ratio)], cell.day === today && 'ring-1 ring-white/70')}
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-1.5 text-xs text-subtle" aria-hidden>
        menos
        {[0, 1, 2, 3, 4].map((n) => (
          <span key={n} className={cn('size-3.5 rounded-[0.3rem]', LEVEL_STYLE[n])} />
        ))}
        mais
      </div>
    </div>
  )
}
