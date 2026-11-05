'use client'

import { useEffect, useId, useState } from 'react'
import { Plus } from 'lucide-react'
import { useJournalText } from '@/lib/journal/client'

type Subtask = { id: string; title: string; completed: boolean }

function readSubtasks(key: string): Subtask[] {
  const raw = localStorage.getItem(key)
  if (raw === null) return []
  const data: unknown = JSON.parse(raw)
  if (!Array.isArray(data) || !data.every(item => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.completed === 'boolean')) {
    throw new Error('Invalid subtasks')
  }
  return data
}

export default function ProjectSubtasks({ storageKey, taskTitle }: { storageKey: string; taskTitle: string }) {
  const t = useJournalText()
  const inputId = useId()
  const [items, setItems] = useState<Subtask[]>([])
  const [draft, setDraft] = useState('')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    function load() {
      try {
        setItems(readSubtasks(storageKey))
        setReady(true)
        setError(false)
      } catch {
        setReady(false)
        setError(true)
      }
    }
    load()
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) load()
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [storageKey])

  function save(update: (current: Subtask[]) => Subtask[]) {
    try {
      // Merge each action into the latest stored list, including edits from other tabs.
      const next = update(readSubtasks(storageKey))
      localStorage.setItem(storageKey, JSON.stringify(next))
      setItems(next)
      setError(false)
      return true
    } catch {
      setError(true)
      return false
    }
  }

  return <div className="project-subtasks">
    <div className="project-subtasks-heading"><strong>{t('Subtasks', 'Subtareas')}</strong><span>{items.filter(item => item.completed).length} / {items.length}</span></div>
    {!ready && !error && <p role="status">{t('Loading subtasks…', 'Cargando subtareas…')}</p>}
    {ready && (items.length ? <ul>{items.map(item => <li key={item.id}>
      <label className="project-subtask-check">
        <input type="checkbox" checked={item.completed} onChange={event => {
          const completed = event.target.checked
          save(current => current.map(entry => entry.id === item.id ? { ...entry, completed } : entry))
        }} />
        <span className={item.completed ? 'project-map-task-done' : undefined}>{item.title}</span>
      </label>
    </li>)}</ul> : <p>{t('Break this task into smaller steps.', 'Divide esta tarea en pasos más pequeños.')}</p>)}
    <form noValidate className="project-subtask-form" onSubmit={event => {
      event.preventDefault()
      const title = draft.trim()
      if (!title || !ready) return
      if (save(current => [...current, { id: crypto.randomUUID(), title, completed: false }])) setDraft('')
    }}>
      <label className="sr-only" htmlFor={inputId}>{t('New subtask for', 'Nueva subtarea para')} {taskTitle}</label>
      <input id={inputId} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => {
        if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault()
      }} maxLength={200} disabled={!ready} placeholder={t('New subtask', 'Nueva subtarea')} />
      <button type="submit" className="journal-button secondary" disabled={!ready || !draft.trim()} aria-label={t('Add subtask', 'Añadir subtarea')} title={t('Add subtask', 'Añadir subtarea')}><Plus size={16} aria-hidden="true" /></button>
    </form>
    {error && <div className="journal-error" role="alert">
      <p>{t('Could not access browser storage. Allow storage and try again; your saved subtasks have not been replaced.', 'No se pudo acceder al almacenamiento del navegador. Permite el almacenamiento e inténtalo de nuevo; tus subtareas guardadas no se han reemplazado.')}</p>
      {!ready && <button className="journal-button secondary" type="button" onClick={() => {
        try { setItems(readSubtasks(storageKey)); setReady(true); setError(false) } catch { setError(true) }
      }}>{t('Retry', 'Reintentar')}</button>}
    </div>}
  </div>
}
