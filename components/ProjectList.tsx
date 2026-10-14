'use client'

import { Fragment, useRef, useState } from 'react'
import { ArrowUpRight, ChevronDown, Circle, CheckCircle2, ListTodo, Plus } from 'lucide-react'
import { useQuickTasks } from '@/hooks/useQuickTasks'
import { taskService } from '@/services/taskService'
import { useTimerStore } from '@/store/useTimerStore'
import { isTaskSelectionLocked } from '@/lib/taskSelection'
import { useI18n } from '@/components/I18nProvider'
import { TaskOption } from '@/types/task'
import { compareTaskActivity } from '@/lib/taskActivity'

export default function ProjectList({ isVisible = true, showSelectionButtons = true, allowProjectCreation = true, layout = 'list' }: { isVisible?: boolean; showSelectionButtons?: boolean; allowProjectCreation?: boolean; layout?: 'list' | 'table' }) {
  const { language } = useI18n()
  const es = language === 'es'
  const text = (en: string, spanish: string) => es ? spanish : en
  const dateFormatter = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', year: 'numeric' })
  const { loading, loadError, saving, error, mutate, retry } = useQuickTasks(isVisible)
  const options = useTimerStore(state => state.taskOptions)
  const selected = useTimerStore(state => state.selectedTask)
  const session = useTimerStore(state => state.currentSession)
  const [name, setName] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<string[]>([])
  const [newTask, setNewTask] = useState('')
  const [taskProjectId, setTaskProjectId] = useState('')
  const taskInputRef = useRef<HTMLInputElement>(null)
  const projects = options.filter(item => !item.parentId).sort(compareTaskActivity)
  const availableProjects = projects.filter(project => !project.completed)
  const taskProject = availableProjects.find(project => project.id === taskProjectId)
    ?? availableProjects.find(project => project.id === (selected?.parentId ?? selected?.id))
    ?? availableProjects[0]
  const locked = isTaskSelectionLocked(session)

  async function createTask() {
    const title = newTask.trim()
    if (!title || !taskProject || saving || loading || loadError) return
    const parentId = taskProject.id
    const result = await mutate(async () => ({ task: await taskService.create({ title, parentId }) }))
    if (result) {
      setNewTask('')
      setTaskProjectId(parentId)
      setExpanded(previous => previous.includes(parentId) ? previous : [...previous, parentId])
      taskInputRef.current?.focus()
    }
  }

  async function create(parentId?: string) {
    const title = (parentId ? drafts[parentId] : name)?.trim()
    if (!title || saving) return
    const result = await mutate(async () => ({ task: await taskService.create({ title, ...(parentId ? { parentId } : {}) }) }))
    if (result) {
      if (parentId) setDrafts(previous => ({ ...previous, [parentId]: '' }))
      else { setName(''); if ('task' in result) setExpanded(previous => [...previous, result.task.id]) }
    }
  }

  function select(item: TaskOption) {
    if (!locked) useTimerStore.getState().setSelectedTask(selected?.id === item.id ? null : item)
  }

  function renderTasks(project: TaskOption, todos: TaskOption[], open: boolean) {
    return (
      <div id={`project-todos-${project.id}`} hidden={!open} className="focus-project-todos">
        <ul>
          {todos.map(todo => <li key={todo.id} data-selected={selected?.id === todo.id}>
            <label className={todo.completed ? 'is-complete' : ''}>
              <input type="checkbox" checked={Boolean(todo.completed)} disabled={saving} onChange={() => void mutate(async () => ({ task: await taskService.update(todo.id, { completed: !todo.completed }) }))} />
              <span>{todo.title}</span>
            </label>
            {showSelectionButtons && <button type="button" className="focus-project-icon" disabled={locked || todo.completed} aria-label={`${text('Select task', 'Seleccionar tarea')}: ${todo.title}`} title={text('Select task', 'Seleccionar tarea')} aria-pressed={selected?.id === todo.id} onClick={() => select(todo)}>{selected?.id === todo.id ? <CheckCircle2 size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}</button>}
          </li>)}
        </ul>
        {allowProjectCreation && <form noValidate className="focus-task-create" onSubmit={event => { event.preventDefault(); void create(project.id) }}>
          <input aria-label={`${text('New task', 'Nueva tarea')}: ${project.title}`} placeholder={text('Add a task…', 'Añadir una tarea…')} value={drafts[project.id] ?? ''} disabled={saving || project.completed} onChange={event => setDrafts(previous => ({ ...previous, [project.id]: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }} />
          <button type="submit" disabled={saving || project.completed || !drafts[project.id]?.trim()} aria-label={text('Add task', 'Añadir tarea')} title={text('Add task', 'Añadir tarea')}><Plus size={16} aria-hidden="true" /></button>
        </form>}
      </div>
    )
  }

  return <section className="focus-projects" data-i18n-ignore aria-busy={loading || saving}>
    {allowProjectCreation && <form noValidate className="focus-project-create" onSubmit={event => { event.preventDefault(); void create() }}>
      <input aria-label={text('Project name', 'Nombre del proyecto')} placeholder={text('New project…', 'Nuevo proyecto…')} value={name} disabled={saving} onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }} />
      <button type="submit" disabled={saving || !name.trim()}><Plus size={16} />{text('Add project', 'Añadir proyecto')}</button>
    </form>}
    {!allowProjectCreation && <form noValidate className="focus-task-composer" onSubmit={event => { event.preventDefault(); void createTask() }}>
      <input ref={taskInputRef} aria-label={text('Add new task', 'Añadir nueva tarea')} placeholder={text('Add new task…', 'Añadir nueva tarea…')} value={newTask} disabled={saving || loading || loadError || !taskProject} onChange={event => setNewTask(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }} />
      <div className="focus-task-project-chip">
        <select aria-label={text('Project for new task', 'Proyecto de la nueva tarea')} value={taskProject?.id ?? ''} disabled={saving || loading || loadError || !availableProjects.length} onChange={event => setTaskProjectId(event.target.value)}>
          {!availableProjects.length && <option value="">{text('Project', 'Proyecto')}</option>}
          {availableProjects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}
        </select>
        <ChevronDown size={12} aria-hidden="true" />
      </div>
      <button type="submit" disabled={saving || loading || loadError || !newTask.trim() || !taskProject} aria-label={text('Add task', 'Añadir tarea')} title={text('Add task', 'Añadir tarea')}><ArrowUpRight size={18} aria-hidden="true" /></button>
    </form>}
    {loadError && <p role="alert">{text('Could not load projects.', 'No se pudieron cargar los proyectos.')} <button type="button" onClick={retry}>{text('Try again', 'Reintentar')}</button></p>}
    {error && <p role="alert">{text('Could not save changes. Please try again.', 'No se pudieron guardar los cambios. Inténtalo de nuevo.')}</p>}
    {!loading && !loadError && !projects.length && <p className="focus-project-empty">{allowProjectCreation ? text('Add your first project, then break it into tasks.', 'Añade tu primer proyecto y divídelo en tareas.') : text('No projects yet. Add one in Manage projects.', 'Aún no hay proyectos. Añade uno en Gestionar proyectos.')}</p>}
    {layout === 'table' ? <div className="focus-project-table-scroll" role="region" aria-label={text('Projects', 'Proyectos')} tabIndex={0}>
      <table className="focus-project-table">
        <caption className="sr-only">{text('Projects, creation dates, tasks and focused time', 'Proyectos, fechas de creación, tareas y tiempo de concentración')}</caption>
        <thead><tr>
          <th scope="col">{text('Project', 'Proyecto')}</th>
          <th scope="col">{text('Created', 'Creado')}</th>
          <th scope="col" className="focus-project-table-number">{text('Tasks', 'Tareas')}</th>
          <th scope="col" className="focus-project-table-number">{text('Focused time', 'Tiempo de concentración')}</th>
        </tr></thead>
        <tbody>{projects.map(project => {
          const open = expanded.includes(project.id)
          const createdAt = project.createdAt ? new Date(project.createdAt) : null
          const todos = options.filter(item => item.parentId === project.id).sort(compareTaskActivity)
          return <Fragment key={project.id}>
            <tr className="focus-project-table-row">
              <th scope="row">
                <button type="button" className="focus-project-table-disclosure" aria-expanded={open} aria-controls={`project-todos-${project.id}`} onClick={() => setExpanded(previous => open ? previous.filter(id => id !== project.id) : [...previous, project.id])}>
                  <ChevronDown size={16} className={open ? '' : '-rotate-90'} aria-hidden="true" />
                  <span className={project.completed ? 'is-complete' : undefined} title={project.title}>{project.title}</span>
                </button>
              </th>
              <td className="focus-project-table-date">{createdAt && !Number.isNaN(createdAt.getTime()) ? <time dateTime={project.createdAt}>{dateFormatter.format(createdAt)}</time> : <span aria-label={text('Creation date unavailable', 'Fecha de creación no disponible')}>—</span>}</td>
              <td className="focus-project-table-number">{new Intl.NumberFormat(language).format(todos.length)}</td>
              <td className="focus-project-table-number">{new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format((project.focusMinutes ?? 0) / 60)} h</td>
            </tr>
            <tr hidden={!open} className="focus-project-table-details"><td colSpan={4}>{renderTasks(project, todos, open)}</td></tr>
          </Fragment>
        })}</tbody>
      </table>
    </div> : <ul className="focus-project-list">
      {projects.map(project => {
        const open = expanded.includes(project.id)
        const todos = options.filter(item => item.parentId === project.id).sort(compareTaskActivity)
        return <li key={project.id} className="focus-project" data-selected={selected?.id === project.id}>
          <div className="focus-project-heading">
            <button type="button" className="focus-project-disclosure" aria-expanded={open} aria-controls={`project-todos-${project.id}`} onClick={() => setExpanded(previous => open ? previous.filter(id => id !== project.id) : [...previous, project.id])}>
              <ChevronDown size={16} className={open ? '' : '-rotate-90'} aria-hidden="true" />
              <span className={project.completed ? 'is-complete' : undefined} title={project.title}>{project.title}</span>
              <small className="focus-project-task-count" title={`${new Intl.NumberFormat(language).format(todos.length)} ${todos.length === 1 ? text('task', 'tarea') : text('tasks', 'tareas')}`}>
                <ListTodo size={13} aria-hidden="true" />
                {new Intl.NumberFormat(language).format(todos.length)}
                <span className="sr-only"> {todos.length === 1 ? text('task', 'tarea') : text('tasks', 'tareas')}</span>
              </small>
              <small>{new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format((project.focusMinutes ?? 0) / 60)} h</small>
            </button>
            {showSelectionButtons && <button type="button" className="focus-project-icon" disabled={locked || project.completed} title={locked ? text('Stop the session to change projects.', 'Detén la sesión para cambiar de proyecto.') : text('Select project', 'Seleccionar proyecto')} aria-label={`${text('Select project', 'Seleccionar proyecto')}: ${project.title}`} aria-pressed={selected?.id === project.id} onClick={() => select(project)}>{selected?.id === project.id ? <CheckCircle2 size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}</button>}
          </div>
          {renderTasks(project, todos, open)}
        </li>
      })}
    </ul>}
    {saving && <p role="status">{text('Saving…', 'Guardando…')}</p>}
  </section>
}
