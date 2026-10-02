import { CABLE_KINDS, DASHES, DEVICE_TYPES, PALETTE } from '../devices'
import { useActive, useStore } from '../store'
import type { CableKind } from '../types'

const input = 'w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm text-slate-100'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function Colors({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PALETTE.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className="h-6 w-6 rounded-full border-2"
          style={{ background: c, borderColor: value === c ? '#fff' : 'transparent' }}
        />
      ))}
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-6 w-8 cursor-pointer rounded border border-line bg-transparent" />
    </div>
  )
}

export default function Inspector() {
  const p = useActive()
  const sel = useStore((s) => s.selection)
  const st = useStore.getState()
  const del = (
    <button onClick={() => st.removeSelected()} className="w-full rounded-md border border-red-500/40 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10">
      Excluir (Del)
    </button>
  )

  let body: React.ReactNode = (
    <p className="text-sm leading-relaxed text-slate-400">
      Selecione um equipamento, cabo ou texto para editar.
      <br /><br />
      <b className="text-slate-300">Dicas</b><br />
      • Arraste de uma porta a outra para puxar um cabo.<br />
      • Roda do mouse: zoom. Arraste o fundo: mover.<br />
      • Ctrl+Z desfaz, Del exclui.
    </p>
  )

  const d = sel?.kind === 'device' ? p.devices.find((x) => x.id === sel.id) : null
  const c = sel?.kind === 'cable' ? p.cables.find((x) => x.id === sel.id) : null
  const n = sel?.kind === 'note' ? p.notes.find((x) => x.id === sel.id) : null

  if (d)
    body = (
      <div className="space-y-4">
        <Field label="Nome"><input className={input} value={d.name} onChange={(e) => st.updateDevice(d.id, { name: e.target.value })} /></Field>
        <Field label="Tipo">
          <select className={input} value={d.type} onChange={(e) => st.updateDevice(d.id, { type: e.target.value as typeof d.type })}>
            {Object.entries(DEVICE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="Quantidade de portas">
          <input type="number" min={1} max={48} className={input} value={d.ports} onChange={(e) => st.updateDevice(d.id, { ports: Number(e.target.value) })} />
        </Field>
        <Field label="Cor"><Colors value={d.color} onChange={(color) => st.updateDevice(d.id, { color })} /></Field>
        {del}
      </div>
    )
  else if (c)
    body = (
      <div className="space-y-4">
        <Field label="Tipo de cabo">
          <select
            className={input}
            value={c.kind}
            onChange={(e) => {
              const k = e.target.value as CableKind
              st.updateCable(c.id, { kind: k, color: CABLE_KINDS[k].color, dash: CABLE_KINDS[k].dash })
            }}
          >
            {Object.entries(CABLE_KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="Texto no cabo"><input className={input} placeholder="ex: VLAN 10 · 1Gbps" value={c.label} onChange={(e) => st.updateCable(c.id, { label: e.target.value })} /></Field>
        <Field label="Estilo">
          <select className={input} value={c.dash} onChange={(e) => st.updateCable(c.id, { dash: e.target.value })}>
            {DASHES.map((x) => <option key={x.label} value={x.value}>{x.label}</option>)}
          </select>
        </Field>
        <Field label={`Espessura (${c.width})`}>
          <input type="range" min={1} max={8} step={0.5} className="w-full" value={c.width} onChange={(e) => st.updateCable(c.id, { width: Number(e.target.value) })} />
        </Field>
        <Field label="Cor"><Colors value={c.color} onChange={(color) => st.updateCable(c.id, { color })} /></Field>
        <p className="text-xs text-slate-500">
          {p.devices.find((x) => x.id === c.from.deviceId)?.name} (porta {c.from.port}) ↔ {p.devices.find((x) => x.id === c.to.deviceId)?.name} (porta {c.to.port})
        </p>
        {del}
      </div>
    )
  else if (n)
    body = (
      <div className="space-y-4">
        <Field label="Texto"><textarea rows={4} className={input} value={n.text} onChange={(e) => st.updateNote(n.id, { text: e.target.value })} /></Field>
        <Field label={`Tamanho (${n.size}px)`}>
          <input type="range" min={10} max={64} className="w-full" value={n.size} onChange={(e) => st.updateNote(n.id, { size: Number(e.target.value) })} />
        </Field>
        <Field label="Cor"><Colors value={n.color} onChange={(color) => st.updateNote(n.id, { color })} /></Field>
        {del}
      </div>
    )

  return (
    <aside className="w-64 shrink-0 overflow-y-auto border-l border-line bg-panel p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-sky-400">
        {d ? 'Equipamento' : c ? 'Cabo' : n ? 'Texto' : 'Propriedades'}
      </div>
      {body}
    </aside>
  )
}
