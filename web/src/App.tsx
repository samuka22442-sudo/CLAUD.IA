import { BrowserRouter, Route, Routes } from 'react-router'
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

export default function App() {
  return (
    <BrowserRouter>
      <PwaManager />
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
    </BrowserRouter>
  )
}
