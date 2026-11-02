'use client'
import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { journalApi, useJournalText } from '@/lib/journal/client'
export default function ProjectViews({ projectId, initial }: { projectId: string; initial: number }) {
  const [views, setViews] = useState(initial)
  const loading = useAuthStore(s => s.isLoading)
  const userId = useAuthStore(s => s.user?.id)
  const t = useJournalText()
  useEffect(() => {
    if (loading) return
    let active = true
    // Delay until after mount; route prefetches and metadata reads never count.
    const timer = setTimeout(() => {
      journalApi<{ views: number }>(`projects/${projectId}/view`, { method: 'POST' }).then(value => { if (active) setViews(value.views) }).catch(() => {})
    }, 700)
    return () => { active = false; clearTimeout(timer) }
  }, [projectId, loading, userId])
  return <span className="public-project-meta-item"><Eye size={14} aria-hidden="true" />{views} {t('views', 'visitas')}</span>
}
