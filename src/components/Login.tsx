import { useState } from 'react'
import { api } from '../api'
import { useStore } from '../store'

const field = 'w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600'

export default function Login() {
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.login(user.trim(), password)
      await useStore.getState().load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-[radial-gradient(ellipse_at_top,#14264a_0%,#0a1020_60%)] px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl border border-line bg-panel/90 p-8 shadow-2xl shadow-black/50">
        <div className="flex items-center gap-3 text-sky-400">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="19" r="2.5" /><circle cx="19" cy="19" r="2.5" /><path d="M12 7.5v4M12 11.5 6 17M12 11.5l6 5.5" />
          </svg>
          <div>
            <div className="text-xl font-bold leading-tight">NetDiagram</div>
            <div className="text-xs text-slate-400">Diagramas de rede</div>
          </div>
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-400">Usuário</span>
          <input id="user" className={field} autoComplete="username" autoFocus value={user} onChange={(e) => setUser(e.target.value)} required />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-400">Senha</span>
          <input id="password" type="password" className={field} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
