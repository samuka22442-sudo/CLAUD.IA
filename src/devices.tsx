import type { CableKind, DeviceType } from './types'

export const DEVICE_TYPES: Record<DeviceType, { label: string; ports: number; paths: string[] }> = {
  router: {
    label: 'Roteador',
    ports: 4,
    paths: ['M4 14h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z', 'M6 18h.01', 'M10 18h.01', 'M15 10v4', 'M17.84 7.17a4 4 0 0 0-5.66 0', 'M20.66 4.34a8 8 0 0 0-11.31 0'],
  },
  switch: {
    label: 'Switch',
    ports: 8,
    paths: ['M4 7h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z', 'M6 12h.01', 'M10 12h.01', 'M14 12h.01', 'M18 12h.01'],
  },
  server: {
    label: 'Servidor',
    ports: 2,
    paths: ['M4 2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z', 'M4 14h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z', 'M6 6h.01', 'M6 18h.01'],
  },
  pc: {
    label: 'Computador',
    ports: 1,
    paths: ['M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M8 21h8', 'M12 17v4'],
  },
  laptop: {
    label: 'Notebook',
    ports: 1,
    paths: ['M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16'],
  },
  cloud: {
    label: 'Internet',
    ports: 1,
    paths: ['M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z'],
  },
  firewall: {
    label: 'Firewall',
    ports: 3,
    paths: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4'],
  },
  ap: {
    label: 'Access Point',
    ports: 1,
    paths: ['M5 12.55a11 11 0 0 1 14.08 0', 'M1.42 9a16 16 0 0 1 21.16 0', 'M8.53 16.11a6 6 0 0 1 6.95 0', 'M12 20h.01'],
  },
}

export const CABLE_KINDS: Record<CableKind, { label: string; color: string; dash: string }> = {
  ethernet: { label: 'Ethernet (UTP)', color: '#38bdf8', dash: '' },
  fibra: { label: 'Fibra óptica', color: '#fbbf24', dash: '' },
  console: { label: 'Console', color: '#94a3b8', dash: '8 6' },
  wifi: { label: 'Wi-Fi', color: '#a78bfa', dash: '2 7' },
}

export const DASHES = [
  { label: 'Sólido', value: '' },
  { label: 'Tracejado', value: '8 6' },
  { label: 'Pontilhado', value: '2 7' },
]

export const PALETTE = ['#3b82f6', '#38bdf8', '#22d3ee', '#34d399', '#fbbf24', '#fb923c', '#f87171', '#a78bfa', '#e2e8f0']

export function DeviceIcon({ type, size = 24, color = 'currentColor' }: { type: DeviceType; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {DEVICE_TYPES[type].paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}
