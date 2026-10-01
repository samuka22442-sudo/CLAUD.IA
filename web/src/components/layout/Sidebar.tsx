import { Download, Share } from 'lucide-react'
import { NavLink } from 'react-router'
import { useInstallPrompt } from '../../hooks/useInstallPrompt.ts'
import { cn } from '../../lib/cn.ts'
import { useAuth } from '../../store/auth.ts'
import { Avatar } from '../ui/Avatar.tsx'
import { Button } from '../ui/Button.tsx'
import { Logo } from '../ui/Logo.tsx'
import { NAV_ITEMS } from './nav.ts'
import { SyncChip } from './SyncChip.tsx'

/** Menu lateral fixo (telas grandes). */
export function Sidebar() {
  const user = useAuth((s) => s.user)
  const { canInstall, needsIOSHint, install } = useInstallPrompt()

  return (
    <aside className="glass sticky top-0 hidden h-dvh w-72 shrink-0 flex-col rounded-none border-y-0 border-l-0 px-4 py-6 lg:flex">
      <div className="px-2">
        <Logo />
      </div>

      <nav aria-label="Principal" className="mt-9 flex flex-col gap-1.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex h-12 items-center gap-3.5 rounded-2xl px-4 text-[0.95rem] font-semibold transition',
                isActive
                  ? 'gradient-brand text-white shadow-glow'
                  : 'text-muted hover:bg-white/[0.06] hover:text-fg',
              )
            }
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        {canInstall && (
          <div className="rounded-2xl border border-brand-400/30 bg-brand-500/10 p-4">
            <p className="text-sm font-bold">Instale o app</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">Abra direto da tela inicial, até sem internet.</p>
            <Button size="sm" className="mt-3" fullWidth icon={<Download className="size-4" />} onClick={install}>
              Instalar
            </Button>
          </div>
        )}
        {needsIOSHint && (
          <p className="flex items-start gap-2 rounded-2xl border border-line bg-white/[0.03] p-3 text-xs leading-relaxed text-muted">
            <Share className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden />
            No iPhone: toque em Compartilhar e depois em “Adicionar à Tela de Início”.
          </p>
        )}

        <div className="px-1">
          <SyncChip />
        </div>

        <NavLink
          to="/perfil"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-2xl border p-3 transition',
              isActive ? 'border-brand-400/50 bg-brand-500/10' : 'border-line bg-white/[0.03] hover:border-line-strong',
            )
          }
        >
          <Avatar name={user?.name ?? '?'} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{user?.name}</span>
            <span className="block truncate text-xs text-subtle">{user?.email || 'Modo demonstração'}</span>
          </span>
        </NavLink>
      </div>
    </aside>
  )
}
