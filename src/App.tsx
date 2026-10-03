import { useEffect } from 'react'
import Canvas from './components/Canvas'
import Inspector from './components/Inspector'
import Login from './components/Login'
import ProjectBar from './components/ProjectBar'
import Toolbar from './components/Toolbar'
import { useStore } from './store'

export default function App() {
  const phase = useStore((s) => s.phase)
  useEffect(() => void useStore.getState().boot(), [])

  if (phase === 'checking') return <div className="flex h-full items-center justify-center text-sm text-slate-500">Carregando…</div>
  if (phase === 'login') return <Login />

  return (
    <div className="flex h-full flex-col">
      <ProjectBar />
      <div className="flex min-h-0 flex-1">
        <Toolbar />
        <Canvas />
        <Inspector />
      </div>
    </div>
  )
}
