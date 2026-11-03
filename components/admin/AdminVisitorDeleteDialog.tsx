'use client'

import { useEffect, useRef, useState } from 'react'
import CommunityDialog from '@/components/CommunityDialog'

type Visit = { id: string; ipAddress: string | null; pagePath: string; createdAt: string }
const buttonClass = 'community-button cursor-pointer focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50'

export default function AdminVisitorDeleteDialog({ visit, token, onClose, onDeleted }: {
  visit: Visit
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

  async function deleteVisit() {
    if (activeRequest.current) return
    const controller = new AbortController()
    activeRequest.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    setDeleting(true)
    setError(null)
    try {
      const authToken = token ?? localStorage.getItem('token')
      if (!authToken) {
        setError('Sign in again to delete visits.')
        return
      }
      const response = await fetch(`/api/admin/visitors?id=${encodeURIComponent(visit.id)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` }, signal: controller.signal,
      })
      if (activeRequest.current !== controller) return
      if (!response.ok) {
        setError(response.status === 401 ? 'Sign in again to delete visits.'
          : response.status === 403 ? 'Only administrators can delete visits.' : 'Could not delete visit. Please retry.')
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

  return <CommunityDialog open title="Delete visit?" variant="project-action" busy={deleting}
    description="This visit and all its recorded details will be permanently deleted. This cannot be undone."
    onClose={() => { if (!deleting) onClose() }}>
    <p className="break-words text-sm text-[var(--admin-secondary)]">
      {visit.ipAddress || 'Unknown IP'} · {visit.pagePath} · {new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(visit.createdAt))} (Kyiv)
    </p>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="mt-4 flex justify-end gap-3" aria-busy={deleting}>
      <button type="button" className={buttonClass} disabled={deleting} onClick={onClose}>Cancel</button>
      <button type="button" className={`${buttonClass} min-w-[7rem] text-red-600`} disabled={deleting} onClick={() => void deleteVisit()}>{deleting ? 'Deleting…' : 'Delete'}</button>
    </div>
  </CommunityDialog>
}
