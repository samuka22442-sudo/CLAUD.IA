import { CircleCheckBig, ListChecks, Plus, Target } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { cn } from '../../lib/cn.ts'

const OPTIONS = [
  { to: '/habitos', label: 'Novo hábito', icon: CircleCheckBig, color: '#22d3ee' },
  { to: '/metas', label: 'Nova meta', icon: Target, color: '#ff3d9a' },
  { to: '/rotinas', label: 'Nova rotina', icon: ListChecks, color: '#ffc532' },
]

/**
 * Botão "+" flutuante (só no celular/tablet). Abre as três opções de criação; cada página
 * abre o formulário quando recebe `?novo=1`.
 */
export function QuickAdd() {
  // Guardamos em qual rota o menu foi aberto: ao navegar, ele deixa de valer sozinho (sem efeito).
  const [openAt, setOpenAt] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const ref = useRef<HTMLDivElement>(null)
  const open = openAt === location.pathname
  const setOpen = (value: boolean) => setOpenAt(value ? location.pathname : null)

  // Fecha ao tocar fora e com Esc.
  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpenAt(null)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpenAt(null)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (location.pathname === '/perfil') return null

  return (
    <div ref={ref} className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 flex flex-col items-end gap-3 lg:hidden">
      {open && (
        <ul className="flex flex-col items-end gap-2.5" aria-label="Criar novo">
          {OPTIONS.map(({ to, label, icon: Icon, color }, index) => (
            <li key={to} className="animate-fade-up" style={{ animationDelay: `${(OPTIONS.length - index) * 40}ms` }}>
              <button
                type="button"
                onClick={() => navigate(`${to}?novo=1`)}
                style={{ ['--c' as string]: color }}
                className="glass flex h-12 items-center gap-3 rounded-full py-1 pr-5 pl-1.5 text-sm font-bold shadow-xl active:scale-95"
              >
                <span className="tint grid size-9 place-items-center rounded-full">
                  <Icon className="size-[1.15rem]" aria-hidden />
                </span>
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        aria-label={open ? 'Fechar menu de criação' : 'Criar novo'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="gradient-brand grid size-14 place-items-center rounded-full text-white shadow-glow transition active:scale-90"
      >
        <Plus className={cn('size-7 transition-transform duration-200', open && 'rotate-45')} strokeWidth={2.6} aria-hidden />
      </button>
    </div>
  )
}
