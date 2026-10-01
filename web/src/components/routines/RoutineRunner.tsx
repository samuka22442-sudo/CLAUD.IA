import type { Routine } from '@ritmo/shared'
import { ArrowLeft, Check, CircleCheck, Pause, Play, RotateCcw, SkipForward, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useToday } from '../../hooks/useToday.ts'
import { useWakeLock } from '../../hooks/useWakeLock.ts'
import { cn } from '../../lib/cn.ts'
import { colorStyle } from '../../lib/colors.ts'
import { formatDuration, formatTimer } from '../../lib/format.ts'
import { setRoutineStep } from '../../store/actions.ts'
import { useData } from '../../store/data.ts'
import { Button } from '../ui/Button.tsx'
import { IconButton } from '../ui/IconButton.tsx'
import { ProgressRing } from '../ui/ProgressRing.tsx'

type Phase = 'idle' | 'running' | 'paused' | 'finished'

const stepMs = (routine: Routine, index: number) => (routine.steps[index]?.minutes ?? 1) * 60_000

const ringSize = () => Math.round(Math.max(190, Math.min(300, window.innerWidth * 0.68, window.innerHeight * 0.36)))

/**
 * Modo foco: percorre a rotina passo a passo com cronômetro em tela cheia.
 * Renderizado num portal (fora do container animado da página) para o `position: fixed` valer.
 */
export function RoutineRunner({ routineId, onClose }: { routineId: string; onClose: () => void }) {
  const routine = useData((s) => s.data.routines.find((r) => r.id === routineId))
  const today = useToday()

  const doneSet = new Set(routine?.runs[today] ?? [])
  const allDone = !!routine && routine.steps.length > 0 && routine.steps.every((s) => doneSet.has(s.id))

  const [index, setIndex] = useState(() => {
    const first = routine?.steps.findIndex((s) => !doneSet.has(s.id)) ?? 0
    return first === -1 ? 0 : first
  })
  const [phase, setPhase] = useState<Phase>('idle')
  const [remainingMs, setRemainingMs] = useState(() => (routine ? stepMs(routine, index) : 0))
  const [now, setNow] = useState(() => Date.now())
  const [size, setSize] = useState(ringSize)
  const [endAt, setEndAt] = useState(0)
  const primaryRef = useRef<HTMLButtonElement>(null)

  useWakeLock(phase === 'running')

  const remaining = phase === 'running' || phase === 'finished' ? Math.max(0, endAt - now) : remainingMs
  const step = routine?.steps[index]
  const total = routine ? stepMs(routine, index) : 1

  // Tique do cronômetro (200 ms): o tempo vem sempre de `endAt`, então não há deriva mesmo com a aba em segundo plano.
  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (endAt - current <= 0) {
        setRemainingMs(0)
        setPhase('finished')
        navigator.vibrate?.([220, 120, 220])
      }
    }, 200)
    return () => clearInterval(id)
  }, [phase, endAt])

  useEffect(() => {
    const onResize = () => setSize(ringSize())
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('resize', onResize)
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    primaryRef.current?.focus()
    return () => {
      window.removeEventListener('resize', onResize)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const goTo = useCallback(
    (next: number) => {
      if (!routine) return
      setIndex(next)
      setPhase('idle')
      setRemainingMs(stepMs(routine, next))
    },
    [routine],
  )

  if (!routine || !step) return null

  const start = () => {
    const current = Date.now()
    setEndAt(current + (remainingMs > 0 ? remainingMs : total))
    setNow(current)
    setPhase('running')
  }
  const pause = () => {
    setRemainingMs(Math.max(0, endAt - Date.now()))
    setPhase('paused')
  }

  /** Próximo passo pendente depois do atual; se não houver, o primeiro pendente antes dele. */
  const nextPending = (doneAfter: Set<string>) => {
    const after = routine.steps.findIndex((s, i) => i > index && !doneAfter.has(s.id))
    if (after !== -1) return after
    return routine.steps.findIndex((s, i) => i < index && !doneAfter.has(s.id))
  }

  const complete = () => {
    setRoutineStep(routine.id, today, step.id, true)
    const doneAfter = new Set(doneSet).add(step.id)
    const next = nextPending(doneAfter)
    if (next !== -1) goTo(next)
    else setPhase('idle') // tudo feito: a tela de conclusão aparece por `allDone`
  }

  const skip = () => {
    const next = nextPending(doneSet)
    if (next !== -1) goTo(next)
    else goTo((index + 1) % routine.steps.length)
  }

  const restart = () => {
    for (const s of routine.steps) setRoutineStep(routine.id, today, s.id, false)
    goTo(0)
  }

  const nextStep = routine.steps[index + 1]
  const stepDone = doneSet.has(step.id)

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Modo foco: ${routine.title}`}
      style={colorStyle(routine.color)}
      className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-ink-950 animate-fade-up"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{ background: 'radial-gradient(700px 480px at 50% 35%, color-mix(in oklab, var(--c) 22%, transparent), transparent 70%)' }}
      />

      <header className="relative flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wider text-subtle uppercase">Modo foco</p>
          <p className="truncate font-bold">{routine.title}</p>
        </div>
        <IconButton label="Sair do modo foco" onClick={onClose}>
          <X className="size-6" />
        </IconButton>
      </header>

      {allDone && phase === 'idle' ? (
        <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-6 py-8 text-center">
          <ProgressRing value={1} size={size} stroke={14} color="var(--c)">
            <CircleCheck className="size-24 text-(--c)" strokeWidth={1.8} aria-hidden />
          </ProgressRing>
          <div>
            <h2 className="text-3xl font-extrabold">Rotina concluída!</h2>
            <p className="mt-2 text-muted">
              {routine.steps.length} passos em {formatDuration(routine.steps.reduce((sum, s) => sum + s.minutes, 0))}. Ótimo trabalho hoje.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button ref={primaryRef} onClick={onClose} size="lg" icon={<Check className="size-5" />}>
              Fechar
            </Button>
            <Button variant="secondary" size="lg" icon={<RotateCcw className="size-5" />} onClick={restart}>
              Fazer de novo
            </Button>
          </div>
        </main>
      ) : (
        <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-5 px-6 py-6 text-center">
          <p className="text-sm font-semibold text-muted">
            Passo {index + 1} de {routine.steps.length}
          </p>
          <h2 className="text-balance text-3xl font-extrabold leading-tight sm:text-4xl">{step.title}</h2>

          <ProgressRing value={1 - remaining / total} size={size} stroke={14} color="var(--c)" label={`${formatTimer(remaining / 1000)} restantes`}>
            <div>
              <p className={cn('text-6xl font-extrabold tabular-nums tracking-tight', phase === 'finished' && 'animate-pulse-glow rounded-full text-(--c)')}>
                {formatTimer(remaining / 1000)}
              </p>
              <p className="mt-1 text-sm font-medium text-muted">
                {phase === 'finished' ? 'Tempo esgotado' : phase === 'paused' ? 'Pausado' : `${step.minutes} min`}
              </p>
            </div>
          </ProgressRing>

          <div className="flex items-center gap-3">
            <IconButton label="Passo anterior" size="md" disabled={index === 0} onClick={() => goTo(index - 1)} className="border border-line">
              <ArrowLeft className="size-5" />
            </IconButton>

            {phase === 'running' ? (
              <Button ref={primaryRef} size="lg" variant="secondary" icon={<Pause className="size-5" />} onClick={pause} className="min-w-40">
                Pausar
              </Button>
            ) : phase === 'finished' || stepDone ? (
              <Button ref={primaryRef} size="lg" icon={<Check className="size-5" />} onClick={complete} className="min-w-40">
                {stepDone ? 'Passo concluído' : 'Concluir'}
              </Button>
            ) : (
              <Button ref={primaryRef} size="lg" icon={<Play className="size-5 fill-current" />} onClick={start} className="min-w-40">
                {phase === 'paused' ? 'Retomar' : 'Começar'}
              </Button>
            )}

            <IconButton label="Pular passo" size="md" onClick={skip} className="border border-line">
              <SkipForward className="size-5" />
            </IconButton>
          </div>

          {phase !== 'finished' && !stepDone && (
            <Button variant="ghost" icon={<Check className="size-4" />} onClick={complete}>
              Marcar como concluído
            </Button>
          )}

          <p className="h-5 text-sm text-subtle">{nextStep ? `A seguir: ${nextStep.title} · ${nextStep.minutes} min` : 'Último passo'}</p>
        </main>
      )}

      <footer className="relative px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8">
        <ol className="mx-auto flex max-w-lg items-center justify-center gap-1.5" aria-label="Passos da rotina">
          {routine.steps.map((s, i) => (
            <li
              key={s.id}
              aria-current={i === index ? 'step' : undefined}
              title={s.title}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all',
                doneSet.has(s.id) ? 'bg-(--c)' : i === index ? 'bg-white/60' : 'bg-white/12',
              )}
            />
          ))}
        </ol>
      </footer>
    </div>,
    document.body,
  )
}
