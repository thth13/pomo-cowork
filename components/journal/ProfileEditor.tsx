'use client'

import Image from 'next/image'
import UnsavedChangesGuard from './UnsavedChangesGuard'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { Author, profileHref } from '@/lib/journal/types'
import { publicUsername, validUsername } from '@/lib/journal/validation'
import { ApiError, journalApi, useJournalQuery, useJournalMutation, useJournalText, useUnsaved } from '@/lib/journal/client'
import { AuthGate, Feedback, JournalLoading, QueryError } from './Primitives'
import { Field, Area, CancelEdit } from './FormFields'
type Profile = Author & {
  description: string | null;
  location: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  twitterUrl: string | null;
};
export default function ProfileEditor() {
  return <AuthGate><Loader /></AuthGate>
}
function Loader() {
  const query = useJournalQuery<Profile>('profile')
  return query.loading ? <JournalLoading /> : query.error ? <QueryError error={query.error} retry={query.reload} /> : query.data ? <Editor profile={query.data} /> : null
}
function Editor({
  profile
}: {
  profile: Profile;
}) {
  const t = useJournalText(),
    state = useJournalMutation(),
    router = useRouter(),
    [values, setValues] = useState(profile),
    [dirty, setDirty] = useState(false)
  useUnsaved(dirty)
  const update = (name: keyof Profile, value: string) => {
    setValues(v => ({
      ...v,
      [name]: value
    }))
    setDirty(true)
  }
  return <section className="journal-form">
    <UnsavedChangesGuard dirty={dirty} onDiscard={() => setDirty(false)} />
    <h1>{t('Your public profile', 'Tu perfil público')}</h1>
    <p>{t('Show what you are building and the focused work behind it. All fields except username are optional.', 'Muestra lo que estás creando y el trabajo dedicado. Todos los campos excepto el nombre de usuario son opcionales.')}</p>
    <Link href={profileHref(profile.username)}>
      {t('View my profile', 'Ver mi perfil')}
      {' '}
      →
    </Link>
    <form noValidate onSubmit={e => {
      e.preventDefault()
      void state.run(async () => {
        if (!validUsername(publicUsername(values.username))) throw new ApiError(t('Use 3–30 letters, numbers, dashes or underscores. Choose a name that is not reserved.', 'Usa entre 3 y 30 letras, números, guiones o guiones bajos. Elige un nombre no reservado.'), 'username')
        const saved = await journalApi<Author>('profile', {
          method: 'PUT',
          body: JSON.stringify(values)
        })
        await useAuthStore.getState().checkAuth()
        setDirty(false)
        router.push(profileHref(saved.username))
        router.refresh()
      }, t('Profile saved', 'Perfil guardado'))
    }}>
      <Feedback state={state} />
      <Field label={t('Username', 'Nombre de usuario')} name="username" value={values.username} maxLength={30} autoComplete="username" error={state.field === 'username' ? state.error : undefined} onChange={e => update('username', publicUsername(e.target.value))} />
      <Field label={t('Display name', 'Nombre visible')} name="displayName" value={values.displayName || ''} maxLength={80} onChange={e => update('displayName', e.target.value)} />
      <Area label={t('Short bio', 'Biografía breve')} name="description" value={values.description || ''} rows={3} maxLength={500} onChange={e => update('description', e.target.value)} />
      <Field label={t('Location', 'Ubicación')} name="location" value={values.location || ''} maxLength={100} onChange={e => update('location', e.target.value)} />
      {(['websiteUrl', 'githubUrl', 'twitterUrl'] as const).map(name => <Field key={name} label={name === 'websiteUrl' ? t('Website URL', 'URL de tu web') : name === 'githubUrl' ? 'GitHub URL' : 'X / Twitter URL'} name={name} type="url" value={values[name] || ''} error={state.field === name ? state.error : undefined} onChange={e => update(name, e.target.value)} />)}
      <label>
        {t('Avatar', 'Avatar')}
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={state.busy} onChange={e => {
          const file = e.target.files?.[0]
          if (!file) return
          void state.run(async () => {
            const body = new FormData()
            body.append('avatar', file)
            const response = await fetch('/api/upload/avatar', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${useAuthStore.getState().token}`
              },
              body
            })
            const value: {
              avatarUrl?: string;
              error?: string;
            } = await response.json()
            if (!response.ok) throw new Error(value.error || 'Upload failed')
            setValues(v => ({
              ...v,
              avatarUrl: value.avatarUrl || null
            }))
            await useAuthStore.getState().checkAuth()
          }, t('Avatar updated', 'Avatar actualizado'))
        }} />
      </label>
      {values.avatarUrl && <Image unoptimized width={80} height={80} className="journal-profile-avatar" src={values.avatarUrl} alt={t('Your avatar', 'Tu avatar')} />}
      <div className="journal-actions">
        <button className="journal-button" disabled={state.busy}>{state.busy ? t('Saving…', 'Guardando…') : t('Save profile', 'Guardar perfil')}</button>
        <CancelEdit dirty={dirty} href={profileHref(profile.username)} />
      </div>
    </form>
  </section>
}
