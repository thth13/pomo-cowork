'use client'

import UnsavedChangesGuard from './UnsavedChangesGuard'
import JournalSelect from './Select'
import Link from 'next/link'
import { FolderOpen, Sprout, Globe2, Lock, FileText, ImagePlus, CircleDashed, Activity, Pause, CheckCircle2, Archive, Check, Plus } from 'lucide-react'
import { projectColorStyle } from '@/lib/projectColors'
import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { TASK_CHANGED_EVENT } from '@/hooks/useQuickTasks'
import { useRouter } from 'next/navigation'
import { Project, profileHref } from '@/lib/journal/types'
import { projectStatuses } from '@/lib/journal/validation'
import { projectStatusLabels } from '@/lib/journal/projectStatus'
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
  return <div className="project-editor-page personal-page-frame">
    <AuthGate><Loader key={accountId || 'guest'} id={id} initialWorkProject={initialWorkProject} /></AuthGate>
  </div>
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
    name: project?.name || '',
    workProjectId: project?.workProjectId || initialWorkProject?.id || '',
    newProjectName: '',
    showTasks: project?.showTasks || false,
    description: project?.description || '',
    content: project?.content || '',
    status: project?.status || 'BUILDING',
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
  const statusLabels = projectStatusLabels(t)
  const statusIcons = { PLANNING: CircleDashed, BUILDING: Activity, PAUSED: Pause, COMPLETED: CheckCircle2, ARCHIVED: Archive }
  const lastActiveStatus = useRef<Project['status']>(project?.status && project.status !== 'ARCHIVED' ? project.status : 'BUILDING')
  const VisibilityIcon = values.visibility === 'PUBLIC' ? Globe2 : Lock
  const error = (name: string) => state.field === name ? state.error : undefined
  return <section className="journal-form journal-card public-project-editor">
    <UnsavedChangesGuard dirty={dirty} onDiscard={() => setDirty(false)} />
    <header className="project-editor-heading">
      <span className="project-editor-emblem" aria-hidden="true"><Sprout size={24} strokeWidth={1.6} /></span>
      <div>
      <h1>{project ? t('Edit project', 'Editar proyecto') : t('Create project page', 'Crear página de proyecto')}</h1>
      <p>{t('A home for your work and progress.', 'Un espacio para tu trabajo y tus avances.')}</p>
      </div>
    </header>
    <form noValidate onSubmit={event => {
      event.preventDefault()
      void state.run(async () => {
        const saved = await journalApi<Project & { username: string }>(`projects${project ? `/${project.id}` : ''}`, {
          method: project ? 'PUT' : 'POST',
          body: JSON.stringify({
            ...values,
            workProjectId: values.workProjectId === '__new__' ? '' : values.workProjectId,
            requestId: requestKey.current || (requestKey.current = crypto.randomUUID()),
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
      <div className="project-editor-layout">
      <section className="project-editor-main" aria-labelledby="project-details-title">
      <h2 id="project-details-title" className="project-editor-section-title"><FolderOpen size={17} aria-hidden="true" />{t('Project details', 'Detalles del proyecto')}</h2>
      <Field label={t('Title', 'Título')} name="name" value={values.name} maxLength={100} required error={error('name')} onChange={e => update('name', e.target.value)} />
      <div className="project-editor-project-field">
        <label id="work-project-label" htmlFor="work-project">{t('Project', 'Proyecto')}</label>
        <JournalSelect
          id="work-project"
          name="workProjectId"
          labelledBy="work-project-label"
          value={values.workProjectId}
          disabled={state.busy || options.loading}
          invalid={Boolean(error('workProjectId'))}
          describedBy={error('workProjectId') ? 'workProjectId-error' : undefined}
          placeholder={options.loading ? t('Loading projects…', 'Cargando proyectos…') : t('Choose your project', 'Elige tu proyecto')}
          placeholderIcon={<FolderOpen size={17} />}
          onValueChange={value => {
            const item = options.data?.items.find(p => p.id === value) || (options.data?.selected?.id === value ? options.data.selected : null)
            setValues(v => ({ ...v, workProjectId: value, newProjectName: '', ...(!project ? { startedAt: (item?.createdAt || new Date().toISOString()).slice(0, 10) } : {}) }))
            setDirty(true)
          }}
          options={[
            { value: '__new__', label: t('Create a new project', 'Crear un proyecto'), icon: <Plus size={17} />, separated: true },
            ...(values.workProjectId && values.workProjectId !== '__new__' && !options.data?.items.some(p => p.id === values.workProjectId)
              ? [{ value: values.workProjectId, label: selectedOption?.title || values.name, icon: <FolderOpen size={17} style={projectColorStyle(selectedOption?.color)} /> }]
              : []),
            ...(options.data?.items.map(item => ({
              value: item.id,
              label: item.title,
              description: item.publicPage ? t('Has a project page', 'Tiene una página de proyecto') : undefined,
              icon: <FolderOpen size={17} style={projectColorStyle(item.color)} />
            })) || [])
          ]}
        />
        {error('workProjectId') && <span id="workProjectId-error" className="journal-field-error">{error('workProjectId')}</span>}
      </div>
      {options.error && <QueryError error={options.error} retry={options.reload} />}
      {(projectPage > 1 || options.data?.hasMore) && <div className="journal-actions">
        {projectPage > 1 && <button type="button" onClick={() => setProjectPage(p => p - 1)}>{t('Previous projects', 'Proyectos anteriores')}</button>}
        {options.data?.hasMore && <button type="button" onClick={() => setProjectPage(p => p + 1)}>{t('More projects', 'Más proyectos')}</button>}
      </div>}
      {duplicate && <p role="status">{t('This project already has a page.', 'Este proyecto ya tiene una página.')} <Link href={`/projects/${duplicate}/edit`}>{t('Edit its page', 'Editar su página')}</Link></p>}
      {values.workProjectId === '__new__' && <Field label={t('New project name', 'Nombre del nuevo proyecto')} name="newProjectName" value={values.newProjectName} maxLength={100} required error={error('newProjectName')} onChange={e => update('newProjectName', e.target.value)} />}
      <p className="journal-muted">{t('Your project’s focus time and progress will appear on this page.', 'El tiempo de concentración y los avances de tu proyecto aparecerán en esta página.')}</p>
      <Area label={t('Short description', 'Descripción breve')} name="description" value={values.description} rows={2} maxLength={280} onChange={e => update('description', e.target.value)} error={error('description')} />
      <details className="project-editor-disclosure" open>
      <summary><span className="project-editor-disclosure-label"><FileText size={16} aria-hidden="true" />{t('About the project', 'Acerca del proyecto')}</span></summary>
      <Area label={t('About the project (Markdown)', 'Acerca del proyecto (Markdown)')} name="content" value={values.content} rows={5} maxLength={20000} onChange={e => update('content', e.target.value)} error={error('content')} />
      </details>
      <details className="project-editor-disclosure project-editor-media">
      <summary><span className="project-editor-disclosure-label"><ImagePlus size={16} aria-hidden="true" />{t('Logo & cover image', 'Logotipo e imagen de portada')}</span></summary>
      <div className="project-editor-media-grid">
      <section>
      <h3>{t('Project logo', 'Logotipo del proyecto')}</h3>
      <div className="public-project-logo-editor"><ImageAttachments variant="logo" label={t('Project logo', 'Logotipo del proyecto')} images={images} max={1} onChange={items => {
        setImages(items)
        setDirty(true)
      }} onBusy={setUploading} /></div>
      </section>
      <section>
      <h3>{t('Cover image', 'Imagen de portada')}</h3>
      <div className="public-project-cover-editor"><ImageAttachments variant="cover" label={t('Cover image', 'Imagen de portada')} images={cover} max={1} onChange={items => { setCover(items); setDirty(true) }} onBusy={setCoverUploading} /></div>
      </section>
      </div>
      </details>
      </section>
      <section className="project-editor-settings" aria-labelledby="project-publishing-title">
      <h2 id="project-publishing-title" className="project-editor-section-title"><Globe2 size={17} aria-hidden="true" />{t('Publishing', 'Publicación')}</h2>
        <div className="project-editor-status-field">
          <label id="project-status-label" htmlFor="project-status">{t('Status', 'Estado')}</label>
          <JournalSelect
            id="project-status"
            labelledBy="project-status-label"
            value={values.status}
            disabled={state.busy}
            placeholder={t('Choose a status', 'Elige un estado')}
            onValueChange={value => {
              if (value !== 'ARCHIVED') lastActiveStatus.current = value as Project['status']
              update('status', value)
            }}
            options={projectStatuses.filter(status => status !== 'ARCHIVED' || values.status === 'ARCHIVED').map(status => {
              const Icon = statusIcons[status]
              return { value: status, label: statusLabels[status], icon: <Icon size={17} /> }
            })}
          />
          <button type="button" className="project-editor-archive" onClick={() => {
            if (values.status === 'ARCHIVED') update('status', lastActiveStatus.current)
            else {
              lastActiveStatus.current = values.status
              update('status', 'ARCHIVED')
            }
          }}><Archive size={14} aria-hidden="true" />{values.status === 'ARCHIVED' ? t('Restore from archive', 'Restaurar del archivo') : t('Archive project', 'Archivar proyecto')}</button>
          {values.status === 'ARCHIVED' && <p className="journal-muted" role="status">{t('Save changes to keep this project archived.', 'Guarda los cambios para mantener este proyecto archivado.')}</p>}
        </div>
        <label>
          {t('Visibility', 'Visibilidad')}
          <span className="project-editor-select project-editor-select--icon" data-visibility={values.visibility}><VisibilityIcon className="project-editor-control-icon" size={16} aria-hidden="true" /><select value={values.visibility} onChange={e => update('visibility', e.target.value)}>
            <option value="PRIVATE">{t('Private', 'Privado')}</option>
            <option value="PUBLIC">{t('Public', 'Público')}</option>
          </select></span>
        </label>
        {values.status === 'COMPLETED' && <Field label={t('Completed on', 'Fecha de finalización')} name="completedAt" type="date" value={values.completedAt} min={values.startedAt} max={new Date().toISOString().slice(0, 10)} onChange={e => update('completedAt', e.target.value)} />}
      <p className="journal-muted">{t('Private pages and their updates are only visible to you.', 'Solo tú puedes ver las páginas privadas y sus actualizaciones.')}</p>
      <label className="project-editor-check">
        <input type="checkbox" role="switch" checked={values.pinned} onChange={e => update('pinned', e.target.checked)} />
        {t('Pin on my profile', 'Destacar en mi perfil')}
      </label>
      <label className="project-editor-check"><input type="checkbox" role="switch" checked={values.showTasks} onChange={e => update('showTasks', e.target.checked)} />{t('Show task names publicly', 'Mostrar nombres de tareas públicamente')}</label>
      <p className="journal-muted">{t('Task totals stay visible when names are hidden.', 'El total de tareas sigue visible aunque ocultes sus nombres.')}</p>
      </section>
      </div>
      <div className="journal-actions project-editor-footer">
        <button className="journal-button" disabled={state.busy || uploading || coverUploading || Boolean(duplicate) || options.loading || Boolean(options.error)} aria-busy={state.busy}><Check size={16} aria-hidden="true" />{state.busy ? t('Saving…', 'Guardando…') : t('Save project', 'Guardar proyecto')}</button>
        <CancelEdit dirty={dirty} href="/projects" />
      </div>
      </fieldset>
    </form>
    {project && <section className="project-editor-danger">
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

type WorkProject = { id: string; title: string; color?: string | null; createdAt: string; publicPage: { id: string; visibility: string } | null }
type WorkProjects = { items: WorkProject[]; hasMore: boolean; selected: WorkProject | null }
