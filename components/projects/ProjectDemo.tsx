'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, Bell, BellRing, BookOpen, CalendarDays, Check, CheckCheck,
  ChevronLeft, ChevronRight, Clock3, Code2, Flag, FolderOpen, GraduationCap,
  Heart, LayoutTemplate, ListTodo, Pause, Pencil, Play, Plus,
  RotateCcw, Settings2, Sparkles, Sprout, Target, Timer,
} from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { useJournalText } from '@/lib/journal/client'
import NotificationToast from '@/components/NotificationToast'
import { useLocalStudyTimer } from '@/hooks/useLocalStudyTimer'
import ProjectDemoDialogs, { type DemoModal, type ProjectSettings } from './ProjectDemoDialogs'
import {
  DEMO_DEADLINE, DEMO_START, DEMO_TODAY, demoPhases, demoPosts, demoProject,
  demoTasks, demoTemplates, type DemoPost, type DemoTask, type DemoTemplate,
} from './projectDemoData'
import { rebalanceDemoTasks, scheduleDemoTasks, shiftDemoDate } from './projectDemoSchedule'
import { createTemplatePreview } from './projectDemoTemplates'
import s from './ProjectDemo.module.css'

type Tab = 'plan' | 'calendar' | 'journal' | 'about'
const tabIds: Tab[] = ['plan', 'calendar', 'journal', 'about']
const templateIcons = { code: Code2, book: BookOpen, graduation: GraduationCap, calendar: CalendarDays }

function DemoFocus({ task, onComplete, onStop }: { task: DemoTask; onComplete: (id: string) => void; onStop: () => void }) {
  const { language } = useI18n()
  const t = useJournalText()
  const clock = useLocalStudyTimer(25 * 60)
  const started = useRef(false)
  const completed = useRef(false)
  const timerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!started.current) {
      started.current = true
      clock.start()
      timerRef.current?.focus({ preventScroll: true })
      if (window.matchMedia('(max-width: 760px)').matches) timerRef.current?.scrollIntoView({ block: 'center' })
    }
    if (clock.status === 'finished' && !completed.current) {
      completed.current = true
      onComplete(task.id)
    }
  }, [clock, task.id, onComplete])

  return <section ref={timerRef} tabIndex={-1} className={s.timer} aria-label={t('Demo focus session', 'Sesión de concentración de ejemplo')}>
    <div className={s.coachHeading}><span className={s.coachLabel}><Timer size={15} aria-hidden="true" />{t('FOCUS TIME', 'CONCENTRACIÓN')}</span><span className={s.badge}>{t('Demo', 'Demo')}</span></div>
    <h3>{task.title[language]}</h3>
    <div className={s.timerDigits} aria-label={t('Time remaining', 'Tiempo restante')}>{String(Math.floor(clock.seconds / 60)).padStart(2, '0')}<span>:</span>{String(clock.seconds % 60).padStart(2, '0')}</div>
    <p className={s.timerCaption} role="status">{clock.status === 'paused' ? t('Paused. Take your time.', 'En pausa. Tómate tu tiempo.') : t('One task. One small step.', 'Una tarea. Un pequeño paso.')}</p>
    <div className={s.timerControls}>
      <button className={`${s.button} ${s.primaryButton}`} onClick={clock.status === 'running' ? clock.pause : clock.start}>
        {clock.status === 'running' ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}{clock.status === 'running' ? t('Pause', 'Pausar') : t('Resume', 'Continuar')}
      </button>
      <button className={s.button} onClick={onStop}>{t('Stop', 'Detener')}</button>
    </div>
    <button className={s.textLink} onClick={() => { if (!completed.current) { completed.current = true; onComplete(task.id) } }}><CheckCheck size={14} aria-hidden="true" />{t('Preview session complete', 'Simular sesión completada')}</button>
    <p className={s.note}>{t('Adds 25 minutes to this preview only.', 'Añade 25 minutos solo a esta vista previa.')}</p>
  </section>
}

export default function ProjectDemo() {
  const { language } = useI18n()
  const t = useJournalText()
  const [projectOverride, setProjectOverride] = useState<ProjectSettings | null>(null)
  const project: ProjectSettings = projectOverride || {
    title: demoProject.title[language], description: demoProject.description[language],
    outcome: demoProject.outcome[language], deadline: DEMO_DEADLINE, days: 5, hours: 2, difficulty: 'balanced',
  }
  const [tasks, setTasks] = useState(demoTasks)
  const [phases, setPhases] = useState(demoPhases)
  const [posts, setPosts] = useState(demoPosts)
  const [projectStart, setProjectStart] = useState(DEMO_START)
  const [followerCount, setFollowerCount] = useState(24)
  const [tab, setTab] = useState<Tab>('plan')
  const [phaseId, setPhaseId] = useState('design')
  const [modal, setModal] = useState<DemoModal>(null)
  const [editingTask, setEditingTask] = useState<DemoTask | null>(null)
  const [following, setFollowing] = useState(false)
  const [liked, setLiked] = useState<string[]>([])
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [showSteps, setShowSteps] = useState(false)
  const [adapted, setAdapted] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState(DEMO_TODAY)
  const [notice, setNotice] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<DemoTemplate | null>(null)
  const closeNotice = useCallback(() => setNotice(''), [])
  const tabsRef = useRef<HTMLDivElement>(null)

  const doneTasks = tasks.filter(task => task.done).length
  const loggedSessions = tasks.reduce((sum, task) => sum + task.completedSessions, 0)
  const remainingSessions = tasks.filter(task => !task.done).reduce((sum, task) => sum + Math.max(0, task.sessions - task.completedSessions), 0)
  const progress = tasks.length ? Math.round(doneTasks / tasks.length * 100) : 0
  const activeTask = tasks.find(task => task.id === activeTaskId)
  const phase = phases.find(value => value.id === phaseId) || phases[0]
  const phaseTasks = tasks.filter(task => task.phaseId === phase.id)
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  const nextTask = tasks.filter(task => !task.done).sort((a, b) =>
    phases.findIndex(value => value.id === a.phaseId) - phases.findIndex(value => value.id === b.phaseId) ||
    a.date.localeCompare(b.date) || priorityOrder[a.priority] - priorityOrder[b.priority])[0]
  const schedule = useMemo(() => scheduleDemoTasks(tasks, project.days, project.hours), [tasks, project.days, project.hours])
  const scheduleDates = Object.keys(schedule).sort()
  const projectedEnd = scheduleDates.at(-1)
  const overDeadline = Boolean(projectedEnd && projectedEnd > project.deadline)
  const firstWeek = shiftDemoDate(DEMO_TODAY, -2 + weekOffset * 7)
  const weekDays = Array.from({ length: 7 }, (_, index) => shiftDemoDate(firstWeek, index))
  const allocations = schedule[selectedDay] || []
  const formatDate = (value: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) =>
    new Intl.DateTimeFormat(language, { ...options, timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
  const duration = (minutes: number) => `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`
  const tabLabels: Record<Tab, string> = { plan: t('Project plan', 'Plan del proyecto'), calendar: t('Calendar', 'Calendario'), journal: t('Project journal', 'Diario del proyecto'), about: t('About', 'Acerca del proyecto') }

  const completeSession = useCallback((id: string) => {
    setTasks(current => current.map(task => task.id === id ? {
      ...task, completedSessions: Math.min(task.sessions, task.completedSessions + 1),
      done: task.completedSessions + 1 >= task.sessions,
    } : task))
    setActiveTaskId(null)
    setNotice(language === 'es' ? 'Sesión de ejemplo completada. +25 min en este proyecto.' : 'Demo session complete. +25 min committed to this project.')
  }, [language])

  function selectTabByKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % tabIds.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabIds.length) % tabIds.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabIds.length - 1
    else return
    event.preventDefault()
    setTab(tabIds[next])
    tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
  }

  function editTask(task: DemoTask | null) { setEditingTask(task); setModal('task') }

  function renderTask(task: DemoTask) {
    const isRunning = activeTaskId === task.id
    return <li className={s.taskRow} data-done={task.done} data-active={isRunning} key={task.id}>
      <label className={s.taskCheck}>
        <input type="checkbox" checked={task.done} disabled={isRunning} aria-label={`${t('Mark complete', 'Marcar como completada')}: ${task.title[language]}`} onChange={() => setTasks(current => current.map(value => value.id === task.id ? { ...value, done: !value.done } : value))} />
        <Check size={13} aria-hidden="true" />
      </label>
      <div className={s.taskContent}>
        <button className={s.taskTitle} onClick={() => editTask(task)} disabled={isRunning}>{task.title[language]}</button>
        <div className={s.taskMeta}>
          <span>{task.completedSessions}/{task.sessions} <span className={s.muted}>{t('sessions', 'sesiones')}</span></span>
          <span>·</span><span>{formatDate(task.date)}</span>
          {task.priority === 'high' && !task.done && <span className={s.priority}><Flag size={10} aria-hidden="true" />{t('High', 'Alta')}</span>}
        </div>
      </div>
      <div className={s.taskActions}>
        {!task.done && <button className={s.iconButton} aria-label={`${t('Start demo focus', 'Iniciar concentración de ejemplo')}: ${task.title[language]}`} disabled={Boolean(activeTaskId) || task.completedSessions >= task.sessions} onClick={() => setActiveTaskId(task.id)}><Play size={15} aria-hidden="true" /></button>}
        <button className={s.iconButton} aria-label={`${t('Edit task', 'Editar tarea')}: ${task.title[language]}`} disabled={isRunning} onClick={() => editTask(task)}><Pencil size={14} aria-hidden="true" /></button>
      </div>
    </li>
  }

  function renderPost(post: DemoPost) {
    return <article className={s.postCard} key={post.id}>
      <div className={s.postHeader}><span className={s.avatar} aria-hidden="true">A</span><span><strong>Alex Morgan</strong><small>{formatDate(post.date)}</small></span><span className={s.postTag}>{post.tag[language]}</span></div>
      <h3>{post.title[language]}</h3>
      <p className={s.postBody}>{post.body[language]}</p>
      <div className={s.postFooter}>
        <span><Clock3 size={13} aria-hidden="true" />{duration(post.minutes)} {t('committed by this update', 'acumuladas hasta esta publicación')}</span>
        <button className={s.textLink} aria-pressed={liked.includes(post.id)} aria-label={`${t('Like update', 'Me gusta esta publicación')}: ${post.title[language]}`} onClick={() => setLiked(current => current.includes(post.id) ? current.filter(id => id !== post.id) : [...current, post.id])}><Heart size={15} fill={liked.includes(post.id) ? 'currentColor' : 'none'} aria-hidden="true" />{post.likes + Number(liked.includes(post.id))}</button>
      </div>
    </article>
  }

  return <div className={s.page} data-i18n-ignore>
    <div className={s.previewBar}>
      <span className={s.previewBadge}><Sparkles size={12} aria-hidden="true" />{t('DESIGN PREVIEW', 'VISTA PREVIA')}</span>
      <span>{t('Sample project · changes reset on reload', 'Proyecto de ejemplo · los cambios se borran al recargar')}</span>
    </div>
    <nav className={s.breadcrumbs} aria-label={t('Breadcrumb', 'Ruta de navegación')}><Link href="/projects"><ArrowLeft size={13} aria-hidden="true" />{t('All projects', 'Todos los proyectos')}</Link><span>/</span><span>{t('Project workspace', 'Espacio del proyecto')}</span></nav>

    <header className={s.hero}>
      <div className={s.heroCopy}>
        <div className={s.eyebrow}><span className={s.badge}><span aria-hidden="true">●</span>{progress === 100 ? t('Completed', 'Completado') : t('In progress', 'En curso')}</span></div>
        <h1>{project.title}</h1>
        <div className={s.owner}><span className={s.avatar} aria-hidden="true">A</span><span>Alex Morgan</span><span aria-hidden="true">·</span><span>{followerCount + Number(following)} {t('following along', 'siguiendo el proyecto')}</span></div>
      </div>
      <div className={s.heroActions}>
        <button className={s.button} aria-pressed={following} onClick={() => { setFollowing(!following); setNotice(following ? t('Demo subscription removed.', 'Suscripción de ejemplo eliminada.') : t('Following this sample project. No real notifications will be sent.', 'Ahora sigues este proyecto de ejemplo. No se enviarán notificaciones reales.')) }}>{following ? <BellRing size={15} aria-hidden="true" /> : <Bell size={15} aria-hidden="true" />}{following ? t('Following', 'Siguiendo') : t('Follow project', 'Seguir proyecto')}</button>
        <button className={`${s.button} ${s.ghostButton}`} onClick={() => setModal('project')}><Pencil size={13} aria-hidden="true" />{t('Edit project', 'Editar proyecto')}</button>
      </div>
    </header>

    <dl className={s.stats}>
      <div className={s.stat}><dt><Clock3 size={14} aria-hidden="true" />{t('Time committed', 'Tiempo dedicado')}</dt><dd className={s.statValue}>{duration(loggedSessions * 25)}</dd><small>{loggedSessions} {t('completed Pomodoros', 'Pomodoros completados')}</small></div>
      <div className={s.stat}><dt><Target size={14} aria-hidden="true" />{t('Plan progress', 'Progreso del plan')}</dt><dd className={s.statValue}>{progress}<span>%</span></dd><div className={s.progressTrack} role="progressbar" aria-label={t('Completed tasks', 'Tareas completadas')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span className={s.progressFill} style={{ width: `${progress}%` }} /></div><small>{doneTasks}/{tasks.length} {t('tasks complete', 'tareas completadas')}</small></div>
      <div className={s.stat}><dt><Timer size={14} aria-hidden="true" />{t('Sessions to go', 'Sesiones restantes')}</dt><dd className={s.statValue}>{remainingSessions}<span> × 25 min</span></dd><small>{duration(remainingSessions * 25)} {t('of planned focus', 'de concentración prevista')}</small></div>
      <div className={s.stat}><dt><Flag size={14} aria-hidden="true" />{t('The finish line', 'La meta')}</dt><dd className={s.statValue}>{formatDate(project.deadline)}</dd><small>{t('Started', 'Inicio')} {formatDate(projectStart)}<span> · 2026</span></small></div>
    </dl>

    <div className={s.tabs} role="tablist" aria-label={t('Project sections', 'Secciones del proyecto')} ref={tabsRef}>
      {tabIds.map((id, index) => <button key={id} id={`project-tab-${id}`} role="tab" aria-selected={tab === id} aria-controls={`project-panel-${id}`} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)} onKeyDown={event => selectTabByKey(event, index)}>
        {id === 'plan' ? <ListTodo size={16} aria-hidden="true" /> : id === 'calendar' ? <CalendarDays size={16} aria-hidden="true" /> : id === 'journal' ? <BookOpen size={16} aria-hidden="true" /> : <FolderOpen size={16} aria-hidden="true" />}{tabLabels[id]}{id === 'journal' && <span className={s.tabCount}>{posts.length}</span>}
      </button>)}
    </div>

    <div className={s.layout}>
      <div className={s.mainColumn}>
        <section id={`project-panel-${tab}`} role="tabpanel" aria-labelledby={`project-tab-${tab}`} tabIndex={0}>
          {tab === 'plan' && <>
            <div className={s.roadmap} aria-label={t('Project stages', 'Etapas del proyecto')}>
              {phases.map((item, index) => {
                const items = tasks.filter(task => task.phaseId === item.id)
                const done = items.length > 0 && items.every(task => task.done)
                return <button key={item.id} className={s.phaseStep} data-active={phaseId === item.id} data-done={done} aria-pressed={phaseId === item.id} onClick={() => setPhaseId(item.id)}>
                  <span className={s.phaseNumber}>{done ? <Check size={15} aria-hidden="true" /> : String(index + 1).padStart(2, '0')}</span><span className={s.phaseCopy}>{item.title[language]}<small className={s.phaseMeta}>{items.filter(task => task.done).length}/{items.length} {t('tasks', 'tareas')}</small></span>
                </button>
              })}
            </div>
            <div className={s.phaseHeading}><div><span className={s.tinyLabel}>{t('STAGE', 'ETAPA')} {phases.findIndex(value => value.id === phaseId) + 1}</span><h3>{phase.title[language]}</h3><p>{phase.description[language]}</p></div><span className={s.badge}>{phaseTasks.filter(task => task.done).length}/{phaseTasks.length}</span></div>
            <ul className={s.taskList}>{phaseTasks.map(renderTask)}</ul>
            {!phaseTasks.length && <div className={s.empty}><ListTodo size={22} aria-hidden="true" /><p>{t('Give this stage its first small step.', 'Añade el primer paso de esta etapa.')}</p></div>}
            <button className={s.addTask} onClick={() => editTask(null)}><Plus size={15} aria-hidden="true" />{t('Add a task', 'Añadir una tarea')}</button>
          </>}

          {tab === 'calendar' && <>
            <div className={s.sectionHeader}><div><span className={s.tinyLabel}>{t('ONE DAY AT A TIME', 'UN DÍA A LA VEZ')}</span><h2>{t('Make room for the work', 'Haz espacio para avanzar')}</h2><p>{t('A realistic place for every 25-minute session.', 'Un lugar realista para cada sesión de 25 minutos.')}</p></div></div>
            <div className={s.calendarHeader}><h3>{formatDate(firstWeek)} – {formatDate(weekDays[6], { month: 'short', day: 'numeric', year: 'numeric' })}</h3><div><button className={s.iconButton} disabled={weekOffset <= -2} aria-label={t('Previous week', 'Semana anterior')} onClick={() => { setWeekOffset(value => value - 1); setSelectedDay(shiftDemoDate(firstWeek, -7)) }}><ChevronLeft size={16} aria-hidden="true" /></button><button className={`${s.button} ${s.ghostButton}`} onClick={() => { setWeekOffset(0); setSelectedDay(DEMO_TODAY) }}>{t('Demo today', 'Hoy en la demo')}</button><button className={s.iconButton} disabled={weekOffset >= 8} aria-label={t('Next week', 'Semana siguiente')} onClick={() => { setWeekOffset(value => value + 1); setSelectedDay(shiftDemoDate(firstWeek, 7)) }}><ChevronRight size={16} aria-hidden="true" /></button></div></div>
            <div className={s.weekDays}>{weekDays.map(day => { const count = (schedule[day] || []).reduce((sum, entry) => sum + entry.sessions, 0); return <button key={day} className={s.dayButton} data-today={day === DEMO_TODAY} aria-pressed={day === selectedDay} aria-label={`${formatDate(day, { weekday: 'long', month: 'long', day: 'numeric' })}, ${count} ${t('sessions', 'sesiones')}`} onClick={() => setSelectedDay(day)}><span>{formatDate(day, { weekday: 'short' })}</span><strong className={s.dayNumber}>{formatDate(day, { day: 'numeric' })}</strong><span className={s.dayDots} aria-hidden="true">{Array.from({ length: Math.min(count, 4) }, (_, index) => <i key={index} />)}</span><small className={s.daySessions}>{count ? `${count} × 25m` : '—'}</small></button> })}</div>
            <div className={s.calendarSummary}><h3>{formatDate(selectedDay, { weekday: 'long', month: 'short', day: 'numeric' })}</h3><span>{duration(allocations.reduce((sum, entry) => sum + entry.sessions * 25, 0))} {t('planned', 'previstas')}</span></div>
            {allocations.length ? <ul className={s.taskList}>{allocations.map(entry => {
              const task = tasks.find(value => value.id === entry.taskId)!
              return <li className={s.scheduleRow} key={entry.taskId}><span className={s.scheduleTime}><Timer size={15} aria-hidden="true" />{entry.sessions}<small>× 25 min</small></span><div className={s.taskContent}><button className={s.taskTitle} disabled={activeTaskId === task.id} onClick={() => editTask(task)}>{task.title[language]}</button><small>{phases.find(value => value.id === task.phaseId)?.title[language]}</small></div><button className={s.iconButton} disabled={Boolean(activeTaskId)} aria-label={`${t('Start demo focus', 'Iniciar concentración de ejemplo')}: ${task.title[language]}`} onClick={() => setActiveTaskId(task.id)}><Play size={15} aria-hidden="true" /></button></li>
            })}</ul> : <div className={s.empty}><Sprout size={28} aria-hidden="true" /><h3>{t('A little breathing room', 'Un pequeño respiro')}</h3><p>{t('No upcoming sessions here. Leave it open or move a task to this day.', 'No hay sesiones pendientes. Deja este día libre o mueve una tarea aquí.')}</p><button className={s.button} onClick={() => editTask(null)}><Plus size={14} aria-hidden="true" />{t('Add a task', 'Añadir una tarea')}</button></div>}
            <p className={s.note}>{t('Upcoming work only. Longer tasks are split across days to fit your daily focus budget.', 'Solo trabajo pendiente. Las tareas largas se reparten entre días según tus horas disponibles.')}</p>
          </>}

          {tab === 'journal' && <>
            <div className={s.sectionHeader}><div><span className={s.tinyLabel}>{t('THE STORY SO FAR', 'LA HISTORIA HASTA AHORA')}</span><h2>{t('Keep the process, too.', 'Guarda también el proceso.')}</h2><p>{t('Notes, small wins, and things learned along the way.', 'Notas, pequeños logros y lo aprendido por el camino.')}</p></div><button className={`${s.button} ${s.primaryButton}`} onClick={() => setModal('post')}><Plus size={14} aria-hidden="true" />{t('Write an update', 'Escribir una publicación')}</button></div>
            <div>{posts.map(renderPost)}{!posts.length && <div className={s.empty}><BookOpen size={26} aria-hidden="true" /><h3>{t('Every project starts somewhere.', 'Todo proyecto tiene un comienzo.')}</h3><p>{t('Write the first note about what you want to build or learn.', 'Escribe la primera nota sobre lo que quieres crear o aprender.')}</p></div>}</div>
          </>}

          {tab === 'about' && <>
            <div className={s.sectionHeader}><div><span className={s.tinyLabel}>{t('THE BIG PICTURE', 'LA VISIÓN GENERAL')}</span><h2>{t('What I’m working toward', 'Lo que quiero conseguir')}</h2></div><button className={s.iconButton} aria-label={t('Edit project', 'Editar proyecto')} onClick={() => setModal('project')}><Pencil size={16} aria-hidden="true" /></button></div>
            <section className={s.aboutSection}><h3>{t('The idea', 'La idea')}</h3><p>{project.description}</p></section>
            <section className={s.outcome}><Target size={21} aria-hidden="true" /><div><span className={s.tinyLabel}>{t('WHAT FINISHED LOOKS LIKE', 'CÓMO SERÁ EL RESULTADO')}</span><p>{project.outcome}</p></div></section>
            <section className={s.aboutSection}><h3>{t('A plan that fits real life', 'Un plan que encaja en tu vida')}</h3><p>{t('A broad goal becomes milestones, practical tasks, and focused sessions. Adjust the plan as you learn; your completed work stays part of the story.', 'Una gran meta se convierte en etapas, tareas concretas y sesiones de concentración. Ajusta el plan mientras avanzas; el trabajo completado sigue siendo parte de la historia.')}</p><button className={s.button} onClick={() => setModal('project')}><Settings2 size={15} aria-hidden="true" />{t('Edit goal & availability', 'Editar objetivo y disponibilidad')}</button></section>
            <div className={s.sectionHeader}><div><span className={s.tinyLabel}>{t('A PLACE TO START', 'UN PUNTO DE PARTIDA')}</span><h2>{t('Different goals. Same small steps.', 'Distintas metas. Pequeños pasos.')}</h2></div></div>
            <div className={s.templateGrid}>{demoTemplates.map(template => { const Icon = templateIcons[template.icon]; return <button key={template.id} className={s.templateButton} onClick={() => { setSelectedTemplate(template); setModal('project') }}><Icon size={21} className={s.templateIcon} aria-hidden="true" /><strong>{template.name[language]}</strong><span>{template.description[language]}</span><ArrowRight size={15} aria-hidden="true" /></button> })}</div>
          </>}
        </section>
        {tabIds.filter(id => id !== tab).map(id => <section key={id} id={`project-panel-${id}`} role="tabpanel" aria-labelledby={`project-tab-${id}`} hidden />)}
      </div>

      <aside className={s.sidebar} aria-label={t('Project companion', 'Ayuda para el proyecto')}>
        {activeTask ? <DemoFocus key={activeTask.id} task={activeTask} onComplete={completeSession} onStop={() => { setActiveTaskId(null); setNotice(t('Demo session stopped. No time was added.', 'Sesión de ejemplo detenida. No se añadió tiempo.')) }} /> : <section className={s.coach}>
          <div className={s.coachHeading}><span className={s.coachLabel}><Sparkles size={15} aria-hidden="true" />{t('Next focus session', 'Próxima sesión')}</span></div>
          {nextTask ? <>
            <h3 className={s.coachTask}>{nextTask.title[language]}</h3>
            {nextTask.completedSessions >= nextTask.sessions ? <>
              <p className={s.note}>{t('All planned sessions are logged. Review your work, then mark the task complete. Need more time? Increase its estimate in Edit task.', 'Todas las sesiones previstas están registradas. Revisa el trabajo y completa la tarea. Si necesitas más tiempo, aumenta la estimación al editarla.')}</p>
              <button className={`${s.button} ${s.primaryButton}`} onClick={() => setTasks(current => current.map(task => task.id === nextTask.id ? { ...task, done: true } : task))}><Check size={14} aria-hidden="true" />{t('Mark task complete', 'Completar tarea')}</button>
            </> : <button className={`${s.button} ${s.primaryButton}`} onClick={() => setActiveTaskId(nextTask.id)}><Play size={14} aria-hidden="true" />{t('Start 25-minute focus', 'Concentrarme 25 minutos')}</button>}
            <button className={s.nextButton} aria-expanded={showSteps} aria-controls="demo-next-steps" onClick={() => setShowSteps(!showSteps)}>
              {t('Task details & steps', 'Detalles y pasos')}<ChevronRight size={14} aria-hidden="true" />
            </button>
            <div id="demo-next-steps" hidden={!showSteps}>
              <p className={s.note}>{nextTask.details[language]}</p>
              <ol className={s.checklist}>{nextTask.checklist.map((step, index) => <li key={index}><span>{index + 1}</span>{step[language]}</li>)}</ol>
            </div>
            <small className={s.note}>{t('Sample AI suggestion · local demo timer', 'Sugerencia de IA de ejemplo · temporizador local')}</small>
          </> : <div className={s.empty}>
            <CheckCheck size={28} aria-hidden="true" />
            <h3>{tasks.length ? t('You made it.', 'Lo conseguiste.') : t('Start with a small step.', 'Empieza con un pequeño paso.')}</h3>
            <p>{tasks.length ? t('Write an update to remember this milestone.', 'Escribe una publicación para recordar este hito.') : t('Add a task or choose a template for your goal.', 'Añade una tarea o elige una plantilla para tu meta.')}</p>
            <button className={s.button} onClick={() => tasks.length ? setModal('post') : editTask(null)}>{tasks.length ? t('Write an update', 'Escribir una publicación') : t('Add a task', 'Añadir una tarea')}</button>
          </div>}
        </section>}

        {overDeadline && <p className={s.scheduleWarning}><Flag size={14} aria-hidden="true" />{t('Some sessions fall after your deadline.', 'Algunas sesiones quedan después del plazo.')}<button className={s.textLink} onClick={() => setModal('adapt')}>{t('Adjust schedule', 'Ajustar horario')}</button></p>}
        <details className={s.planDetails}>
          <summary>{t('Schedule & settings', 'Horario y ajustes')}</summary>
          <section className={s.planCard}>
            <div className={s.coachHeading}><h3>{t('Your rhythm', 'Tu ritmo')}</h3><button className={s.iconButton} aria-label={t('Edit availability', 'Editar disponibilidad')} onClick={() => setModal('project')}><Settings2 size={14} aria-hidden="true" /></button></div>
            <dl className={s.planFacts}><div><dt><CalendarDays size={14} aria-hidden="true" />{t('Working days', 'Días de trabajo')}</dt><dd>{project.days} / {t('week', 'semana')}</dd></div><div><dt><Clock3 size={14} aria-hidden="true" />{t('Focus per day', 'Concentración diaria')}</dt><dd>{new Intl.NumberFormat(language).format(project.hours)} h</dd></div><div><dt><Sprout size={14} aria-hidden="true" />{t('Pace', 'Ritmo')}</dt><dd>{project.difficulty === 'light' ? t('Gentle', 'Suave') : project.difficulty === 'ambitious' ? t('Ambitious', 'Ambicioso') : t('Balanced', 'Equilibrado')}</dd></div></dl>
            <p className={s.note}>{t('Workdays start on Monday. Breaks are extra.', 'Los días laborables empiezan el lunes. Las pausas van aparte.')}</p>
          </section>
          <section className={s.adaptive} data-active={overDeadline}>
            <RotateCcw size={17} aria-hidden="true" /><h3>{adapted ? t('A little more breathing room.', 'Un poco más de margen.') : t('Plans can change. That’s okay.', 'Los planes cambian. Está bien.')}</h3><p>{overDeadline ? t('Some sessions fall after your deadline. Redistribute the remaining work or adjust your availability.', 'Algunas sesiones quedan después del plazo. Reparte el trabajo pendiente o ajusta tu disponibilidad.') : adapted ? t('Your remaining sessions now fit your available workdays.', 'Tus sesiones pendientes se han repartido entre los días disponibles.') : t('Missed a day? Let your next steps move with you.', '¿Te saltaste un día? Ajusta los próximos pasos a tu ritmo.')}</p>
            {projectedEnd && <small>{t('Planned finish:', 'Final previsto:')} {formatDate(projectedEnd)}</small>}
            <button className={s.textLink} onClick={() => setModal('adapt')}><Sparkles size={13} aria-hidden="true" />{t('Rebalance my plan', 'Reorganizar mi plan')}<ArrowRight size={13} aria-hidden="true" /></button>
          </section>
          <button className={s.sectionLink} onClick={() => setModal('templates')}><LayoutTemplate size={17} aria-hidden="true" /><span>{t('Start from a template', 'Empezar con una plantilla')}</span><ArrowRight size={14} aria-hidden="true" /></button>
        </details>
      </aside>
    </div>
    <footer className={s.footer}><Sprout size={15} aria-hidden="true" /><span>{t('Good things take a few Pomodoros.', 'Las cosas buenas llevan unos cuantos Pomodoros.')}</span><span>{t('Prototype · October 28, 2026', 'Prototipo · 28 de octubre de 2026')}</span></footer>

    <ProjectDemoDialogs
      key={`${modal || 'closed'}-${editingTask?.id || 'new'}-${selectedTemplate?.id || 'project'}`}
      open={modal} onClose={() => { setModal(null); setSelectedTemplate(null) }}
      project={selectedTemplate ? { ...project, title: selectedTemplate.name[language], description: selectedTemplate.goal[language], outcome: selectedTemplate.goal[language], deadline: selectedTemplate.id === 'weekly' ? shiftDemoDate(DEMO_TODAY, 6) : project.deadline } : project}
      task={editingTask} phases={phases} newTaskPhaseId={phaseId} newTaskDate={tab === 'calendar' ? selectedDay : DEMO_TODAY} templatePreview={Boolean(selectedTemplate)}
      onSaveProject={value => {
        setProjectOverride(value)
        if (selectedTemplate) {
          const preview = createTemplatePreview(selectedTemplate)
          setPhases(preview.phases)
          setTasks(rebalanceDemoTasks(preview.tasks, value.days, value.hours))
          setPhaseId(preview.phases[0].id)
          setPosts([])
          setLiked([])
          setFollowing(false)
          setFollowerCount(0)
          setProjectStart(DEMO_TODAY)
          setActiveTaskId(null)
        } else {
          setTasks(current => rebalanceDemoTasks(current, value.days, value.hours))
        }
        setModal(null)
        setAdapted(true)
        setTab('plan')
        setSelectedTemplate(null)
        setShowSteps(false)
        setNotice(t('Demo plan updated. The sample tasks show how your plan will look.', 'Plan de ejemplo actualizado. Las tareas de muestra enseñan cómo se verá tu plan.'))
      }}
      onSaveTask={value => { setTasks(current => current.some(task => task.id === value.id) ? current.map(task => task.id === value.id ? value : task) : [...current, value]); setPhaseId(value.phaseId); setModal(null); setAdapted(false); setNotice(t('Task saved in this preview.', 'Tarea guardada en esta vista previa.')) }}
      onDeleteTask={value => { setTasks(current => current.filter(task => task.id !== value.id)); setModal(null); setNotice(t('Task removed from this preview.', 'Tarea eliminada de esta vista previa.')) }}
      onPublish={(title, body) => { setPosts(current => [{ id: crypto.randomUUID(), title: { en: title, es: title }, body: { en: body, es: body }, date: DEMO_TODAY, minutes: loggedSessions * 25, likes: 0, tag: { en: 'Project update', es: 'Actualización' } }, ...current]); setModal(null); setTab('journal'); setNotice(t('Update added to the demo journal. It is not published publicly.', 'Publicación añadida al diario de ejemplo. No es pública.')) }}
      onUseTemplate={value => { setSelectedTemplate(value); setModal('project') }}
      onAdapt={() => { setTasks(current => rebalanceDemoTasks(current, project.days, project.hours)); setAdapted(true); setModal(null); setTab('calendar'); setWeekOffset(0); setSelectedDay(DEMO_TODAY); setNotice(t('Demo schedule rebalanced. Completed work is unchanged.', 'Calendario de ejemplo reorganizado. El trabajo completado se conserva.')) }}
    />
    <NotificationToast message={notice} isVisible={Boolean(notice)} onClose={closeNotice} type="success" />
  </div>
}
