import { CircleCheck, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '../ui/Button.tsx'

/**
 * Registra o service worker e avisa de duas coisas: "pronto para usar offline" (primeira instalação)
 * e "nova versão disponível" (o usuário escolhe quando atualizar).
 */
export function PwaManager() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      // App aberto por dias (PWA instalado): confere se há versão nova a cada hora.
      if (registration) setInterval(() => void registration.update(), 60 * 60 * 1000)
    },
  })

  // O aviso de "pronto para usar offline" é só informativo: some sozinho. O de "nova versão" espera a escolha.
  useEffect(() => {
    if (!offlineReady || needRefresh) return
    const id = setTimeout(() => setOfflineReady(false), 7000)
    return () => clearTimeout(id)
  }, [offlineReady, needRefresh, setOfflineReady])

  if (!needRefresh && !offlineReady) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[65] flex justify-center px-4 lg:bottom-6">
      <div role="status" className="glass pointer-events-auto flex max-w-md animate-fade-up items-center gap-3 rounded-2xl border-brand-400/40 py-2.5 pr-2.5 pl-4 shadow-2xl">
        {needRefresh ? (
          <>
            <RefreshCw className="size-5 shrink-0 text-brand-300" aria-hidden />
            <p className="text-sm font-semibold">Nova versão disponível</p>
            <Button size="sm" onClick={() => void updateServiceWorker(true)}>
              Atualizar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
              Depois
            </Button>
          </>
        ) : (
          <>
            <CircleCheck className="size-5 shrink-0 text-emerald-300" aria-hidden />
            <p className="text-sm font-semibold">Pronto para usar sem internet</p>
            <Button size="sm" variant="ghost" onClick={() => setOfflineReady(false)}>
              OK
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
