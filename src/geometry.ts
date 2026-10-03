import type { Device, DeviceType } from './types'

export const PORT = 22
export const GAP = 4
export const PAD = 10
export const HEADER = 58
export const PER_ROW = 12

const cols = (ports: number) => Math.min(ports, PER_ROW)

export function deviceSize(ports: number) {
  const rows = Math.ceil(ports / PER_ROW)
  return {
    w: Math.max(150, PAD * 2 + cols(ports) * (PORT + GAP) - GAP),
    h: HEADER + PAD + rows * (PORT + GAP) - GAP + PAD,
  }
}

/** Posição da porta relativa ao canto do equipamento (centro do círculo). */
export function portOffset(ports: number, port: number) {
  const { w } = deviceSize(ports)
  const i = port - 1
  const x0 = (w - (cols(ports) * (PORT + GAP) - GAP)) / 2
  return {
    x: x0 + (i % PER_ROW) * (PORT + GAP) + PORT / 2,
    y: HEADER + PAD + Math.floor(i / PER_ROW) * (PORT + GAP) + PORT / 2,
  }
}

export function portPos(d: Device, port: number) {
  const o = portOffset(d.ports, port)
  return { x: d.x + o.x, y: d.y + o.y }
}

type Pt = { x: number; y: number }

/** Curva suave entre duas portas; devolve o caminho e o ponto médio (para o rótulo). */
export function cableGeom(a: Pt, b: Pt) {
  const s = b.y >= a.y ? 1 : -1
  const dist = Math.hypot(b.x - a.x, b.y - a.y)
  const k = Math.min(220, Math.max(70, dist * 0.45))
  const c1 = { x: a.x, y: a.y + s * k }
  const c2 = { x: b.x, y: b.y - s * k }
  return {
    d: `M${a.x},${a.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y}`,
    mid: { x: (a.x + 3 * c1.x + 3 * c2.x + b.x) / 8, y: (a.y + 3 * c1.y + 3 * c2.y + b.y) / 8 },
  }
}

export const cablePath = (a: Pt, b: Pt) => cableGeom(a, b).d

// --- sobreposição ---------------------------------------------------------

const MARGIN = 28
type Box = { x: number; y: number; w: number; h: number }
const boxOf = (d: { x: number; y: number; ports: number }): Box => ({ x: d.x, y: d.y, ...deviceSize(d.ports) })
const hit = (a: Box, b: Box) =>
  a.x < b.x + b.w + MARGIN && a.x + a.w + MARGIN > b.x && a.y < b.y + b.h + MARGIN && a.y + a.h + MARGIN > b.y

/** Posição livre mais próxima de (x, y) que não encosta em nenhum dos outros equipamentos. */
export function freeSpot(others: Device[], x: number, y: number, ports: number): Pt {
  const size = deviceSize(ports)
  const free = (px: number, py: number) => !others.some((o) => hit({ x: px, y: py, ...size }, boxOf(o)))
  if (free(x, y)) return { x, y }
  const step = 20
  for (let r = 1; r <= 120; r++) {
    let best: Pt | null = null
    let bd = Infinity
    for (let i = -r; i <= r; i++) {
      for (const [dx, dy] of [[i, -r], [i, r], [-r, i], [r, i]]) {
        const d2 = dx * dx + dy * dy
        const px = x + dx * step
        const py = y + dy * step
        if (d2 < bd && free(px, py)) {
          best = { x: px, y: py }
          bd = d2
        }
      }
    }
    if (best) return best
  }
  return { x, y }
}

const TIER: Record<DeviceType, number> = { cloud: 0, firewall: 1, router: 2, switch: 3, ap: 4, server: 5, pc: 5, laptop: 5 }

/** Organiza em camadas (internet → firewall → roteador → switch → ...), centralizado e sem colisão. */
export function arrange(devices: Device[]): Record<string, Pt> {
  const tiers = new Map<number, Device[]>()
  for (const d of devices) tiers.set(TIER[d.type], [...(tiers.get(TIER[d.type]) ?? []), d])
  const out: Record<string, Pt> = {}
  let y = 0
  for (const t of [...tiers.keys()].sort((a, b) => a - b)) {
    const list = tiers.get(t)!
    for (let i = 0; i < list.length; i += 5) {
      const row = list.slice(i, i + 5)
      const sizes = row.map((d) => deviceSize(d.ports))
      const total = sizes.reduce((s, z) => s + z.w, 0) + 60 * (row.length - 1)
      let x = -total / 2
      row.forEach((d, j) => {
        out[d.id] = { x: Math.round(x), y: Math.round(y) }
        x += sizes[j].w + 60
      })
      y += Math.max(...sizes.map((z) => z.h)) + 120
    }
  }
  return out
}
