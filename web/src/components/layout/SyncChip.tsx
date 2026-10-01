import { CloudCheck, CloudOff, FlaskConical, RefreshCw, TriangleAlert } from 'lucide-react'
import { useOnline } from '../../hooks/useOnline.ts'
import { useData } from '../../store/data.ts'
import { syncNow, useSync } from '../../store/sync.ts'
import { Chip } from '../ui/Chip.tsx'

/** Estado da sincronização com o servidor: Sincronizado · Sincronizando · Offline (N pendentes) · Erro. */
export function SyncChip() {
  const mode = useData((s) => s.mode)
  const pending = useData((s) => s.queue.length)
  const status = useSync((s) => s.status)
  const online = useOnline()

  if (mode === 'demo') {
    return (
      <Chip tone="warning" icon={<FlaskConical className="size-3.5" aria-hidden />}>
        Demonstração
      </Chip>
    )
  }

  if (!online || status === 'offline') {
    return (
      <Chip tone="warning" icon={<CloudOff className="size-3.5" aria-hidden />}>
        {pending > 0 ? `Offline · ${pending} pendente${pending > 1 ? 's' : ''}` : 'Offline'}
      </Chip>
    )
  }

  if (status === 'error') {
    return (
      <button type="button" onClick={syncNow} aria-label="Erro ao sincronizar. Tentar de novo" className="rounded-full">
        <Chip tone="danger" icon={<TriangleAlert className="size-3.5" aria-hidden />}>
          Erro · tentar de novo
        </Chip>
      </button>
    )
  }

  if (status === 'syncing' || pending > 0) {
    return (
      <Chip tone="brand" icon={<RefreshCw className="size-3.5 animate-spin" aria-hidden />}>
        Sincronizando
      </Chip>
    )
  }

  return (
    <Chip tone="success" icon={<CloudCheck className="size-3.5" aria-hidden />}>
      Sincronizado
    </Chip>
  )
}
