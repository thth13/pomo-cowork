'use client'

import { userProfileHref } from '@/lib/userProfile'
import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import NotificationToast from '@/components/NotificationToast'
import type {
  ReferralLink,
  ReferralPurchaseEntry,
  ReferralSignupEntry,
  SubscriptionPlan,
  SupportMessageEntry,
} from '@/types'
import { ArrowUpRight, Link2, Crown, MessageSquare, MousePointer2, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'

interface CreateReferralPayload {
  label?: string
  code?: string
}

interface ProUserEntry {
  id: string
  username: string
  email: string
  avatarUrl?: string | null
  proExpiresAt?: string | null
  createdAt: string
  lastSeenAt?: string | null
}

const getBaseUrl = () => {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export type AdminSection = 'overview' | 'referrals' | 'users' | 'support' | 'events' | 'directory' | 'online' | 'wall' | 'habits'

export default function AdminReferralManager({ section = 'referrals' }: { section?: AdminSection }) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()
  const [referralsLoading, setReferralsLoading] = useState(false)
  const [loaded, setLoaded] = useState({ referrals: false, users: false, support: false })
  const [items, setItems] = useState<ReferralLink[]>([])
  const [label, setLabel] = useState('')
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [openSignupsId, setOpenSignupsId] = useState<string | null>(null)
  const [signupsByReferral, setSignupsByReferral] = useState<Record<string, ReferralSignupEntry[]>>({})
  const [signupsLoadingId, setSignupsLoadingId] = useState<string | null>(null)
  const [openPurchasesId, setOpenPurchasesId] = useState<string | null>(null)
  const [purchasesByReferral, setPurchasesByReferral] = useState<Record<string, ReferralPurchaseEntry[]>>({})
  const [purchasesLoadingId, setPurchasesLoadingId] = useState<string | null>(null)
  const [supportMessages, setSupportMessages] = useState<SupportMessageEntry[]>([])
  const [supportLoading, setSupportLoading] = useState(false)
  const [proUsers, setProUsers] = useState<ProUserEntry[]>([])
  const [proUsersLoading, setProUsersLoading] = useState(false)
  const [premiumUsername, setPremiumUsername] = useState('')
  const [premiumMessage, setPremiumMessage] = useState('')
  const [isGrantingPremium, setIsGrantingPremium] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info')
  const [showToast, setShowToast] = useState(false)

  const baseUrl = useMemo(() => getBaseUrl(), [])
  const monthlyAmount = 7 * 0.5
  const yearlyAmount = 60 * 0.5
  const moneyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    []
  )

  const formatMoney = (value?: number | null) =>
    Number.isFinite(value) ? moneyFormatter.format(value ?? 0) : '—'

  const getPurchaseAmount = (entry: ReferralPurchaseEntry) => {
    if (Number.isFinite(entry.amount)) return entry.amount
    return entry.subscriptionPlan === 'YEARLY' ? yearlyAmount : monthlyAmount
  }

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      checkAuth()
    }
  }, [checkAuth, isAuthenticated, isLoading])

  const fetchItems = async () => {
    setReferralsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/referrals', {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error ?? 'Failed to load referrals')
      }

      const data = (await response.json()) as ReferralLink[]
      setItems(data)
      setLoaded(prev => ({ ...prev, referrals: true }))
    } catch (err) {
      setToastType('error')
      setToastMessage(err instanceof Error ? err.message : 'Failed to load referrals')
      setShowToast(true)
    } finally {
      setReferralsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      void fetchItems()
    }
  }, [isAuthenticated])

  const fetchSupportMessages = async () => {
    setSupportLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/support', {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error ?? 'Failed to load support messages')
      }

      const data = (await response.json()) as SupportMessageEntry[]
      setSupportMessages(data)
      setLoaded(prev => ({ ...prev, support: true }))
    } catch (err) {
      setToastType('error')
      setToastMessage(err instanceof Error ? err.message : 'Failed to load support messages')
      setShowToast(true)
    } finally {
      setSupportLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      void fetchSupportMessages()
    }
  }, [isAuthenticated])

  const fetchProUsers = async () => {
    setProUsersLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/pro-users', {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error ?? 'Failed to load pro users')
      }

      const data = (await response.json()) as ProUserEntry[]
      setProUsers(data)
      setLoaded(prev => ({ ...prev, users: true }))
    } catch (err) {
      setToastType('error')
      setToastMessage(err instanceof Error ? err.message : 'Failed to load pro users')
      setShowToast(true)
    } finally {
      setProUsersLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      void fetchProUsers()
    }
  }, [isAuthenticated])

  const handleGrantPremium = async () => {
    if (isGrantingPremium) {
      return
    }

    const username = premiumUsername.trim()
    if (!username) {
      setToastType('warning')
      setToastMessage('Enter a username')
      setShowToast(true)
      return
    }

    const message = premiumMessage.trim()
    if (!message) {
      setToastType('warning')
      setToastMessage('Enter a message for the user')
      setShowToast(true)
      return
    }

    setIsGrantingPremium(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/pro-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ username, message }),
      })
      const body = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(body?.error ?? 'Failed to grant Premium')
      }

      const updatedUser = body?.user as ProUserEntry | undefined
      setPremiumUsername('')
      setPremiumMessage('')
      setToastType('success')
      setToastMessage(
        body?.status === 'already_lifetime'
          ? `${updatedUser?.username ?? username} already has Premium with no expiry`
          : `Premium active for ${updatedUser?.username ?? username} until ${formatShortDate(updatedUser?.proExpiresAt)}`
      )
      setShowToast(true)
      await fetchProUsers()
    } catch (err) {
      setToastType('error')
      setToastMessage(err instanceof Error ? err.message : 'Failed to grant Premium')
      setShowToast(true)
    } finally {
      setIsGrantingPremium(false)
    }
  }

  const handleCreate = async () => {
    setIsSubmitting(true)

    const payload: CreateReferralPayload = {}
    if (label.trim()) payload.label = label.trim()
    if (code.trim()) payload.code = code.trim()

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error ?? 'Failed to create referral')
      }

      setLabel('')
      setCode('')
      setToastType('success')
      setToastMessage('Referral link created')
      setShowToast(true)
      await fetchItems()
    } catch (err) {
      setToastType('error')
      setToastMessage(err instanceof Error ? err.message : 'Failed to create referral')
      setShowToast(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setToastType('success')
      setToastMessage('Copied to clipboard')
      setShowToast(true)
    } catch {
      setToastType('error')
      setToastMessage('Clipboard access denied')
      setShowToast(true)
    }
  }

  const handleArchive = async (id: string) => {
    setArchivingId(id)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/referrals/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error ?? 'Failed to archive referral')
      }

      setItems((prev) => prev.filter((item) => item.id !== id))
      setToastType('success')
      setToastMessage('Referral link archived')
      setShowToast(true)
    } catch (err) {
      setToastType('error')
      setToastMessage(err instanceof Error ? err.message : 'Failed to archive referral')
      setShowToast(true)
    } finally {
      setArchivingId(null)
    }
  }

  const handleArchiveClick = async (id: string) => {
    if (confirmArchiveId !== id) {
      setConfirmArchiveId(id)
      setToastType('warning')
      setToastMessage('To delete, press again')
      setShowToast(true)
      window.setTimeout(() => {
        setConfirmArchiveId((current) => (current === id ? null : current))
      }, 2500)
      return
    }

    setConfirmArchiveId(null)
    await handleArchive(id)
  }

  const handleSignupsToggle = async (id: string) => {
    if (openSignupsId === id) {
      setOpenSignupsId(null)
      return
    }

    if (signupsLoadingId === id) {
      return
    }

    if (signupsByReferral[id]) {
      setOpenSignupsId(id)
      return
    }

    setSignupsLoadingId(id)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/referrals/${id}/signups`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error ?? 'Failed to load signups')
      }

      const data = (await response.json()) as ReferralSignupEntry[]
      setSignupsByReferral((prev) => ({ ...prev, [id]: data }))
      setOpenSignupsId(id)
    } catch (err) {
      setToastType('error')
      setToastMessage(err instanceof Error ? err.message : 'Failed to load signups')
      setShowToast(true)
    } finally {
      setSignupsLoadingId(null)
    }
  }

  const handlePurchasesToggle = async (id: string) => {
    if (openPurchasesId === id) {
      setOpenPurchasesId(null)
      return
    }

    if (purchasesLoadingId === id) {
      return
    }

    if (purchasesByReferral[id]) {
      setOpenPurchasesId(id)
      return
    }

    setPurchasesLoadingId(id)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/referrals/${id}/purchases`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error ?? 'Failed to load purchases')
      }

      const data = (await response.json()) as ReferralPurchaseEntry[]
      const normalized = data.map((entry) => ({
        ...entry,
        amount: Number.isFinite(entry.amount)
          ? entry.amount
          : entry.subscriptionPlan === 'YEARLY'
            ? yearlyAmount
            : monthlyAmount,
      }))
      setPurchasesByReferral((prev) => ({ ...prev, [id]: normalized }))
      setOpenPurchasesId(id)
    } catch (err) {
      setToastType('error')
      setToastMessage(err instanceof Error ? err.message : 'Failed to load purchases')
      setShowToast(true)
    } finally {
      setPurchasesLoadingId(null)
    }
  }

  const getPlanLabel = (plan: SubscriptionPlan) => (plan === 'YEARLY' ? 'Yearly' : 'Monthly')
  const formatShortDate = (value?: string | null) =>
    value
      ? new Date(value).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'No expiry'

  if (isLoading) {
    return null
  }

  if (!isAuthenticated) {
    notFound()
  }

  return (
    <div className="admin-manager">
      <section hidden={section !== 'overview'} aria-label="Overview">
        <div className="admin-metrics">
          {[
            { title: 'Referral links', value: loaded.referrals ? items.length : '—', icon: Link2, href: '#referrals', note: 'Campaigns and partners' },
            { title: 'Referral clicks', value: loaded.referrals ? items.reduce((sum, item) => sum + item.clicksCount, 0) : '—', icon: MousePointer2, href: '#referrals', note: 'Across all referral links' },
            { title: 'Pro users', value: loaded.users ? proUsers.length : '—', icon: Crown, href: '#users', note: 'Active Premium accounts' },
            { title: 'Support messages', value: loaded.support ? supportMessages.length : '—', icon: MessageSquare, href: '#support', note: 'Messages from your community' },
          ].map(({ title, value, icon: Icon, href, note }) => (
            <a href={href} className="admin-metric" key={title}>
              <span className="admin-metric-label">{title}<Icon size={18} aria-hidden="true" /></span>
              <strong>{typeof value === 'number' ? value.toLocaleString('en-US') : value}</strong>
              <span className="admin-metric-note">{note}<ArrowUpRight size={15} aria-hidden="true" /></span>
            </a>
          ))}
        </div>
        <div className="admin-overview-panel">
          <div className="admin-panel-heading"><h2>Workspace management</h2><p>Manage growth, membership, and community feedback.</p><button type="button" className="admin-refresh" disabled={referralsLoading || proUsersLoading || supportLoading} onClick={() => { void fetchItems(); void fetchProUsers(); void fetchSupportMessages() }}>Refresh overview</button></div>
          {[
            { href: '#referrals', icon: Link2, title: 'Referral campaigns', description: 'Create links and review clicks, signups, and purchases.' },
            { href: '#users', icon: Crown, title: 'Premium membership', description: 'Review active Pro accounts and grant Premium access.' },
            { href: '#support', icon: MessageSquare, title: 'Community support', description: 'Read messages and open the sender’s profile.' },
            { href: '#events', icon: MousePointer2, title: 'Paywall activity', description: 'Review paywall opens, checkout clicks, and support clicks.' },
          ].map(({ href, icon: Icon, title, description }) => (
            <a className="admin-shortcut" href={href} key={href}><span className="admin-shortcut-icon"><Icon size={20} aria-hidden="true" /></span><span><strong>{title}</strong><span>{description}</span></span><ArrowUpRight size={18} aria-hidden="true" /></a>
          ))}
        </div>
      </section>
      <section hidden={section !== 'referrals'} className="space-y-6" aria-label="Referral links">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[var(--admin-ink)]">Referral links</h2>
          <p className="text-xs text-[var(--admin-muted)]">
            Create, track, and manage referral codes for campaigns and partners.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCreateOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--admin-accent-line)] bg-[var(--admin-accent-soft)] px-4 py-2 text-xs font-semibold text-[var(--admin-accent-hover)] shadow-sm transition hover:border-[var(--admin-accent-line)] hover:bg-[var(--admin-accent-soft)]"
          >
            {isCreateOpen ? 'Hide create' : 'Create link'}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isCreateOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-6 shadow-sm backdrop-blur"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--admin-ink)]">Create referral link</h3>
                <p className="text-xs text-[var(--admin-muted)]">
                  Optional: set a label or custom code (4-32 chars, letters, numbers, _ or -).
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-[var(--admin-secondary)]">
                Label
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Partner or campaign"
                  className="w-full rounded-xl border border-[var(--admin-line)] bg-[var(--admin-surface)] px-4 py-2 text-sm text-[var(--admin-ink)] shadow-sm focus:border-[var(--admin-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent-line)]"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-[var(--admin-secondary)]">
                Custom code
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-[var(--admin-line)] bg-[var(--admin-surface)] px-4 py-2 text-sm text-[var(--admin-ink)] shadow-sm focus:border-[var(--admin-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent-line)]"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-xl bg-[var(--admin-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--admin-accent-hover)] disabled:cursor-not-allowed disabled:bg-[var(--admin-accent-line)]"
              >
                {isSubmitting ? 'Creating...' : 'Create link'}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-6 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--admin-ink)]">Existing links</h2>
          <span className="text-xs text-[var(--admin-muted)]">{items.length} total</span>
        </div>

        <div className="mt-4 divide-y divide-[var(--admin-line)]">
          {referralsLoading && !loaded.referrals ? <p role="status" className="py-6 text-sm text-[var(--admin-muted)]">Loading referral links…</p> : items.length === 0 ? (
            <div className="py-6 text-sm text-[var(--admin-muted)]">No referral links yet.</div>
          ) : (
            items.map((item) => {
              const url = `${baseUrl}/?ref=${item.code}`
              return (
                <div key={item.id} className="group relative grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-base font-semibold text-[var(--admin-ink)]">
                        {item.label ?? 'Untitled'}
                      </p>
                      <span className="rounded-full bg-[var(--admin-subtle)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                        {item.code}
                      </span>
                      <span className="text-xs font-semibold text-[var(--admin-muted)]">
                        Earned: {moneyFormatter.format(item.earnedAmount)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--admin-muted)]">
                      Created by {item.createdBy.email}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm">
                        <span className="h-2 w-2 rounded-full bg-[var(--admin-accent)]" />
                        Unique clicks: {item.clicksCount}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleSignupsToggle(item.id)}
                        className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800"
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Signups: {item.signupsCount}
                        {signupsLoadingId === item.id ? (
                          <span className="ml-1 h-3 w-3 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
                        ) : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handlePurchasesToggle(item.id)}
                        className="flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm transition hover:border-violet-300 hover:text-violet-800"
                      >
                        <span className="h-2 w-2 rounded-full bg-violet-500" />
                        Purchases: {item.purchasesCount}
                        {purchasesLoadingId === item.id ? (
                          <span className="ml-1 h-3 w-3 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" />
                        ) : null}
                      </button>
                    </div>
                    <AnimatePresence initial={false}>
                      {openSignupsId === item.id ? (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                          className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-3 text-xs text-[var(--admin-secondary)] shadow-sm"
                        >
                          {signupsByReferral[item.id]?.length ? (
                            <motion.ul
                              className="space-y-2"
                              initial="hidden"
                              animate="show"
                              variants={{
                                hidden: { opacity: 1 },
                                show: {
                                  opacity: 1,
                                  transition: { staggerChildren: 0.06 },
                                },
                              }}
                            >
                              {signupsByReferral[item.id].map((entry) => (
                                <motion.li
                                  key={entry.user.id}
                                  variants={{
                                    hidden: { opacity: 0, y: -6 },
                                    show: { opacity: 1, y: 0 },
                                  }}
                                >
                                  <Link
                                    href={userProfileHref(entry.user)}
                                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--admin-subtle)] bg-[var(--admin-surface)] px-3 py-2 text-left transition hover:border-emerald-200 hover:bg-emerald-50/40"
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      {entry.user.avatarUrl ? (
                                        <Image
                                          src={entry.user.avatarUrl}
                                          alt={entry.user.username}
                                          className="h-8 w-8 rounded-full object-cover"
                                          loading="lazy"
                                          width={32}
                                          height={32}
                                        />
                                      ) : (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--admin-line)] text-[11px] font-semibold text-[var(--admin-secondary)]">
                                          {entry.user.username.slice(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-[var(--admin-ink)]">
                                          {entry.user.username}
                                        </p>
                                        <p className="truncate text-[11px] text-[var(--admin-muted)]">
                                          {entry.user.email}
                                        </p>
                                      </div>
                                    </div>
                                    <span className="text-[11px] text-[var(--admin-muted)]">
                                      {new Date(entry.signupCreatedAt).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
                                    </span>
                                  </Link>
                                </motion.li>
                              ))}
                            </motion.ul>
                          ) : (
                            <div>No signups yet.</div>
                          )}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                    <AnimatePresence initial={false}>
                      {openPurchasesId === item.id ? (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                          className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-3 text-xs text-[var(--admin-secondary)] shadow-sm"
                        >
                          {purchasesByReferral[item.id]?.length ? (
                            <motion.ul
                              className="space-y-2"
                              initial="hidden"
                              animate="show"
                              variants={{
                                hidden: { opacity: 1 },
                                show: {
                                  opacity: 1,
                                  transition: { staggerChildren: 0.06 },
                                },
                              }}
                            >
                              {purchasesByReferral[item.id].map((entry) => (
                                <motion.li
                                  key={`${entry.user.id}-${entry.purchaseCreatedAt}`}
                                  variants={{
                                    hidden: { opacity: 0, y: -6 },
                                    show: { opacity: 1, y: 0 },
                                  }}
                                >
                                  <Link
                                    href={userProfileHref(entry.user)}
                                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--admin-subtle)] bg-[var(--admin-surface)] px-3 py-2 text-left transition hover:border-violet-200 hover:bg-violet-50/40"
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      {entry.user.avatarUrl ? (
                                        <Image
                                          src={entry.user.avatarUrl}
                                          alt={entry.user.username}
                                          className="h-8 w-8 rounded-full object-cover"
                                          loading="lazy"
                                          width={32}
                                          height={32}
                                        />
                                      ) : (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--admin-line)] text-[11px] font-semibold text-[var(--admin-secondary)]">
                                          {entry.user.username.slice(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-[var(--admin-ink)]">
                                          {entry.user.username}
                                        </p>
                                        <p className="truncate text-[11px] text-[var(--admin-muted)]">
                                          {entry.user.email}
                                        </p>
                                      </div>
                                    </div>
                                    <span className="text-[11px] font-semibold text-violet-600">
                                      {getPlanLabel(entry.subscriptionPlan)} · {formatMoney(getPurchaseAmount(entry))}
                                    </span>
                                  </Link>
                                </motion.li>
                              ))}
                            </motion.ul>
                          ) : (
                            <div>No purchases yet.</div>
                          )}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(url)}
                      className="inline-flex items-center justify-center rounded-xl border border-[var(--admin-line)] px-3 py-2 text-xs font-semibold text-[var(--admin-secondary)] transition hover:border-[var(--admin-line)] hover:text-[var(--admin-ink)]"
                    >
                      Copy URL
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleArchiveClick(item.id)}
                    disabled={archivingId === item.id}
                    className="admin-archive inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--admin-accent-line)] bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-sm transition hover:text-[var(--admin-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Archive referral link"
                    title="Archive"
                  >
                    {archivingId === item.id ? (
                      <span className="h-2 w-2 animate-spin rounded-full border-2 border-[var(--admin-accent-line)] border-t-transparent" />
                    ) : (
                      <X className="h-2 w-2" />
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      </section>
      <section hidden={section !== 'users'} aria-label="Pro users">
      <div className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-6 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--admin-ink)]">Pro users</h2>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">
              Grant one month of Premium by username.
            </p>
          </div>
          <span className="text-xs text-[var(--admin-muted)]">{proUsers.length} total</span>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <label className="sr-only" htmlFor="premium-user-username">
            Username
          </label>
          <input
            id="premium-user-username"
            type="text"
            autoCapitalize="none"
            spellCheck={false}
            value={premiumUsername}
            onChange={(event) => setPremiumUsername(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault()
                void handleGrantPremium()
              }
            }}
            placeholder="username"
            disabled={isGrantingPremium}
            className="min-w-0 flex-1 rounded-xl border border-[var(--admin-line)] bg-[var(--admin-surface)] px-4 py-2 text-sm text-[var(--admin-ink)] shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <label className="text-xs text-[var(--admin-muted)]" htmlFor="premium-user-message">
            Message shown to the user
          </label>
          <textarea
            id="premium-user-message"
            value={premiumMessage}
            onChange={(event) => setPremiumMessage(event.target.value)}
            placeholder="Write a message to display when the user receives Premium"
            rows={4}
            maxLength={2000}
            disabled={isGrantingPremium}
            className="min-w-0 resize-none rounded-xl border border-[var(--admin-line)] bg-[var(--admin-surface)] px-4 py-2 text-sm text-[var(--admin-ink)] shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => void handleGrantPremium()}
            disabled={isGrantingPremium || !premiumUsername.trim() || !premiumMessage.trim()}
            className="inline-flex items-center justify-center rounded-xl bg-[var(--admin-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--admin-accent-hover)] disabled:cursor-not-allowed disabled:bg-amber-300"
          >
            {isGrantingPremium ? 'Granting...' : 'Grant Premium for 1 month'}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {proUsersLoading ? (
            <div className="text-sm text-[var(--admin-muted)]">Loading pro users...</div>
          ) : proUsers.length === 0 ? (
            <div className="text-sm text-[var(--admin-muted)]">No active pro users yet.</div>
          ) : (
            proUsers.map((entry) => (
              <Link
                key={entry.id}
                href={userProfileHref(entry)}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--admin-line)] bg-[var(--admin-surface)] px-4 py-3 text-sm text-[var(--admin-secondary)] shadow-sm transition hover:border-amber-200 hover:bg-amber-50/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {entry.avatarUrl ? (
                    <Image
                      src={entry.avatarUrl}
                      alt={entry.username}
                      className="h-10 w-10 rounded-full object-cover"
                      loading="lazy"
                      width={40}
                      height={40}
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--admin-line)] text-xs font-semibold text-[var(--admin-secondary)]">
                      {entry.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--admin-ink)]">
                      {entry.username}
                    </p>
                    <p className="truncate text-xs text-[var(--admin-muted)]">{entry.email}</p>
                    {entry.lastSeenAt ? (
                      <p className="text-[11px] text-[var(--admin-muted)]">
                        Last seen {formatShortDate(entry.lastSeenAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                    Pro
                  </span>
                  <span className="text-[11px] text-[var(--admin-muted)]">
                    {entry.proExpiresAt ? `Active until ${formatShortDate(entry.proExpiresAt)}` : 'No expiry'}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      </section>
      <section hidden={section !== 'support'} aria-label="Support messages">
      <div className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-6 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--admin-ink)]">Support messages</h2>
          <span className="text-xs text-[var(--admin-muted)]">{supportMessages.length} total</span>
        </div>

        <div className="mt-4 space-y-4">
          {supportLoading ? (
            <div className="text-sm text-[var(--admin-muted)]">Loading support messages...</div>
          ) : supportMessages.length === 0 ? (
            <div className="text-sm text-[var(--admin-muted)]">No support messages yet.</div>
          ) : (
            supportMessages.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-4 text-sm text-[var(--admin-secondary)] shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-[var(--admin-ink)]">
                      {entry.subject?.trim() || 'No subject'}
                    </p>
                    <p className="text-xs text-[var(--admin-muted)]">
                      {entry.name?.trim() || 'Anonymous'} · {entry.email?.trim() || 'No email'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-[var(--admin-subtle)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                      {entry.status}
                    </span>
                    <p className="mt-1 text-[11px] text-[var(--admin-muted)]">
                      {new Date(entry.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm text-[var(--admin-secondary)]">
                  {entry.message}
                </p>
                {entry.user ? (
                  <div className="mt-3">
                    <Link
                      href={userProfileHref(entry.user)}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--admin-accent-hover)] transition hover:text-[var(--admin-accent-hover)]"
                    >
                      View user profile
                    </Link>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
      </section>
      <NotificationToast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        type={toastType}
      />
    </div>
  )
}
