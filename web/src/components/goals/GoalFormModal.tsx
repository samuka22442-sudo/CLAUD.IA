import { GOAL_CATEGORIES, LIMITS } from '@ritmo/shared'
import type { ColorKey, Goal, GoalCategory, GoalKind, IconKey } from '@ritmo/shared'
import { ListChecks, Plus, Hash, X } from 'lucide-react'
import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { cn } from '../../lib/cn.ts'
import { colorStyle } from '../../lib/colors.ts'
import { newId } from '../../lib/ids.ts'
import { GOAL_CATEGORY_LABELS } from '../../lib/labels.ts'
import { parseNumber } from '../../lib/numbers.ts'
import { saveGoal } from '../../store/actions.ts'
import { toast } from '../../store/toast.ts'
import { Button } from '../ui/Button.tsx'
import { ChipButton } from '../ui/Chip.tsx'
import { ColorPicker } from '../ui/ColorPicker.tsx'
import { Field, FieldGroup, Input, Textarea } from '../ui/Field.tsx'
import { IconButton } from '../ui/IconButton.tsx'
import { IconPicker } from '../ui/IconPicker.tsx'
import { Modal } from '../ui/Modal.tsx'

interface GoalFormModalProps {
  /** Sem `goal`, cria uma nova. */
  goal?: Goal
  onClose: () => void
}

interface MilestoneDraft {
  id: string
  title: string
  done: boolean
}

const KINDS: { value: GoalKind; label: string; example: string; icon: typeof Hash }[] = [
  { value: 'numeric', label: 'Numérica', example: 'Ex.: ler 12 livros, juntar R$ 5.000', icon: Hash },
  { value: 'checklist', label: 'Checklist', example: 'Ex.: concluir um curso em etapas', icon: ListChecks },
]

const show = (n: number | undefined) => (n === undefined ? '' : String(n).replace('.', ','))

export function GoalFormModal({ goal, onClose }: GoalFormModalProps) {
  const formId = useId()
  const [title, setTitle] = useState(goal?.title ?? '')
  const [description, setDescription] = useState(goal?.description ?? '')
  const [category, setCategory] = useState<GoalCategory>(goal?.category ?? 'personal')
  const [kind, setKind] = useState<GoalKind>(goal?.kind ?? 'numeric')
  const [targetText, setTargetText] = useState(show(goal?.target))
  const [currentText, setCurrentText] = useState(show(goal?.current ?? (goal ? 0 : undefined)))
  const [unit, setUnit] = useState(goal?.unit ?? '')
  const [milestones, setMilestones] = useState<MilestoneDraft[]>(
    goal?.milestones.length ? goal.milestones.map((m) => ({ ...m })) : [{ id: newId(), title: '', done: false }],
  )
  const [deadline, setDeadline] = useState(goal?.deadline ?? '')
  const [icon, setIcon] = useState<IconKey>(goal?.icon ?? 'target')
  const [color, setColor] = useState<ColorKey>(goal?.color ?? 'violet')
  const [submitted, setSubmitted] = useState(false)

  const target = parseNumber(targetText)
  const current = currentText.trim() === '' ? 0 : parseNumber(currentText)
  const errors = {
    title: !title.trim() ? 'Dê um nome à meta' : undefined,
    target:
      kind === 'numeric' && (target === null || target <= 0 || target > LIMITS.maxGoalValue)
        ? 'Informe um alvo maior que zero'
        : undefined,
    current:
      kind === 'numeric' && (current === null || current < 0 || current > LIMITS.maxGoalValue)
        ? 'Informe um valor igual ou maior que zero'
        : undefined,
    milestones:
      kind === 'checklist' && !milestones.some((m) => m.title.trim()) ? 'Adicione ao menos uma etapa' : undefined,
  }
  const hasError = Object.values(errors).some(Boolean)

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (hasError) return
    saveGoal({
      id: goal?.id,
      title,
      description,
      category,
      icon,
      color,
      kind,
      target: kind === 'numeric' ? (target ?? undefined) : undefined,
      current: kind === 'numeric' ? (current ?? 0) : undefined,
      unit,
      milestones,
      deadline: deadline || undefined,
    })
    toast.success(goal ? 'Meta atualizada' : 'Meta criada')
    onClose()
  }

  const updateMilestone = (id: string, text: string) =>
    setMilestones((list) => list.map((m) => (m.id === id ? { ...m, title: text } : m)))
  const addMilestone = () => setMilestones((list) => [...list, { id: newId(), title: '', done: false }])
  const removeMilestone = (id: string) => setMilestones((list) => (list.length > 1 ? list.filter((m) => m.id !== id) : list))

  return (
    <Modal
      open
      onClose={onClose}
      title={goal ? 'Editar meta' : 'Nova meta'}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} fullWidth>
            {goal ? 'Salvar alterações' : 'Criar meta'}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-5">
        <Field label="Nome da meta" error={submitted ? errors.title : undefined}>
          <Input
            value={title}
            maxLength={LIMITS.title}
            placeholder="Ex.: Ler 12 livros neste ano"
            invalid={submitted && !!errors.title}
            autoFocus={!goal && window.matchMedia('(pointer: fine)').matches}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <Field label="Descrição" optional>
          <Textarea value={description} maxLength={LIMITS.description} rows={2} placeholder="Por que essa meta importa?" onChange={(e) => setDescription(e.target.value)} />
        </Field>

        {!goal && (
          <FieldGroup label="Como medir o progresso?">
            <div role="radiogroup" aria-label="Tipo de meta" className="grid grid-cols-2 gap-3">
              {KINDS.map(({ value, label, example, icon: KindIcon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={kind === value}
                  onClick={() => setKind(value)}
                  className={cn(
                    'rounded-2xl border p-3.5 text-left transition active:scale-[0.98]',
                    kind === value
                      ? 'border-brand-400/60 bg-brand-500/15 shadow-[0_0_24px_-8px_rgb(139_61_255/0.9)]'
                      : 'border-line bg-white/[0.03] hover:border-line-strong',
                  )}
                >
                  <KindIcon className={cn('size-5', kind === value ? 'text-brand-300' : 'text-subtle')} aria-hidden />
                  <span className="mt-2 block text-sm font-bold">{label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-subtle">{example}</span>
                </button>
              ))}
            </div>
          </FieldGroup>
        )}

        {kind === 'numeric' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Alvo" error={submitted ? errors.target : undefined}>
              <Input type="text" inputMode="decimal" placeholder="12" value={targetText} invalid={submitted && !!errors.target} onChange={(e) => setTargetText(e.target.value)} />
            </Field>
            <Field label="Valor atual" error={submitted ? errors.current : undefined}>
              <Input type="text" inputMode="decimal" placeholder="0" value={currentText} invalid={submitted && !!errors.current} onChange={(e) => setCurrentText(e.target.value)} />
            </Field>
            <Field label="Unidade" optional className="col-span-2">
              <Input value={unit} maxLength={LIMITS.unit} placeholder="livros, km, R$, páginas…" onChange={(e) => setUnit(e.target.value)} />
            </Field>
          </div>
        ) : (
          <FieldGroup label="Etapas" error={submitted ? errors.milestones : undefined}>
            <ul className="space-y-2">
              {milestones.map((milestone, index) => (
                <li key={milestone.id} className="flex items-center gap-2">
                  <Input
                    value={milestone.title}
                    maxLength={LIMITS.milestoneTitle}
                    placeholder={`Etapa ${index + 1}`}
                    aria-label={`Etapa ${index + 1}`}
                    onChange={(e) => updateMilestone(milestone.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (index === milestones.length - 1 && milestones.length < LIMITS.maxMilestones) addMilestone()
                      }
                    }}
                  />
                  <IconButton label={`Remover etapa ${index + 1}`} tone="danger" disabled={milestones.length === 1} onClick={() => removeMilestone(milestone.id)}>
                    <X className="size-5" />
                  </IconButton>
                </li>
              ))}
            </ul>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              icon={<Plus className="size-4" />}
              disabled={milestones.length >= LIMITS.maxMilestones}
              onClick={addMilestone}
            >
              Adicionar etapa
            </Button>
          </FieldGroup>
        )}

        <Field label="Prazo" optional>
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>

        <FieldGroup label="Categoria">
          <div className="flex flex-wrap gap-2">
            {GOAL_CATEGORIES.map((value) => (
              <ChipButton key={value} selected={category === value} onClick={() => setCategory(value)}>
                {GOAL_CATEGORY_LABELS[value]}
              </ChipButton>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup label="Cor">
          <ColorPicker value={color} onChange={setColor} />
        </FieldGroup>

        <div style={colorStyle(color)}>
          <FieldGroup label="Ícone">
            <IconPicker value={icon} color={color} onChange={setIcon} />
          </FieldGroup>
        </div>
      </form>
    </Modal>
  )
}
