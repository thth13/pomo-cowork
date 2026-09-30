'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Check, LockKeyhole } from 'lucide-react'
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
  const showLocked = params.get('achievementStatus') === 'all'
  const requestedFilter = params.get('achievementCategory')
  const filter: Filter = requestedFilter && requestedFilter in copy.filters ? requestedFilter as Filter : 'all'
  const [data, setData] = useState<AchievementProfile | null>(null)
  const [error, setError] = useState(false), [reload, setReload] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setData(null); setError(false); setSelected(null)
    const path = userId + (owner ? '?timezone=' + encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone) : '')
    achievementApi<AchievementProfile>(path, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setData(value) })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [userId, token, reload, owner])

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; profile: AchievementProfile }>).detail
      if (owner && detail?.userId === userId) {
        setData(detail.profile)
      }
    }
    window.addEventListener('achievements-updated', listener)
    return () => window.removeEventListener('achievements-updated', listener)
  }, [owner, userId])

  const unlocked = (data?.items.filter(item => item.unlockedAt) ?? []).sort((a, b) => b.unlockedAt!.localeCompare(a.unlockedAt!))
  const current = data?.items.find(item => item.id === selected)
  const name = (item: AchievementView) => language === 'es' ? item.nameEs : item.name
  const description = (item: AchievementView) => language === 'es' ? item.descriptionEs : item.description
  const date = (value: string) => new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
  const number = (value: number) => new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(value)
  function open(item: AchievementView) {
    setSelected(item.id)
  }
  function close() { setSelected(null) }
  function navigate(next: Filter | null) {
    const query = new URLSearchParams(params.toString())
    query.delete('page')
    if (next === null) { query.set('tab', expanded ? 'projects' : 'achievements'); query.delete('achievementCategory'); query.delete('achievementStatus') }
    else { query.set('tab', 'achievements'); next === 'all' ? query.delete('achievementCategory') : query.set('achievementCategory', next) }
    router.replace(pathname + '?' + query.toString(), { scroll: false })
  }
  function changeStatus(all: boolean) {
    const query = new URLSearchParams(params.toString())
    all ? query.set('achievementStatus', 'all') : query.delete('achievementStatus')
    query.delete('achievementCategory')
    router.replace(pathname + '?' + query.toString(), { scroll: false })
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
  const items = (showLocked ? data?.items ?? [] : unlocked).filter(item => filter === 'all' || (filter === 'dailyWeekly' ? ['daily', 'weekly'].includes(item.category) : item.category === filter))
  const preview = unlocked.slice(0, 3)
  const visibleItems = expanded ? items : preview
  return <section className="profile-achievements" id="achievements" data-expanded={expanded} data-i18n-ignore aria-label={copy.title}>
    <div className="achievement-heading">
      <div><h2>{expanded ? copy.title : copy.latest}</h2>{expanded && data && <small>{unlocked.length} / {data.items.length} {copy.unlocked}</small>}</div>
      <button type="button" className="achievement-text-button" onClick={() => navigate(null)} aria-expanded={expanded} aria-controls="achievement-list">{expanded ? copy.hide : copy.showEarned}</button>
    </div>
    {!data && !error && <div className="achievement-load" role="status">{copy.loading}</div>}
    {error && <div className="achievement-load" role="alert"><p>{copy.error}</p><button type="button" onClick={() => setReload(n => n + 1)}>{copy.retry}</button></div>}
    {data && <>
      {expanded && <>
      <div className="achievement-filters" role="group" aria-label={copy.statusFilter}>
        <button type="button" aria-pressed={!showLocked} onClick={() => changeStatus(false)}>{copy.earned} ({unlocked.length})</button>
        <button type="button" aria-pressed={showLocked} onClick={() => changeStatus(true)}>{copy.showAll}</button>
      </div>
      <div className="achievement-rarity-summary">{RARITIES.map(rarity => <span key={rarity} data-rarity={rarity}>{copy.rarity[rarity]} <strong>{unlocked.filter(item => item.rarity === rarity).length}</strong></span>)}</div>
      <div className="achievement-filters" aria-label={copy.title}>{(Object.keys(copy.filters) as Filter[]).map(key => <button key={key} type="button" aria-pressed={filter === key} onClick={() => navigate(key)}>{copy.filters[key]}</button>)}</div>
      </>}
      <div id="achievement-list" className={expanded ? 'achievement-grid' : 'achievement-mini-grid'}>
        {visibleItems.map(item => expanded ? <button type="button" key={item.id} className="achievement-card" data-rarity={item.rarity} data-locked={!item.unlockedAt} onClick={() => open(item)}>
          <span className="achievement-card-top"><AchievementBadge item={item} /><span className="achievement-rarity">{copy.rarity[item.rarity]}</span></span>
          <strong>{name(item)}</strong>
          <span className="achievement-description">{item.secret && !item.unlockedAt ? copy.mystery : description(item)}</span>
          <span className="achievement-card-bottom">
            <span className="achievement-status" data-locked={!item.unlockedAt}>
              {item.unlockedAt ? <Check size={14} aria-hidden="true" /> : <LockKeyhole size={14} aria-hidden="true" />}
              {item.unlockedAt ? copy.earned : copy.locked}
            </span>
            {item.unlockedAt ? <small>{date(item.unlockedAt)}</small> : progress(item)}
          </span>
        </button> : <button type="button" key={item.id} className="achievement-mini" data-rarity={item.rarity} onClick={() => open(item)}>
          <AchievementBadge item={item} /><span>{name(item)}</span>
        </button>)}
      </div>
      {!visibleItems.length && <p className="achievement-muted">{!unlocked.length && (!expanded || !showLocked) ? copy.emptyEarned : copy.empty}</p>}
    </>}
    <CommunityDialog open={!!current} title={current ? name(current) : copy.title}
      description={current ? (current.secret && !current.unlockedAt ? copy.mystery : description(current)) : undefined}
      variant="achievement" dismissOnBackdrop onClose={close}>
      {current && <div className="achievement-dialog-content">
        <AchievementBadge item={current} />
        <p className="achievement-eyebrow">{copy.rarity[current.rarity]}</p>
        <p className="achievement-status" data-locked={!current.unlockedAt}>
          {current.unlockedAt ? <Check size={14} aria-hidden="true" /> : <LockKeyhole size={14} aria-hidden="true" />}
          {current.unlockedAt ? `${copy.earned} ${date(current.unlockedAt)}` : copy.locked}
        </p>
        {progress(current)}
        {current.percentage !== null && <p className="achievement-muted">{number(current.percentage)}% {copy.by}</p>}

      </div>}
    </CommunityDialog>
  </section>
}
