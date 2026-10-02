import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CABLE_KINDS, DEVICE_TYPES } from './devices'
import type { Cable, CableKind, Device, DeviceType, Note, PortRef, Project, Selection } from './types'

export const uid = () => Math.random().toString(36).slice(2, 10)

const blank = (name: string): Project => ({ id: uid(), name, devices: [], cables: [], notes: [], updatedAt: Date.now() })

const samePort = (a: PortRef, b: PortRef) => a.deviceId === b.deviceId && a.port === b.port
export const portUsed = (p: Project, ref: PortRef) => p.cables.some((c) => samePort(c.from, ref) || samePort(c.to, ref))

interface State {
  projects: Project[]
  activeId: string
  selection: Selection
  past: Project[]

  select: (s: Selection) => void
  checkpoint: () => void
  undo: () => void

  newProject: () => void
  switchProject: (id: string) => void
  renameProject: (name: string) => void
  duplicateProject: () => void
  deleteProject: () => void
  importProject: (raw: unknown) => boolean

  addDevice: (type: DeviceType, x: number, y: number) => void
  updateDevice: (id: string, patch: Partial<Device>) => void
  addCable: (from: PortRef, to: PortRef) => void
  updateCable: (id: string, patch: Partial<Cable>) => void
  addNote: (x: number, y: number) => void
  updateNote: (id: string, patch: Partial<Note>) => void
  removeSelected: () => void
}

const first = blank('Meu diagrama')

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const mutate = (fn: (p: Project) => Project, record = true) =>
        set((s) => {
          const cur = s.projects.find((p) => p.id === s.activeId)!
          const next = { ...fn(cur), updatedAt: Date.now() }
          return {
            projects: s.projects.map((p) => (p.id === cur.id ? next : p)),
            past: record ? [...s.past.slice(-49), cur] : s.past,
          }
        })

      const add = (p: Project) => set((s) => ({ projects: [...s.projects, p], activeId: p.id, selection: null, past: [] }))

      return {
        projects: [first],
        activeId: first.id,
        selection: null,
        past: [],

        select: (selection) => set({ selection }),
        checkpoint: () =>
          set((s) => ({ past: [...s.past.slice(-49), s.projects.find((p) => p.id === s.activeId)!] })),
        undo: () =>
          set((s) => {
            const prev = s.past[s.past.length - 1]
            if (!prev) return s
            return {
              projects: s.projects.map((p) => (p.id === prev.id ? prev : p)),
              past: s.past.slice(0, -1),
              selection: null,
            }
          }),

        newProject: () => add(blank(`Projeto ${get().projects.length + 1}`)),
        switchProject: (id) => set({ activeId: id, selection: null, past: [] }),
        renameProject: (name) => mutate((p) => ({ ...p, name }), false),
        duplicateProject: () => {
          const cur = get().projects.find((p) => p.id === get().activeId)!
          add({ ...structuredClone(cur), id: uid(), name: `${cur.name} (cópia)`, updatedAt: Date.now() })
        },
        deleteProject: () =>
          set((s) => {
            const rest = s.projects.filter((p) => p.id !== s.activeId)
            const projects = rest.length ? rest : [blank('Meu diagrama')]
            return { projects, activeId: projects[0].id, selection: null, past: [] }
          }),
        importProject: (raw) => {
          const r = raw as Partial<Project> | null
          if (!r || typeof r.name !== 'string' || !Array.isArray(r.devices) || !Array.isArray(r.cables)) return false
          add({ ...(r as Project), id: uid(), notes: Array.isArray(r.notes) ? r.notes : [], updatedAt: Date.now() })
          return true
        },

        addDevice: (type, x, y) => {
          const def = DEVICE_TYPES[type]
          const d: Device = { id: uid(), type, name: def.label, ports: def.ports, x, y, color: '#3b82f6' }
          mutate((p) => ({ ...p, devices: [...p.devices, d] }))
          set({ selection: { kind: 'device', id: d.id } })
        },
        updateDevice: (id, patch) =>
          mutate((p) => {
            const next = { ...patch }
            if (next.ports !== undefined) {
              const used = p.cables.flatMap((c) => [c.from, c.to]).filter((r) => r.deviceId === id).map((r) => r.port)
              next.ports = Math.min(48, Math.max(1, Math.round(next.ports) || 1, ...used))
            }
            return { ...p, devices: p.devices.map((d) => (d.id === id ? { ...d, ...next } : d)) }
          }, !('x' in patch || 'y' in patch)),
        addCable: (from, to) => {
          const p = get().projects.find((x) => x.id === get().activeId)!
          if (from.deviceId === to.deviceId || portUsed(p, from) || portUsed(p, to)) return
          const k = CABLE_KINDS.ethernet
          const c: Cable = { id: uid(), from, to, kind: 'ethernet', color: k.color, dash: k.dash, width: 2.5, label: '' }
          mutate((q) => ({ ...q, cables: [...q.cables, c] }))
          set({ selection: { kind: 'cable', id: c.id } })
        },
        updateCable: (id, patch) =>
          mutate((p) => ({ ...p, cables: p.cables.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
        addNote: (x, y) => {
          const n: Note = { id: uid(), text: 'Texto', x, y, size: 16, color: '#dbe7ff' }
          mutate((p) => ({ ...p, notes: [...p.notes, n] }))
          set({ selection: { kind: 'note', id: n.id } })
        },
        updateNote: (id, patch) =>
          mutate((p) => ({ ...p, notes: p.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }), !('x' in patch || 'y' in patch)),
        removeSelected: () => {
          const sel = get().selection
          if (!sel) return
          mutate((p) => {
            if (sel.kind === 'device')
              return {
                ...p,
                devices: p.devices.filter((d) => d.id !== sel.id),
                cables: p.cables.filter((c) => c.from.deviceId !== sel.id && c.to.deviceId !== sel.id),
              }
            if (sel.kind === 'cable') return { ...p, cables: p.cables.filter((c) => c.id !== sel.id) }
            return { ...p, notes: p.notes.filter((n) => n.id !== sel.id) }
          })
          set({ selection: null })
        },
      }
    },
    {
      name: 'netdiagram.v1',
      partialize: (s) => ({ projects: s.projects, activeId: s.activeId }),
    },
  ),
)

export const useActive = () => useStore((s) => s.projects.find((p) => p.id === s.activeId) ?? s.projects[0])
export type { CableKind }
