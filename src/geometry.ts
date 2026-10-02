import type { Device } from './types'

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

export function cablePath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const s = b.y >= a.y ? 1 : -1
  const k = Math.min(160, Math.abs(b.y - a.y) / 2 + 50)
  return `M${a.x},${a.y} C${a.x},${a.y + s * k} ${b.x},${b.y - s * k} ${b.x},${b.y}`
}
