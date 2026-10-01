import type { IconKey } from '@ritmo/shared'
import { Sparkles } from 'lucide-react'
import { ICONS } from '../../lib/icons.ts'

/** Ícone de hábito/meta/rotina a partir da chave guardada (cai em ✨ se a chave for desconhecida). */
export function EntityIcon({ name, className }: { name: IconKey | string; className?: string }) {
  const Icon = ICONS[name as IconKey] ?? Sparkles
  return <Icon className={className} aria-hidden />
}
