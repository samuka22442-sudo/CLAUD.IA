import {
  Brain,
  CircleCheckBig,
  Download,
  Droplets,
  Dumbbell,
  Eye,
  EyeOff,
  Flame,
  ListChecks,
  Lock,
  Mail,
  Share,
  Sparkles,
  Target,
  TriangleAlert,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router'
import { Splash } from '../components/layout/RequireAuth.tsx'
import { Button } from '../components/ui/Button.tsx'
import { CheckToggle } from '../components/ui/CheckToggle.tsx'
import { Field, Input } from '../components/ui/Field.tsx'
import { Logo } from '../components/ui/Logo.tsx'
import { ProgressBar } from '../components/ui/ProgressBar.tsx'
import { ProgressRing } from '../components/ui/ProgressRing.tsx'
import { useInstallPrompt } from '../hooks/useInstallPrompt.ts'
import { cn } from '../lib/cn.ts'
import { colorStyle } from '../lib/colors.ts'
import { errorMessage } from '../sync/api.ts'
import { useAuth } from '../store/auth.ts'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Tab = 'login' | 'register'

interface FormErrors {
  name?: string
  email?: string
  password?: string
}

export function Login() {
  const status = useAuth((s) => s.status)
  const allowSignup = useAuth((s) => s.allowSignup)
  const sessionExpired = useAuth((s) => s.sessionExpired)
  const { login, register, enterDemo } = useAuth.getState()
  const [params] = useSearchParams()
  const location = useLocation()
  const { canInstall, needsIOSHint, install } = useInstallPrompt()

  const [tab, setTab] = useState<Tab>(params.get('aba') === 'cadastro' ? 'register' : 'login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  if (status === 'loading') return <Splash />
  if (status === 'authenticated') return <Navigate to={from} replace />

  const isRegister = allowSignup && tab === 'register'

  function validate(): FormErrors {
    const found: FormErrors = {}
    if (isRegister && !name.trim()) found.name = 'Informe seu nome'
    if (!EMAIL_RE.test(email.trim())) found.email = 'Informe um e-mail válido'
    if (isRegister ? password.length < 8 : password.length === 0) {
      found.password = isRegister ? 'Use ao menos 8 caracteres' : 'Informe sua senha'
    }
    return found
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    setServerError(null)
    if (Object.keys(found).length > 0) return

    setBusy(true)
    try {
      if (isRegister) await register({ name: name.trim(), email: email.trim(), password })
      else await login({ email: email.trim(), password, remember })
      // Ao autenticar, `status` muda e o <Navigate> acima leva para a página pedida.
    } catch (error) {
      setServerError(errorMessage(error))
      setBusy(false)
    }
  }

  const switchTab = (next: Tab) => {
    setTab(next)
    setErrors({})
    setServerError(null)
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
      <BrandPanel />

      <main className="flex min-h-dvh items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-md animate-fade-up">
          {/* Marca compacta (celular/tablet) */}
          <div className="mb-8 text-center lg:hidden">
            <Logo className="justify-center" />
            <h1 className="mt-6 text-[1.75rem] leading-tight font-extrabold tracking-tight">
              Construa seu <span className="text-gradient">ritmo</span>.
            </h1>
            <p className="mt-2 text-sm text-muted">Hábitos, metas e rotinas num só lugar.</p>
          </div>

          <div className="glass rounded-[2rem] p-6 sm:p-8">
            {allowSignup ? (
              <div role="tablist" aria-label="Acesso" className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-ink-800/70 p-1">
                {(['login', 'register'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    onClick={() => switchTab(value)}
                    className={cn(
                      'h-11 rounded-xl text-sm font-bold transition',
                      tab === value ? 'gradient-brand text-white shadow-glow' : 'text-muted hover:text-fg',
                    )}
                  >
                    {value === 'login' ? 'Entrar' : 'Criar conta'}
                  </button>
                ))}
              </div>
            ) : (
              <h2 className="mb-6 text-xl font-bold">Entrar</h2>
            )}

            {sessionExpired && !serverError && (
              <Notice tone="info">Sua sessão expirou. Entre novamente para continuar.</Notice>
            )}
            {serverError && <Notice tone="error">{serverError}</Notice>}

            <form onSubmit={onSubmit} noValidate className="space-y-4">
              {isRegister && (
                <Field label="Nome" error={errors.name}>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-subtle" aria-hidden />
                    <Input
                      className="pl-12"
                      name="name"
                      autoComplete="name"
                      placeholder="Como quer ser chamado(a)?"
                      value={name}
                      invalid={!!errors.name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </Field>
              )}

              <Field label="E-mail" error={errors.email}>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-subtle" aria-hidden />
                  <Input
                    className="pl-12"
                    type="email"
                    name="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    placeholder="voce@exemplo.com"
                    value={email}
                    invalid={!!errors.email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </Field>

              <Field label="Senha" error={errors.password} hint={isRegister && !errors.password ? 'Mínimo de 8 caracteres.' : undefined}>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-subtle" aria-hidden />
                  <Input
                    className="px-12"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    placeholder="••••••••"
                    value={password}
                    invalid={!!errors.password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute top-1/2 right-1.5 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-subtle transition hover:text-fg"
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </Field>

              {!isRegister && (
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-muted select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="size-5 shrink-0 cursor-pointer accent-brand-500"
                  />
                  Manter conectado neste aparelho
                </label>
              )}

              <Button type="submit" size="lg" fullWidth loading={busy} className="mt-2">
                {isRegister ? 'Criar minha conta' : 'Entrar'}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs font-semibold tracking-wider text-subtle uppercase" aria-hidden>
              <span className="h-px flex-1 bg-line" />
              ou
              <span className="h-px flex-1 bg-line" />
            </div>

            <Button variant="secondary" size="lg" fullWidth icon={<Sparkles className="size-5 text-brand-300" />} onClick={enterDemo}>
              Explorar demonstração
            </Button>
            <p className="mt-2.5 text-center text-xs text-subtle">Sem criar conta: os dados ficam só neste aparelho.</p>

            {canInstall && (
              <Button variant="ghost" fullWidth className="mt-3" icon={<Download className="size-4" />} onClick={install}>
                Instalar o app
              </Button>
            )}
            {needsIOSHint && (
              <p className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-white/[0.03] p-3 text-xs leading-relaxed text-muted">
                <Share className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden />
                No iPhone: toque em Compartilhar e depois em “Adicionar à Tela de Início” para instalar.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function Notice({ tone, children }: { tone: 'error' | 'info'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'mb-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-medium',
        tone === 'error' ? 'border-red-400/40 bg-red-500/10 text-red-200' : 'border-brand-400/40 bg-brand-500/10 text-brand-100',
      )}
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ Painel de marca (telas grandes) */

const FEATURES = [
  { icon: CircleCheckBig, title: 'Hábitos', text: 'Sequências e estatísticas para manter a constância.' },
  { icon: Target, title: 'Metas', text: 'Números ou etapas, com prazo e progresso visível.' },
  { icon: ListChecks, title: 'Rotinas', text: 'Passo a passo guiado, com cronômetro de foco.' },
]

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden border-r border-line lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-9 xl:px-20">
      <div className="pointer-events-none absolute -top-32 -left-24 size-[28rem] rounded-full bg-brand-500/35 blur-[120px]" aria-hidden />
      <div className="pointer-events-none absolute right-[-6rem] bottom-[-4rem] size-[26rem] rounded-full bg-magenta-500/25 blur-[120px]" aria-hidden />

      <Logo className="relative" />

      <div className="relative my-auto py-6">
        <h1 className="max-w-xl text-5xl leading-[1.08] font-extrabold tracking-tight xl:text-[3.4rem]">
          Construa seu <span className="text-gradient">ritmo</span>, um dia de cada vez.
        </h1>
        <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">
          Hábitos, metas e rotinas em um só lugar. No celular ou no computador, tudo sincronizado.
        </p>

        <PreviewCluster />
      </div>

      {/* Só aparece quando a tela é alta o bastante; em notebooks baixos (ex.: 1280×800) o painel fica só com título e prévia. */}
      <ul className="relative hidden grid-cols-3 gap-5 [@media(min-height:880px)]:grid">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex flex-col gap-2.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-300">
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-bold">{title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )
}

const PREVIEW_HABITS = [
  { icon: Droplets, title: 'Beber 2 L de água', color: 'cyan', done: true },
  { icon: Brain, title: 'Meditar 10 minutos', color: 'violet', done: true },
  { icon: Dumbbell, title: 'Treinar', color: 'pink', done: false },
] as const

/** Miniatura do app (decorativa), montada com os mesmos componentes das telas reais. */
function PreviewCluster() {
  return (
    <div className="relative mt-9 h-[19.5rem] max-w-xl select-none [@media(max-height:719px)]:hidden" aria-hidden>
      <div className="glass absolute top-0 left-0 w-[21rem] -rotate-2 rounded-[2rem] p-5 shadow-2xl">
        <div className="flex items-center gap-4">
          <ProgressRing value={2 / 3} size={72} stroke={8}>
            <span className="text-lg font-extrabold">67%</span>
          </ProgressRing>
          <div>
            <p className="text-sm font-semibold text-muted">Hoje</p>
            <p className="text-xl font-extrabold">2 de 3 hábitos</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2.5">
          {PREVIEW_HABITS.map(({ icon: Icon, title, color, done }) => (
            <li key={title} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-2" style={colorStyle(color)}>
              <span className="tint grid size-9 place-items-center rounded-xl">
                <Icon className="size-[1.1rem]" />
              </span>
              <span className={cn('flex-1 text-sm font-semibold', done && 'text-muted line-through decoration-white/30')}>{title}</span>
              <CheckToggle checked={done} onChange={() => undefined} color={color} label={title} disabled size="md" />
            </li>
          ))}
        </ul>
      </div>

      <div className="glass absolute top-2 right-2 flex rotate-3 items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl">
        <span className="grid size-10 place-items-center rounded-xl bg-orange-400/15 text-orange-300">
          <Flame className="size-5" />
        </span>
        <div>
          <p className="text-xl leading-none font-extrabold">23 dias</p>
          <p className="mt-1 text-xs text-muted">de sequência</p>
        </div>
      </div>

      <div className="glass absolute right-0 bottom-2 w-60 rotate-[1.5deg] rounded-2xl p-4 shadow-2xl" style={colorStyle('violet')}>
        <div className="flex items-center justify-between text-sm font-bold">
          <span>Ler 12 livros</span>
          <span className="text-brand-300">8/12</span>
        </div>
        <ProgressBar value={8 / 12} tone="entity" className="mt-3" />
        <p className="mt-2 text-xs text-muted">Faltam 4 livros · em 95 dias</p>
      </div>
    </div>
  )
}
