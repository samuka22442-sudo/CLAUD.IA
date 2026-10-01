import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="glass flex flex-col items-center rounded-3xl px-6 py-12 text-center">
      <div className="mb-5 grid size-16 place-items-center rounded-2xl bg-brand-500/15 text-brand-300 shadow-[0_0_40px_-8px_rgb(139_61_255/0.9)]">
        <Icon className="size-8" aria-hidden />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
