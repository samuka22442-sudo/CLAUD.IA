import type { Goal } from '@ritmo/shared'
import { Archive, Plus, Target, Trophy } from 'lucide-react'
import { useState } from 'react'
import { GoalCard } from '../components/goals/GoalCard.tsx'
import { GoalFormModal } from '../components/goals/GoalFormModal.tsx'
import { GoalProgressModal } from '../components/goals/GoalProgressModal.tsx'
import { Masonry } from '../components/ui/Masonry.tsx'
import { Button } from '../components/ui/Button.tsx'
import { ConfirmDialog } from '../components/ui/ConfirmDialog.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { PageHeader } from '../components/ui/PageHeader.tsx'
import { Tabs } from '../components/ui/Tabs.tsx'
import { useCreateParam } from '../hooks/useCreateParam.ts'
import { useToday } from '../hooks/useToday.ts'
import { goalStatus } from '../lib/goals.ts'
import { deleteGoal, setGoalArchived, toggleGoalMilestone } from '../store/actions.ts'
import { useData } from '../store/data.ts'
import { toast } from '../store/toast.ts'

type Filter = 'active' | 'completed' | 'archived'

export function Goals() {
  const goals = useData((s) => s.data.goals)
  const today = useToday()
  const [filter, setFilter] = useState<Filter>('active')
  const [form, setForm] = useState<{ goal?: Goal } | null>(null)
  const [progressGoalId, setProgressGoalId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Goal | null>(null)
  useCreateParam(() => setForm({}))

  const live = goals.filter((g) => !g.archived)
  const active = live
    .filter((g) => goalStatus(g, today) !== 'completed')
    // Prazo mais próximo primeiro (datas ISO ordenam como texto); sem prazo por último.
    .sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'))
  const completed = live
    .filter((g) => goalStatus(g, today) === 'completed')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  const archived = goals.filter((g) => g.archived)

  const list = filter === 'active' ? active : filter === 'completed' ? completed : archived
  const late = active.filter((g) => goalStatus(g, today) === 'late').length
  const progressGoal = goals.find((g) => g.id === progressGoalId)

  const subtitle =
    goals.length === 0
      ? 'Defina onde quer chegar'
      : `${active.length} em andamento${late > 0 ? ` · ${late} atrasada${late > 1 ? 's' : ''}` : ''} · ${completed.length} concluída${completed.length === 1 ? '' : 's'}`

  return (
    <>
      <PageHeader
        title="Metas"
        subtitle={subtitle}
        actions={
          <Button className="max-lg:hidden" icon={<Plus className="size-5" />} onClick={() => setForm({})}>
            Nova meta
          </Button>
        }
      />

      <Tabs<Filter>
        ariaLabel="Filtrar metas"
        className="mb-5"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'active', label: 'Ativas', count: active.length },
          { value: 'completed', label: 'Concluídas', count: completed.length },
          { value: 'archived', label: 'Arquivadas', count: archived.length },
        ]}
      />

      {list.length > 0 ? (
        <Masonry
          items={list}
          getKey={(goal) => goal.id}
          // Cartões de checklist são mais altos: o peso ajuda a equilibrar as duas colunas.
          weight={(goal) => 4 + (goal.kind === 'checklist' ? goal.milestones.length * 0.9 : 1)}
          render={(goal) => (
            <GoalCard
              goal={goal}
              today={today}
              onEdit={() => setForm({ goal })}
              onProgress={() => setProgressGoalId(goal.id)}
              onToggleMilestone={(milestoneId) => toggleGoalMilestone(goal.id, milestoneId)}
              onArchive={() => {
                setGoalArchived(goal.id, !goal.archived)
                toast.success(goal.archived ? 'Meta restaurada' : 'Meta arquivada')
              }}
              onDelete={() => setDeleting(goal)}
            />
          )}
        />
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Defina sua primeira meta"
          description="Com números (ler 12 livros) ou em etapas (concluir um curso), com prazo e progresso sempre à vista."
          action={
            <Button icon={<Plus className="size-5" />} onClick={() => setForm({})}>
              Nova meta
            </Button>
          }
        />
      ) : filter === 'completed' ? (
        <EmptyState icon={Trophy} title="Nenhuma meta concluída ainda" description="Quando uma meta chegar a 100%, ela aparece aqui para você celebrar." />
      ) : filter === 'archived' ? (
        <EmptyState icon={Archive} title="Nenhuma meta arquivada" description="Metas que você pausar ficam guardadas aqui." />
      ) : (
        <EmptyState
          icon={Target}
          title="Tudo concluído por aqui"
          description="Que tal definir o próximo desafio?"
          action={
            <Button icon={<Plus className="size-5" />} onClick={() => setForm({})}>
              Nova meta
            </Button>
          }
        />
      )}

      {form && <GoalFormModal goal={form.goal} onClose={() => setForm(null)} />}
      {progressGoal && <GoalProgressModal goal={progressGoal} onClose={() => setProgressGoalId(null)} />}
      <ConfirmDialog
        open={deleting !== null}
        title="Excluir meta?"
        message={<p>“{deleting?.title}” será apagada para sempre. Se só quiser pausar, use <strong className="text-fg">Arquivar</strong>.</p>}
        confirmLabel="Excluir"
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteGoal(deleting.id)
          toast.success('Meta excluída')
          setDeleting(null)
        }}
      />
    </>
  )
}

