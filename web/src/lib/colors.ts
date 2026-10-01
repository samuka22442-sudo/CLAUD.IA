import type { ColorKey } from '@ritmo/shared'
import type { CSSProperties } from 'react'

export interface ColorDef {
  label: string
  hex: string
}

/** Paleta de categorias: tons vivos e saturados que se destacam no fundo escuro. */
export const COLORS: Record<ColorKey, ColorDef> = {
  violet: { label: 'Violeta', hex: '#9d5cff' },
  fuchsia: { label: 'Magenta', hex: '#e53bff' },
  pink: { label: 'Rosa', hex: '#ff3d9a' },
  cyan: { label: 'Ciano', hex: '#22d3ee' },
  blue: { label: 'Azul', hex: '#4d8dff' },
  emerald: { label: 'Esmeralda', hex: '#1ee09a' },
  lime: { label: 'Lima', hex: '#b6f23c' },
  amber: { label: 'Âmbar', hex: '#ffc532' },
  orange: { label: 'Laranja', hex: '#ff8a3d' },
  red: { label: 'Vermelho', hex: '#ff4d6d' },
}

export const colorHex = (key: ColorKey): string => COLORS[key]?.hex ?? COLORS.violet.hex

/** Define `--c` no elemento; as classes `bg-(--c)/15`, `text-(--c)` etc. derivam tudo dessa cor. */
export const colorStyle = (key: ColorKey): CSSProperties => ({ ['--c' as string]: colorHex(key) })
