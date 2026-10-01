import { useEffect, useState } from 'react'
import { todayISO } from '../lib/dates.ts'
import type { ISODate } from '../lib/dates.ts'

/**
 * Data de hoje (YYYY-MM-DD) que vira sozinha à meia-noite com o app aberto
 * e é reconferida quando a aba/PWA volta ao primeiro plano.
 */
export function useToday(): ISODate {
  const [today, setToday] = useState<ISODate>(() => todayISO())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const refresh = () => setToday((current) => {
      const now = todayISO()
      return now === current ? current : now
    })

    const scheduleMidnight = () => {
      const now = new Date()
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1)
      timer = setTimeout(() => {
        refresh()
        scheduleMidnight()
      }, next.getTime() - now.getTime())
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    scheduleMidnight()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return today
}
