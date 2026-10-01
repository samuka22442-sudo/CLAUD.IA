import type { ReactNode } from 'react'
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router'
import { AppShell } from './components/layout/AppShell.tsx'
import { PwaManager } from './components/layout/PwaManager.tsx'
import { RequireAuth } from './components/layout/RequireAuth.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { Goals } from './pages/Goals.tsx'
import { Habits } from './pages/Habits.tsx'
import { Login } from './pages/Login.tsx'
import { NotFound } from './pages/NotFound.tsx'
import { Profile } from './pages/Profile.tsx'
import { Progress } from './pages/Progress.tsx'
import { Routines } from './pages/Routines.tsx'
import { DEMO_BUILD } from './lib/env.ts'

/** Na versão estática a navegação fica em memória: funciona em qualquer endereço, sem reescrita de URL. */
function Router({ children }: { children: ReactNode }) {
  return DEMO_BUILD ? <MemoryRouter>{children}</MemoryRouter> : <BrowserRouter>{children}</BrowserRouter>
}

export default function App() {
  return (
    <Router>
      {!DEMO_BUILD && <PwaManager />}
      <Routes>
        <Route path="/entrar" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="habitos" element={<Habits />} />
            <Route path="metas" element={<Goals />} />
            <Route path="rotinas" element={<Routines />} />
            <Route path="progresso" element={<Progress />} />
            <Route path="perfil" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  )
}
