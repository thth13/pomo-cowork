'use client'

import { useRef, useState, type FormEvent } from 'react'
import { ArrowRight, BookOpen, CalendarDays, Check, Code2, GraduationCap, RotateCcw, Sparkles, Trash2 } from 'lucide-react'
import CommunityDialog from '@/components/CommunityDialog'
import { useI18n } from '@/components/I18nProvider'
import { Area, Field } from '@/components/journal/FormFields'
import { useJournalText } from '@/lib/journal/client'
import { DEMO_TODAY, demoTemplates, type DemoPhase, type DemoTask, type DemoTemplate } from './projectDemoData'
import styles from './ProjectDemoDialogs.module.css'

export type ProjectSettings = {
  title: string
  description: string
  outcome: string
  deadline: string
  days: number
  hours: number
  difficulty: 'light' | 'balanced' | 'ambitious'
}

export type DemoModal = 'project' | 'task' | 'post' | 'templates' | 'adapt' | null

type Props = {
  open: DemoModal
  onClose: () => void
  project: ProjectSettings
  onSaveProject: (value: ProjectSettings) => void
  task: DemoTask | null
  phases: DemoPhase[]
  onSaveTask: (value: DemoTask) => void
  onDeleteTask: (value: DemoTask) => void
  onPublish: (title: string, body: string) => void
  onUseTemplate: (value: DemoTemplate) => void
  onAdapt: () => void
  newTaskPhaseId?: string
  newTaskDate?: string
  templatePreview?: boolean
}

type Errors = Record<string, string>

function read(data: FormData, name: string) {
  return String(data.get(name) ?? '').trim()
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function focusError(form: HTMLFormElement) {
  requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
}

function FormActions({ onClose, label, ai = false }: { onClose: () => void; label: string; ai?: boolean }) {
  const t = useJournalText()
  return <div className={styles.actions}>
    <button type="button" onClick={onClose}>{t('Cancel', 'Cancelar')}</button>
    <button type="submit" className={styles.primary}>{ai && <Sparkles size={15} aria-hidden="true" />}{label}</button>
  </div>
}

function ProjectForm({ project, onSaveProject, onClose, templatePreview }: Pick<Props, 'project' | 'onSaveProject' | 'onClose' | 'templatePreview'>) {
  const t = useJournalText()
  const [errors, setErrors] = useState<Errors>({})
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const title = read(data, 'project-title')
    const description = read(data, 'project-description')
    const outcome = read(data, 'project-outcome')
    const deadline = read(data, 'project-deadline')
    const days = Number(read(data, 'project-days'))
    const hours = Number(read(data, 'project-hours'))
    const difficulty = read(data, 'project-difficulty')
    const next: Errors = {}
    if (!title) next['project-title'] = t('Give your project a name.', 'Dale un nombre a tu proyecto.')
    if (!description) next['project-description'] = t('Describe what you want to achieve.', 'Describe lo que quieres conseguir.')
    if (!outcome) next['project-outcome'] = t('Describe what a finished project looks like.', 'Describe cómo será el proyecto terminado.')
    if (!isDate(deadline) || deadline < DEMO_TODAY) next['project-deadline'] = t('Choose October 28, 2026 or later.', 'Elige el 28 de octubre de 2026 o una fecha posterior.')
    if (!Number.isInteger(days) || days < 1 || days > 7) next['project-days'] = t('Enter 1 to 7 days.', 'Introduce entre 1 y 7 días.')
    if (!Number.isFinite(hours) || hours < 0.5 || hours > 8 || !Number.isInteger(hours * 2)) next['project-hours'] = t('Use 0.5–8 hours, in half-hour steps.', 'Usa entre 0,5 y 8 horas, en pasos de media hora.')
    if (!['light', 'balanced', 'ambitious'].includes(difficulty)) next['project-difficulty'] = t('Choose a pace.', 'Elige un ritmo.')
    setErrors(next)
    if (Object.keys(next).length) return focusError(form)
    onSaveProject({ title, description, outcome, deadline, days, hours, difficulty: difficulty as ProjectSettings['difficulty'] })
  }
  return <form className={styles.form} noValidate onSubmit={submit}>
    <Field name="project-title" label={t('Project name', 'Nombre del proyecto')} defaultValue={project.title} maxLength={100} error={errors['project-title']} autoFocus />
    <Area name="project-description" label={t('What do you want to achieve?', '¿Qué quieres conseguir?')} defaultValue={project.description} maxLength={1500} rows={3} error={errors['project-description']} />
    <Area name="project-outcome" label={t('What does finished look like?', '¿Cómo será el resultado final?')} defaultValue={project.outcome} maxLength={800} rows={2} error={errors['project-outcome']} />
    <div className={styles.fields}>
      <Field name="project-deadline" label={t('Target date', 'Fecha objetivo')} type="date" min={DEMO_TODAY} defaultValue={project.deadline} error={errors['project-deadline']} />
      <label>{t('Pace', 'Ritmo')}<select name="project-difficulty" defaultValue={project.difficulty} aria-invalid={Boolean(errors['project-difficulty'])} aria-describedby={errors['project-difficulty'] ? 'project-difficulty-error' : undefined}>
        <option value="light">{t('Gentle', 'Suave')}</option><option value="balanced">{t('Balanced', 'Equilibrado')}</option><option value="ambitious">{t('Ambitious', 'Ambicioso')}</option>
      </select>{errors['project-difficulty'] && <span id="project-difficulty-error" className={styles.error}>{errors['project-difficulty']}</span>}</label>
      <Field name="project-days" label={t('Work days per week', 'Días de trabajo por semana')} type="number" min={1} max={7} step={1} defaultValue={project.days} error={errors['project-days']} />
      <Field name="project-hours" label={t('Hours per day', 'Horas al día')} type="number" min={0.5} max={8} step={0.5} defaultValue={project.hours} error={errors['project-hours']} />
    </div>
    <p className={styles.note}><Sparkles size={15} aria-hidden="true" />{templatePreview
      ? t('This replaces the sample plan and its demo progress with this template.', 'Esto sustituye el plan de ejemplo y su progreso de demostración por esta plantilla.')
      : t('Preview how your goal becomes milestones, tasks and 25-minute sessions. This prototype uses a sample plan.', 'Explora cómo tu objetivo se convierte en etapas, tareas y sesiones de 25 minutos. Este prototipo usa un plan de ejemplo.')}</p>
    <FormActions onClose={onClose} label={t('Preview AI plan', 'Ver plan de IA')} ai />
  </form>
}

function TaskForm({ task, phases, onSaveTask, onDeleteTask, onClose, newTaskPhaseId, newTaskDate }: Pick<Props, 'task' | 'phases' | 'onSaveTask' | 'onDeleteTask' | 'onClose' | 'newTaskPhaseId' | 'newTaskDate'>) {
  const t = useJournalText()
  const { language } = useI18n()
  const [errors, setErrors] = useState<Errors>({})
  const [deleting, setDeleting] = useState(false)
  const deleteCancel = useRef<HTMLButtonElement>(null)
  const deleteTrigger = useRef<HTMLButtonElement>(null)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const title = read(data, 'task-title')
    const details = read(data, 'task-details')
    const phaseId = read(data, 'task-phase')
    const date = read(data, 'task-date')
    const sessions = Number(read(data, 'task-sessions'))
    const priority = read(data, 'task-priority')
    const next: Errors = {}
    if (!title) next['task-title'] = t('Name the task you want to work on.', 'Escribe el nombre de la tarea.')
    if (!phases.some(phase => phase.id === phaseId)) next['task-phase'] = t('Choose a stage.', 'Elige una etapa.')
    if (!isDate(date)) next['task-date'] = t('Choose a valid date.', 'Elige una fecha válida.')
    const minimum = Math.max(1, task?.completedSessions ?? 0)
    if (!Number.isInteger(sessions) || sessions < minimum || sessions > 64) next['task-sessions'] = t(`Use ${minimum}–64 sessions. Logged sessions stay recorded.`, `Usa entre ${minimum} y 64 sesiones. Las registradas se conservan.`)
    if (!['high', 'medium', 'low'].includes(priority)) next['task-priority'] = t('Choose a priority.', 'Elige una prioridad.')
    setErrors(next)
    if (Object.keys(next).length) return focusError(form)
    onSaveTask({
      id: task?.id ?? crypto.randomUUID(), phaseId,
      title: task && title === task.title[language] ? task.title : { en: title, es: title },
      details: task && details === task.details[language] ? task.details : { en: details, es: details },
      checklist: task?.checklist ?? [
        { en: 'Choose one small result for this session.', es: 'Elige un resultado pequeño para esta sesión.' },
        { en: 'Work on that result for 25 focused minutes.', es: 'Trabaja en ese resultado durante 25 minutos.' },
        { en: 'Save your work and note the next step.', es: 'Guarda tu trabajo y anota el siguiente paso.' },
      ],
      date, sessions, priority: priority as DemoTask['priority'],
      completedSessions: task?.completedSessions ?? 0, done: task?.done ?? false,
    })
  }
  return <form className={styles.form} noValidate onSubmit={submit}>
    <Field name="task-title" label={t('Task name', 'Nombre de la tarea')} defaultValue={task?.title[language] ?? ''} placeholder={t('e.g. Sketch the mobile homepage', 'Ej. Bocetar la página de inicio móvil')} maxLength={120} error={errors['task-title']} autoFocus />
    <Area name="task-details" label={t('What needs to happen?', '¿Qué hay que hacer?')} defaultValue={task?.details[language] ?? ''} maxLength={1500} rows={3} />
    <div className={styles.fields}>
      <label>{t('Stage', 'Etapa')}<select name="task-phase" defaultValue={task?.phaseId ?? newTaskPhaseId ?? phases[0]?.id} aria-invalid={Boolean(errors['task-phase'])} aria-describedby={errors['task-phase'] ? 'task-phase-error' : undefined}>
        {phases.map(phase => <option key={phase.id} value={phase.id}>{phase.title[language]}</option>)}
      </select>{errors['task-phase'] && <span id="task-phase-error" className={styles.error}>{errors['task-phase']}</span>}</label>
      <Field name="task-date" label={t('Scheduled for', 'Programada para')} type="date" defaultValue={task?.date ?? newTaskDate ?? DEMO_TODAY} error={errors['task-date']} />
      <Field name="task-sessions" label={t('25-minute sessions', 'Sesiones de 25 minutos')} type="number" min={Math.max(1, task?.completedSessions ?? 0)} max={64} step={1} defaultValue={task?.sessions ?? 2} error={errors['task-sessions']} />
      <label>{t('Priority', 'Prioridad')}<select name="task-priority" defaultValue={task?.priority ?? 'medium'} aria-invalid={Boolean(errors['task-priority'])} aria-describedby={errors['task-priority'] ? 'task-priority-error' : undefined}>
        <option value="low">{t('Low', 'Baja')}</option><option value="medium">{t('Medium', 'Media')}</option><option value="high">{t('High', 'Alta')}</option>
      </select>{errors['task-priority'] && <span id="task-priority-error" className={styles.error}>{errors['task-priority']}</span>}</label>
    </div>
    {task && task.completedSessions > 0 && <p className={styles.hint}>{t(`${task.completedSessions} sessions already logged. Editing keeps this focus time.`, `${task.completedSessions} sesiones ya registradas. La edición conserva este tiempo.`)}</p>}
    <FormActions onClose={onClose} label={task ? t('Save task', 'Guardar tarea') : t('Add task', 'Añadir tarea')} />
    {task && <div className={styles.deleteArea}>
      {deleting ? <div role="group" aria-label={t('Delete this task?', '¿Eliminar esta tarea?')}>
        <p>{t('Delete this task from the sample plan?', '¿Eliminar esta tarea del plan de ejemplo?')}</p>
        {task.completedSessions > 0 && <p className={styles.hint}>{t('Its logged time will also be removed from this preview’s totals.', 'Su tiempo registrado también se quitará de los totales de esta vista previa.')}</p>}
        <div className={styles.actions}>
          <button ref={deleteCancel} type="button" onClick={() => { setDeleting(false); requestAnimationFrame(() => deleteTrigger.current?.focus()) }}>{t('Keep task', 'Conservar tarea')}</button>
          <button type="button" className={styles.danger} onClick={() => onDeleteTask(task)}><Trash2 size={14} aria-hidden="true" />{t('Delete task', 'Eliminar tarea')}</button>
        </div>
      </div> : <button ref={deleteTrigger} type="button" className={styles.deleteButton} onClick={() => { setDeleting(true); requestAnimationFrame(() => deleteCancel.current?.focus()) }}><Trash2 size={14} aria-hidden="true" />{t('Delete task', 'Eliminar tarea')}</button>}
    </div>}
  </form>
}

function PostForm({ onPublish, onClose }: Pick<Props, 'onPublish' | 'onClose'>) {
  const t = useJournalText()
  const [errors, setErrors] = useState<Errors>({})
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const title = read(data, 'post-title')
    const body = read(data, 'post-body')
    const next: Errors = {}
    if (!title) next['post-title'] = t('Add a title for your update.', 'Añade un título a tu actualización.')
    if (!body) next['post-body'] = t('Share what you worked on or learned.', 'Cuenta en qué trabajaste o qué aprendiste.')
    setErrors(next)
    if (Object.keys(next).length) return focusError(form)
    onPublish(title, body)
  }
  return <form className={styles.form} noValidate onSubmit={submit}>
    <Field name="post-title" label={t('Update title', 'Título de la actualización')} placeholder={t('What moved forward today?', '¿En qué avanzaste hoy?')} maxLength={120} error={errors['post-title']} autoFocus />
    <Area name="post-body" label={t('Your project journal', 'Tu diario del proyecto')} placeholder={t('Share a small win, a lesson, or what you are trying next…', 'Comparte un logro, algo que aprendiste o lo que probarás después…')} rows={7} maxLength={4000} error={errors['post-body']} />
    <p className={styles.note}><BookOpen size={16} aria-hidden="true" />{t('This update appears only in the demo journal and resets on refresh.', 'Esta actualización aparece solo en el diario de demostración y se borra al recargar.')}</p>
    <FormActions onClose={onClose} label={t('Publish demo update', 'Publicar actualización de prueba')} />
  </form>
}

function Templates({ onUseTemplate }: Pick<Props, 'onUseTemplate'>) {
  const { language } = useI18n()
  const t = useJournalText()
  const icons = { code: Code2, book: BookOpen, graduation: GraduationCap, calendar: CalendarDays }
  return <div className={styles.form}>
    <p className={styles.hint}>{t('Choose a starting point, then make the goal and schedule yours.', 'Elige un punto de partida y adapta el objetivo y el horario.')}</p>
    <div className={styles.templates}>{demoTemplates.map(template => {
      const Icon = icons[template.icon]
      return <button key={template.id} type="button" className={styles.template} onClick={() => onUseTemplate(template)}>
        <Icon size={21} aria-hidden="true" /><span><strong>{template.name[language]}</strong><small>{template.description[language]}</small></span><ArrowRight size={16} aria-hidden="true" />
      </button>
    })}</div>
  </div>
}

function AdaptPlan({ onAdapt, onClose }: Pick<Props, 'onAdapt' | 'onClose'>) {
  const t = useJournalText()
  return <div className={styles.form}>
    <div className={styles.adaptIcon}><RotateCcw size={25} aria-hidden="true" /></div>
    <p className={styles.adaptIntro}>{t('A missed day does not have to become a missed goal.', 'Perder un día no significa perder tu objetivo.')}</p>
    <p className={styles.hint}>{t('Preview a new schedule for the work you still have ahead.', 'Revisa un nuevo horario para el trabajo que todavía tienes pendiente.')}</p>
    <ul className={styles.adaptList}>
      <li><Check size={16} aria-hidden="true" />{t('Keep completed tasks and logged focus time.', 'Conserva las tareas terminadas y el tiempo registrado.')}</li>
      <li><Check size={16} aria-hidden="true" />{t('Redistribute remaining sessions from October 28.', 'Redistribuye las sesiones pendientes desde el 28 de octubre.')}</li>
      <li><Check size={16} aria-hidden="true" />{t('Use the work days and daily hours in your plan.', 'Usa los días de trabajo y las horas diarias de tu plan.')}</li>
    </ul>
    <p className={styles.note}>{t('This is a simulated suggestion. You can still edit each task’s date afterwards.', 'Esta es una sugerencia simulada. Después puedes editar la fecha de cada tarea.')}</p>
    <div className={styles.actions}>
      <button type="button" onClick={onClose}>{t('Keep current plan', 'Conservar plan actual')}</button>
      <button type="button" className={styles.primary} onClick={onAdapt}><Sparkles size={15} aria-hidden="true" />{t('Update demo schedule', 'Actualizar horario de prueba')}</button>
    </div>
  </div>
}

export default function ProjectDemoDialogs(props: Props) {
  const t = useJournalText()
  const title = props.open === 'project' ? t('Shape your project', 'Define tu proyecto')
    : props.open === 'task' ? props.task ? t('Edit task', 'Editar tarea') : t('Add a task', 'Añadir una tarea')
      : props.open === 'post' ? t('A new page in your project', 'Una nueva página en tu proyecto')
        : props.open === 'templates' ? t('Start with a template', 'Empieza con una plantilla')
          : t('Make room for a fresh start', 'Haz espacio para volver a empezar')
  return <CommunityDialog open={Boolean(props.open)} title={title} onClose={props.onClose}>
    {props.open === 'project' && <ProjectForm {...props} />}
    {props.open === 'task' && <TaskForm {...props} />}
    {props.open === 'post' && <PostForm {...props} />}
    {props.open === 'templates' && <Templates {...props} />}
    {props.open === 'adapt' && <AdaptPlan {...props} />}
  </CommunityDialog>
}
