'use client'

import AdminDeleteDialog from './AdminDeleteDialog'

type Visit = { id: string; ipAddress: string | null; pagePath: string; createdAt: string }

export default function AdminVisitorDeleteDialog({ visit, ...props }: {
  visit: Visit
  token: string | null
  onClose: () => void
  onDeleted: () => void
}) {
  return <AdminDeleteDialog {...props} endpoint={`/api/admin/visitors?id=${encodeURIComponent(visit.id)}`}
    subject="visit" title="Delete visit?"
    description="This visit and all its recorded details will be permanently deleted. This cannot be undone.">
    <p className="break-words text-sm text-[var(--admin-secondary)]">
      {visit.ipAddress || 'Unknown IP'} · {visit.pagePath} · {new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(visit.createdAt))} (Kyiv)
    </p>
  </AdminDeleteDialog>
}
