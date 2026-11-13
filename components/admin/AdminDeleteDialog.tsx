'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import CommunityDialog from '@/components/CommunityDialog'

const buttonClass = 'community-button cursor-pointer focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50'

export default function AdminDeleteDialog({ endpoint, subject, title, description, children, token, onClose, onDeleted }: {
  endpoint: string
  subject: 'visit' | 'anonymous user'
  title: string
  description: string
  children: ReactNode
  token: string | null
  onClose: () => void
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeRequest = useRef<AbortController | null>(null)

  useEffect(() => () => {
    activeRequest.current?.abort()
    activeRequest.current = null
  }, [])

  async function deleteItem() {
    if (activeRequest.current) return
    const controller = new AbortController()
    activeRequest.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    setDeleting(true)
    setError(null)
    try {
      const authToken = token ?? localStorage.getItem('token')
      if (!authToken) {
        setError(`Sign in again to delete this ${subject}.`)
        return
      }
      const response = await fetch(endpoint, {
        method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` }, signal: controller.signal,
      })
      if (activeRequest.current !== controller) return
      if (!response.ok) {
        setError(response.status === 401 ? `Sign in again to delete this ${subject}.`
          : response.status === 403 ? `Only administrators can delete this ${subject}.`
          : response.status === 409 ? 'This account is now registered and cannot be deleted here.'
          : `Could not delete this ${subject}. Please retry.`)
        return
      }
      onDeleted()
    } catch {
      if (activeRequest.current === controller) setError('Could not confirm deletion. Please retry.')
    } finally {
      window.clearTimeout(timeout)
      if (activeRequest.current === controller) {
        activeRequest.current = null
        setDeleting(false)
      }
    }
  }

  return <CommunityDialog open title={title} variant="project-action" busy={deleting}
    description={description}
    onClose={() => { if (!deleting) onClose() }}>
    {children}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="mt-4 flex justify-end gap-3" aria-busy={deleting}>
      <button type="button" className={buttonClass} disabled={deleting} onClick={onClose}>Cancel</button>
      <button type="button" className={`${buttonClass} min-w-[7rem] text-red-600`} disabled={deleting} onClick={() => void deleteItem()}>{deleting ? 'Deleting…' : 'Delete'}</button>
    </div>
  </CommunityDialog>
}
