import { cn } from '../../lib/cn.ts'

interface ProgressBarProps {
  /** 0 a 1 */
  value: number
  /** 'entity' usa a cor `--c` definida por um elemento pai; 'brand' usa o degradê roxo. */
  tone?: 'brand' | 'entity'
  className?: string
  label?: string
}

export function ProgressBar({ value, tone = 'brand', className, label }: ProgressBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-white/[0.07]', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-700 ease-out', tone === 'brand' && 'gradient-brand')}
        style={{
          width: `${pct}%`,
          ...(tone === 'entity'
            ? {
                backgroundImage: 'linear-gradient(90deg, color-mix(in oklab, var(--c) 62%, #6d28d9), var(--c))',
                boxShadow: '0 0 14px -2px color-mix(in oklab, var(--c) 70%, transparent)',
              }
            : { boxShadow: '0 0 14px -2px rgb(139 61 255 / 0.8)' }),
        }}
      />
    </div>
  )
}
