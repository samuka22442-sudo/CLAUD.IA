import { useCallback, useEffect, useRef, useState } from 'react'
import { DeviceIcon } from '../devices'
import { PORT, cablePath, deviceSize, portOffset, portPos } from '../geometry'
import { portUsed, useActive, useStore } from '../store'
import type { DeviceType, PortRef } from '../types'

type Drag =
  | { t: 'pan'; sx: number; sy: number; vx: number; vy: number }
  | { t: 'move'; kind: 'device' | 'note'; id: string; ox: number; oy: number }
  | { t: 'link'; from: PortRef }

interface View { x: number; y: number; k: number }

export default function Canvas() {
  const project = useActive()
  const { select, addDevice, updateDevice, updateNote, addCable, checkpoint } = useStore.getState()
  const sel = useStore((s) => s.selection)
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 })
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)
  const viewRef = useRef(view)
  viewRef.current = view

  const toWorld = useCallback((cx: number, cy: number) => {
    const r = ref.current!.getBoundingClientRect()
    const v = viewRef.current
    return { x: (cx - r.left - v.x) / v.k, y: (cy - r.top - v.y) / v.k }
  }, [])

  const fit = useCallback(() => {
    const el = ref.current
    if (!el) return
    const p = useStore.getState().projects.find((q) => q.id === useStore.getState().activeId)!
    const boxes = [
      ...p.devices.map((d) => ({ x: d.x, y: d.y, ...deviceSize(d.ports) })),
      ...p.notes.map((n) => ({ x: n.x, y: n.y, w: n.text.length * n.size * 0.6, h: n.size * 1.6 })),
    ]
    if (!boxes.length) return setView({ x: 0, y: 0, k: 1 })
    const x0 = Math.min(...boxes.map((b) => b.x)) - 60
    const y0 = Math.min(...boxes.map((b) => b.y)) - 60
    const x1 = Math.max(...boxes.map((b) => b.x + b.w)) + 60
    const y1 = Math.max(...boxes.map((b) => b.y + b.h)) + 100
    const k = Math.min(1.2, el.clientWidth / (x1 - x0), el.clientHeight / (y1 - y0))
    setView({ k, x: (el.clientWidth - (x1 - x0) * k) / 2 - x0 * k, y: (el.clientHeight - (y1 - y0) * k) / 2 - y0 * k })
  }, [])

  useEffect(() => {
    fit()
    window.addEventListener('netdiagram:fit', fit)
    return () => window.removeEventListener('netdiagram:fit', fit)
  }, [project.id, fit])

  useEffect(() => {
    const onAdd = (e: Event) => {
      const type = (e as CustomEvent<DeviceType | 'note'>).detail
      const el = ref.current!
      const v = viewRef.current
      const jitter = () => (Math.random() - 0.5) * 60
      const x = Math.round((el.clientWidth / 2 - v.x) / v.k + jitter())
      const y = Math.round((el.clientHeight / 2 - v.y) / v.k + jitter())
      if (type === 'note') useStore.getState().addNote(x, y)
      else useStore.getState().addDevice(type, x - 75, y - 30)
    }
    window.addEventListener('netdiagram:add', onAdd)
    return () => window.removeEventListener('netdiagram:add', onAdd)
  }, [])

  useEffect(() => {
    const el = ref.current!
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const v = viewRef.current
      const k = Math.min(2.5, Math.max(0.2, v.k * Math.exp(-e.deltaY * 0.0012)))
      const mx = e.clientX - r.left
      const my = e.clientY - r.top
      setView({ k, x: mx - ((mx - v.x) / v.k) * k, y: my - ((my - v.y) / v.k) * k })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'Delete' || e.key === 'Backspace') useStore.getState().removeSelected()
      if (e.key === 'Escape') useStore.getState().select(null)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        useStore.getState().undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const t = e.target as HTMLElement
    const w = toWorld(e.clientX, e.clientY)
    ref.current!.setPointerCapture(e.pointerId)

    const portEl = t.closest<HTMLElement>('[data-port]')
    if (portEl) {
      const from = { deviceId: portEl.dataset.device!, port: Number(portEl.dataset.port) }
      if (portUsed(project, from)) {
        const c = project.cables.find((c) => [c.from, c.to].some((r) => r.deviceId === from.deviceId && r.port === from.port))
        if (c) select({ kind: 'cable', id: c.id })
        return
      }
      drag.current = { t: 'link', from }
      setGhost(w)
      return
    }
    const nodeEl = t.closest<HTMLElement>('[data-node]')
    if (nodeEl) {
      const kind = nodeEl.dataset.node as 'device' | 'note'
      const id = nodeEl.dataset.id!
      const item = (kind === 'device' ? project.devices : project.notes).find((i) => i.id === id)!
      select({ kind, id })
      checkpoint()
      drag.current = { t: 'move', kind, id, ox: w.x - item.x, oy: w.y - item.y }
      return
    }
    const cableEl = t.closest<SVGElement>('[data-cable]')
    if (cableEl) {
      select({ kind: 'cable', id: cableEl.dataset.cable! })
      return
    }
    select(null)
    drag.current = { t: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    if (d.t === 'pan') setView({ ...view, x: d.vx + e.clientX - d.sx, y: d.vy + e.clientY - d.sy })
    else {
      const w = toWorld(e.clientX, e.clientY)
      if (d.t === 'link') setGhost(w)
      else {
        const patch = { x: Math.round(w.x - d.ox), y: Math.round(w.y - d.oy) }
        if (d.kind === 'device') updateDevice(d.id, patch)
        else updateNote(d.id, patch)
      }
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (d?.t === 'link') {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-port]')
      if (el) addCable(d.from, { deviceId: el.dataset.device!, port: Number(el.dataset.port) })
      setGhost(null)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/x-device') as DeviceType
    const w = toWorld(e.clientX, e.clientY)
    if (type === ('note' as string)) useStore.getState().addNote(Math.round(w.x), Math.round(w.y))
    else if (type) addDevice(type, Math.round(w.x - 75), Math.round(w.y - 30))
  }

  const dev = (id: string) => project.devices.find((d) => d.id === id)
  const linking = drag.current?.t === 'link' ? drag.current.from : null
  const linkFrom = linking && dev(linking.deviceId)

  return (
    <div
      ref={ref}
      id="canvas"
      className="relative h-full flex-1 overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
      style={{
        backgroundImage: 'radial-gradient(#23365f 1.2px, transparent 1.2px)',
        backgroundSize: `${28 * view.k}px ${28 * view.k}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div id="world" className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
        <svg className="absolute left-0 top-0 overflow-visible pointer-events-none" width={1} height={1}>
          {project.cables.map((c) => {
            const a = dev(c.from.deviceId)
            const b = dev(c.to.deviceId)
            if (!a || !b) return null
            const pa = portPos(a, c.from.port)
            const pb = portPos(b, c.to.port)
            const d = cablePath(pa, pb)
            const on = sel?.kind === 'cable' && sel.id === c.id
            return (
              <g key={c.id} data-cable={c.id} className="cursor-pointer">
                <path d={d} fill="none" stroke="transparent" strokeWidth={16} pointerEvents="stroke" />
                {on && <path d={d} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={c.width + 6} strokeLinecap="round" />}
                <path d={d} fill="none" stroke={c.color} strokeWidth={c.width} strokeDasharray={c.dash} strokeLinecap="round" />
                {c.label && (
                  <text x={(pa.x + pb.x) / 2} y={(pa.y + pb.y) / 2 + 16} textAnchor="middle" fontSize={12} fill="#cfe0ff" stroke="#0a1020" strokeWidth={4} paintOrder="stroke">
                    {c.label}
                  </text>
                )}
              </g>
            )
          })}
          {linkFrom && ghost && (
            <path d={cablePath(portPos(linkFrom, linking.port), ghost)} fill="none" stroke="#7dd3fc" strokeWidth={2.5} strokeDasharray="6 5" />
          )}
        </svg>

        {project.devices.map((d) => {
          const { w, h } = deviceSize(d.ports)
          const on = sel?.kind === 'device' && sel.id === d.id
          return (
            <div
              key={d.id}
              data-node="device"
              data-id={d.id}
              className="absolute rounded-xl border bg-panel shadow-lg shadow-black/40"
              style={{ left: d.x, top: d.y, width: w, height: h, borderColor: on ? '#fff' : d.color, boxShadow: on ? `0 0 0 2px ${d.color}` : undefined }}
            >
              <div className="flex items-center gap-2 px-3 pt-2.5" style={{ color: d.color }}>
                <DeviceIcon type={d.type} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-100">{d.name}</div>
                  <div className="text-[10px] text-slate-400">{d.ports} {d.ports === 1 ? 'porta' : 'portas'}</div>
                </div>
              </div>
              {Array.from({ length: d.ports }, (_, i) => {
                const o = portOffset(d.ports, i + 1)
                const used = portUsed(project, { deviceId: d.id, port: i + 1 })
                return (
                  <div
                    key={i}
                    data-port={i + 1}
                    data-device={d.id}
                    title={`Porta ${i + 1}`}
                    className="absolute flex cursor-crosshair items-center justify-center rounded-md border text-[9px] font-medium hover:scale-110 hover:border-sky-300"
                    style={{
                      left: o.x - PORT / 2, top: o.y - PORT / 2, width: PORT, height: PORT,
                      background: used ? d.color : '#0a1020',
                      borderColor: used ? d.color : '#2b4373',
                      color: used ? '#0a1020' : '#7f9bd0',
                    }}
                  >
                    {i + 1}
                  </div>
                )
              })}
            </div>
          )
        })}

        {project.notes.map((n) => {
          const on = sel?.kind === 'note' && sel.id === n.id
          return (
            <div
              key={n.id}
              data-node="note"
              data-id={n.id}
              className="absolute cursor-move whitespace-pre rounded px-1.5 py-0.5"
              style={{ left: n.x, top: n.y, fontSize: n.size, color: n.color, outline: on ? '1.5px dashed #60a5fa' : 'none', outlineOffset: 3 }}
            >
              {n.text || ' '}
            </div>
          )
        })}
      </div>

      {!project.devices.length && !project.notes.length && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-slate-500">
          <div>
            <div className="text-lg font-medium text-slate-400">Diagrama vazio</div>
            <div className="mt-1 text-sm">Clique (ou arraste) um equipamento da barra à esquerda.<br />Depois arraste de uma porta até outra para puxar o cabo.</div>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg border border-line bg-panel/90 px-1 py-1 text-xs text-slate-300" onPointerDown={(e) => e.stopPropagation()}>
        <button className="rounded px-2 py-1 hover:bg-panel2" onClick={() => setView((v) => ({ ...v, k: Math.max(0.2, v.k / 1.2) }))}>−</button>
        <span className="w-10 text-center">{Math.round(view.k * 100)}%</span>
        <button className="rounded px-2 py-1 hover:bg-panel2" onClick={() => setView((v) => ({ ...v, k: Math.min(2.5, v.k * 1.2) }))}>+</button>
        <button className="rounded px-2 py-1 hover:bg-panel2" onClick={fit}>Ajustar</button>
      </div>
    </div>
  )
}
