'use client'

import { Fragment, useId, useRef, useState } from 'react'
import { ArrowUpRight, ChevronDown, Check, ListTodo, Loader2, Plus, Play, Trash2, X } from 'lucide-react'
import CommunityDialog from '@/components/CommunityDialog'
import ProjectColorPicker from '@/components/ProjectColorPicker'
import { projectColorStyle } from '@/lib/projectColors'
import ProjectActions from '@/components/ProjectActions'
import { useQuickTasks } from '@/hooks/useQuickTasks'
import { taskService } from '@/services/taskService'
import { useTimerStore } from '@/store/useTimerStore'
import { useTimerActionsStore } from '@/store/useTimerActionsStore'
import { useI18n } from '@/components/I18nProvider'
import { TaskOption } from '@/types/task'
import { compareTaskActivity } from '@/lib/taskActivity'

export default function ProjectList({ isVisible = true, showSelectionButtons = true, allowProjectCreation = true, layout = 'list' }: { isVisible?: boolean; showSelectionButtons?: boolean; allowProjectCreation?: boolean; layout?: 'list' | 'table' }) {
  const { language } = useI18n()
  const es = language === 'es'
  const text = (en: string, spanish: string) => es ? spanish : en
  const dateFormatter = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', year: 'numeric' })
  const { loading, loadError, saving, error, mutate, retry } = useQuickTasks(isVisible)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  function mutateWithFeedback(action: string, operation: Parameters<typeof mutate>[0]) {
    return mutate(async () => {
      setPendingAction(action)
      try {
        return await operation()
      } finally {
        setPendingAction(null)
      }
    })
  }

  const creatingProject = pendingAction === 'create-project'
  const options = useTimerStore(state => state.taskOptions)
  const selected = useTimerStore(state => state.selectedTask)
  const session = useTimerStore(state => state.currentSession)
  const [name, setName] = useState('')
  const [color, setColor] = useState<string | null>(null)
  const [renameColor, setRenameColor] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<string[]>([])
  const listRef = useRef<HTMLElement>(null)
  const projectButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [deleteTarget, setDeleteTarget] = useState<TaskOption | null>(null)
  const [deleteError, setDeleteError] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState('')
  const [renameTarget, setRenameTarget] = useState<TaskOption | null>(null)
  const renameInputId = useId()
  const [renameTitle, setRenameTitle] = useState('')
  const [renameError, setRenameError] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskOption | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskRenameError, setTaskRenameError] = useState(false)
  const taskRowRefs = useRef<Record<string, HTMLLIElement | null>>({})

  function finishTaskRename(id: string) {
    setEditingTask(null)
    setTaskRenameError(false)
    requestAnimationFrame(() => taskRowRefs.current[id]?.querySelector<HTMLButtonElement>('.focus-task-actions-trigger')?.focus({ preventScroll: true }))
  }

  async function renameTask() {
    const title = taskTitle.trim()
    if (!editingTask || !title || saving) return
    const target = editingTask
    setTaskRenameError(false)
    const result = await mutateWithFeedback(`rename:${target.id}`, async () => ({ task: await taskService.update(target.id, { title }) }))
    if (!result) { setTaskRenameError(true); return }
    finishTaskRename(target.id)
    setDeleteStatus(`${text('Task renamed', 'Tarea renombrada')}: ${title}`)
  }
  const projects = options.filter(item => !item.parentId).sort(compareTaskActivity)
  const startTask = useTimerActionsStore(state => state.startTask)
  const timerBusy = useTimerActionsStore(state => state.busy)

  async function create(parentId?: string) {
    const title = (parentId ? drafts[parentId] : name)?.trim()
    if (!title || saving) return
    if (parentId && (loading || loadError || !projects.some(project => project.id === parentId && !project.completed))) return
    const result = await mutateWithFeedback(parentId ? `create-task:${parentId}` : 'create-project', async () => ({ task: await taskService.create({ title, ...(parentId ? { parentId } : { color }) }) }))
    if (result) {
      if (parentId) setDrafts(previous => ({ ...previous, [parentId]: '' }))
      else { setName(''); setColor(null); if ('task' in result) setExpanded(previous => [...previous, result.task.id]) }
    }
  }

  async function deleteTask() {
    if (!deleteTarget || saving) return
    const target = deleteTarget
    setDeleteError(false)
    const result = await mutateWithFeedback(`delete:${target.id}`, async () => {
      await taskService.remove(target.id)
      return { deletedId: target.id }
    })
    if (!result) {
      setDeleteError(true)
      return
    }
    setDeleteTarget(null)
    setDeleteStatus(`${target.parentId ? text('Task deleted', 'Tarea eliminada') : text('Project deleted', 'Proyecto eliminado')}: ${target.title}`)
    if (!target.parentId) setExpanded(previous => previous.filter(id => id !== target.id))
    requestAnimationFrame(() => {
      if (target.parentId) projectButtonRefs.current[target.parentId]?.focus({ preventScroll: true })
      else listRef.current?.focus({ preventScroll: true })
    })
  }

  async function renameProject() {
    const title = renameTitle.trim()
    if (!renameTarget || !title || saving) return
    setRenameError(false)
    const result = await mutateWithFeedback(`rename:${renameTarget.id}`, async () => ({ task: await taskService.update(renameTarget.id, { title, color: renameColor }) }))
    if (!result) { setRenameError(true); return }
    setRenameTarget(null)
    setDeleteStatus(`${text('Project renamed', 'Proyecto renombrado')}: ${title}`)
  }

  function renderTasks(project: TaskOption, todos: TaskOption[], open: boolean) {
    return (
      <div id={`project-todos-${project.id}`} hidden={!open} className="focus-project-todos">
        <ul>
          {todos.map(todo => <li ref={node => { taskRowRefs.current[todo.id] = node }} key={todo.id} data-selected={selected?.id === todo.id}>
            {editingTask?.id === todo.id ? <form noValidate className="focus-task-rename" onSubmit={event => { event.preventDefault(); void renameTask() }} onKeyDown={event => {
              if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!saving) finishTaskRename(todo.id) }
              if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault()
            }}>
              <input autoFocus aria-label={text('Task name', 'Nombre de la tarea')} value={taskTitle} disabled={saving} onFocus={event => event.currentTarget.select()} onChange={event => setTaskTitle(event.target.value)} />
              <button type="submit" disabled={saving || !taskTitle.trim()} aria-busy={pendingAction === `rename:${todo.id}`} aria-label={text('Save task name', 'Guardar nombre de la tarea')} title={text('Save', 'Guardar')}>{pendingAction === `rename:${todo.id}` ? <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}</button>
              <button type="button" disabled={saving} onClick={() => finishTaskRename(todo.id)} aria-label={text('Cancel renaming', 'Cancelar cambio de nombre')} title={text('Cancel', 'Cancelar')}><X size={15} aria-hidden="true" /></button>
              {taskRenameError && <p role="alert">{text('Could not rename the task. Please try again.', 'No se pudo renombrar la tarea. Inténtalo de nuevo.')}</p>}
            </form> : <label className={todo.completed ? 'is-complete' : ''}>
              <span className="focus-task-checkbox" data-pending={pendingAction === `complete:${todo.id}`}>
                <input type="checkbox" checked={Boolean(todo.completed)} disabled={saving} aria-busy={pendingAction === `complete:${todo.id}`} onChange={() => void mutateWithFeedback(`complete:${todo.id}`, async () => ({ task: await taskService.update(todo.id, { completed: !todo.completed }) }))} />
                {pendingAction === `complete:${todo.id}` && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              </span>
              <span>{todo.title}</span>
            </label>}
            {showSelectionButtons && <button type="button" className="focus-project-icon focus-timer-task" data-active={session?.taskRecordId === todo.id} disabled={Boolean(session) || timerBusy || !startTask || saving || todo.completed || project.completed} aria-label={`${text('Start timer for task', 'Iniciar temporizador para tarea')}: ${todo.title}`} title={session ? text('Stop the current session before starting another task.', 'Detén la sesión actual antes de iniciar otra tarea.') : text('Select this task and start the timer', 'Seleccionar esta tarea e iniciar el temporizador')} onClick={() => { if (startTask) void startTask(todo) }}><Play size={16} aria-hidden="true" /></button>}
            {editingTask?.id !== todo.id && <ProjectActions kind="task" title={todo.title} disabled={saving || Boolean(editingTask)} onRename={() => { setEditingTask(todo); setTaskTitle(todo.title); setTaskRenameError(false); setDeleteStatus('') }} onDelete={() => { setDeleteTarget(todo); setDeleteError(false); setDeleteStatus('') }} />}
          </li>)}
        </ul>
        <form noValidate className="focus-task-create" onSubmit={event => { event.preventDefault(); void create(project.id) }}>
          <input aria-label={`${text('Add new task', 'Añadir nueva tarea')}: ${project.title}`} placeholder={text('Add new task…', 'Añadir nueva tarea…')} value={drafts[project.id] ?? ''} disabled={saving || loading || loadError || project.completed} onChange={event => setDrafts(previous => ({ ...previous, [project.id]: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }} />
          <button type="submit" disabled={saving || loading || loadError || project.completed || !drafts[project.id]?.trim()} aria-busy={pendingAction === `create-task:${project.id}`} aria-label={text('Add task', 'Añadir tarea')} title={text('Add task', 'Añadir tarea')}>{pendingAction === `create-task:${project.id}` ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}</button>
        </form>
      </div>
    )
  }

  return <section ref={listRef} tabIndex={-1} className="focus-projects" data-i18n-ignore aria-label={text('Projects', 'Proyectos')} aria-busy={loading || saving}>
    {!allowProjectCreation && <form noValidate className="focus-project-composer" onSubmit={event => { event.preventDefault(); void create() }}>
      <div className="project-name-field">
        <input aria-label={text('Project name', 'Nombre del proyecto')} placeholder={text('Create new project…', 'Crear nuevo proyecto…')} value={name} disabled={saving} onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }} />
        <ProjectColorPicker value={color} onChange={setColor} disabled={saving} />
      </div>
      <button type="submit" disabled={saving || !name.trim()} aria-busy={creatingProject} aria-label={creatingProject ? text('Saving', 'Guardando') : text('Add project', 'Añadir proyecto')} title={text('Add project', 'Añadir proyecto')}>{creatingProject ? <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ArrowUpRight size={18} aria-hidden="true" />}</button>
    </form>}
    {allowProjectCreation && <form noValidate className="focus-project-create" onSubmit={event => { event.preventDefault(); void create() }}>
      <div className="project-name-field">
        <input aria-label={text('Project name', 'Nombre del proyecto')} placeholder={text('New project…', 'Nuevo proyecto…')} value={name} disabled={saving} onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }} />
        <ProjectColorPicker value={color} onChange={setColor} disabled={saving} />
      </div>
      <button type="submit" disabled={saving || !name.trim()} aria-busy={creatingProject}>{creatingProject ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}{text('Add project', 'Añadir proyecto')}</button>
    </form>}
    {loadError && <p role="alert">{text('Could not load projects.', 'No se pudieron cargar los proyectos.')} <button type="button" onClick={retry}>{text('Try again', 'Reintentar')}</button></p>}
    {error && !deleteTarget && !renameTarget && !editingTask && <p role="alert">{text('Could not save changes. Please try again.', 'No se pudieron guardar los cambios. Inténtalo de nuevo.')}</p>}
    {!loading && !loadError && !projects.length && <p className="focus-project-empty">
      {allowProjectCreation ? text('Add your first project, then break it into tasks.', 'Añade tu primer proyecto y divídelo en tareas.') : text('Create your first project and tasks.', 'Crea tu primer proyecto y sus tareas.')}
    </p>}
    {layout === 'table' ? <div className="focus-project-table-scroll" role="region" aria-label={text('Projects', 'Proyectos')} tabIndex={0}>
      <table className="focus-project-table">
        <caption className="sr-only">{text('Projects, creation dates, tasks and focused time', 'Proyectos, fechas de creación, tareas y tiempo de concentración')}</caption>
        <thead><tr>
          <th scope="col">{text('Project', 'Proyecto')}</th>
          <th scope="col">{text('Created', 'Creado')}</th>
          <th scope="col" className="focus-project-table-number">{text('Tasks', 'Tareas')}</th>
          <th scope="col" className="focus-project-table-number">{text('Focused time', 'Tiempo de concentración')}</th>
          <th scope="col" className="focus-project-table-actions"><span className="sr-only">{text('Actions', 'Acciones')}</span></th>
        </tr></thead>
        <tbody>{projects.map(project => {
          const open = expanded.includes(project.id)
          const createdAt = project.createdAt ? new Date(project.createdAt) : null
          const todos = options.filter(item => item.parentId === project.id).sort(compareTaskActivity)
          return <Fragment key={project.id}>
            <tr className="focus-project-table-row">
              <th scope="row">
                <button ref={node => { projectButtonRefs.current[project.id] = node }} type="button" className="focus-project-table-disclosure" aria-expanded={open} aria-controls={`project-todos-${project.id}`} onClick={() => setExpanded(previous => open ? previous.filter(id => id !== project.id) : [...previous, project.id])}>
                  <ChevronDown size={16} className={open ? '' : '-rotate-90'} aria-hidden="true" />
                  <span className={project.completed ? 'is-complete' : undefined} title={project.title} style={projectColorStyle(project.color)}>{project.title}</span>
                </button>
              </th>
              <td className="focus-project-table-date">{createdAt && !Number.isNaN(createdAt.getTime()) ? <time dateTime={project.createdAt}>{dateFormatter.format(createdAt)}</time> : <span aria-label={text('Creation date unavailable', 'Fecha de creación no disponible')}>—</span>}</td>
              <td className="focus-project-table-number">{new Intl.NumberFormat(language).format(todos.length)}</td>
              <td className="focus-project-table-number">{new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format((project.focusMinutes ?? 0) / 60)} h</td>
              <td className="focus-project-table-actions"><ProjectActions title={project.title} disabled={saving} onRename={() => { setRenameTarget(project); setRenameTitle(project.title); setRenameColor(project.color ?? null); setRenameError(false); setDeleteStatus('') }} onDelete={() => { setDeleteTarget(project); setDeleteError(false); setDeleteStatus('') }} /></td>
            </tr>
            <tr hidden={!open} className="focus-project-table-details"><td colSpan={5}>{renderTasks(project, todos, open)}</td></tr>
          </Fragment>
        })}</tbody>
      </table>
    </div> : <ul className="focus-project-list">
      {projects.map(project => {
        const open = expanded.includes(project.id)
        const todos = options.filter(item => item.parentId === project.id).sort(compareTaskActivity)
        return <li key={project.id} className="focus-project" data-selected={selected?.id === project.id}>
          <div className="focus-project-heading">
            <button ref={node => { projectButtonRefs.current[project.id] = node }} type="button" className="focus-project-disclosure" aria-expanded={open} aria-controls={`project-todos-${project.id}`} onClick={() => setExpanded(previous => open ? previous.filter(id => id !== project.id) : [...previous, project.id])}>
              <ChevronDown size={16} className={open ? '' : '-rotate-90'} aria-hidden="true" />
              <span className={project.completed ? 'is-complete' : undefined} title={project.title} style={projectColorStyle(project.color)}>{project.title}</span>
              <small className="focus-project-task-count" title={`${new Intl.NumberFormat(language).format(todos.length)} ${todos.length === 1 ? text('task', 'tarea') : text('tasks', 'tareas')}`}>
                <ListTodo size={13} aria-hidden="true" />
                {new Intl.NumberFormat(language).format(todos.length)}
                <span className="sr-only"> {todos.length === 1 ? text('task', 'tarea') : text('tasks', 'tareas')}</span>
              </small>
              <small>{new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format((project.focusMinutes ?? 0) / 60)} h</small>
            </button>
            {showSelectionButtons && <button type="button" className="focus-project-icon focus-timer-task" data-active={session?.workProjectId === project.id && !session?.taskRecordId} disabled={Boolean(session) || timerBusy || !startTask || saving || project.completed} aria-label={`${text('Start timer for project', 'Iniciar temporizador para proyecto')}: ${project.title}`} title={session ? text('Stop the current session before starting another task.', 'Detén la sesión actual antes de iniciar otra tarea.') : text('Select this project and start the timer', 'Seleccionar este proyecto e iniciar el temporizador')} onClick={() => { if (startTask) void startTask(project) }}><Play size={16} aria-hidden="true" /></button>}
          </div>
          {renderTasks(project, todos, open)}
        </li>
      })}
    </ul>}
    <span className="sr-only" role="status">{saving ? text('Saving…', 'Guardando…') : ''}</span>
    <p className="sr-only" role="status">{deleteStatus}</p>
    <CommunityDialog variant="project-action" open={Boolean(deleteTarget)} title={deleteTarget?.parentId ? text('Delete task?', '¿Eliminar tarea?') : text('Delete project?', '¿Eliminar proyecto?')} description={deleteTarget?.parentId ? text('This task will be permanently deleted. This cannot be undone.', 'Esta tarea se eliminará permanentemente. No se puede deshacer.') : text('This project and all its tasks will be permanently deleted. This cannot be undone.', 'Este proyecto y todas sus tareas se eliminarán permanentemente. No se puede deshacer.')} busy={saving} onClose={() => { if (!saving) setDeleteTarget(null) }}>
      <p className="break-words">{deleteTarget?.title}</p>
      {deleteError && <p role="alert">{deleteTarget?.parentId ? text('Could not delete the task. Please try again.', 'No se pudo eliminar la tarea. Inténtalo de nuevo.') : text('Could not delete the project. Please try again.', 'No se pudo eliminar el proyecto. Inténtalo de nuevo.')}</p>}
      <div className="community-dialog-actions">
        <button type="button" className="community-button" autoFocus disabled={saving} onClick={() => setDeleteTarget(null)}>{text('Cancel', 'Cancelar')}</button>
        <button type="button" className="community-button community-button-danger" disabled={saving} aria-busy={saving} onClick={() => void deleteTask()}>{pendingAction === `delete:${deleteTarget?.id}` ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}{deleteTarget?.parentId ? text('Delete task', 'Eliminar tarea') : text('Delete project', 'Eliminar proyecto')}</button>
      </div>
    </CommunityDialog>
    <CommunityDialog variant="project-action" open={Boolean(renameTarget)} title={text('Edit project', 'Editar proyecto')} busy={saving} onClose={() => { if (!saving) setRenameTarget(null) }}>
      <form noValidate className="project-edit-form" onSubmit={event => { event.preventDefault(); void renameProject() }}>
        <div className="community-field">
          <div className="project-name-field">
            <input id={renameInputId} aria-label={text('Project name', 'Nombre del proyecto')} autoFocus value={renameTitle} disabled={saving} onChange={event => setRenameTitle(event.target.value)} onFocus={event => event.currentTarget.select()} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }} />
            <ProjectColorPicker value={renameColor} onChange={setRenameColor} disabled={saving} />
          </div>
        </div>
        {renameError && <p role="alert">{text('Could not save changes. Please try again.', 'No se pudieron guardar los cambios. Inténtalo de nuevo.')}</p>}
        <div className="community-dialog-actions">
          <button type="button" className="community-button" disabled={saving} onClick={() => setRenameTarget(null)}>{text('Cancel', 'Cancelar')}</button>
          <button type="submit" className="community-button community-button-primary relative" disabled={saving || !renameTitle.trim()} aria-busy={pendingAction === `rename:${renameTarget?.id}`}>
            <span className={pendingAction === `rename:${renameTarget?.id}` ? 'opacity-0' : undefined}>{text('Save changes', 'Guardar cambios')}</span>
            {pendingAction === `rename:${renameTarget?.id}` && <span className="absolute inset-0 grid place-items-center" aria-hidden="true"><Loader2 size={16} className="animate-spin motion-reduce:animate-none" /></span>}
          </button>
        </div>
      </form>
    </CommunityDialog>
  </section>
}
