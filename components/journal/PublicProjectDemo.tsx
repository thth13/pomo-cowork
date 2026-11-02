'use client'

import { useState } from 'react'
import { useJournalText } from '@/lib/journal/client'
import type { Author, Project } from '@/lib/journal/types'
import type { ProjectOverview } from '@/lib/journal/projectOverview'
import PublicProjectView from './PublicProjectView'

export default function PublicProjectDemo({ tab, today }: { tab: string; today: string }) {
  const t = useJournalText()
  const [following, setFollowing] = useState(false)
  const day = (offset: number) => new Date(new Date(`${today}T12:00:00Z`).getTime() + offset * 86400000).toISOString()
  const user: Author = { id: 'demo-author', username: 'alex-demo', displayName: 'Alex Morgan', avatarUrl: null }
  const project: Project = {
    id: 'demo-project', userId: user.id, workProjectId: null, name: 'Pomo Cowork', slug: 'pomo-cowork',
    imageUrl: '/icons/favicon-192.png', coverUrl: '/backgrounds/images/pixel-autumn.png',
    description: t('A cozy place to focus, work together, and make every study session count. Building one Pomodoro at a time.', 'Un lugar acogedor para concentrarse, trabajar juntos y aprovechar cada sesión. Un Pomodoro a la vez.'),
    content: '', status: 'BUILDING', visibility: 'PUBLIC', pinned: true, websiteUrl: null, githubUrl: null,
    startedAt: day(-42), completedAt: null, showTasks: true, views: 1248, stats: { seconds: 86.5 * 3600, sessions: 214 },
  }
  const days = Array.from({ length: 43 }, (_, index) => ({ date: day(index - 42).slice(0, 10), seconds: index < 21 && index % 6 === 0 ? 0 : (45 + (index * 37) % 165) * 60, sessions: 2 + index % 5 }))
  const mondayOffset = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7
  const overview: ProjectOverview = {
    totalTasks: 52, completedTasks: 38, moreTasks: false, followers: 128,
    seconds: 86.5 * 3600, sessions: 214, pomodoros: 196, streak: 21, days,
    week: Array.from({ length: 7 }, (_, index) => {
      const date = day(index - mondayOffset).slice(0, 10)
      const entry = days.find(item => item.date === date)
      return { date, minutes: (entry?.seconds || 0) / 60, sessions: entry?.sessions || 0, completed: entry?.sessions || 0 }
    }),
    recent: [0, -1, -2, -3].map((offset, index) => ({ id: `demo-session-${index}`, date: day(offset), minutes: [50, 75, 25, 110][index], type: index === 3 ? 'TIME_TRACKING' : 'WORK' })),
    tasks: [
      [t('Add weekly progress emails', 'Añadir correos de progreso semanal'), false],
      [t('Improve the mobile timer layout', 'Mejorar el temporizador móvil'), false],
      [t('Build a shared focus playlist', 'Crear una lista musical compartida'), false],
      [t('Add project milestone celebrations', 'Añadir celebraciones de hitos'), false],
      [t('Implement room presence indicators', 'Implementar indicadores de presencia'), true],
      [t('Design the new onboarding flow', 'Diseñar la nueva bienvenida'), true],
      [t('Ship public project pages', 'Publicar páginas de proyectos'), true],
    ].map(([title, completed], index) => ({ id: `demo-task-${index}`, title: String(title), completed: Boolean(completed) })),
  }
  const entries = [
    { id: 'first-100', label: t('Milestone', 'Hito'), title: t('We just reached 100 active users!', '¡Llegamos a 100 usuarios activos!'), content: t('A little milestone that means a lot. Six weeks ago this was just a small idea. Today, people from 12 countries are focusing together. Next up: shared focus rooms and better weekly stats.', 'Un pequeño hito que significa mucho. Hace seis semanas era solo una idea. Hoy, personas de 12 países se concentran juntas. Lo próximo: salas compartidas y mejores estadísticas.'), likes: 24, date: day(0) },
    { id: 'focus-rooms', label: t('Update', 'Actualización'), title: t('A calmer space to do your best work', 'Un espacio tranquilo para trabajar mejor'), content: t('The new focus rooms are here. We simplified the timer, added quiet presence indicators, and gave every project a little more room to breathe. Thanks to everyone who shared feedback this week.', 'Las nuevas salas ya están aquí. Simplificamos el temporizador, añadimos indicadores de presencia y dimos más espacio a cada proyecto. Gracias por los comentarios de esta semana.'), likes: 18, date: day(-3) },
    { id: 'weekly-notes', label: t('Weekly update', 'Resumen semanal'), title: t('Week six: small steps, steady progress', 'Semana seis: pequeños pasos, avances constantes'), content: t('This week: shipped public pages, finished the mobile navigation, and spent 12 focused hours on the details. Next week I’m working on weekly progress emails and a shared playlist.', 'Esta semana: páginas públicas, navegación móvil y 12 horas de concentración en los detalles. La próxima semana: correos de progreso y una lista musical compartida.'), likes: 12, date: day(-6) },
  ]
  return <>
    <p className="journal-muted" role="note">{t('Demo project · Sample data. Interactions stay in this preview.', 'Proyecto de demostración · Datos de ejemplo. Las interacciones se quedan en esta vista.')}</p>
    <PublicProjectView preview project={project} user={user} overview={overview} tab={tab}
      followControl={<div><button className="journal-button secondary" type="button" aria-pressed={following} onClick={() => setFollowing(value => !value)}>{following ? t('Following', 'Siguiendo') : t('Follow project', 'Seguir proyecto')}</button><small>{128 + Number(following)} {t('followers', 'seguidores')}</small></div>}
      milestone={{ title: entries[0].title, slug: entries[0].id, date: entries[0].date }}
      posts={<>{entries.slice(0, tab === 'overview' ? 2 : 3).map(entry => <DemoPost key={entry.id} entry={entry} />)}</>}
      timeline={<section className="journal-card"><h2>{t('Project timeline', 'Cronología del proyecto')}</h2><ol className="journal-timeline">{entries.map(entry => <li key={entry.id}><time dateTime={entry.date}>{entry.date.slice(0, 10)}</time><a href={`?tab=blog#${entry.id}`}>{entry.title}</a></li>)}<li><time dateTime={project.startedAt}>{project.startedAt.slice(0, 10)}</time><strong>{t('Project started', 'Proyecto iniciado')}</strong></li></ol></section>}
      about={<><p>{t('Building a friendly productivity platform with a Pomodoro timer, coworking rooms, social challenges, and progress tracking.', 'Creando una plataforma de productividad con temporizador Pomodoro, salas de trabajo, retos sociales y seguimiento del progreso.')}</p><p className="journal-muted">Next.js · Node.js · PostgreSQL</p><span className="journal-badge">Productivity / SaaS</span></>}
      pagination={null}
    />
  </>
}

function DemoPost({ entry }: { entry: { id: string; label: string; title: string; content: string; likes: number; date: string } }) {
  const t = useJournalText()
  const [liked, setLiked] = useState(false)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [comments, setComments] = useState<string[]>([])
  return <article id={entry.id} className="journal-card journal-update">
    <header className="journal-row"><div className="journal-author"><div><strong>Alex Morgan</strong><small>@alex-demo</small></div></div><span className="journal-badge">{entry.label}</span></header>
    <h2>{entry.title}</h2><p>{entry.content}</p><p className="journal-muted"><time dateTime={entry.date}>{entry.date.slice(0, 10)}</time></p>
    <div className="journal-interactions"><div className="journal-actions">
      <button type="button" aria-pressed={liked} onClick={() => setLiked(value => !value)}>{liked ? t('Liked', 'Te gusta') : t('Like', 'Me gusta')} · {entry.likes + Number(liked)}</button>
      <button type="button" aria-expanded={open} aria-controls={`${entry.id}-comments`} onClick={() => setOpen(value => !value)}>{t('Comments', 'Comentarios')} · {comments.length + 1}</button>
    </div>{open && <section id={`${entry.id}-comments`} aria-label={t('Comments', 'Comentarios')}>
      <div className="journal-comment"><strong>Jamie</strong><p>{t('Love seeing the progress. The focus rooms are already part of my daily routine!', '¡Me encanta ver los avances! Las salas ya son parte de mi rutina diaria.')}</p></div>
      <div aria-live="polite">{comments.map((comment, index) => <div className="journal-comment" key={index}><strong>{t('You', 'Tú')}</strong><p>{comment}</p></div>)}</div>
      <form noValidate onSubmit={event => { event.preventDefault(); if (!draft.trim()) return; setComments(previous => [...previous, draft.trim()]); setDraft('') }}>
        <label>{t('Your comment', 'Tu comentario')}<textarea className="resize-none" rows={3} maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} /></label>
        <button className="journal-button" disabled={!draft.trim()}>{t('Post comment', 'Publicar comentario')}</button>
      </form>
    </section>}</div>
  </article>
}
