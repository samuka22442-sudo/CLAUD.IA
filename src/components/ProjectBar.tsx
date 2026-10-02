import { useRef } from 'react'
import { toPng } from 'html-to-image'
import { useActive, useStore } from '../store'

const btn = 'rounded-md border border-line bg-panel2 px-2.5 py-1.5 text-xs text-slate-200 hover:border-accent hover:text-white disabled:opacity-40'

function download(href: string, name: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = name
  a.click()
}

export default function ProjectBar() {
  const p = useActive()
  const projects = useStore((s) => s.projects)
  const canUndo = useStore((s) => s.past.length > 0)
  const st = useStore.getState()
  const file = useRef<HTMLInputElement>(null)
  const safe = p.name.replace(/[^\w\-]+/g, '_') || 'diagrama'

  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' }))
    download(url, `${safe}.json`)
    URL.revokeObjectURL(url)
  }

  const importJson = async (f: File) => {
    try {
      if (!st.importProject(JSON.parse(await f.text()))) throw new Error()
    } catch {
      alert('Arquivo inválido.')
    }
  }

  const exportPng = async () => {
    const world = document.getElementById('world')!
    const els = [...world.querySelectorAll<HTMLElement>('[data-node]')]
    if (!els.length) return
    const pad = 80
    const x0 = Math.min(...els.map((e) => e.offsetLeft)) - pad
    const y0 = Math.min(...els.map((e) => e.offsetTop)) - pad
    const x1 = Math.max(...els.map((e) => e.offsetLeft + e.offsetWidth)) + pad
    const y1 = Math.max(...els.map((e) => e.offsetTop + e.offsetHeight)) + pad + 60
    const url = await toPng(world, {
      width: x1 - x0,
      height: y1 - y0,
      backgroundColor: '#0a1020',
      pixelRatio: 2,
      style: { transform: `translate(${-x0}px, ${-y0}px) scale(1)` },
    })
    download(url, `${safe}.png`)
  }

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-line bg-panel px-3 py-2">
      <div className="mr-2 flex items-center gap-2 font-bold text-sky-400">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="19" r="2.5" /><circle cx="19" cy="19" r="2.5" /><path d="M12 7.5v4M12 11.5 6 17M12 11.5l6 5.5" />
        </svg>
        NetDiagram
      </div>
      <select className="rounded-md border border-line bg-bg px-2 py-1.5 text-sm" value={p.id} onChange={(e) => st.switchProject(e.target.value)}>
        {projects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
      </select>
      <input
        className="w-56 rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm font-medium"
        value={p.name}
        placeholder="Nome do projeto"
        onChange={(e) => st.renameProject(e.target.value)}
      />
      <button className={btn} onClick={() => st.newProject()}>+ Novo</button>
      <button className={btn} onClick={() => st.duplicateProject()}>Duplicar</button>
      <button className={btn} onClick={() => confirm(`Excluir "${p.name}"?`) && st.deleteProject()}>Excluir</button>
      <div className="mx-1 h-5 w-px bg-line" />
      <button className={btn} disabled={!canUndo} onClick={() => st.undo()}>↶ Desfazer</button>
      <div className="ml-auto flex gap-2">
        <button className={btn} onClick={() => file.current?.click()}>Importar JSON</button>
        <button className={btn} onClick={exportJson}>Exportar JSON</button>
        <button className={btn + ' !border-accent !bg-accent/20'} onClick={exportPng}>Exportar PNG</button>
        <input ref={file} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = '' }} />
      </div>
    </header>
  )
}
