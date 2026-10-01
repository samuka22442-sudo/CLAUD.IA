import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn.ts'

interface FieldProps {
  label: string
  /** Texto de ajuda abaixo do campo. */
  hint?: string
  error?: string
  optional?: boolean
  children: ReactNode
  className?: string
}

/** Rótulo + campo + mensagem de erro. O <label> envolve o campo, então a associação é automática. */
export function Field({ label, hint, error, optional, children, className }: FieldProps) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-fg">
        {label}
        {optional && <span className="text-xs font-medium text-subtle">opcional</span>}
      </span>
      {children}
      {error ? (
        <span role="alert" className="mt-1.5 block text-sm font-medium text-red-300">
          {error}
        </span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-subtle">{hint}</span>
      )}
    </label>
  )
}

/** Mesmo visual para grupos de controles que não são um único input (cores, ícones, dias…). */
export function FieldGroup({ label, hint, error, optional, children, className }: FieldProps) {
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-fg">
        {label}
        {optional && <span className="text-xs font-medium text-subtle">opcional</span>}
      </legend>
      {children}
      {error ? (
        <span role="alert" className="mt-1.5 block text-sm font-medium text-red-300">
          {error}
        </span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-subtle">{hint}</span>
      )}
    </fieldset>
  )
}

const control =
  'rounded-xl border bg-ink-800/80 px-4 text-fg placeholder:text-subtle transition focus:outline-none focus:ring-2 disabled:opacity-60'

/** Campos ocupam a largura toda, a menos que o chamador defina a sua (`w-20`, `size-…`). */
const fullWidth = (className?: string) => (className && /(^|\s)(w-|size-)/.test(className) ? '' : 'w-full')
const ok = 'border-line hover:border-line-strong focus:border-brand-400 focus:ring-brand-500/35'
const bad = 'border-red-400/60 focus:border-red-400 focus:ring-red-500/30'

interface InvalidProp {
  invalid?: boolean
}

export function Input({ invalid, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & InvalidProp) {
  return <input className={cn(control, fullWidth(className), 'h-12', invalid ? bad : ok, className)} aria-invalid={invalid || undefined} {...rest} />
}

export function Textarea({ invalid, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & InvalidProp) {
  return (
    <textarea
      className={cn(control, fullWidth(className), 'min-h-24 resize-y py-3 leading-relaxed', invalid ? bad : ok, className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  )
}

export function Select({ invalid, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & InvalidProp) {
  return (
    <select className={cn(control, fullWidth(className), 'h-12 appearance-none', invalid ? bad : ok, className)} aria-invalid={invalid || undefined} {...rest}>
      {children}
    </select>
  )
}
