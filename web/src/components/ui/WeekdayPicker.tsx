import { WEEKDAYS } from '@ritmo/shared'
import type { Weekday } from '@ritmo/shared'
import { cn } from '../../lib/cn.ts'
import { WEEKDAY_INITIAL, WEEKDAY_NAME } from '../../lib/dates.ts'
import { ChipButton } from './Chip.tsx'

interface WeekdayPickerProps {
  value: Weekday[]
  onChange: (days: Weekday[]) => void
}

const PRESETS: { label: string; days: Weekday[] }[] = [
  { label: 'Todos os dias', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: 'Dias úteis', days: [1, 2, 3, 4, 5] },
  { label: 'Fim de semana', days: [0, 6] },
]

const sameDays = (a: Weekday[], b: Weekday[]) => a.length === b.length && a.every((d) => b.includes(d))

export function WeekdayPicker({ value, onChange }: WeekdayPickerProps) {
  const toggle = (day: Weekday) => {
    const next = value.includes(day) ? value.filter((d) => d !== day) : [...value, day]
    onChange([...next].sort((a, b) => a - b))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <ChipButton key={preset.label} selected={sameDays(value, preset.days)} onClick={() => onChange(preset.days)}>
            {preset.label}
          </ChipButton>
        ))}
      </div>
      <div role="group" aria-label="Dias da semana" className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS.map((day) => {
          const selected = value.includes(day)
          return (
            <button
              key={day}
              type="button"
              aria-pressed={selected}
              aria-label={WEEKDAY_NAME[day]}
              title={WEEKDAY_NAME[day]}
              onClick={() => toggle(day)}
              className={cn(
                'aspect-square min-h-11 rounded-full border text-sm font-bold transition active:scale-90',
                selected
                  ? 'gradient-brand border-transparent text-white shadow-[0_0_18px_-4px_rgb(139_61_255/0.9)]'
                  : 'border-line bg-white/[0.04] text-muted hover:border-line-strong hover:text-fg',
              )}
            >
              {WEEKDAY_INITIAL[day]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
