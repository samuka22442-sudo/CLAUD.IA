import { Fragment, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

function useMinWidth(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', callback)
      return () => media.removeEventListener('change', callback)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

interface MasonryProps<T> {
  items: T[]
  getKey: (item: T) => string
  render: (item: T) => ReactNode
  /** Peso estimado da altura do item; cada item vai para a coluna mais "leve". Padrão: todos iguais. */
  weight?: (item: T) => number
  /** Largura mínima (px) para usar duas colunas. */
  minWidth?: number
  className?: string
}

/**
 * Lista em duas colunas (a partir de `minWidth`) sem buracos entre cartões de alturas diferentes.
 * No celular é uma coluna só, na ordem original.
 */
export function Masonry<T>({ items, getKey, render, weight = () => 1, minWidth = 1024, className }: MasonryProps<T>) {
  const wide = useMinWidth(`(min-width: ${minWidth}px)`)
  const count = wide ? 2 : 1

  const columns: T[][] = Array.from({ length: count }, () => [])
  const heights = Array.from({ length: count }, () => 0)
  for (const item of items) {
    const target = heights.indexOf(Math.min(...heights))
    columns[target]!.push(item)
    heights[target]! += weight(item)
  }

  return (
    <div className={cn('grid items-start gap-4', count === 2 && 'grid-cols-2', className)}>
      {columns.map((list, index) => (
        <div key={index} className="min-w-0 space-y-4">
          {list.map((item) => (
            <Fragment key={getKey(item)}>{render(item)}</Fragment>
          ))}
        </div>
      ))}
    </div>
  )
}
