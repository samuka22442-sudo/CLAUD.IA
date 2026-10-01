import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { cn } from '../../lib/cn.ts'
import { useToast } from '../../store/toast.ts'

const tones = {
  success: { icon: CircleCheck, ring: 'border-emerald-400/40', text: 'text-emerald-300' },
  error: { icon: CircleAlert, ring: 'border-red-400/45', text: 'text-red-300' },
  info: { icon: Info, ring: 'border-brand-400/45', text: 'text-brand-300' },
}

/** Avisos temporários. Fica acima da barra inferior no celular. */
export function Toaster() {
  const toasts = useToast((s) => s.toasts)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      {toasts.map((item) => {
        const tone = tones[item.tone]
        const Icon = tone.icon
        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              'glass pointer-events-auto flex max-w-md animate-fade-up items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-2xl',
              tone.ring,
            )}
          >
            <Icon className={cn('size-5 shrink-0', tone.text)} aria-hidden />
            <span>{item.message}</span>
          </div>
        )
      })}
    </div>
  )
}
