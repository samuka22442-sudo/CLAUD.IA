import { LIMITS, ROUTINE_PERIODS } from '@ritmo/shared'
import type { ColorKey, IconKey, Routine, RoutinePeriod, Weekday } from '@ritmo/shared'
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { colorStyle } from '../../lib/colors.ts'
import { formatDuration } from '../../lib/format.ts'
import { newId } from '../../lib/ids.ts'
import { PERIOD_LABELS } from '../../lib/labels.ts'
import { routineEndTime } from '../../lib/routines.ts'
import { saveRoutine } from '../../store/actions.ts'
import { toast } from '../../store/toast.ts'
import { Button } from '../ui/Button.tsx'
import { ChipButton } from '../ui/Chip.tsx'
import { ColorPicker } from '../ui/ColorPicker.tsx'
import { Field, FieldGroup, Input } from '../ui/Field.tsx'
import { IconButton } from '../ui/IconButton.tsx'
import { IconPicker } from '../ui/IconPicker.tsx'
import { Modal } from '../ui/Modal.tsx'
import { WeekdayPicker } from '../ui/WeekdayPicker.tsx'

interface StepDraft {
  id: string
  title: string
  /** Texto do campo: permite apagar tudo ao digitar. */
  minutes: string
}

interface RoutineFormModalProps {
  /** Sem `routine`, cria uma nova. */
  routine?: Routine
  onClose: () => void
}

const DEFAULT_START: Record<RoutinePeriod, string> = { morning: '06:30', afternoon: '14:00', evening: '21:00', custom: '12:00' }
const DEFAULT_ICON: Record<RoutinePeriod, IconKey> = { morning: 'sun', afternoon: 'target', evening: 'moon', custom: 'star' }
const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

const stepMinutes = (text: string) => {
  const n = Number.parseInt(text, 10)
  return Number.isFinite(n) && n > 0 ? Math.min(n, LIMITS.maxStepMinutes) : 0
}

export function RoutineFormModal({ routine, onClose }: RoutineFormModalProps) {
  const formId = useId()
  const [title, setTitle] = useState(routine?.title ?? '')
  const [period, setPeriod] = useState<RoutinePeriod>(routine?.period ?? 'morning')
  const [startTime, setStartTime] = useState(routine?.startTime ?? DEFAULT_START.morning)
  const [days, setDays] = useState<Weekday[]>(routine?.days ?? ALL_DAYS)
  const [steps, setSteps] = useState<StepDraft[]>(
    routine?.steps.map((s) => ({ id: s.id, title: s.title, minutes: String(s.minutes) })) ?? [{ id: newId(), title: '', minutes: '10' }],
  )
  const [icon, setIcon] = useState<IconKey>(routine?.icon ?? DEFAULT_ICON.morning)
  const [color, setColor] = useState<ColorKey>(routine?.color ?? 'amber')
  const [submitted, setSubmitted] = useState(false)
  // Em rotina nova, escolher o período sugere horário e ícone — até o usuário mexer neles.
  const [startTouched, setStartTouched] = useState(!!routine)
  const [iconTouched, setIconTouched] = useState(!!routine)

  const filled = steps.filter((s) => s.title.trim())
  const errors = {
    title: !title.trim() ? 'Dê um nome à rotina' : undefined,
    startTime: !startTime ? 'Informe o horário de início' : undefined,
    days: days.length === 0 ? 'Escolha ao menos um dia' : undefined,
    steps:
      filled.length === 0
        ? 'Adicione ao menos um passo'
        : filled.some((s) => stepMinutes(s.minutes) === 0)
          ? 'Cada passo precisa de uma duração em minutos'
          : undefined,
  }
  const hasError = Object.values(errors).some(Boolean)
  const total = filled.reduce((sum, s) => sum + stepMinutes(s.minutes), 0)

  const choosePeriod = (value: RoutinePeriod) => {
    setPeriod(value)
    if (!startTouched) setStartTime(DEFAULT_START[value])
    if (!iconTouched) setIcon(DEFAULT_ICON[value])
  }
  const updateStep = (id: string, patch: Partial<StepDraft>) =>
    setSteps((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  const addStep = () => setSteps((list) => [...list, { id: newId(), title: '', minutes: '10' }])
  const removeStep = (id: string) => setSteps((list) => (list.length > 1 ? list.filter((s) => s.id !== id) : list))
  const moveStep = (index: number, delta: -1 | 1) =>
    setSteps((list) => {
      const target = index + delta
      if (target < 0 || target >= list.length) return list
      const next = [...list]
      ;[next[index], next[target]] = [next[target]!, next[index]!]
      return next
    })

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (hasError) return
    saveRoutine({
      id: routine?.id,
      title,
      icon,
      color,
      period,
      days,
      startTime,
      steps: filled.map((s) => ({ id: s.id, title: s.title, minutes: stepMinutes(s.minutes) })),
    })
    toast.success(routine ? 'Rotina atualizada' : 'Rotina criada')
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={routine ? 'Editar rotina' : 'Nova rotina'}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} fullWidth>
            {routine ? 'Salvar alterações' : 'Criar rotina'}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-5">
        <Field label="Nome da rotina" error={submitted ? errors.title : undefined}>
          <Input
            value={title}
            maxLength={LIMITS.title}
            placeholder="Ex.: Manhã energizada"
            invalid={submitted && !!errors.title}
            autoFocus={!routine && window.matchMedia('(pointer: fine)').matches}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <FieldGroup label="Período do dia">
          <div className="flex flex-wrap gap-2">
            {ROUTINE_PERIODS.map((value) => (
              <ChipButton key={value} selected={period === value} onClick={() => choosePeriod(value)}>
                {PERIOD_LABELS[value]}
              </ChipButton>
            ))}
          </div>
        </FieldGroup>

        <div className="grid gap-5 sm:grid-cols-[11rem_1fr]">
          <Field label="Começa às" error={submitted ? errors.startTime : undefined}>
            <Input
              type="time"
              value={startTime}
              invalid={submitted && !!errors.startTime}
              onChange={(e) => {
                setStartTouched(true)
                setStartTime(e.target.value)
              }}
            />
          </Field>
          <FieldGroup label="Dias da semana" error={submitted ? errors.days : undefined}>
            <WeekdayPicker value={days} onChange={setDays} />
          </FieldGroup>
        </div>

        <FieldGroup label="Passos" error={submitted ? errors.steps : undefined}>
          <ol className="space-y-2.5">
            {steps.map((step, index) => (
              <li key={step.id} className="rounded-2xl border border-line bg-white/[0.03] p-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.07] text-xs font-extrabold text-muted tabular-nums">{index + 1}</span>
                  <Input
                    value={step.title}
                    maxLength={LIMITS.stepTitle}
                    placeholder="Ex.: Alongamento"
                    aria-label={`Nome do passo ${index + 1}`}
                    onChange={(e) => updateStep(step.id, { title: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (index === steps.length - 1 && steps.length < LIMITS.maxSteps) addStep()
                      }
                    }}
                  />
                </div>
                <div className="mt-2 flex items-center gap-2 pl-[2.625rem]">
                  <label className="flex items-center gap-2 text-xs font-semibold text-subtle">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={step.minutes}
                      aria-label={`Duração do passo ${index + 1} em minutos`}
                      className="h-10 w-20 px-3 text-center tabular-nums"
                      onChange={(e) => updateStep(step.id, { minutes: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                    />
                    min
                  </label>
                  <div className="ml-auto flex items-center">
                    <IconButton label={`Subir passo ${index + 1}`} size="sm" disabled={index === 0} onClick={() => moveStep(index, -1)}>
                      <ChevronUp className="size-5" />
                    </IconButton>
                    <IconButton label={`Descer passo ${index + 1}`} size="sm" disabled={index === steps.length - 1} onClick={() => moveStep(index, 1)}>
                      <ChevronDown className="size-5" />
                    </IconButton>
                    <IconButton label={`Remover passo ${index + 1}`} size="sm" tone="danger" disabled={steps.length === 1} onClick={() => removeStep(step.id)}>
                      <X className="size-5" />
                    </IconButton>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" size="sm" icon={<Plus className="size-4" />} disabled={steps.length >= LIMITS.maxSteps} onClick={addStep}>
              Adicionar passo
            </Button>
            {total > 0 && startTime && (
              <p className="text-sm text-muted">
                Duração <strong className="text-fg">{formatDuration(total)}</strong> · termina às{' '}
                <strong className="text-fg tabular-nums">{routineEndTime({ startTime, steps: filled.map((s) => ({ id: s.id, title: s.title, minutes: stepMinutes(s.minutes) })) })}</strong>
              </p>
            )}
          </div>
        </FieldGroup>

        <FieldGroup label="Cor">
          <ColorPicker value={color} onChange={setColor} />
        </FieldGroup>

        <div style={colorStyle(color)}>
          <FieldGroup label="Ícone">
            <IconPicker
              value={icon}
              color={color}
              onChange={(value) => {
                setIconTouched(true)
                setIcon(value)
              }}
            />
          </FieldGroup>
        </div>
      </form>
    </Modal>
  )
}
