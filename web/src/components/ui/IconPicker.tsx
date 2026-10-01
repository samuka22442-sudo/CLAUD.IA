import { ICON_KEYS } from '@ritmo/shared'
import type { ColorKey, IconKey } from '@ritmo/shared'
import { colorStyle } from '../../lib/colors.ts'
import { ICON_LABELS, ICONS } from '../../lib/icons.ts'
import { cn } from '../../lib/cn.ts'

interface IconPickerProps {
  value: IconKey
  color: ColorKey
  onChange: (icon: IconKey) => void
}

export function IconPicker({ value, color, onChange }: IconPickerProps) {
  return (
    <div role="radiogroup" aria-label="Ícone" style={colorStyle(color)} className="grid grid-cols-6 gap-2 sm:grid-cols-8">
      {ICON_KEYS.map((key) => {
        const Icon = ICONS[key]
        const selected = key === value
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={ICON_LABELS[key]}
            title={ICON_LABELS[key]}
            onClick={() => onChange(key)}
            className={cn(
              'grid aspect-square min-h-11 place-items-center rounded-xl border transition active:scale-90',
              selected
                ? 'tint tint-border c-glow'
                : 'border-line bg-white/[0.03] text-muted hover:border-line-strong hover:text-fg',
            )}
          >
            <Icon className="size-5" aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
