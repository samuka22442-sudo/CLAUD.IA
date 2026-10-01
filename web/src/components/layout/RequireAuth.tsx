import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../../store/auth.ts'
import { LogoMark } from '../ui/Logo.tsx'

/** Tela de abertura enquanto o app descobre se há sessão. */
export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <LogoMark className="size-16 animate-pulse-glow rounded-2xl" />
    </div>
  )
}

/** Barra quem não está logado e leva para /entrar (voltando à página pedida depois do login). */
export function RequireAuth() {
  const status = useAuth((s) => s.status)
  const location = useLocation()

  if (status === 'loading') return <Splash />
  if (status === 'anonymous') {
    return <Navigate to="/entrar" replace state={{ from: `${location.pathname}${location.search}` }} />
  }
  return <Outlet />
}
