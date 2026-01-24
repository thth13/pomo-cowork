'use client'

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
import { X } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'

interface CreateReferralPayload {
  label?: string
  code?: string
}

const getBaseUrl = () => {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export default function AdminReferralManager() {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore()
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
    } catch (err) {
      setToastType('error')
      setToastMessage(err instanceof Error ? err.message : 'Failed to load referrals')
      setShowToast(true)
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

  if (isLoading) {
    return null
  }

  if (!isAuthenticated) {
    notFound()
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Referral links</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create, track, and manage referral codes for campaigns and partners.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {user ? (
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
              {user.email}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setIsCreateOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200"
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
            className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/70"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Create referral link</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Optional: set a label or custom code (4-32 chars, letters, numbers, _ or -).
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                Label
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Partner or campaign"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-rose-500 dark:focus:ring-rose-500/40"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                Custom code
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-rose-500 dark:focus:ring-rose-500/40"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-xl bg-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-300"
              >
                {isSubmitting ? 'Creating...' : 'Create link'}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Existing links</h2>
          <span className="text-xs text-slate-400">{items.length} total</span>
        </div>

        <div className="mt-4 divide-y divide-slate-200/70 dark:divide-slate-800/80">
          {items.length === 0 ? (
            <div className="py-6 text-sm text-slate-500 dark:text-slate-400">No referral links yet.</div>
          ) : (
            items.map((item) => {
              const url = `${baseUrl}/?ref=${item.code}`
              return (
                <div key={item.id} className="group relative grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-base font-semibold text-slate-900 dark:text-white">
                        {item.label ?? 'Untitled'}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        {item.code}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Earned: {moneyFormatter.format(item.earnedAmount)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Created by {item.createdBy.email}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Unique clicks: {item.clicksCount}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleSignupsToggle(item.id)}
                        className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:border-emerald-800"
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
                        className="flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm transition hover:border-violet-300 hover:text-violet-800 dark:border-violet-900/40 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:border-violet-800"
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
                          className="rounded-xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300"
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
                                    href={`/user/${entry.user.id}`}
                                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white/70 px-3 py-2 text-left transition hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-emerald-900/50"
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      {entry.user.avatarUrl ? (
                                        <img
                                          src={entry.user.avatarUrl}
                                          alt={entry.user.username}
                                          className="h-8 w-8 rounded-full object-cover"
                                          loading="lazy"
                                          width={32}
                                          height={32}
                                        />
                                      ) : (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                                          {entry.user.username.slice(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                          {entry.user.username}
                                        </p>
                                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                          {entry.user.email}
                                        </p>
                                      </div>
                                    </div>
                                    <span className="text-[11px] text-slate-400">
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
                          className="rounded-xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300"
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
                                    href={`/user/${entry.user.id}`}
                                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white/70 px-3 py-2 text-left transition hover:border-violet-200 hover:bg-violet-50/40 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-violet-900/50"
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      {entry.user.avatarUrl ? (
                                        <img
                                          src={entry.user.avatarUrl}
                                          alt={entry.user.username}
                                          className="h-8 w-8 rounded-full object-cover"
                                          loading="lazy"
                                          width={32}
                                          height={32}
                                        />
                                      ) : (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                                          {entry.user.username.slice(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                          {entry.user.username}
                                        </p>
                                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                          {entry.user.email}
                                        </p>
                                      </div>
                                    </div>
                                    <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-300">
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
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:border-slate-700"
                    >
                      Copy URL
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleArchiveClick(item.id)}
                    disabled={archivingId === item.id}
                    className="absolute right-2 top-2 inline-flex h-4 w-4 items-center justify-center rounded-full border border-rose-200 bg-white/90 text-rose-500 opacity-0 shadow-sm transition hover:text-rose-600 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-900/40 dark:bg-slate-950/90 dark:text-rose-300"
                    aria-label="Archive referral link"
                    title="Archive"
                  >
                    {archivingId === item.id ? (
                      <span className="h-2 w-2 animate-spin rounded-full border-2 border-rose-300 border-t-transparent" />
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

      <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Support messages</h2>
          <span className="text-xs text-slate-400">{supportMessages.length} total</span>
        </div>

        <div className="mt-4 space-y-4">
          {supportLoading ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">Loading support messages...</div>
          ) : supportMessages.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">No support messages yet.</div>
          ) : (
            supportMessages.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                      {entry.subject?.trim() || 'No subject'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {entry.name?.trim() || 'Anonymous'} · {entry.email?.trim() || 'No email'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      {entry.status}
                    </span>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {new Date(entry.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                  {entry.message}
                </p>
                {entry.user ? (
                  <div className="mt-3">
                    <Link
                      href={`/user/${entry.user.id}`}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-rose-600 transition hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200"
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
      <NotificationToast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        type={toastType}
      />
    </div>
  )
}
