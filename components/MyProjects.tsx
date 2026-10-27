'use client'

import { Clock3, ListTodo } from 'lucide-react'
import { useJournalText } from '@/lib/journal/client'
import ProjectList from '@/components/ProjectList'
import { useTimerStore } from '@/store/useTimerStore'
import { useI18n } from '@/components/I18nProvider'
import PersonalPageSkeleton from '@/components/PersonalPageSkeleton'

export function MyProjectsLoading() {
  return <PersonalPageSkeleton variant="projects" />
}

export default function MyProjects() {
  const t = useJournalText()
  const { language } = useI18n()
  const totalMinutes = useTimerStore(state => state.taskOptions.filter(task => !task.parentId).reduce((sum, task) => sum + (task.focusMinutes ?? 0), 0))
  return <section className="my-projects-panel" aria-labelledby="my-projects-title">
    <div className="my-projects-summary">
      <div>
        <div className="my-projects-section-title"><ListTodo size={18} aria-hidden="true" /><h2 id="my-projects-title">{t('My projects', 'Mis proyectos')}</h2></div>
        <p>{t('Projects, tasks and the time you have focused.', 'Proyectos, tareas y tu tiempo de concentración.')}</p>
      </div>
      <dl className="my-projects-total"><dt><Clock3 size={15} aria-hidden="true" />{t('Total focused', 'Total enfocado')}</dt><dd>{new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(totalMinutes / 60)} h</dd></dl>
    </div>
    <ProjectList showSelectionButtons={false} layout="table" />
  </section>
}
