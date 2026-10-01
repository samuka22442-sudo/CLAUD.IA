import { useId } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

interface ProgressRingProps {
  /** 0 a 1 */
  value: number
  size?: number
  stroke?: number
  /** Cor sólida (hex). Sem ela usa o degradê roxo → magenta da marca. */
  color?: string
  children?: ReactNode
  className?: string
  label?: string
}

/** Anel de progresso em SVG com brilho e animação suave. */
export function ProgressRing({ value, size = 120, stroke = 10, color, children, className, label }: ProgressRingProps) {
  const gradientId = useId()
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(1, Math.max(0, value))
  const glow = color ?? '#8b3dff'

  return (
    <div
      role="img"
      aria-label={label ?? `${Math.round(clamped * 100)}% concluído`}
      className={cn('relative inline-grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b3dff" />
            <stop offset="100%" stopColor="#ff4fd8" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color ?? `url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          strokeOpacity={clamped === 0 ? 0 : 1}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 ${Math.max(4, stroke)}px ${glow}99)` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}
