import type { Goal } from '@ritmo/shared'
import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { formatNumber, formatPercent } from '../../lib/format.ts'
import { addProgress, goalProgress } from '../../lib/goals.ts'
import { parseNumber } from '../../lib/numbers.ts'
import { todayISO } from '../../lib/dates.ts'
import { addGoalProgress } from '../../store/actions.ts'
import { toast } from '../../store/toast.ts'
import { Button } from '../ui/Button.tsx'
import { ChipButton } from '../ui/Chip.tsx'
import { Field, Input } from '../ui/Field.tsx'
import { Modal } from '../ui/Modal.tsx'

const QUICK = [1, 5, 10]

/** Registrar quanto avançou em uma meta numérica (pode ser negativo para corrigir). */
export function GoalProgressModal({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const formId = useId()
  const [text, setText] = useState('1')
  const amount = parseNumber(text)
  const unit = goal.unit ? ` ${goal.unit}` : ''

  const preview = amount === null ? null : addProgress(goal, amount, todayISO())
  const willComplete = preview !== null && goalProgress(preview) >= 1 && goalProgress(goal) < 1

  function submit(event: FormEvent) {
    event.preventDefault()
    if (amount === null || amount === 0) return
    addGoalProgress(goal.id, amount)
    toast.success(willComplete ? 'Meta concluída! Parabéns!' : 'Progresso registrado')
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Registrar progresso"
      description={goal.title}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} fullWidth disabled={amount === null || amount === 0}>
            Registrar
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-4">
        <Field label={`Quanto avançou${goal.unit ? ` (${goal.unit})` : ''}?`} hint="Use um valor negativo para corrigir um excesso.">
          <Input
            type="text"
            inputMode="decimal"
            value={text}
            autoFocus={window.matchMedia('(pointer: fine)').matches}
            onChange={(e) => setText(e.target.value)}
          />
        </Field>

        <div className="flex flex-wrap gap-2" aria-label="Valores rápidos">
          {QUICK.map((value) => (
            <ChipButton key={value} selected={amount === value} onClick={() => setText(String(value))}>
              +{value}
            </ChipButton>
          ))}
        </div>

        {preview && amount !== 0 && (
          <p className="rounded-xl border border-line bg-white/[0.03] px-4 py-3 text-sm text-muted">
            <span className="font-semibold text-fg">
              {formatNumber(goal.current ?? 0)}
              {unit}
            </span>{' '}
            →{' '}
            <span className="font-semibold text-fg">
              {formatNumber(preview.current ?? 0)}
              {unit}
            </span>{' '}
            · {formatPercent(goalProgress(preview))} da meta
            {willComplete && <span className="mt-1 block font-bold text-emerald-300">Isso conclui a meta!</span>}
          </p>
        )}
      </form>
    </Modal>
  )
}
