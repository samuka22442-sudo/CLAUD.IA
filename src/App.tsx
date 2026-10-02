import Canvas from './components/Canvas'
import Inspector from './components/Inspector'
import ProjectBar from './components/ProjectBar'
import Toolbar from './components/Toolbar'

export default function App() {
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
