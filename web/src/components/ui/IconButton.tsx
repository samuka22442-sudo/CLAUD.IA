import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Obrigatório: nome acessível do botão (também vira dica ao passar o mouse). */
  label: string
  children: ReactNode
  tone?: 'default' | 'danger'
  size?: 'sm' | 'md'
}

export function IconButton({ label, children, tone = 'default', size = 'md', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-xl transition duration-150 active:scale-95 disabled:opacity-50',
        size === 'md' ? 'size-11' : 'size-9',
        tone === 'danger'
          ? 'text-red-300 hover:bg-red-500/15'
          : 'text-muted hover:bg-white/[0.07] hover:text-fg',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
