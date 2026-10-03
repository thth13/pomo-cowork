'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clock3, ListTodo } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useJournalText } from '@/lib/journal/client'
import { QueryError } from '@/components/journal/Primitives'
import { useI18n } from '@/components/I18nProvider'
import PersonalNavigation from '@/components/PersonalNavigation'
import PersonalPageSkeleton from '@/components/PersonalPageSkeleton'

export function MyProjectsLoading() {
  return (
    <section className="my-projects personal-page-frame">
      <PersonalNavigation />
      <PersonalPageSkeleton variant="projects" />
    </section>
  )
}

type Task = {
  id: string
  title: string
  completed: boolean
  focusMinutes: number
}

function formatFocusTime(minutes: number, hourLabel: string, minuteLabel: string) {
  const safeMinutes = Math.max(0, Math.round(minutes || 0))
  const hours = Math.floor(safeMinutes / 60)
  const remainingMinutes = safeMinutes % 60

  if (hours === 0) return `${remainingMinutes} ${minuteLabel}`
  if (remainingMinutes === 0) return `${hours} ${hourLabel}`
  return `${hours} ${hourLabel} ${remainingMinutes} ${minuteLabel}`
}

export default function MyProjects() {
  const token = useAuthStore((state) => state.token)
  const t = useJournalText()
  const { language } = useI18n()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestVersion, setRequestVersion] = useState(0)
  const loadError = language === 'es'
    ? 'No se pudieron cargar las tareas. Inténtalo de nuevo.'
    : 'Unable to load tasks. Try again.'

  const reload = useCallback(() => setRequestVersion((version) => version + 1), [])

  useEffect(() => {
    if (!token) return

    const controller = new AbortController()
    setLoading(true)
    setError('')

    fetch('/api/tasks', {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(loadError)
        const data: unknown = await response.json()
        if (!Array.isArray(data)) throw new Error(loadError)
        return data as Task[]
      })
      .then((data) => {
        if (!controller.signal.aborted) setTasks(data)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : loadError)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [loadError, requestVersion, token])

  const totalMinutes = useMemo(
    () => tasks.reduce((total, task) => total + Math.max(0, task.focusMinutes || 0), 0),
    [tasks]
  )
  const hourLabel = t('h', 'h')
  const minuteLabel = t('min', 'min')

  if (loading) return <MyProjectsLoading />

  return (
    <section className="my-projects personal-page-frame">
      <PersonalNavigation />
      <header className="my-projects-heading">
        <p className="journal-eyebrow">{t('Personal workspace', 'Espacio personal')}</p>
        <h1>{t('My projects', 'Mis proyectos')}</h1>
        <p>{t('A clear view of your tasks and the focus time behind them.', 'Una vista clara de tus tareas y el tiempo de enfoque dedicado a cada una.')}</p>
      </header>

      <section className="my-projects-panel" aria-labelledby="my-tasks-title">
        <div className="my-projects-summary">
          <div>
            <div className="my-projects-section-title">
              <ListTodo size={18} aria-hidden="true" />
              <h2 id="my-tasks-title">{t('My tasks', 'Mis tareas')}</h2>
            </div>
            <p>{t('All tasks, with time you have actually focused.', 'Todas las tareas, con el tiempo que realmente has trabajado.')}</p>
          </div>
          <dl className="my-projects-total">
            <dt><Clock3 size={15} aria-hidden="true" /> {t('Total focused', 'Total enfocado')}</dt>
            <dd>{formatFocusTime(totalMinutes, hourLabel, minuteLabel)}</dd>
          </dl>
        </div>

        {error ? <QueryError error={error} retry={reload} /> : tasks.length === 0 ? (
          <div className="my-projects-empty">
            <ListTodo size={24} aria-hidden="true" />
            <h3>{t('No tasks yet', 'Aún no hay tareas')}</h3>
            <p>{t('Add a task from the timer workspace to see it here.', 'Añade una tarea desde el espacio del temporizador para verla aquí.')}</p>
          </div>
        ) : (
          <ul className="my-projects-list" aria-label={t('Task focus time', 'Tiempo de enfoque por tarea')}>
            {tasks.map((task) => (
              <li key={task.id} className={task.completed ? 'is-complete' : undefined}>
                <span className="my-projects-task-name">{task.title}</span>
                <span className="my-projects-task-time">
                  <Clock3 size={15} aria-hidden="true" />
                  {formatFocusTime(task.focusMinutes, hourLabel, minuteLabel)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
