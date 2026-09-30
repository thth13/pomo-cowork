'use client'

import UnsavedChangesGuard from './UnsavedChangesGuard'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Post, Project, PageResult, Stats, duration, profileHref } from '@/lib/journal/types'
import { journalApi, useJournalQuery, useJournalMutation, useJournalText, useUnsaved } from '@/lib/journal/client'
import { milestoneTypes } from '@/lib/journal/validation'
import { AuthGate, Feedback, JournalLoading, QueryError, DeleteButton } from './Primitives'
import { Field, Area, ImageAttachments, CancelEdit } from './FormFields'
import Markdown from './Markdown'
export default function PostComposer({
  edit,
  project,
  weekly
}: {
  edit?: string;
  project?: string;
  weekly?: boolean;
}) {
  return <AuthGate><Loader edit={edit} project={project} weekly={weekly} /></AuthGate>
}
function Loader({
  edit,
  project,
  weekly
}: {
  edit?: string;
  project?: string;
  weekly?: boolean;
}) {
  const query = useJournalQuery<Post>(edit ? `posts/${edit}` : null)
  if (edit && query.loading) return <JournalLoading />
  if (query.error) return <QueryError error={query.error} retry={query.reload} />
  if (edit && !query.data) return null
  return <Composer post={query.data || undefined} initialProject={project} weekly={weekly} />
}
function Composer({
  post,
  initialProject,
  weekly
}: {
  post?: Post;
  initialProject?: string;
  weekly?: boolean;
}) {
  const t = useJournalText(),
    state = useJournalMutation(),
    router = useRouter()
  const requestKey = useRef<string>()
  const [projectPage, setProjectPage] = useState(1),
    projects = useJournalQuery<PageResult<Pick<Project, 'id' | 'name' | 'visibility'>>>(`projects?picker=1&page=${projectPage}`)
  const [values, setValues] = useState({
    projectId: post?.projectId || initialProject || '',
    title: post?.title || '',
    content: post?.content || (weekly ? '## What I shipped\n\n- \n\n## What I learned\n\n\n\n## Next week\n\n- ' : ''),
    type: post?.type || (weekly ? 'WEEKLY_UPDATE' : 'UPDATE'),
    visibility: post?.visibility || 'PUBLIC',
    showFocusStats: post?.showFocusStats ?? Boolean(weekly),
    important: post?.important || false,
    milestoneType: post?.milestone?.type || 'CUSTOM',
    achievedAt: post?.milestone?.achievedAt.slice(0, 10) || new Date().toISOString().slice(0, 10),
    weekStart: post?.statsFrom || ''
  })
  const selectedProject = useJournalQuery<Project>(values.projectId ? `projects/${values.projectId}` : null)
  const [images, setImages] = useState(post?.images || []),
    [uploading, setUploading] = useState(false),
    [dirty, setDirty] = useState(false),
    [preview, setPreview] = useState(false)
  const stats = useJournalQuery<Stats & {
    from: string | null;
    to: string;
  }>(`weekly?${values.projectId ? `projectId=${values.projectId}&` : ''}${values.type === 'MILESTONE' ? `period=total&at=${values.achievedAt}` : ''}`)
  useUnsaved(dirty)
  const update = (key: keyof typeof values, value: string | boolean) => {
    setValues(v => ({
      ...v,
      [key]: value
    }))
    setDirty(true)
  }
  const save = (published: boolean) => void state.run(async () => {
    const result = await journalApi<{
      slug: string;
      username: string;
    }>(`posts${post ? `/${post.id}` : ''}`, {
      method: post ? 'PUT' : 'POST',
      body: JSON.stringify({
        ...values,
        requestId: requestKey.current || (requestKey.current = crypto.randomUUID()),
        images,
        published,
        weekStart: values.weekStart || stats.data?.from || undefined
      })
    })
    setDirty(false)
    router.push(published && values.visibility === 'PUBLIC' ? `${profileHref(result.username)}/posts/${result.slug}` : '/journal')
    router.refresh()
  }, published ? t('Update published', 'Actualización publicada') : t('Draft saved', 'Borrador guardado'))
  const presetLabels = [t('Custom', 'Personalizado'), t('Project launched', 'Proyecto lanzado'), t('First user', 'Primer usuario'), t('100 users', '100 usuarios'), t('First revenue', 'Primer ingreso'), '$100 MRR', '$1K MRR']
  const savedStats = post && post.type === values.type && post.projectId === (values.projectId || null) && (values.type !== 'MILESTONE' || post.milestone?.achievedAt.slice(0, 10) === values.achievedAt) ? {
    seconds: post.focusedSecondsSnapshot || 0,
    sessions: post.sessionsSnapshot || 0
  } : null
  return <section className="journal-form">
    <UnsavedChangesGuard dirty={dirty} onDiscard={() => setDirty(false)} />
    <h1>{post ? t('Edit update', 'Editar actualización') : t('Share what you are working on', 'Comparte en qué estás trabajando')}</h1>
    <p>{t('A short note is enough. Share the work, a lesson, or a milestone.', 'Una nota breve es suficiente. Comparte tu trabajo, una lección o un hito.')}</p>
    <form noValidate onSubmit={e => {
      e.preventDefault()
      save(true)
    }}>
      <Feedback state={state} />
      <div className="journal-fields">
        <label>
          {t('Project (optional)', 'Proyecto (opcional)')}
          <select value={values.projectId} onChange={e => update('projectId', e.target.value)} disabled={projects.loading}>
            <option value="">{t('No project', 'Sin proyecto')}</option>
            {values.projectId && !projects.data?.items.some(p => p.id === values.projectId) && <option value={values.projectId}>{selectedProject.data?.name || t('Selected project', 'Proyecto seleccionado')}</option>}
            {projects.data?.items.map(p => <option key={p.id} value={p.id}>
              {p.name}
              {' '}
              ·
              {' '}
              {p.visibility.toLowerCase()}
            </option>)}
          </select>
        </label>
        <label>
          {t('Type', 'Tipo')}
          <select value={values.type} onChange={e => update('type', e.target.value)}>
            <option value="UPDATE">{t('Update', 'Actualización')}</option>
            <option value="MILESTONE">{t('Milestone', 'Hito')}</option>
            <option value="WEEKLY_UPDATE">{t('Weekly update', 'Resumen semanal')}</option>
          </select>
        </label>
      </div>
      {projects.error && <QueryError error={projects.error} retry={projects.reload} />}
      <div className="journal-actions">
        {projectPage > 1 && <button type="button" onClick={() => setProjectPage(projectPage - 1)}>{t('Previous projects', 'Proyectos anteriores')}</button>}
        {projects.data?.hasMore && <button type="button" onClick={() => setProjectPage(projectPage + 1)}>{t('More projects', 'Más proyectos')}</button>}
      </div>
      {selectedProject.error && <QueryError error={selectedProject.error} retry={selectedProject.reload} />}
      {selectedProject.data?.visibility === 'PRIVATE' && <p className="journal-muted">{t('This project is private. Save a private update or draft, or make the project public first.', 'Este proyecto es privado. Guarda una actualización privada o un borrador, o haz público el proyecto primero.')}</p>}
      {values.type === 'MILESTONE' && <div className="journal-fields">
        <label>
          {t('Milestone', 'Hito')}
          <select value={values.milestoneType} onChange={e => {
            update('milestoneType', e.target.value)
            const index = milestoneTypes.indexOf((e.target.value as typeof milestoneTypes[number]))
            if (index > 0) update('title', presetLabels[index])
          }}>
            {milestoneTypes.map((type, i) => <option key={type} value={type}>{presetLabels[i]}</option>)}
          </select>
        </label>
        <Field label={t('Achieved on', 'Fecha del hito')} name="achievedAt" type="date" value={values.achievedAt} max={new Date().toISOString().slice(0, 10)} onChange={e => update('achievedAt', e.target.value)} error={state.field === 'achievedAt' ? state.error : undefined} />
      </div>}
      <Field label={values.type === 'MILESTONE' ? t('Milestone title', 'Título del hito') : t('Title (optional)', 'Título (opcional)')} name="title" maxLength={160} value={values.title} error={state.field === 'title' ? state.error : undefined} onChange={e => update('title', e.target.value)} />
      <Area label={t('Content', 'Contenido')} name="content" rows={12} maxLength={20000} value={values.content} error={state.field === 'content' ? state.error : undefined} onChange={e => update('content', e.target.value)} />
      <p className="journal-muted">{t('Markdown: ## heading, **bold**, - list, [label](https://example.com).', 'Markdown: ## título, **negrita**, - lista, [texto](https://ejemplo.com).')}</p>
      <button type="button" aria-expanded={preview} onClick={() => setPreview(!preview)}>{t('Preview', 'Vista previa')}</button>
      {preview && <section className="journal-card"><Markdown content={values.content} /></section>}
      <ImageAttachments images={images} onChange={items => {
        setImages(items)
        setDirty(true)
      }} onBusy={setUploading} />
      <div className="journal-card">
        <h2>{savedStats ? t('Saved focus snapshot', 'Estadísticas guardadas') : values.type === 'MILESTONE' ? t('Focus before this milestone', 'Enfoque antes de este hito') : t('This week · UTC', 'Esta semana · UTC')}</h2>
        {stats.loading ? <p role="status">{t('Loading focus time…', 'Cargando tiempo…')}</p> : stats.error ? <QueryError error={stats.error} retry={stats.reload} /> : stats.data && <p>
          {duration((savedStats || stats.data).seconds)}
          {' '}
          ·
          {' '}
          {(savedStats || stats.data).sessions}
          {' '}
          {t('sessions', 'sesiones')}
        </p>}
        <label>
          <input type="checkbox" checked={values.showFocusStats} onChange={e => update('showFocusStats', e.target.checked)} />
          {t('Show focus stats', 'Mostrar estadísticas de enfoque')}
        </label>
      </div>
      <label>
        {t('Visibility', 'Visibilidad')}
        <select value={values.visibility} onChange={e => update('visibility', e.target.value)}>
          <option value="PUBLIC">{t('Public', 'Público')}</option>
          <option value="PRIVATE">{t('Private', 'Privado')}</option>
        </select>
      </label>
      <label>
        <input type="checkbox" checked={values.important} onChange={e => update('important', e.target.checked)} />
        {t('Include in the project timeline', 'Incluir en la cronología del proyecto')}
      </label>
      <div className="journal-actions">
        <button className="journal-button" disabled={state.busy || uploading || stats.loading || Boolean(stats.error)} aria-busy={state.busy}>{state.busy ? t('Saving…', 'Guardando…') : t('Publish update', 'Publicar actualización')}</button>
        <button type="button" disabled={state.busy || uploading} onClick={() => save(false)}>{post?.publishedAt ? t('Unpublish and save draft', 'Retirar publicación y guardar borrador') : t('Save draft', 'Guardar borrador')}</button>
        <CancelEdit dirty={dirty} href="/journal" />
      </div>
    </form>
    {post && <DeleteButton label={t('Delete update', 'Eliminar actualización')} busy={state.busy} onDelete={() => void state.run(async () => {
      await journalApi(`posts/${post.id}`, {
        method: 'DELETE'
      })
      setDirty(false)
      router.push('/journal')
      router.refresh()
    })} />}
  </section>
}
