import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn.ts'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Padding interno padrão (desligue para cards com listas que vão de borda a borda). */
  padded?: boolean
}

export function Card({ padded = true, className, ...rest }: CardProps) {
  return <div className={cn('glass rounded-3xl', padded && 'p-4 sm:p-5', className)} {...rest} />
}
