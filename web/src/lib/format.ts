/** "1 dia", "2 dias" */
export const plural = (n: number, one: string, many: string): string => (Math.abs(n) === 1 ? one : many)

export const countLabel = (n: number, one: string, many: string): string => `${n} ${plural(n, one, many)}`

const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
export const formatNumber = (n: number): string => numberFormat.format(n)

export const formatPercent = (ratio: number): string => `${Math.round(ratio * 100)}%`

/** 45 → "45 min"; 60 → "1 h"; 65 → "1 h 05 min" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')} min`
}

/** Saudação conforme a hora do dia. */
export function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name

/** "Ana Souza" → "AS" */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]![0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? '') : ''
  return (first + last).toUpperCase()
}

/** mm:ss para o cronômetro do modo foco. */
export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
