import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { cn } from '../../lib/cn.ts'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
  /** React 19: `ref` é uma prop comum em componentes de função. */
  ref?: Ref<HTMLButtonElement>
}

const variants: Record<Variant, string> = {
  primary: 'gradient-brand text-white font-semibold shadow-glow hover:brightness-110',
  secondary: 'glass text-fg hover:border-line-strong hover:bg-white/[0.07]',
  ghost: 'text-muted hover:bg-white/[0.06] hover:text-fg',
  danger: 'border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 gap-1.5 rounded-xl px-3 text-sm',
  md: 'h-11 gap-2 rounded-xl px-4 text-[0.95rem]',
  lg: 'h-12 gap-2 rounded-2xl px-6 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  type = 'button',
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition duration-150 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
}
