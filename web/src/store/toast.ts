import { create } from 'zustand'
import { newId } from '../lib/ids.ts'

export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  tone: ToastTone
}

interface ToastState {
  toasts: Toast[]
  show: (message: string, tone?: ToastTone) => void
  dismiss: (id: string) => void
}

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  show(message, tone = 'info') {
    const id = newId()
    // No máximo 3 avisos empilhados; o mais antigo sai.
    set({ toasts: [...get().toasts, { id, message, tone }].slice(-3) })
    setTimeout(() => get().dismiss(id), tone === 'error' ? 6000 : 3500)
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) })
  },
}))

/** Atalhos: toast.success('Salvo!') */
export const toast = {
  success: (message: string) => useToast.getState().show(message, 'success'),
  error: (message: string) => useToast.getState().show(message, 'error'),
  info: (message: string) => useToast.getState().show(message, 'info'),
}
