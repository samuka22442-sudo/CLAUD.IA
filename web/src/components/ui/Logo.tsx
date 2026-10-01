import { useId } from 'react'
import { APP_NAME } from '@ritmo/shared'
import { cn } from '../../lib/cn.ts'

/** Marca: anel de progresso com check, sobre degradê roxo → magenta. */
export function LogoMark({ className }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 48 48" className={cn('size-10 shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="55%" stopColor="#a21fe0" />
          <stop offset="100%" stopColor="#e11dff" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#${id})`} />
      <circle cx="24" cy="24" r="12.5" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="3.6" />
      <path d="M24 11.5a12.5 12.5 0 1 1-12.5 12.5" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M18.4 24.6l4.1 4.1 7.3-8.6" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ className, showName = true }: { className?: string; showName?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <LogoMark />
      {showName && <span className="text-xl font-extrabold tracking-tight">{APP_NAME}</span>}
    </span>
  )
}
