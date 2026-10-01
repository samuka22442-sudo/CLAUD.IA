import type { ColorKey, Habit, IconKey, Weekday } from '@ritmo/shared'
import { LIMITS } from '@ritmo/shared'
import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { colorStyle } from '../../lib/colors.ts'
import { scheduleLabel } from '../../lib/labels.ts'
import { saveHabit } from '../../store/actions.ts'
import { toast } from '../../store/toast.ts'
import { Button } from '../ui/Button.tsx'
import { ColorPicker } from '../ui/ColorPicker.tsx'
import { Field, FieldGroup, Input, Textarea } from '../ui/Field.tsx'
import { IconPicker } from '../ui/IconPicker.tsx'
import { Modal } from '../ui/Modal.tsx'
import { WeekdayPicker } from '../ui/WeekdayPicker.tsx'
import { EntityIcon } from '../ui/EntityIcon.tsx'

interface HabitFormModalProps {
  /** Sem `habit`, cria um novo. */
  habit?: Habit
  onClose: () => void
  onSaved?: (id: string) => void
}

const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

/** Formulário de criar/editar hábito. É montado só quando necessário, então sempre abre com o estado certo. */
export function HabitFormModal({ habit, onClose, onSaved }: HabitFormModalProps) {
  const formId = useId()
  const [title, setTitle] = useState(habit?.title ?? '')
  const [description, setDescription] = useState(habit?.description ?? '')
  const [icon, setIcon] = useState<IconKey>(habit?.icon ?? 'star')
  const [color, setColor] = useState<ColorKey>(habit?.color ?? 'violet')
  const [days, setDays] = useState<Weekday[]>(habit?.days ?? ALL_DAYS)
  const [time, setTime] = useState(habit?.time ?? '')
  const [submitted, setSubmitted] = useState(false)

  const titleError = !title.trim() ? 'Dê um nome ao hábito' : undefined
  const daysError = days.length === 0 ? 'Escolha ao menos um dia' : undefined

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (titleError || daysError) return
    const id = saveHabit({ id: habit?.id, title, description, icon, color, days, time: time || undefined })
    toast.success(habit ? 'Hábito atualizado' : 'Hábito criado')
    onSaved?.(id)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={habit ? 'Editar hábito' : 'Novo hábito'}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} fullWidth>
            {habit ? 'Salvar alterações' : 'Criar hábito'}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-5">
        <div style={colorStyle(color)} className="glass flex items-center gap-3.5 rounded-2xl p-3.5" aria-hidden>
          <span className="tint c-glow grid size-12 shrink-0 place-items-center rounded-2xl">
            <EntityIcon name={icon} className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold">{title.trim() || 'Nome do hábito'}</p>
            <p className="text-xs text-subtle">
              {days.length > 0 ? scheduleLabel(days) : 'Sem dias'}
              {time && ` · ${time}`}
            </p>
          </div>
        </div>

        <Field label="Nome" error={submitted ? titleError : undefined}>
          <Input
            value={title}
            maxLength={LIMITS.title}
            placeholder="Ex.: Beber 2 litros de água"
            invalid={submitted && !!titleError}
            autoFocus={!habit && window.matchMedia('(pointer: fine)').matches}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <Field label="Descrição" optional>
          <Textarea
            value={description}
            maxLength={LIMITS.description}
            rows={2}
            placeholder="Algum detalhe que ajude a lembrar"
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <FieldGroup label="Dias da semana" error={submitted ? daysError : undefined}>
          <WeekdayPicker value={days} onChange={setDays} />
        </FieldGroup>

        <Field label="Horário" optional hint="Só para você se organizar; não envia lembretes.">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>

        <FieldGroup label="Cor">
          <ColorPicker value={color} onChange={setColor} />
        </FieldGroup>

        <FieldGroup label="Ícone">
          <IconPicker value={icon} color={color} onChange={setIcon} />
        </FieldGroup>
      </form>
    </Modal>
  )
}
