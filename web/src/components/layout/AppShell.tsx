import { Outlet, useLocation } from 'react-router'
import { Toaster } from '../ui/Toaster.tsx'
import { BottomNav } from './BottomNav.tsx'
import { QuickAdd } from './QuickAdd.tsx'
import { Sidebar } from './Sidebar.tsx'
import { Topbar } from './Topbar.tsx'

/** Estrutura das telas autenticadas: sidebar (≥ lg) ou topbar + barra inferior (< lg). */
export function AppShell() {
  const location = useLocation()
  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-32 sm:px-6 lg:px-10 lg:pt-10 lg:pb-14">
          {/* key = rota: a página nova entra com uma animação suave */}
          <div key={location.pathname} className="animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
      <QuickAdd />
      <BottomNav />
      <Toaster />
    </div>
  )
}
