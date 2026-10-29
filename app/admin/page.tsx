'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, Crown, LayoutDashboard, Link2, MessageSquare, MousePointer2, ShieldCheck, Users, MessageCircle, ListChecks, BarChart3 } from 'lucide-react'
import AdminAllMetrics from '@/components/admin/AdminAllMetrics'
import AdminOverview from '@/components/admin/AdminOverview'
import AdminDataTable, { type AdminDataKind } from '@/components/admin/AdminDataTable'
import type { AdminSection } from '@/components/AdminReferralManager'
import './admin.css'

const AdminReferralManager = dynamic(() => import('@/components/AdminReferralManager'), {
  ssr: false,
  loading: () => <div className="admin-loading" role="status">Loading workspace…</div>,
})
const AdminPaywallEvents = dynamic(() => import('@/components/AdminPaywallEvents'), {
  ssr: false,
  loading: () => <div className="admin-loading" role="status">Loading activity…</div>,
})

const sections = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, description: '' },
  { id: 'metrics', label: 'All metrics', icon: BarChart3, description: 'Community totals, current activity, and all-time records.' },
  { id: 'referrals', label: 'Referral links', icon: Link2, description: 'Manage campaign links and track the people they bring to Pomo.' },
  { id: 'users', label: 'Pro users', icon: Crown, description: 'Manage Premium access and review active memberships.' },
  { id: 'directory', label: 'All users', icon: Users, description: 'Registered and guest accounts with focus statistics, as in the user directory.' },
  { id: 'wall', label: 'Wall messages', icon: MessageCircle, description: 'Messages posted on every user profile.' },
  { id: 'habits', label: 'Habits', icon: ListChecks, description: 'Habit tracking across the community.' },
  { id: 'support', label: 'Support inbox', icon: MessageSquare, description: 'Messages and feedback from your community, in one place.' },
  { id: 'events', label: 'Paywall activity', icon: MousePointer2, description: 'Explore interactions with Premium and support. All event times are shown in Kyiv time.' },
] as const

export default function AdminPage() {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore()
  const [section, setSection] = useState<AdminSection>('overview')
  const [eventsVisited, setEventsVisited] = useState(false)
  const active = sections.find(item => item.id === section) ?? sections[0]

  useEffect(() => {
    if (!isAuthenticated && !isLoading) void checkAuth()
  }, [isAuthenticated, isLoading, checkAuth])

  useEffect(() => {
    const syncSection = () => {
      const id = window.location.hash.slice(1)
      if (id === 'admin-content') return
      const next = sections.find(item => item.id === id)?.id ?? (new URLSearchParams(window.location.search).has('paywallPage') ? 'events' : 'overview')
      setSection(next)
      if (next === 'events') setEventsVisited(true)
    }
    syncSection()
    window.addEventListener('hashchange', syncSection)
    return () => window.removeEventListener('hashchange', syncSection)
  }, [])

  useEffect(() => {
    const previous = document.title
    document.title = `${active.label} · Pomo Admin`
    return () => { document.title = previous }
  }, [active.label])

  if (!isLoading && !isAuthenticated) notFound()

  return (
    <div className="admin-shell" data-no-translate>
      <a className="admin-skip" href="#admin-content">Skip to content</a>
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand"><span className="admin-brand-icon"><ShieldCheck size={23} aria-hidden="true" /></span><span>Pomo Cowork<small>Administration</small></span></Link>
        <p className="admin-nav-label">WORKSPACE</p>
        <nav aria-label="Admin sections" className="admin-nav">
          {sections.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} aria-current={section === id ? 'page' : undefined}><Icon size={18} aria-hidden="true" /><span>{label}</span>{section === id && <span className="admin-nav-dot" />}</a>)}
        </nav>
        <div className="admin-sidebar-bottom"><Link href="/"><ArrowLeft size={17} aria-hidden="true" />Back to workspace</Link></div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar"><div className="admin-breadcrumb">Workspace <span>/</span> <strong>{active.label}</strong></div><div className="admin-account"><span className="admin-avatar" aria-hidden="true">{(user?.username || user?.email || 'A').slice(0, 1).toUpperCase()}</span><span>{user?.username || 'Admin'}<small>Administrator</small></span></div></header>
        <main className="admin-content" id="admin-content" tabIndex={-1}>
          <div className="admin-page-heading"><div><p className="admin-eyebrow">ADMIN CONSOLE</p><h1>{active.label}</h1>{active.description && <p>{active.description}</p>}</div><Link href="/" className="admin-site-link">Open website<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
          {isLoading ? <div className="admin-loading" role="status">Loading account…</div> : <>
            {section === 'overview' && <AdminOverview />}
            {section === 'metrics' && <AdminAllMetrics />}
            <AdminReferralManager section={section} />
            {(['directory', 'wall', 'habits'] as string[]).includes(section) && <AdminDataTable key={section} kind={section as AdminDataKind} />}
            {eventsVisited && <div hidden={section !== 'events'}><AdminPaywallEvents /></div>}
          </>}
        </main>
      </div>
    </div>
  )
}
