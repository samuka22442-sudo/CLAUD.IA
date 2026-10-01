/** Lê um número digitado (aceita vírgula decimal). Retorna null se vazio ou inválido. */
export function parseNumber(text: string): number | null {
  const normalized = text.trim().replace(/\s/g, '').replace(',', '.')
  if (normalized === '') return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}
