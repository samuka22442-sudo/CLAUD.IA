import { useEffect } from 'react'

/** Mantém a tela acesa enquanto `active` (modo foco da rotina). Falha em silêncio onde não há suporte. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) void lock.release()
        else sentinel = lock
      } catch {
        // negado (economia de bateria, aba em segundo plano…): segue sem
      }
    }
    // O navegador solta o lock ao esconder a aba; pede de novo ao voltar.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release()
    }
  }, [active])
}
