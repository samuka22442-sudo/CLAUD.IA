import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

const tones: Record<Tone, string> = {
  neutral: 'bg-white/[0.06] text-muted border-line',
  brand: 'bg-brand-500/15 text-brand-200 border-brand-400/30',
  success: 'bg-emerald-400/12 text-emerald-300 border-emerald-400/30',
  warning: 'bg-amber-400/12 text-amber-300 border-amber-400/30',
  danger: 'bg-red-400/12 text-red-300 border-red-400/35',
}

interface ChipProps {
  children: ReactNode
  tone?: Tone
  icon?: ReactNode
  className?: string
}

/** Etiqueta pequena e arredondada (não clicável). */
export function Chip({ children, tone = 'neutral', icon, className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}

interface ChipButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  selected?: boolean
  children: ReactNode
}

/** Chip clicável (filtros, presets, categorias). */
export function ChipButton({ selected = false, className, children, type = 'button', ...rest }: ChipButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap transition active:scale-95',
        selected
          ? 'border-brand-400/60 bg-brand-500/20 text-brand-100 shadow-[0_0_20px_-6px_rgb(139_61_255/0.8)]'
          : 'border-line bg-white/[0.04] text-muted hover:border-line-strong hover:text-fg',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
