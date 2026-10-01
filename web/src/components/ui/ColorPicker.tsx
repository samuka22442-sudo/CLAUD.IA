import { COLOR_KEYS } from '@ritmo/shared'
import type { ColorKey } from '@ritmo/shared'
import { Check } from 'lucide-react'
import { COLORS, colorStyle } from '../../lib/colors.ts'
import { cn } from '../../lib/cn.ts'

interface ColorPickerProps {
  value: ColorKey
  onChange: (color: ColorKey) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div role="radiogroup" aria-label="Cor" className="grid grid-cols-5 gap-2.5">
      {COLOR_KEYS.map((key) => {
        const selected = key === value
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={COLORS[key].label}
            title={COLORS[key].label}
            onClick={() => onChange(key)}
            style={colorStyle(key)}
            className={cn(
              'relative grid aspect-square min-h-11 w-full max-w-14 place-items-center justify-self-center rounded-full bg-(--c) transition active:scale-90',
              selected ? 'ring-2 ring-white ring-offset-2 ring-offset-ink-850 c-glow' : 'opacity-85 hover:opacity-100',
            )}
          >
            {selected && <Check className="size-5 text-ink-950" strokeWidth={3} aria-hidden />}
          </button>
        )
      })}
    </div>
  )
}
