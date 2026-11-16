'use client'

import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor, useEditorState, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Strikethrough, Heading2, List, ListOrdered, Quote, Code2, Undo2, Redo2, Plus, X, FileText, Check } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { notesCopy } from '@/lib/i18n/notes'
import { emptyNote, type WorkspaceNote } from '@/lib/notes'
import { useWorkspaceNotes } from '@/hooks/useWorkspaceNotes'
import '@/app/workspace-notes.css'

type Copy = { [Key in keyof typeof notesCopy.en]: string }

function NoteEditor({ note, copy, onChange }: { note: WorkspaceNote; copy: Copy; onChange: (content: JSONContent) => void }) {
  const copyRef = useRef(copy)
  copyRef.current = copy
  const changeRef = useRef(onChange)
  changeRef.current = onChange
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: false }), Placeholder.configure({ placeholder: () => copyRef.current.placeholder })],
    content: note.content,
    immediatelyRender: false,
    editorProps: { attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': copy.editor, spellcheck: 'true' } },
    onUpdate: ({ editor }) => changeRef.current(editor.getJSON()),
  })
  const state = useEditorState({ editor, selector: ({ editor }) => editor ? {
    bold: editor.isActive('bold'), italic: editor.isActive('italic'), strike: editor.isActive('strike'),
    heading: editor.isActive('heading'), bullet: editor.isActive('bulletList'), ordered: editor.isActive('orderedList'),
    quote: editor.isActive('blockquote'), code: editor.isActive('codeBlock'),
    undo: editor.can().undo(), redo: editor.can().redo(),
  } : null })

  useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(note.content)) {
      editor.commands.setContent(note.content, { emitUpdate: false })
    }
  }, [editor, note.content])
  useEffect(() => {
    editor?.setOptions({ editorProps: { attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': copy.editor, spellcheck: 'true' } } })
  }, [editor, copy.editor])

  const actions = [
    { name: copy.undo, icon: Undo2, disabled: !state?.undo, run: () => editor?.chain().focus().undo().run() },
    { name: copy.redo, icon: Redo2, disabled: !state?.redo, run: () => editor?.chain().focus().redo().run() },
    { name: copy.heading, icon: Heading2, active: state?.heading, run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { name: copy.bold, icon: Bold, active: state?.bold, run: () => editor?.chain().focus().toggleBold().run() },
    { name: copy.italic, icon: Italic, active: state?.italic, run: () => editor?.chain().focus().toggleItalic().run() },
    { name: copy.strike, icon: Strikethrough, active: state?.strike, run: () => editor?.chain().focus().toggleStrike().run() },
    { name: copy.bullet, icon: List, active: state?.bullet, run: () => editor?.chain().focus().toggleBulletList().run() },
    { name: copy.ordered, icon: ListOrdered, active: state?.ordered, run: () => editor?.chain().focus().toggleOrderedList().run() },
    { name: copy.quote, icon: Quote, active: state?.quote, run: () => editor?.chain().focus().toggleBlockquote().run() },
    { name: copy.code, icon: Code2, active: state?.code, run: () => editor?.chain().focus().toggleCodeBlock().run() },
  ]
  return <>
    <div className="notes-toolbar" role="group" aria-label={copy.formatting}>
      {actions.map(({ name, icon: Icon, active, disabled, run }) => <button key={name} type="button" title={name} aria-label={name} aria-pressed={active} disabled={!editor || disabled} onMouseDown={event => event.preventDefault()} onClick={run}><Icon size={14} strokeWidth={1.6} aria-hidden="true" /></button>)}
    </div>
    <div className="notes-writing-scroll"><EditorContent editor={editor} /></div>
  </>
}

export default function WorkspaceNotes({ owner }: { owner: string }) {
  const { language } = useI18n()
  const copy = notesCopy[language]
  const { notes, notesRef, ready, error, saving, dirty, commit, retry, saveCopies } = useWorkspaceNotes(owner)
  const [activeId, setActiveId] = useState('')
  const [removed, setRemoved] = useState<{ note: WorkspaceNote; index: number } | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const active = notes.find(note => note.id === activeId) ?? notes[0]

  const update = (id: string, patch: Partial<WorkspaceNote>) => commit(notesRef.current.map(note => note.id === id ? { ...note, ...patch } : note))
  const add = () => {
    const note = emptyNote()
    commit([...notesRef.current, note])
    setActiveId(note.id)
    requestAnimationFrame(() => titleRef.current?.focus())
  }
  useEffect(() => {
    tabsRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [active?.id])

  if (!ready) return <div className="workspace-notes notes-loading" data-no-translate role="status">
    {error ? <><p>{copy.loadError}</p><button type="button" onClick={retry}>{copy.retry}</button></> : copy.loading}
  </div>

  return <div className="workspace-notes" data-no-translate>
    <div className="notes-tab-bar">
      <div ref={tabsRef} className="notes-tabs" role="tablist" aria-label={copy.title}>
        {notes.map((note, index) => <div className="notes-tab-wrap" key={note.id} data-active={active?.id === note.id}>
          <button type="button" role="tab" id={`note-tab-${note.id}`} aria-controls="notes-panel" aria-selected={active?.id === note.id} tabIndex={active?.id === note.id ? 0 : -1}
            title={note.title || copy.untitled} onClick={() => setActiveId(note.id)} onKeyDown={event => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? notes.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + notes.length) % notes.length
              setActiveId(notes[next].id)
              document.getElementById(`note-tab-${notes[next].id}`)?.focus()
            }}><FileText size={13} aria-hidden="true" /><span>{note.title || copy.untitled}</span></button>
          <button type="button" className="notes-tab-close" aria-label={`${copy.remove}: ${note.title || copy.untitled}`} title={copy.remove} onClick={() => {
            setRemoved({ note, index })
            const next = notesRef.current.filter(item => item.id !== note.id)
            commit(next)
            const selected = active?.id === note.id ? next[Math.min(index, next.length - 1)]?.id ?? '' : active?.id ?? ''
            setActiveId(selected)
            requestAnimationFrame(() => (document.getElementById(`note-tab-${selected}`) ?? document.getElementById('notes-add'))?.focus())
          }}><X size={12} aria-hidden="true" /></button>
        </div>)}
      </div>
      <button id="notes-add" type="button" className="notes-add" onClick={add} aria-label={copy.add} title={copy.add}><Plus size={18} aria-hidden="true" /></button>
    </div>
    {error && <div className="notes-feedback" role="alert">
      {error === 'conflict' ? copy.conflict : error === 'limit' ? copy.limit : copy.error}
      <button type="button" disabled={saving} onClick={error === 'conflict' ? () => {
        void saveCopies(active?.id).then(id => { if (id) setActiveId(id) })
      } : retry}>{error === 'conflict' ? copy.saveCopies : copy.retry}</button>
    </div>}
    {removed && <div className="notes-feedback" role="status">{copy.deleted}<button type="button" onClick={() => {
      const next = [...notesRef.current]
      next.splice(Math.min(removed.index, next.length), 0, removed.note)
      commit(next.filter((note, index, items) => items.findIndex(item => item.id === note.id) === index)); setActiveId(removed.note.id); setRemoved(null)
    }}>{copy.restore}</button></div>}
    {active ? <section className="notes-panel" id="notes-panel" role="tabpanel" aria-labelledby={`note-tab-${active.id}`}>
      <div className="notes-title-row"><input ref={titleRef} aria-label={copy.name} placeholder={copy.untitled} maxLength={160} value={active.title} onChange={event => update(active.id, { title: event.target.value })} /></div>
      <NoteEditor key={active.id} note={active} copy={copy} onChange={content => update(active.id, { content })} />
    </section> : <div className="notes-empty"><FileText size={30} strokeWidth={1.2} aria-hidden="true" /><p>{copy.empty}</p><button type="button" onClick={add}><Plus size={16} aria-hidden="true" />{copy.create}</button></div>}
    <footer className="notes-footer">{error ? <X size={12} aria-hidden="true" /> : !dirty && <Check size={12} aria-hidden="true" />}<span role="status">{error ? copy.notSaved : saving ? copy.saving : dirty ? copy.unsaved : copy.saved}</span></footer>
  </div>
}
