import type { Habit } from '@ritmo/shared'
import { Archive, CircleCheckBig, Plus } from 'lucide-react'
import { useState } from 'react'
import { HabitCard } from '../components/habits/HabitCard.tsx'
import { HabitDetail } from '../components/habits/HabitDetail.tsx'
import { HabitFormModal } from '../components/habits/HabitFormModal.tsx'
import { Button } from '../components/ui/Button.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { Tabs } from '../components/ui/Tabs.tsx'
import { useCreateParam } from '../hooks/useCreateParam.ts'
import { useToday } from '../hooks/useToday.ts'
import { formatLongDate, minutesOfDay } from '../lib/dates.ts'
import { dayProgress, habitsForDay, isDoneOn } from '../lib/habits.ts'
import { toggleHabitToday } from '../store/actions.ts'
import { useData } from '../store/data.ts'

type Filter = 'today' | 'all' | 'archived'

/** Pendentes primeiro (por horário), concluídos depois. */
function sortForToday(habits: Habit[], today: string): Habit[] {
  const time = (h: Habit) => (h.time ? minutesOfDay(h.time) : 24 * 60)
  return [...habits].sort((a, b) => {
    const doneDiff = Number(isDoneOn(a, today)) - Number(isDoneOn(b, today))
    return doneDiff !== 0 ? doneDiff : time(a) - time(b)
  })
}

export function Habits() {
  const habits = useData((s) => s.data.habits)
  const today = useToday()
  const [filter, setFilter] = useState<Filter>('today')
  const [form, setForm] = useState<{ habit?: Habit } | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  useCreateParam(() => setForm({}))

  const active = habits.filter((h) => !h.archived)
  const archived = habits.filter((h) => h.archived)
  const scheduledToday = habitsForDay(habits, today)
  const progress = dayProgress(habits, today)

  const list = filter === 'today' ? sortForToday(scheduledToday, today) : filter === 'all' ? active : archived

  return (
    <>
      <PageHeader
        title="Hábitos"
        subtitle={
          progress.scheduled > 0
            ? `${formatLongDate(today)} · ${progress.done} de ${progress.scheduled} concluídos hoje`
            : formatLongDate(today)
        }
        actions={
          <Button className="max-lg:hidden" icon={<Plus className="size-5" />} onClick={() => setForm({})}>
            Novo hábito
          </Button>
        }
      />

      <Tabs<Filter>
        ariaLabel="Filtrar hábitos"
        className="mb-5"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'today', label: 'Hoje', count: scheduledToday.length },
          { value: 'all', label: 'Todos', count: active.length },
          { value: 'archived', label: 'Arquivados', count: archived.length },
        ]}
      />

      {list.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {list.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              today={today}
              onOpen={() => setDetailId(habit.id)}
              onToggle={(done) => toggleHabitToday(habit.id, today, done)}
            />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <EmptyState
          icon={CircleCheckBig}
          title="Crie seu primeiro hábito"
          description="Escolha o que quer repetir, em quais dias, e acompanhe sua sequência crescer."
          action={
            <Button icon={<Plus className="size-5" />} onClick={() => setForm({})}>
              Novo hábito
            </Button>
          }
        />
      ) : filter === 'archived' ? (
        <EmptyState icon={Archive} title="Nenhum hábito arquivado" description="Hábitos que você pausar aparecem aqui e podem ser restaurados a qualquer momento." />
      ) : (
        <EmptyState
          icon={CircleCheckBig}
          title="Nada agendado para hoje"
          description="Nenhum dos seus hábitos cai neste dia da semana. Aproveite para descansar."
          action={
            <Button variant="secondary" onClick={() => setFilter('all')}>
              Ver todos os hábitos
            </Button>
          }
        />
      )}

      {form && (
        <HabitFormModal
          habit={form.habit}
          onClose={() => setForm(null)}
        />
      )}
      {detailId && (
        <HabitDetail
          habitId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(habit) => {
            setDetailId(null)
            setForm({ habit })
          }}
        />
      )}
    </>
  )
}
