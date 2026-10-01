import { NavLink } from 'react-router'
import { cn } from '../../lib/cn.ts'
import { NAV_ITEMS } from './nav.ts'

/** Barra de abas inferior (celular e tablet). Respeita a área segura do iPhone. */
export function BottomNav() {
  return (
    <nav
      aria-label="Principal"
      className="glass fixed inset-x-0 bottom-0 z-40 rounded-b-none rounded-t-3xl border-b-0 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5 px-2 pt-1.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} className="group flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5">
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'grid h-8 w-12 place-items-center rounded-full transition',
                      isActive ? 'gradient-brand text-white shadow-[0_0_20px_-4px_rgb(139_61_255/0.9)]' : 'text-subtle group-active:scale-90',
                    )}
                  >
                    <Icon className="size-[1.3rem]" aria-hidden />
                  </span>
                  <span className={cn('text-[0.68rem] font-semibold leading-none', isActive ? 'text-brand-100' : 'text-subtle')}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
