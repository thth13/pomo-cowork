'use client'

import UnsavedChangesGuard from './UnsavedChangesGuard'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { TASK_CHANGED_EVENT } from '@/hooks/useQuickTasks'
import { useRouter } from 'next/navigation'
import { Project, profileHref } from '@/lib/journal/types'
import { projectStatuses, slugify } from '@/lib/journal/validation'
import { journalApi, useJournalQuery, useJournalMutation, useJournalText, useUnsaved } from '@/lib/journal/client'
import { AuthGate, Feedback, JournalLoading, QueryError, DeleteButton } from './Primitives'
import { Field, Area, ImageAttachments, CancelEdit } from './FormFields'
export default function ProjectEditor({
  id, initialWorkProject
}: {
  id?: string;
  initialWorkProject?: string;
}) {
  const accountId = useAuthStore(s => s.user?.id)
  return <AuthGate><Loader key={accountId || 'guest'} id={id} initialWorkProject={initialWorkProject} /></AuthGate>
}
function Loader({
  id, initialWorkProject
}: {
  id?: string;
  initialWorkProject?: string;
}) {
  const query = useJournalQuery<Project>(id ? `projects/${id}` : null)
  const selected = useJournalQuery<WorkProjects>(!id && initialWorkProject ? `work-projects?selected=${encodeURIComponent(initialWorkProject)}` : null)
  const router = useRouter()
  const existingId = selected.data?.selected?.publicPage?.id
  useEffect(() => { if (existingId) router.replace(`/projects/${existingId}/edit`) }, [existingId, router])
  if (!id && initialWorkProject && (selected.loading || existingId)) return <JournalLoading />
  if (selected.error) return <QueryError error={selected.error} retry={selected.reload} />
  if (id && query.loading) return <JournalLoading />
  if (query.error) return <QueryError error={query.error} retry={query.reload} />
  if (id && !query.data) return null
  return <Editor key={id || 'new'} project={query.data || undefined} initialWorkProject={selected.data?.selected || undefined} />
}
function Editor({
  project, initialWorkProject
}: {
  project?: Project;
  initialWorkProject?: WorkProject;
}) {
  const t = useJournalText(),
    state = useJournalMutation(),
    router = useRouter()
  const requestKey = useRef<string>()
  const [values, setValues] = useState({
    name: project?.name || initialWorkProject?.title || '',
    workProjectId: project?.workProjectId || initialWorkProject?.id || '',
    newProjectName: '',
    showTasks: project?.showTasks || false,
    slug: project?.slug || '',
    description: project?.description || '',
    content: project?.content || '',
    status: project?.status || 'PLANNING',
    visibility: project?.visibility || 'PUBLIC',
    pinned: project?.pinned || false,
    websiteUrl: project?.websiteUrl || '',
    githubUrl: project?.githubUrl || '',
    startedAt: (project?.startedAt || initialWorkProject?.createdAt || new Date().toISOString()).slice(0, 10),
    completedAt: project?.completedAt?.slice(0, 10) || ''
  })
  const [projectPage, setProjectPage] = useState(1)
  const options = useJournalQuery<WorkProjects>(`work-projects?page=${projectPage}&selected=${encodeURIComponent(values.workProjectId)}`)
  const [cover, setCover] = useState(project?.coverUrl ? [project.coverUrl] : [])
  const [coverUploading, setCoverUploading] = useState(false)
  const selectedOption = options.data?.items.find(item => item.id === values.workProjectId) || options.data?.selected
  const duplicate = selectedOption?.publicPage && selectedOption.publicPage.id !== project?.id ? selectedOption.publicPage.id : null
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
  return <section className="journal-form journal-card public-project-editor">
    <UnsavedChangesGuard dirty={dirty} onDiscard={() => setDirty(false)} />
    <h1>{project ? t('Edit project', 'Editar proyecto') : t('Make public project', 'Hacer público un proyecto')}</h1>
    <p>{t('Keep it private while planning, or make it public to share your progress.', 'Mantenlo privado mientras planificas o hazlo público para compartir tus avances.')}</p>
    <form noValidate onSubmit={event => {
      event.preventDefault()
      void state.run(async () => {
        const saved = await journalApi<Project & { username: string }>(`projects${project ? `/${project.id}` : ''}`, {
          method: project ? 'PUT' : 'POST',
          body: JSON.stringify({
            ...values,
            workProjectId: values.workProjectId === '__new__' ? '' : values.workProjectId,
            requestId: requestKey.current || (requestKey.current = crypto.randomUUID()),
            slug: values.slug || slugify(values.name),
            imageUrl: images[0] || null,
            coverUrl: cover[0] || null
          })
        })
        setDirty(false)
        if (values.workProjectId === '__new__') window.dispatchEvent(new CustomEvent(TASK_CHANGED_EVENT))
        router.push(saved.visibility === 'PUBLIC' ? `${profileHref(saved.username)}/projects/${saved.slug}` : '/projects')
        router.refresh()
      }, t('Project saved', 'Proyecto guardado'))
    }}>
      <Feedback state={state} />
      <fieldset disabled={state.busy} className="public-project-fields">
      <label>{t('Project', 'Proyecto')}
        <select name="workProjectId" value={values.workProjectId} disabled={state.busy || options.loading} aria-invalid={Boolean(error('workProjectId'))} aria-describedby={error('workProjectId') ? 'workProjectId-error' : undefined} onChange={e => {
          const item = options.data?.items.find(p => p.id === e.target.value) || (options.data?.selected?.id === e.target.value ? options.data.selected : null)
          setValues(v => ({ ...v, workProjectId: e.target.value, newProjectName: '', name: item?.title || '', ...(!project ? { startedAt: (item?.createdAt || new Date().toISOString()).slice(0, 10) } : {}) }))
          setDirty(true)
        }}>
          <option value="">{t('Choose your project', 'Elige tu proyecto')}</option>
          <option value="__new__">{t('+ Create a new project', '+ Crear un proyecto')}</option>
          {values.workProjectId && values.workProjectId !== '__new__' && !options.data?.items.some(p => p.id === values.workProjectId) && <option value={values.workProjectId}>{selectedOption?.title || values.name}</option>}
          {options.data?.items.map(item => <option key={item.id} value={item.id}>{item.title}{item.publicPage ? ' · ' + t('has a page', 'tiene página') : ''}</option>)}
        </select>
        {error('workProjectId') && <span id="workProjectId-error" className="journal-field-error">{error('workProjectId')}</span>}
      </label>
      {options.error && <QueryError error={options.error} retry={options.reload} />}
      <div className="journal-actions">
        {projectPage > 1 && <button type="button" onClick={() => setProjectPage(p => p - 1)}>{t('Previous projects', 'Proyectos anteriores')}</button>}
        {options.data?.hasMore && <button type="button" onClick={() => setProjectPage(p => p + 1)}>{t('More projects', 'Más proyectos')}</button>}
      </div>
      {duplicate && <p role="status">{t('This project already has a page.', 'Este proyecto ya tiene una página.')} <Link href={`/projects/${duplicate}/edit`}>{t('Edit its page', 'Editar su página')}</Link></p>}
      {values.workProjectId === '__new__' && <Field label={t('New project name', 'Nombre del nuevo proyecto')} name="newProjectName" value={values.newProjectName} maxLength={100} required error={error('newProjectName')} onChange={e => { update('newProjectName', e.target.value); update('name', e.target.value) }} />}
      <p className="journal-muted">{t('Your project’s focus time and progress will appear on this page.', 'El tiempo de concentración y los avances de tu proyecto aparecerán en esta página.')}</p>
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
      <label><input type="checkbox" checked={values.showTasks} onChange={e => update('showTasks', e.target.checked)} />{t('Show task names publicly', 'Mostrar nombres de tareas públicamente')}</label>
      <p className="journal-muted">{t('Off by default. Visitors still see total and completed task counts.', 'Desactivado por defecto. Los visitantes ven el total de tareas y las completadas.')}</p>
      <h2>{t('Project logo', 'Logotipo del proyecto')}</h2>
      <div className="public-project-logo-editor"><ImageAttachments images={images} max={1} onChange={items => {
        setImages(items)
        setDirty(true)
      }} onBusy={setUploading} /></div>
      <h2>{t('Cover image', 'Imagen de portada')}</h2>
      <p className="journal-muted">{t('A wide image works best (about 4:1).', 'Una imagen panorámica funciona mejor (aproximadamente 4:1).')}</p>
      <div className="public-project-cover-editor"><ImageAttachments images={cover} max={1} onChange={items => { setCover(items); setDirty(true) }} onBusy={setCoverUploading} /></div>
      <p className="journal-muted">{t('Making a project private also hides its updates, milestones and attached images from public views.', 'Al hacer privado un proyecto también se ocultan sus actualizaciones, hitos e imágenes adjuntas.')}</p>
      <div className="journal-actions">
        <button className="journal-button" disabled={state.busy || uploading || coverUploading || Boolean(duplicate) || options.loading || Boolean(options.error)} aria-busy={state.busy}>{state.busy ? t('Saving…', 'Guardando…') : t('Save project', 'Guardar proyecto')}</button>
        <CancelEdit dirty={dirty} href="/projects" />
      </div>
      </fieldset>
    </form>
    {project && <section className="journal-card">
      <p>{t('Deleting this page removes its posts, milestones, likes, comments and followers. Your work project, tasks and focus sessions remain.', 'Eliminar esta página elimina sus publicaciones, hitos, Me gusta, comentarios y seguidores. Tu proyecto de trabajo, tareas y sesiones se conservan.')}</p>
      <DeleteButton busy={state.busy} label={t('Delete project page', 'Eliminar página del proyecto')} onDelete={() => void state.run(async () => {
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

type WorkProject = { id: string; title: string; createdAt: string; publicPage: { id: string; visibility: string } | null }
type WorkProjects = { items: WorkProject[]; hasMore: boolean; selected: WorkProject | null }
