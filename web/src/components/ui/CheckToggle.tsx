import { Check } from 'lucide-react'
import type { ColorKey } from '@ritmo/shared'
import { colorStyle } from '../../lib/colors.ts'
import { cn } from '../../lib/cn.ts'

interface CheckToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  color: ColorKey
  label: string
  disabled?: boolean
  size?: 'md' | 'lg'
}

/** Botão circular de concluir/desconcluir (hábitos e passos de rotina). Área de toque de 44 px. */
export function CheckToggle({ checked, onChange, color, label, disabled = false, size = 'md' }: CheckToggleProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={colorStyle(color)}
      className={cn(
        'grid shrink-0 place-items-center rounded-full border-2 transition duration-200 active:scale-90 disabled:opacity-40',
        size === 'lg' ? 'size-12' : 'size-11',
        checked
          ? 'border-transparent bg-(--c) text-ink-950 c-glow'
          : 'border-[color-mix(in_oklab,var(--c)_55%,transparent)] text-transparent hover:bg-[color-mix(in_oklab,var(--c)_14%,transparent)] hover:text-[color-mix(in_oklab,var(--c)_60%,transparent)]',
      )}
    >
      <Check className={cn('size-6', checked && 'animate-pop')} strokeWidth={3.2} aria-hidden />
    </button>
  )
}
