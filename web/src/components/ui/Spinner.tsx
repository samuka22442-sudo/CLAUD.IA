import { LoaderCircle } from 'lucide-react'
import { cn } from '../../lib/cn.ts'

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn('size-5 animate-spin text-brand-300', className)} aria-label="Carregando" role="status" />
}
