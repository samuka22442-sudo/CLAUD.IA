import type { LucideIcon } from 'lucide-react'
import type { CSSProperties } from 'react'
import { cn } from '../../lib/cn.ts'

interface StatTileProps {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  /** Cor de destaque (hex). Padrão: violeta. */
  color?: string
  className?: string
}

export function StatTile({ icon: Icon, label, value, hint, color = '#9d5cff', className }: StatTileProps) {
  return (
    <div className={cn('glass rounded-2xl p-4', className)} style={{ ['--c' as string]: color } as CSSProperties}>
      <div className="flex items-center gap-2.5">
        <span className="tint grid size-9 place-items-center rounded-xl">
          <Icon className="size-[1.15rem]" aria-hidden />
        </span>
        <span className="text-sm font-semibold text-muted">{label}</span>
      </div>
      <p className="mt-3 text-3xl font-extrabold leading-none tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-subtle">{hint}</p>}
    </div>
  )
}
