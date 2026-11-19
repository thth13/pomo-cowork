'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { emptyNote, fitsFreeNotesLimit, FREE_NOTES_LIMIT, MAX_WORKSPACE_NOTES, readLegacyNotes, type WorkspaceNote } from '@/lib/notes'
import { hasActiveProAccess } from '@/lib/proAccess'
import { createNotesClient, NotesRequestError } from '@/services/notesService'
import { useAuthStore } from '@/store/useAuthStore'

const SAVE_DELAY = 500
export type NotesError = 'load' | 'save' | 'conflict' | 'limit' | null

export function useWorkspaceNotes(owner: string) {
  const [notes, setNotes] = useState<WorkspaceNote[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<NotesError>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const notesRef = useRef<WorkspaceNote[]>([])
  const clientRef = useRef<ReturnType<typeof createNotesClient> | null>(null)
  const mounted = useRef(false)
  const loaded = useRef(false)
  const base = useRef<WorkspaceNote[]>([])
  const revision = useRef(0)
  const generation = useRef(0)
  const savedGeneration = useRef(0)
  const running = useRef(false)
  const errorRef = useRef<NotesError>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const legacyImported = useRef(false)
  const loadSequence = useRef(0)

  const showError = useCallback((value: NotesError) => {
    errorRef.current = value
    if (mounted.current) setError(value)
  }, [])

  const flush = useCallback(async () => {
    if (!loaded.current || running.current || !clientRef.current || generation.current === savedGeneration.current || errorRef.current) return
    if (timer.current) clearTimeout(timer.current)
    running.current = true
    if (mounted.current) setSaving(true)
    try {
      // Serialize requests. Edits made during a request stay in memory and are
      // written next, so an older response never replaces the current editor.
      while (generation.current !== savedGeneration.current) {
        const submittedGeneration = generation.current
        const submitted = notesRef.current
        const result = await clientRef.current.save(submitted, revision.current, legacyImported.current)
        revision.current = result.revision
        base.current = submitted
        savedGeneration.current = submittedGeneration
      }
      if (mounted.current) setDirty(false)
    } catch (cause) {
      showError(cause instanceof NotesRequestError && cause.status === 409 ? 'conflict' :
        cause instanceof NotesRequestError && (cause.status === 413 || cause.status === 400) ? 'limit' : 'save')
    } finally {
      running.current = false
      if (mounted.current) setSaving(false)
    }
  }, [showError])

  const commit = useCallback((next: WorkspaceNote[]) => {
    notesRef.current = next
    setNotes(next)
    generation.current += 1
    setDirty(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flush() }, SAVE_DELAY)
  }, [flush])

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!clientRef.current) return
    const sequence = ++loadSequence.current
    showError(null)
    try {
      const result = await clientRef.current.load(signal)
      if (signal?.aborted || !mounted.current || sequence !== loadSequence.current) return
      revision.current = result.revision
      base.current = result.notes
      legacyImported.current = true
      let initial = result.notes
      if (!result.legacyImported) {
        const legacy = readLegacyNotes(owner)
        const ids = new Set(initial.map(note => note.id))
        const limit = hasActiveProAccess(useAuthStore.getState().user) ? MAX_WORKSPACE_NOTES : FREE_NOTES_LIMIT
        const available = Math.max(0, limit - initial.length)
        initial = [...initial, ...legacy.filter(note => !ids.has(note.id)).slice(0, available)]
      }
      if (result.revision === 0 && initial.length === 0) initial = [emptyNote()]
      notesRef.current = initial
      setNotes(initial)
      loaded.current = true
      setReady(true)
      // A new guest can view the initial draft and local notes without creating
      // a server profile. Their first edit saves the whole collection.
      if (!result.legacyImported && (owner !== 'guest' || result.revision > 0)) {
        generation.current += 1
        setDirty(true)
        void flush()
      }
    } catch {
      if (!signal?.aborted && mounted.current && sequence === loadSequence.current) showError('load')
    }
  }, [owner, showError, flush])

  // Keep drafts on conflict. Explicit recovery preserves remote changes and
  // saves only locally edited/added notes as new copies; remote deletions stay.
  const saveCopies = useCallback(async (activeId?: string) => {
    if (!clientRef.current || running.current) return
    setSaving(true)
    try {
      const remote = await clientRef.current.load()
      if (!mounted.current) return
      const previous = new Map(base.current.map(note => [note.id, JSON.stringify(note)]))
      let selectedId = activeId
      const copies = notesRef.current.filter(note => previous.get(note.id) !== JSON.stringify(note))
        .map(note => {
          const id = emptyNote().id
          if (note.id === activeId) selectedId = id
          return { ...note, id }
        })
      const next = [...remote.notes, ...copies]
      if (!hasActiveProAccess(useAuthStore.getState().user) && !fitsFreeNotesLimit(next, remote.notes)) return false
      revision.current = remote.revision
      base.current = remote.notes
      legacyImported.current = true
      showError(null)
      commit(next)
      void flush()
      return selectedId
    } catch { showError('conflict') }
    finally { if (mounted.current) setSaving(false) }
  }, [commit, flush, showError])

  useEffect(() => {
    mounted.current = true
    clientRef.current = createNotesClient(useAuthStore.getState().token)
    const controller = new AbortController()
    void load(controller.signal)
    const flushOnBlur = () => { void flush() }
    const guardUnsaved = (event: BeforeUnloadEvent) => {
      if (generation.current === savedGeneration.current) return
      void flush()
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', guardUnsaved)
    window.addEventListener('blur', flushOnBlur)
    return () => {
      mounted.current = false
      loadSequence.current += 1
      controller.abort()
      if (timer.current) clearTimeout(timer.current)
      void flush()
      window.removeEventListener('beforeunload', guardUnsaved)
      window.removeEventListener('blur', flushOnBlur)
    }
  }, [load, flush])

  const retry = () => {
    if (!loaded.current) { void load(); return }
    showError(null)
    void flush()
  }

  return { notes, notesRef, ready, error, saving, dirty, commit, retry, saveCopies }
}
