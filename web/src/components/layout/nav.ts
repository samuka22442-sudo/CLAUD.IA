import { ChartColumn, CircleCheckBig, House, ListChecks, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Início', icon: House, end: true },
  { to: '/habitos', label: 'Hábitos', icon: CircleCheckBig },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/rotinas', label: 'Rotinas', icon: ListChecks },
  { to: '/progresso', label: 'Progresso', icon: ChartColumn },
]
