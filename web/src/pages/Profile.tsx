import { Download, FlaskConical, LogOut, ShieldCheck, Smartphone, Trash2, TriangleAlert, UserRound, Wifi, WifiOff } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { SyncChip } from '../components/layout/SyncChip.tsx'
import { Avatar } from '../components/ui/Avatar.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { ConfirmDialog } from '../components/ui/ConfirmDialog.tsx'
import { Field, Input } from '../components/ui/Field.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { useInstallPrompt } from '../hooks/useInstallPrompt.ts'
import { useOnline } from '../hooks/useOnline.ts'
import { todayISO } from '../lib/dates.ts'
import { countLabel } from '../lib/format.ts'
import { errorMessage } from '../sync/api.ts'
import { clearAllData } from '../store/actions.ts'
import { useAuth } from '../store/auth.ts'
import { useData } from '../store/data.ts'
import { toast } from '../store/toast.ts'

declare const __APP_VERSION__: string

function downloadJSON(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function SectionCard({ icon: Icon, title, description, children }: { icon: typeof UserRound; title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-300">
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-bold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {children}
    </Card>
  )
}

export function Profile() {
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const mode = useAuth((s) => s.mode)
  const data = useData((s) => s.data)
  const pending = useData((s) => s.queue.length)
  const online = useOnline()
  const { canInstall, needsIOSHint, installed, install } = useInstallPrompt()
  const demo = mode === 'demo'

  const [name, setName] = useState(user?.name ?? '')
  const [savingName, setSavingName] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)
  const [confirm, setConfirm] = useState<'logout' | 'clear' | 'delete' | null>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!user) return null

  const counts = {
    habits: data.habits.length,
    goals: data.goals.length,
    routines: data.routines.length,
  }

  async function saveName(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed === user?.name) return
    setSavingName(true)
    try {
      await useAuth.getState().updateName(trimmed)
      toast.success('Nome atualizado')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSavingName(false)
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault()
    setPasswordError(null)
    if (newPassword.length < 8) {
      setPasswordError('A nova senha precisa ter ao menos 8 caracteres.')
      return
    }
    setSavingPassword(true)
    try {
      await useAuth.getState().changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      toast.success('Senha alterada. Os outros aparelhos foram desconectados.')
    } catch (error) {
      setPasswordError(errorMessage(error))
    } finally {
      setSavingPassword(false)
    }
  }

  function exportData() {
    downloadJSON(`ritmo-dados-${todayISO()}.json`, {
      app: 'ritmo',
      version: 1,
      exportedAt: new Date().toISOString(),
      user: { name: user?.name, email: user?.email },
      data,
    })
    toast.success('Arquivo exportado')
  }

  async function logout() {
    setBusy(true)
    await useAuth.getState().logout()
    navigate('/entrar', { replace: true })
  }

  async function deleteAccount() {
    setBusy(true)
    setDeleteError(null)
    try {
      await useAuth.getState().deleteAccount(deletePassword)
      toast.success('Conta excluída')
      navigate('/entrar', { replace: true })
    } catch (error) {
      setDeleteError(errorMessage(error))
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Perfil" subtitle="Sua conta, seus dados e o aplicativo" />

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {/* Cabeçalho do perfil */}
        <Card className="relative overflow-hidden lg:col-span-2">
          <div className="pointer-events-none absolute -top-20 -right-10 size-56 rounded-full bg-brand-500/25 blur-[80px]" aria-hidden />
          <div className="relative flex flex-wrap items-center gap-4">
            <Avatar name={user.name} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-extrabold">{user.name}</p>
              <p className="truncate text-sm text-muted">{demo ? 'Modo demonstração' : user.email}</p>
              <p className="mt-2 text-xs text-subtle">
                {countLabel(counts.habits, 'hábito', 'hábitos')} · {countLabel(counts.goals, 'meta', 'metas')} · {countLabel(counts.routines, 'rotina', 'rotinas')}
              </p>
            </div>
            <SyncChip />
          </div>
        </Card>

        {demo && (
          <Card className="border-amber-400/30 bg-amber-400/[0.05] lg:col-span-2">
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-300">
                <FlaskConical className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">Você está no modo demonstração</p>
                <p className="mt-0.5 text-sm text-muted">Os dados de exemplo ficam só neste aparelho. Crie uma conta para guardá-los no servidor e acessar de qualquer lugar.</p>
              </div>
              <Button
                onClick={async () => {
                  await useAuth.getState().logout()
                  navigate('/entrar?aba=cadastro', { replace: true })
                }}
              >
                Criar conta
              </Button>
            </div>
          </Card>
        )}

        <SectionCard icon={UserRound} title="Seus dados" description="Como você aparece no app.">
          <form onSubmit={saveName} className="space-y-4">
            <Field label="Nome">
              <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
            {!demo && (
              <Field label="E-mail" hint="O e-mail é o seu login e não pode ser alterado por aqui.">
                <Input value={user.email} readOnly disabled />
              </Field>
            )}
            <Button type="submit" loading={savingName} disabled={!name.trim() || name.trim() === user.name}>
              Salvar nome
            </Button>
          </form>
        </SectionCard>

        {!demo && (
          <SectionCard icon={ShieldCheck} title="Senha" description="Ao trocar, os outros aparelhos são desconectados.">
            <form onSubmit={savePassword} className="space-y-4">
              <Field label="Senha atual">
                <Input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </Field>
              <Field label="Nova senha" hint="Mínimo de 8 caracteres.">
                <Input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </Field>
              {passwordError && (
                <p role="alert" className="text-sm font-medium text-red-300">
                  {passwordError}
                </p>
              )}
              <Button type="submit" loading={savingPassword} disabled={!currentPassword || !newPassword}>
                Alterar senha
              </Button>
            </form>
          </SectionCard>
        )}

        <SectionCard icon={Download} title="Meus dados" description="Leve uma cópia ou comece do zero.">
          <div className="flex flex-col gap-3">
            <Button variant="secondary" icon={<Download className="size-4" />} onClick={exportData}>
              Exportar tudo (JSON)
            </Button>
            <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setConfirm('clear')}>
              Apagar todos os dados
            </Button>
            {!demo && (
              <Button variant="danger" icon={<TriangleAlert className="size-4" />} onClick={() => { setDeletePassword(''); setDeleteError(null); setConfirm('delete') }}>
                Excluir minha conta
              </Button>
            )}
          </div>
        </SectionCard>

        <SectionCard icon={Smartphone} title="Aplicativo" description="Instale para abrir da tela inicial, até sem internet.">
          <div className="space-y-4">
            {installed ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <ShieldCheck className="size-4" aria-hidden /> O Ritmo já está instalado neste aparelho.
              </p>
            ) : canInstall ? (
              <Button icon={<Download className="size-4" />} onClick={install}>
                Instalar o app
              </Button>
            ) : needsIOSHint ? (
              <p className="rounded-xl border border-line bg-white/[0.03] p-3 text-sm leading-relaxed text-muted">
                No iPhone/iPad: toque em <strong className="text-fg">Compartilhar</strong> e depois em <strong className="text-fg">Adicionar à Tela de Início</strong>.
              </p>
            ) : (
              <p className="text-sm text-muted">Use o menu do navegador (⋮) e escolha “Instalar app” ou “Adicionar à tela inicial”.</p>
            )}
            <dl className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-subtle">Conexão</dt>
                <dd className={`flex items-center gap-1.5 font-semibold ${online ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {online ? <Wifi className="size-4" aria-hidden /> : <WifiOff className="size-4" aria-hidden />}
                  {online ? 'Online' : 'Offline'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-subtle">Alterações pendentes</dt>
                <dd className="font-semibold tabular-nums">{demo ? '—' : pending}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-subtle">Versão</dt>
                <dd className="font-semibold tabular-nums">{__APP_VERSION__}</dd>
              </div>
            </dl>
          </div>
        </SectionCard>

        <Card className="lg:col-span-2">
          <Button
            variant="secondary"
            icon={<LogOut className="size-4" />}
            onClick={() => (pending > 0 && !demo ? setConfirm('logout') : void logout())}
            loading={busy && confirm === null}
          >
            {demo ? 'Sair da demonstração' : 'Sair da conta'}
          </Button>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm === 'logout'}
        title="Sair com alterações pendentes?"
        message={
          <p>
            Há {countLabel(pending, 'alteração', 'alterações')} que ainda não chegou ao servidor (sem conexão). Se sair agora, {pending === 1 ? 'ela será perdida' : 'elas serão perdidas'}.
          </p>
        }
        confirmLabel="Sair mesmo assim"
        loading={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => void logout()}
      />

      <ConfirmDialog
        open={confirm === 'clear'}
        title="Apagar todos os dados?"
        message={
          <p>
            Todos os hábitos, metas e rotinas {demo ? 'da demonstração' : 'da sua conta'} serão apagados{!demo && ', em todos os aparelhos'}. Isso não pode ser desfeito. Considere exportar uma cópia antes.
          </p>
        }
        confirmLabel="Apagar tudo"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          clearAllData()
          setConfirm(null)
          toast.success('Dados apagados')
        }}
      />

      <ConfirmDialog
        open={confirm === 'delete'}
        title="Excluir minha conta?"
        message={<p>Sua conta e todos os seus dados serão apagados do servidor para sempre. Para confirmar, digite sua senha.</p>}
        confirmLabel="Excluir conta"
        loading={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => void deleteAccount()}
      >
        <div className="mt-4">
          <Field label="Sua senha" error={deleteError ?? undefined}>
            <Input type="password" autoComplete="current-password" value={deletePassword} invalid={!!deleteError} onChange={(e) => setDeletePassword(e.target.value)} />
          </Field>
        </div>
      </ConfirmDialog>
    </>
  )
}
