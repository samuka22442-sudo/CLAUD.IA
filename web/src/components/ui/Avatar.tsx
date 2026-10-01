import { cn } from '../../lib/cn.ts'
import { initials } from '../../lib/format.ts'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'size-9 text-xs', md: 'size-11 text-sm', lg: 'size-16 text-xl' }

/** Iniciais sobre um degradê da marca. */
export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'gradient-brand inline-grid shrink-0 place-items-center rounded-full font-extrabold text-white shadow-[0_0_22px_-4px_rgb(139_61_255/0.8)]',
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
