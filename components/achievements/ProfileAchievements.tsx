'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Star, X } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { useAuthStore } from '@/store/useAuthStore'
import { achievementApi } from '@/lib/achievements/client'
import { RARITIES, type AchievementProfile, type AchievementView } from '@/lib/achievements/definitions'
import { achievementsCopy } from '@/lib/i18n/achievements'
import AchievementBadge from './AchievementBadge'
import CommunityDialog from '@/components/CommunityDialog'

type Filter = keyof typeof achievementsCopy.en.filters
export default function ProfileAchievements({ userId }: { userId: string }) {
  const { language } = useI18n(), copy = achievementsCopy[language]
  const viewer = useAuthStore(s => s.user?.id), token = useAuthStore(s => s.token)
  const owner = viewer === userId
  const params = useSearchParams(), pathname = usePathname(), router = useRouter()
  const expanded = params.get('tab') === 'achievements'
  const requestedFilter = params.get('achievementCategory')
  const filter: Filter = requestedFilter && requestedFilter in copy.filters ? requestedFilter as Filter : 'all'
  const [data, setData] = useState<AchievementProfile | null>(null)
  const [error, setError] = useState(false), [reload, setReload] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false), [saveError, setSaveError] = useState(false), [feedback, setFeedback] = useState('')
  const mutationLock = useRef(false), accountGeneration = useRef(0)

  useEffect(() => {
    const controller = new AbortController()
    accountGeneration.current++
    setData(null); setError(false); setSelected(null); setSaveError(false); setFeedback('')
    const path = userId + (owner ? '?timezone=' + encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone) : '')
    achievementApi<AchievementProfile>(path, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setData(value) })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [userId, token, reload, owner])

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; profile: AchievementProfile }>).detail
      if (owner && detail?.userId === userId && !mutationLock.current) {
        setData(previous => previous ? { ...detail.profile, items: detail.profile.items.map(item => ({
          ...item, featuredOrder: previous.items.find(old => old.id === item.id)?.featuredOrder ?? null,
        })) } : detail.profile)
      }
    }
    window.addEventListener('achievements-updated', listener)
    return () => window.removeEventListener('achievements-updated', listener)
  }, [owner, userId])

  const featured = (data?.items ?? []).filter(item => item.featuredOrder !== null).sort((a, b) => a.featuredOrder! - b.featuredOrder!)
  const unlocked = data?.items.filter(item => item.unlockedAt) ?? []
  const current = data?.items.find(item => item.id === selected)
  const name = (item: AchievementView) => language === 'es' ? item.nameEs : item.name
  const description = (item: AchievementView) => language === 'es' ? item.descriptionEs : item.description
  const date = (value: string) => new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
  const number = (value: number) => new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(value)
  function open(item: AchievementView) {
    setSelected(item.id); setSaveError(false); setFeedback('')
  }
  function close() { setSelected(null) }
  function navigate(next: Filter | null) {
    const query = new URLSearchParams(params.toString())
    query.delete('page')
    if (next === null) { query.set('tab', expanded ? 'projects' : 'achievements'); query.delete('achievementCategory') }
    else { query.set('tab', 'achievements'); next === 'all' ? query.delete('achievementCategory') : query.set('achievementCategory', next) }
    router.replace(pathname + '?' + query.toString(), { scroll: false })
  }
  async function save(ids: string[]) {
    if (mutationLock.current) return
    mutationLock.current = true
    const generation = accountGeneration.current
    setSaving(true); setSaveError(false); setFeedback('')
    try {
      await achievementApi('featured', { method: 'PUT', body: JSON.stringify({ ids }) })
      if (generation !== accountGeneration.current) return
      setData(previous => previous ? { ...previous, items: previous.items.map(item => ({ ...item, featuredOrder: ids.includes(item.id) ? ids.indexOf(item.id) : null })) } : previous)
      setFeedback(copy.saved)
    } catch { if (generation === accountGeneration.current) setSaveError(true) }
    finally { mutationLock.current = false; setSaving(false) }
  }
  function move(id: string, delta: number) {
    const ids = featured.map(item => item.id), index = ids.indexOf(id)
    if (index + delta < 0 || index + delta >= ids.length) return
    ;[ids[index], ids[index + delta]] = [ids[index + delta], ids[index]]
    void save(ids)
  }
  function progress(item: AchievementView) {
    if (item.secret || item.unlockedAt || item.progress === null || item.threshold === null) return null
    if (item.unit === 'rank') return <span className="achievement-progress">
      <span>{item.progress > 0 ? `${copy.bestRank}: #${item.progress} / #${item.threshold}` : copy.noRank}</span>
      <progress value={item.progress > 0 ? Math.min(100, item.threshold / item.progress * 100) : 0} max={100} aria-label={name(item)} />
    </span>
    const value = Math.min(item.progress, item.threshold), percent = Math.min(100, Math.floor(value / item.threshold * 100))
    return <span className="achievement-progress">
      <span>{number(value)} / {number(item.threshold)} {copy.units[item.unit]} <span>{percent}%</span></span>
      <progress value={value} max={item.threshold} aria-label={name(item)} />
    </span>
  }
  const items = (data?.items ?? []).filter(item => filter === 'all' || (filter === 'dailyWeekly' ? ['daily', 'weekly'].includes(item.category) : item.category === filter))
  const preview = unlocked.length ? [...unlocked].sort((a, b) => b.unlockedAt!.localeCompare(a.unlockedAt!)).slice(0, 3) : (data?.items.slice(0, 3) ?? [])
  const visibleItems = expanded ? items : preview
  return <section className="profile-achievements" id="achievements" data-i18n-ignore aria-label={copy.title}>
    <div className="achievement-heading">
      <div><h2>{copy.title}</h2>{data && <small>{unlocked.length} / {data.items.length} {copy.unlocked}</small>}</div>
      <button type="button" className="achievement-text-button" onClick={() => navigate(null)} aria-expanded={expanded}>{expanded ? copy.hide : copy.showAll}</button>
    </div>
    {!data && !error && <div className="achievement-load" role="status">{copy.loading}</div>}
    {error && <div className="achievement-load" role="alert"><p>{copy.error}</p><button type="button" onClick={() => setReload(n => n + 1)}>{copy.retry}</button></div>}
    {!!featured.length && <div className="achievement-featured">
      <p className="achievement-eyebrow">{copy.featured}</p>
      <div className="achievement-featured-grid">
        {featured.map((item, index) => <div key={item.id} className="achievement-featured-item" data-rarity={item.rarity}>
          <button type="button" className="achievement-featured-open" onClick={() => open(item)}>
            <AchievementBadge item={item} /><span><strong>{name(item)}</strong><small>{copy.rarity[item.rarity]}</small></span>
          </button>
          {owner && <div className="achievement-featured-actions">
            <button type="button" title={copy.earlier} aria-label={`${copy.earlier}: ${name(item)}`} disabled={saving || index === 0} onClick={() => move(item.id, -1)}><ArrowLeft size={15} /></button>
            <button type="button" title={copy.later} aria-label={`${copy.later}: ${name(item)}`} disabled={saving || index === featured.length - 1} onClick={() => move(item.id, 1)}><ArrowRight size={15} /></button>
            <button type="button" title={copy.remove} aria-label={`${copy.remove}: ${name(item)}`} disabled={saving} onClick={() => void save(featured.filter(other => other.id !== item.id).map(other => other.id))}><X size={15} /></button>
          </div>}
        </div>)}
      </div>
    </div>}
    {owner && data && !featured.length && <p className="achievement-muted">{copy.choose}</p>}
    {!selected && saveError && <p role="alert">{copy.saveError}</p>}
    <span className="sr-only" role="status">{saving ? copy.saving : feedback}</span>
    {data && <>
      {expanded && <>
      <div className="achievement-rarity-summary">{RARITIES.map(rarity => <span key={rarity} data-rarity={rarity}>{copy.rarity[rarity]} <strong>{unlocked.filter(item => item.rarity === rarity).length}</strong></span>)}</div>
      <div className="achievement-filters" aria-label={copy.title}>{(Object.keys(copy.filters) as Filter[]).map(key => <button key={key} type="button" aria-pressed={filter === key} onClick={() => navigate(key)}>{copy.filters[key]}</button>)}</div>
      </>}
      <div className="achievement-grid">
        {visibleItems.map(item => <button type="button" key={item.id} className="achievement-card" data-rarity={item.rarity} data-locked={!item.unlockedAt} onClick={() => open(item)}>
          <span className="achievement-card-top"><AchievementBadge item={item} /><span className="achievement-rarity">{copy.rarity[item.rarity]}</span>{item.unlockedAt ? <Check size={15} aria-label={copy.earned} /> : <LockKeyhole size={14} aria-hidden="true" />}</span>
          <strong>{name(item)}</strong>
          <span className="achievement-description">{item.secret && !item.unlockedAt ? copy.mystery : description(item)}</span>
          <span className="achievement-card-bottom">{item.unlockedAt ? <small>{copy.earned} {date(item.unlockedAt)}</small> : progress(item)}</span>
        </button>)}
      </div>
      {!visibleItems.length && <p className="achievement-load">{copy.empty}</p>}
    </>}
    <CommunityDialog open={!!current} title={current ? name(current) : copy.title}
      description={current ? (current.secret && !current.unlockedAt ? copy.mystery : description(current)) : undefined}
      variant="achievement" busy={saving} dismissOnBackdrop onClose={close}>
      {current && <div className="achievement-dialog-content">
        <AchievementBadge item={current} />
        <p className="achievement-eyebrow">{copy.rarity[current.rarity]}</p>
        {current.unlockedAt && <p className="achievement-muted">{copy.earned} {date(current.unlockedAt)}</p>}
        {progress(current)}
        {current.percentage !== null && <p className="achievement-muted">{number(current.percentage)}% {copy.by}</p>}
        {owner && current.unlockedAt && <div className="achievement-dialog-feature">
          <button type="button" disabled={saving || (current.featuredOrder === null && featured.length >= 3)} onClick={() => void save(current.featuredOrder !== null ? featured.filter(item => item.id !== current.id).map(item => item.id) : [...featured.map(item => item.id), current.id])}>
            <Star size={16} aria-hidden="true" />{current.featuredOrder !== null ? copy.remove : copy.feature}
          </button>
          {current.featuredOrder === null && featured.length >= 3 && <p className="achievement-muted">{copy.limit}</p>}
          {saveError && <p role="alert">{copy.saveError}</p>}
          <span className="sr-only" role="status">{saving ? copy.saving : feedback}</span>
        </div>}
      </div>}
    </CommunityDialog>
  </section>
}
