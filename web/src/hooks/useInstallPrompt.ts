import { useCallback, useEffect, useState } from 'react'

/** Evento não padronizado (Chrome/Edge/Android) que permite mostrar o diálogo de instalação do PWA. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

/** Chame uma vez no início do app: guarda o evento antes de qualquer componente montar. */
export function captureInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

export const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const isIOS = (): boolean =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPadOS se identifica como Mac

export interface InstallState {
  /** O navegador oferece instalação direta (botão "Instalar"). */
  canInstall: boolean
  /** iPhone/iPad no Safari: não há diálogo, o usuário usa Compartilhar → Adicionar à Tela de Início. */
  needsIOSHint: boolean
  /** Já está rodando como app instalado. */
  installed: boolean
  install: () => Promise<void>
}

export function useInstallPrompt(): InstallState {
  const [, rerender] = useState(0)

  useEffect(() => {
    const listener = () => rerender((n) => n + 1)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    deferred = null
    notify()
  }, [])

  const installed = isStandalone()
  return {
    canInstall: deferred !== null && !installed,
    needsIOSHint: !installed && deferred === null && isIOS(),
    installed,
    install,
  }
}
