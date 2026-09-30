'use client'

import UnsavedChangesGuard from './UnsavedChangesGuard'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Project } from '@/lib/journal/types'
import { projectStatuses, slugify } from '@/lib/journal/validation'
import { journalApi, useJournalQuery, useJournalMutation, useJournalText, useUnsaved } from '@/lib/journal/client'
import { AuthGate, Feedback, JournalLoading, QueryError, DeleteButton } from './Primitives'
import { Field, Area, ImageAttachments, CancelEdit } from './FormFields'
export default function ProjectEditor({
  id
}: {
  id?: string;
}) {
  return <AuthGate><Loader id={id} /></AuthGate>
}
function Loader({
  id
}: {
  id?: string;
}) {
  const query = useJournalQuery<Project>(id ? `projects/${id}` : null)
  if (id && query.loading) return <JournalLoading />
  if (query.error) return <QueryError error={query.error} retry={query.reload} />
  if (id && !query.data) return null
  return <Editor key={id || 'new'} project={query.data || undefined} />
}
function Editor({
  project
}: {
  project?: Project;
}) {
  const t = useJournalText(),
    state = useJournalMutation(),
    router = useRouter()
  const requestKey = useRef<string>()
  const [values, setValues] = useState({
    name: project?.name || '',
    slug: project?.slug || '',
    description: project?.description || '',
    content: project?.content || '',
    status: project?.status || 'PLANNING',
    visibility: project?.visibility || 'PRIVATE',
    pinned: project?.pinned || false,
    websiteUrl: project?.websiteUrl || '',
    githubUrl: project?.githubUrl || '',
    startedAt: (project?.startedAt || new Date().toISOString()).slice(0, 10),
    completedAt: project?.completedAt?.slice(0, 10) || ''
  })
  const [images, setImages] = useState(project?.imageUrl ? [project.imageUrl] : []),
    [uploading, setUploading] = useState(false),
    [dirty, setDirty] = useState(false)
  useUnsaved(dirty)
  const update = (key: keyof typeof values, value: string | boolean) => {
    setValues(v => ({
      ...v,
      [key]: value
    }))
    setDirty(true)
  }
  const error = (name: string) => state.field === name ? state.error : undefined
  return <section className="journal-form">
    <UnsavedChangesGuard dirty={dirty} onDiscard={() => setDirty(false)} />
    <h1>{project ? t('Edit project', 'Editar proyecto') : t('Start something worth focusing on', 'Empieza algo que merezca tu atención')}</h1>
    <p>{t('Keep it private while planning, or make it public to share your progress.', 'Mantenlo privado mientras planificas o hazlo público para compartir tus avances.')}</p>
    <form noValidate onSubmit={event => {
      event.preventDefault()
      void state.run(async () => {
        await journalApi(`projects${project ? `/${project.id}` : ''}`, {
          method: project ? 'PUT' : 'POST',
          body: JSON.stringify({
            ...values,
            requestId: requestKey.current || (requestKey.current = crypto.randomUUID()),
            slug: values.slug || slugify(values.name),
            imageUrl: images[0] || null
          })
        })
        setDirty(false)
        router.push('/projects')
        router.refresh()
      }, t('Project saved', 'Proyecto guardado'))
    }}>
      <Feedback state={state} />
      <Field label={t('Project name', 'Nombre del proyecto')} name="name" value={values.name} maxLength={100} required error={error('name')} onChange={e => update('name', e.target.value)} />
      <Field label={t('URL slug', 'Identificador de URL')} name="slug" value={values.slug} placeholder={slugify(values.name)} maxLength={80} error={error('slug')} onChange={e => update('slug', e.target.value)} />
      <Area label={t('Short description', 'Descripción breve')} name="description" value={values.description} rows={2} maxLength={280} onChange={e => update('description', e.target.value)} error={error('description')} />
      <Area label={t('About the project (Markdown)', 'Acerca del proyecto (Markdown)')} name="content" value={values.content} rows={6} maxLength={20000} onChange={e => update('content', e.target.value)} error={error('content')} />
      <div className="journal-fields">
        <label>
          {t('Status', 'Estado')}
          <select value={values.status} onChange={e => update('status', e.target.value)}>{projectStatuses.map(status => <option key={status} value={status}>{{
                PLANNING: t('Planning', 'Planificación'),
                BUILDING: t('Building', 'En desarrollo'),
                PAUSED: t('Paused', 'En pausa'),
                COMPLETED: t('Completed', 'Completado'),
                ARCHIVED: t('Archived', 'Archivado')
              }[status]}</option>)}</select>
        </label>
        <label>
          {t('Visibility', 'Visibilidad')}
          <select value={values.visibility} onChange={e => update('visibility', e.target.value)}>
            <option value="PRIVATE">{t('Private', 'Privado')}</option>
            <option value="PUBLIC">{t('Public', 'Público')}</option>
          </select>
        </label>
        <Field label={t('Started on', 'Fecha de inicio')} name="startedAt" type="date" value={values.startedAt} max={new Date().toISOString().slice(0, 10)} onChange={e => update('startedAt', e.target.value)} />
        {values.status === 'COMPLETED' && <Field label={t('Completed on', 'Fecha de finalización')} name="completedAt" type="date" value={values.completedAt} min={values.startedAt} max={new Date().toISOString().slice(0, 10)} onChange={e => update('completedAt', e.target.value)} />}
        <Field label="Website URL" name="websiteUrl" type="url" value={values.websiteUrl} onChange={e => update('websiteUrl', e.target.value)} error={error('websiteUrl')} />
        <Field label="GitHub URL" name="githubUrl" type="url" value={values.githubUrl} onChange={e => update('githubUrl', e.target.value)} error={error('githubUrl')} />
      </div>
      <label>
        <input type="checkbox" checked={values.pinned} onChange={e => update('pinned', e.target.checked)} />
        {t('Currently building — pin this project on my profile', 'Proyecto actual: destacar este proyecto en mi perfil')}
      </label>
      <ImageAttachments images={images} max={1} onChange={items => {
        setImages(items)
        setDirty(true)
      }} onBusy={setUploading} />
      <p className="journal-muted">{t('Making a project private also hides its updates, milestones and attached images from public views.', 'Al hacer privado un proyecto también se ocultan sus actualizaciones, hitos e imágenes adjuntas.')}</p>
      <div className="journal-actions">
        <button className="journal-button" disabled={state.busy || uploading} aria-busy={state.busy}>{state.busy ? t('Saving…', 'Guardando…') : t('Save project', 'Guardar proyecto')}</button>
        <CancelEdit dirty={dirty} href="/projects" />
      </div>
    </form>
    {project && <section className="journal-card">
      <p>{t('Deleting this project also removes its updates, milestones, reactions and comments. Your focus sessions remain, without the project association.', 'Eliminar este proyecto también elimina sus actualizaciones, hitos, apoyos y comentarios. Tus sesiones se conservan sin la asociación al proyecto.')}</p>
      <DeleteButton busy={state.busy} label={t('Delete project', 'Eliminar proyecto')} onDelete={() => void state.run(async () => {
        await journalApi(`projects/${project.id}`, {
          method: 'DELETE'
        })
        setDirty(false)
        router.push('/projects')
        router.refresh()
      })} />
    </section>}
  </section>
}
