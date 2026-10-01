import { Link } from 'react-router'
import { useAuth } from '../../store/auth.ts'
import { Avatar } from '../ui/Avatar.tsx'
import { Logo } from '../ui/Logo.tsx'
import { SyncChip } from './SyncChip.tsx'

/** Barra superior (celular e tablet): marca, estado de sincronização e atalho para o perfil. */
export function Topbar() {
  const user = useAuth((s) => s.user)
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-ink-950/75 px-4 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2.5 backdrop-blur-xl sm:px-6 lg:hidden">
      <Link to="/" aria-label="Ritmo — início">
        <Logo />
      </Link>
      <div className="flex items-center gap-2.5">
        <SyncChip />
        <Link to="/perfil" aria-label="Meu perfil">
          <Avatar name={user?.name ?? '?'} size="sm" />
        </Link>
      </div>
    </header>
  )
}
