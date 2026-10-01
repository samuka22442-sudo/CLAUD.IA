import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'
import { IconButton } from './IconButton.tsx'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  /** Barra de ações fixa no rodapé (botões Salvar/Cancelar). */
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const widths = { sm: 'md:max-w-md', md: 'md:max-w-lg', lg: 'md:max-w-2xl' }

/**
 * Diálogo acessível baseado no <dialog> nativo (foco preso, Esc fecha, fundo inerte).
 * No celular vira bottom sheet; a partir de md, janela centralizada.
 * O conteúdo só é montado enquanto aberto, então formulários sempre começam limpos.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  // O evento nativo "close" também dispara quando fechamos por código (open → false). Só o fechamento
  // feito pelo usuário (Esc) deve chamar onClose; senão, trocar de diálogo fecharia o fluxo inteiro.
  const closedByCode = useRef(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) {
      closedByCode.current = true
      dialog.close()
    }
  }, [open])

  // Trava a rolagem da página por trás enquanto o diálogo está aberto.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onClose={() => {
        if (closedByCode.current) {
          closedByCode.current = false
          return
        }
        onClose()
      }}
      // Clique no fundo escuro (o próprio <dialog>, que ocupa a tela toda) fecha.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {open && (
        <div
          className={cn(
            'flex max-h-[92dvh] w-full animate-sheet-up flex-col overflow-hidden rounded-t-[1.75rem] border-t border-line-strong bg-ink-850 shadow-[0_-20px_60px_-20px_rgb(139_61_255/0.35)] md:max-h-[88dvh] md:animate-dialog-in md:rounded-[1.75rem] md:border md:shadow-2xl',
            widths[size],
          )}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/15 md:hidden" aria-hidden />
          <header className="flex shrink-0 items-start gap-3 px-5 pb-2 pt-3 md:px-6 md:pt-5">
            <div className="min-w-0 flex-1 pt-1.5">
              <h2 id={titleId} className="text-lg font-bold leading-tight">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <IconButton label="Fechar" onClick={onClose} className="-mr-2">
              <X className="size-5" />
            </IconButton>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2 md:px-6">{children}</div>
          {footer && (
            <footer className="shrink-0 border-t border-line bg-ink-900/70 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  )
}
