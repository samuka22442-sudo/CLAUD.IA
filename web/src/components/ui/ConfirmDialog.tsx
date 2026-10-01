import type { ReactNode } from 'react'
import { Button } from './Button.tsx'
import { Modal } from './Modal.tsx'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
  /** Conteúdo extra entre a mensagem e os botões (ex.: campo de senha). */
  children?: ReactNode
}

/** Confirmação para ações destrutivas ou irreversíveis. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  loading = false,
  onConfirm,
  onClose,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} fullWidth loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-[0.95rem] leading-relaxed text-muted">{message}</div>
      {children}
    </Modal>
  )
}
