'use client'

import { Check, LockKeyhole, Square } from 'lucide-react'
import type { Project } from '@/lib/journal/types'
import type { ProjectOverview } from '@/lib/journal/projectOverview'
import { useJournalText } from '@/lib/journal/client'
import { useI18n } from '@/components/I18nProvider'
import { projectStatusLabels } from '@/lib/journal/projectStatus'

export default function ProjectMap({ project, overview }: { project: Project; overview: ProjectOverview }) {
  const t = useJournalText()
  const { language } = useI18n()
  const number = (value: number) => new Intl.NumberFormat(language).format(value)
  const progress = overview.totalTasks ? Math.round(overview.completedTasks / overview.totalTasks * 100) : 0
  const groups = [
    { completed: false, label: t('To do', 'Pendiente'), count: overview.totalTasks - overview.completedTasks },
    { completed: true, label: t('Completed', 'Completado'), count: overview.completedTasks },
  ]

  return <section className="project-map" aria-labelledby="project-map-title">
    <div className="project-map-caption">
      <h2 id="project-map-title">{t('Project map', 'Mapa del proyecto')}</h2>
      <p>{t('Tasks grouped by completion status.', 'Tareas agrupadas por estado de finalización.')}</p>
      {project.showTasks && overview.totalTasks > overview.tasks.length && <p>{t('Showing', 'Mostrando')} {number(overview.tasks.length)} {t('of', 'de')} {number(overview.totalTasks)} {t('tasks on this page. Branch totals cover the whole project.', 'tareas en esta página. Los totales de las ramas incluyen todo el proyecto.')}</p>}
    </div>
    <div className="project-map-canvas">
      <section className="journal-card project-map-root">
        <span className="journal-badge">{projectStatusLabels(t)[project.status]}</span>
        <h3>{project.name}</h3>
        {project.description && <p>{project.description}</p>}
        <div className="project-map-progress">
          <div><span>{t('Task progress', 'Progreso de tareas')}</span><strong>{number(progress)}%</strong></div>
          <progress max={Math.max(1, overview.totalTasks)} value={overview.completedTasks} aria-label={t('Task progress', 'Progreso de tareas')} />
          <small>{number(overview.completedTasks)} / {number(overview.totalTasks)} {t('tasks completed', 'tareas completadas')}</small>
        </div>
      </section>
      <div className="project-map-branches">
        {!project.showTasks ? <section className="journal-card project-map-notice"><LockKeyhole size={20} aria-hidden="true" /><h3>{t('Task names are private', 'Los nombres de las tareas son privados')}</h3><p>{t('The owner has not enabled public tasks for this project.', 'El propietario no ha habilitado las tareas públicas de este proyecto.')}</p></section> : !overview.totalTasks ? <section className="journal-card project-map-notice"><h3>{t('No tasks yet', 'Aún no hay tareas')}</h3><p>{t('Project tasks will appear here when they are added.', 'Las tareas del proyecto aparecerán aquí cuando se añadan.')}</p></section> : groups.map(group => {
          const tasks = overview.tasks.filter(task => task.completed === group.completed)
          return <section className="project-map-branch" data-completed={group.completed} key={String(group.completed)} aria-label={group.label}>
            <div className="journal-card project-map-status">
              <span className="journal-badge">{group.label}</span>
              <h3>{number(group.count)} {t('tasks', 'tareas')}</h3>
              <p>{group.completed ? t('Finished work', 'Trabajo terminado') : t('Work still to complete', 'Trabajo por completar')}</p>
            </div>
            <div className="journal-card project-map-task-panel">
              {tasks.length ? <ul>{tasks.map(task => <li key={task.id}>
                {task.completed ? <Check size={17} aria-hidden="true" /> : <Square size={17} aria-hidden="true" />}
                <span className="sr-only">{group.label}: </span><span className={task.completed ? 'project-map-task-done' : undefined}>{task.title}</span>
              </li>)}</ul> : <p>{group.count ? t('No tasks from this branch on this page. Use the page controls below to see more.', 'No hay tareas de esta rama en esta página. Usa los controles de abajo para ver más.') : t('No tasks in this branch yet.', 'Aún no hay tareas en esta rama.')}</p>}
            </div>
          </section>
        })}
      </div>
    </div>
  </section>
}
