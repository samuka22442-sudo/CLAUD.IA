import { EllipsisVertical } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onClick: () => void
  tone?: 'default' | 'danger'
}

/** Menu "⋯" de ações do cartão (Editar, Arquivar, Excluir…). Fecha ao tocar fora ou com Esc. */
export function ActionMenu({ items, label = 'Mais opções' }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="grid size-11 place-items-center rounded-xl text-muted transition hover:bg-white/[0.07] hover:text-fg active:scale-95"
      >
        <EllipsisVertical className="size-5" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="glass absolute top-full right-0 z-30 mt-1 min-w-52 animate-dialog-in rounded-2xl p-1.5 shadow-2xl"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
              className={cn(
                'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition',
                item.tone === 'danger' ? 'text-red-300 hover:bg-red-500/15' : 'text-fg hover:bg-white/[0.07]',
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
