import { DEVICE_TYPES, DeviceIcon } from '../devices'
import type { DeviceType } from '../types'

export default function Toolbar() {
  const addAtCenter = (type: DeviceType | 'note') =>
    window.dispatchEvent(new CustomEvent('netdiagram:add', { detail: type }))

  const item = (key: string, label: string, icon: React.ReactNode, type: DeviceType | 'note') => (
    <button
      key={key}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('application/x-device', type)}
      onClick={() => addAtCenter(type)}
      className="flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left text-sm text-slate-200 hover:border-line hover:bg-panel2"
    >
      <span className="text-sky-400">{icon}</span>
      {label}
    </button>
  )

  return (
    <aside className="w-44 shrink-0 space-y-1 overflow-y-auto border-r border-line bg-panel p-2">
      <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Equipamentos</div>
      {(Object.keys(DEVICE_TYPES) as DeviceType[]).map((t) => item(t, DEVICE_TYPES[t].label, <DeviceIcon type={t} size={20} />, t))}
      <div className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Anotação</div>
      {item('note', 'Texto', <span className="inline-block w-5 text-center text-lg font-bold leading-none">T</span>, 'note')}
    </aside>
  )
}
