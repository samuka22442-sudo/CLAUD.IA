import { cn } from '../../lib/cn.ts'

interface TabOption<T extends string> {
  value: T
  label: string
  count?: number
}

interface TabsProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: TabOption<T>[]
  ariaLabel: string
  className?: string
}

/** Controle segmentado (filtros Hoje · Todos · Arquivados etc.). */
export function Tabs<T extends string>({ value, onChange, options, ariaLabel, className }: TabsProps<T>) {
  return (
    <div className={cn('max-w-full overflow-x-auto no-scrollbar', className)}>
      <div role="tablist" aria-label={ariaLabel} className="inline-flex gap-1 rounded-2xl border border-line bg-ink-800/70 p-1">
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                'inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold whitespace-nowrap transition active:scale-95 sm:gap-2 sm:px-4',
                selected ? 'gradient-brand text-white shadow-glow' : 'text-muted hover:text-fg',
              )}
            >
              {option.label}
              {option.count !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-xs font-bold tabular-nums',
                    selected ? 'bg-white/20 text-white' : 'bg-white/[0.07] text-subtle',
                  )}
                >
                  {option.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
