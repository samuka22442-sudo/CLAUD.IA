import { Archive, ArchiveRestore, Flame, Pencil, Percent, Trash2, Trophy, CircleCheckBig } from 'lucide-react'
import type { Habit } from '@ritmo/shared'
import { useState } from 'react'
import { useToday } from '../../hooks/useToday.ts'
import { colorHex, colorStyle } from '../../lib/colors.ts'
import { bestStreak, completionRate, currentStreak } from '../../lib/habits.ts'
import { scheduleLabel } from '../../lib/labels.ts'
import { formatPercent, plural } from '../../lib/format.ts'
import { deleteHabit, setHabitArchived, setHabitDay } from '../../store/actions.ts'
import { useData } from '../../store/data.ts'
import { toast } from '../../store/toast.ts'
import { Button } from '../ui/Button.tsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx'
import { Modal } from '../ui/Modal.tsx'
import { StatTile } from '../ui/StatTile.tsx'
import { HabitCalendar } from './HabitCalendar.tsx'
import { EntityIcon } from '../ui/EntityIcon.tsx'

interface HabitDetailProps {
  habitId: string
  onClose: () => void
  onEdit: (habit: Habit) => void
}

/** Detalhe do hábito: estatísticas e calendário editável. Lê do store, então acompanha cada marcação. */
export function HabitDetail({ habitId, onClose, onEdit }: HabitDetailProps) {
  const habit = useData((s) => s.data.habits.find((h) => h.id === habitId))
  const today = useToday()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!habit) return null
  const streak = currentStreak(habit, today)
  const best = bestStreak(habit, today)
  const color = colorHex(habit.color)

  return (
    <>
      <Modal
        open={!confirmDelete}
        onClose={onClose}
        size="lg"
        title={habit.title}
        description={habit.description}
        footer={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => onEdit(habit)}>
              Editar
            </Button>
            <Button
              variant="secondary"
              icon={habit.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
              onClick={() => {
                setHabitArchived(habit.id, !habit.archived)
                toast.success(habit.archived ? 'Hábito restaurado' : 'Hábito arquivado')
                onClose()
              }}
            >
              {habit.archived ? 'Restaurar' : 'Arquivar'}
            </Button>
            <Button variant="danger" className="ml-auto" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>
              Excluir
            </Button>
          </div>
        }
      >
        <div style={colorStyle(habit.color)} className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="tint c-glow grid size-14 shrink-0 place-items-center rounded-2xl">
              <EntityIcon name={habit.icon} className="size-7" />
            </span>
            <p className="text-sm text-muted">
              {scheduleLabel(habit.days)}
              {habit.time && ` · ${habit.time}`}
              {habit.archived && ' · Arquivado'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile icon={Flame} label="Sequência" value={`${streak}`} hint={plural(streak, 'dia seguido', 'dias seguidos')} color="#ff8a3d" />
            <StatTile icon={Trophy} label="Recorde" value={`${best}`} hint={plural(best, 'dia', 'dias')} color="#ffc532" />
            <StatTile icon={Percent} label="30 dias" value={formatPercent(completionRate(habit, 30, today))} hint="de conclusão" color={color} />
            <StatTile icon={CircleCheckBig} label="Total" value={`${habit.completions.length}`} hint={plural(habit.completions.length, 'conclusão', 'conclusões')} color="#1ee09a" />
          </div>

          <div className="glass mx-auto max-w-md rounded-2xl p-4">
            <HabitCalendar habit={habit} today={today} onToggle={(date, done) => setHabitDay(habit.id, date, done)} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir hábito?"
        message={
          <p>
            “{habit.title}” e todo o histórico de conclusões serão apagados. Se só quiser pausar, use <strong className="text-fg">Arquivar</strong>.
          </p>
        }
        confirmLabel="Excluir"
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteHabit(habit.id)
          toast.success('Hábito excluído')
          setConfirmDelete(false)
          onClose()
        }}
      />
    </>
  )
}
