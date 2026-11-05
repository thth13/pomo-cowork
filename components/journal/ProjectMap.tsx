'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import CommunityDialog from '@/components/CommunityDialog'
import { LockKeyhole } from 'lucide-react'
import type { Project } from '@/lib/journal/types'
import type { ProjectOverview } from '@/lib/journal/projectOverview'
import { useJournalText } from '@/lib/journal/client'
import { useI18n } from '@/components/I18nProvider'
import { projectStatusLabels } from '@/lib/journal/projectStatus'
import { useAuthStore } from '@/store/useAuthStore'
import ProjectSubtasks from './ProjectSubtasks'

export default function ProjectMap({ project, overview, pagination }: { project: Project; overview: ProjectOverview; pagination?: ReactNode }) {
  const t = useJournalText()
  const router = useRouter()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [connections, setConnections] = useState<{ path: string; x: number; y: number; completed: boolean }[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const measure = () => {
      const root = canvas.querySelector<HTMLElement>('.project-map-root')
      if (!root) return
      const bounds = canvas.getBoundingClientRect()
      const rootBounds = root.getBoundingClientRect()
      const startX = rootBounds.right - bounds.left + 6
      const startY = rootBounds.top + rootBounds.height / 2 - bounds.top
      setConnections(Array.from(canvas.querySelectorAll<HTMLElement>('.project-map-status, .project-map-notice')).map(node => {
        const rect = node.getBoundingClientRect()
        const x = rect.left - bounds.left - 8
        const y = rect.top + rect.height / 2 - bounds.top
        const middle = startX + (x - startX) / 2
        return { path: `M ${startX} ${startY} C ${middle} ${startY}, ${middle} ${y}, ${x} ${y}`, x, y, completed: node.closest('[data-completed=true]') !== null }
      }))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(canvas)
    canvas.querySelectorAll('.project-map-node').forEach(node => observer.observe(node))
    const frame = requestAnimationFrame(measure)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [overview.tasks, project.showTasks])
  const { language } = useI18n()
  const number = (value: number) => new Intl.NumberFormat(language).format(value)
  const progress = overview.totalTasks ? Math.round(overview.completedTasks / overview.totalTasks * 100) : 0
  const accountId = useAuthStore(state => state.user?.id)
  const isOwner = accountId === project.userId

  return <CommunityDialog open variant="task-tree" title={`${t('Task tree', 'Árbol de tareas')} · ${project.name}`} onClose={() => router.replace('?tab=overview', { scroll: false })}>
  <section className="project-map" aria-labelledby="project-map-title">
    <div className="project-map-caption">
      <h2 id="project-map-title">{t('Task tree', 'Árbol de tareas')}</h2>
      <p>{t('Project → tasks → subtasks', 'Proyecto → tareas → subtareas')}</p>
      <p>{isOwner ? t('Subtasks are saved only in this browser. They do not change task completion or sync with other devices.', 'Las subtareas se guardan solo en este navegador. No cambian el estado de las tareas ni se sincronizan con otros dispositivos.') : t('Subtasks are kept locally by the project owner and are not published.', 'El propietario guarda las subtareas localmente y no se publican.')}</p>
      {project.showTasks && overview.totalTasks > overview.tasks.length && <p>{t('Showing', 'Mostrando')} {number(overview.tasks.length)} {t('of', 'de')} {number(overview.totalTasks)} {t('tasks on this page. Progress covers the whole project.', 'tareas en esta página. El progreso incluye todo el proyecto.')}</p>}
    </div>
    <div className="project-map-scroll" tabIndex={0} role="region" aria-label={t('Project task tree. Scroll to explore.', 'Árbol de tareas del proyecto. Desplázate para explorar.')}>
    <div className="project-map-canvas" ref={canvasRef}>
      <svg className="project-map-connections" aria-hidden="true">{connections.map((connection, index) => <g key={index}>
        <path d={connection.path} />
        <circle cx={connection.x} cy={connection.y} r="5" data-completed={connection.completed} />
      </g>)}</svg>
      <section className="project-map-node project-map-root">
        <span className="project-map-badge">{projectStatusLabels(t)[project.status]}</span>
        <h3>{project.name}</h3>
        {project.description && <p>{project.description}</p>}
        <div className="project-map-progress">
          <div><span>{t('Task progress', 'Progreso de tareas')}</span><strong>{number(progress)}%</strong></div>
          <progress max={Math.max(1, overview.totalTasks)} value={overview.completedTasks} aria-label={t('Task progress', 'Progreso de tareas')} />
          <small>{number(overview.completedTasks)} / {number(overview.totalTasks)} {t('tasks completed', 'tareas completadas')}</small>
        </div>
      </section>
      <div className="project-map-branches">
        {!project.showTasks ? <section className="project-map-node project-map-notice"><LockKeyhole size={20} aria-hidden="true" /><h3>{t('Task names are private', 'Los nombres de las tareas son privados')}</h3><p>{t('The owner has not enabled public tasks for this project.', 'El propietario no ha habilitado las tareas públicas de este proyecto.')}</p></section> : !overview.totalTasks ? <section className="project-map-node project-map-notice"><h3>{t('No tasks yet', 'Aún no hay tareas')}</h3><p>{t('Project tasks will appear here when they are added.', 'Las tareas del proyecto aparecerán aquí cuando se añadan.')}</p></section> : !overview.tasks.length ? <section className="project-map-node project-map-notice"><p>{t('No tasks on this page. Use the page controls below.', 'No hay tareas en esta página. Usa los controles de abajo.')}</p></section> : overview.tasks.map(task => <section className="project-map-branch" data-completed={task.completed} key={task.id} aria-label={task.title}>
            <div className="project-map-node project-map-status">
              <span className="project-map-badge">{task.completed ? t('Completed', 'Completada') : t('To do', 'Pendiente')}</span>
              <h3>{task.title}</h3>
            </div>
            <div className="project-map-node project-map-task-panel">
              {isOwner ? <ProjectSubtasks key={`${accountId}:${project.id}:${task.id}`} storageKey={`pomo:project-subtasks:v1:${accountId}:${project.id}:${task.id}`} taskTitle={task.title} /> : <p>{t('Subtasks are local to the owner’s browser.', 'Las subtareas se guardan en el navegador del propietario.')}</p>}
            </div>
          </section>)}
      </div>
    </div>
    {project.showTasks && pagination}
    </div>
  </section>
  </CommunityDialog>
}
