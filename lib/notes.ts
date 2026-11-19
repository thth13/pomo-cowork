import type { JSONContent } from '@tiptap/react'

export const FREE_NOTES_LIMIT = 1
export const MAX_WORKSPACE_NOTES = 200

export interface WorkspaceNote {
  id: string
  title: string
  content: JSONContent
}

export interface NotesSnapshot {
  notes: WorkspaceNote[]
  revision: number
  legacyImported: boolean
}

export const emptyNote = (): WorkspaceNote => ({
  id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `note_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  title: '', content: { type: 'doc', content: [{ type: 'paragraph' }] },
})

const nodeTypes = new Set(['doc', 'paragraph', 'text', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'codeBlock', 'hardBreak', 'horizontalRule'])
const markTypes = new Set(['bold', 'italic', 'strike', 'code', 'underline'])

function isNode(value: unknown, depth = 0): value is JSONContent {
  if (depth > 30 || !value || typeof value !== 'object' || Array.isArray(value)) return false
  const node = value as JSONContent
  return typeof node.type === 'string' && nodeTypes.has(node.type) &&
    (node.type !== 'text' || typeof node.text === 'string') &&
    (node.content === undefined || (Array.isArray(node.content) && node.content.every(child => isNode(child, depth + 1)))) &&
    (node.marks === undefined || (Array.isArray(node.marks) && node.marks.every(mark => mark && markTypes.has(mark.type))))
}

export function isWorkspaceNote(value: unknown): value is WorkspaceNote {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const note = value as WorkspaceNote
  return typeof note.id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(note.id) &&
    typeof note.title === 'string' && note.title.length <= 160 &&
    isNode(note.content) && note.content.type === 'doc'
}

export function isNotesCollection(value: unknown): value is WorkspaceNote[] {
  return Array.isArray(value) && value.length <= MAX_WORKSPACE_NOTES && value.every(isWorkspaceNote) &&
    new Set(value.map(note => note.id)).size === value.length
}

export function fitsFreeNotesLimit(next: WorkspaceNote[], saved: WorkspaceNote[]) {
  if (next.length <= FREE_NOTES_LIMIT) return true
  const savedIds = new Set(saved.map(note => note.id))
  return next.every(note => savedIds.has(note.id))
}

// Read-only migration of the previous implementation. The server is now the
// only destination for writes; leave the old value intact as a recovery copy.
export function readLegacyNotes(owner: string): WorkspaceNote[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(`pomo:notes:${owner}:v1`) ?? '[]')
    if (!Array.isArray(value)) return []
    const seen = new Set<string>()
    return value.filter((note): note is WorkspaceNote => {
      if (!isWorkspaceNote(note) || seen.has(note.id)) return false
      seen.add(note.id)
      return true
    }).slice(0, MAX_WORKSPACE_NOTES)
  } catch { return [] }
}
