'use client'

import { notFound } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { useAuthStore } from '@/store/useAuthStore'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { token, isLoading } = useAuthStore()
  if (isLoading) return null
  if (!token) notFound()

  return <AdminAccess key={token} token={token}>{children}</AdminAccess>
}

function AdminAccess({ token, children }: { token: string; children: ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function checkAccess() {
      try {
        const response = await fetch('/api/admin/access', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!controller.signal.aborted) setAllowed(response.status === 204)
      } catch {
        if (!controller.signal.aborted) setAllowed(false)
      }
    }
    void checkAccess()
    return () => controller.abort()
  }, [token])

  if (allowed === null) return null
  if (!allowed) notFound()
  return children
}
