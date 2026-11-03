'use client'
import { useJournalText } from '@/lib/journal/client'
import Link from 'next/link'
import { duration } from '@/lib/journal/types'
export default function ProjectTimeline({
  startedAt,
  entries,
  base
}: {
  startedAt: string;
  base: string;
  entries: {
    id: string;
    slug: string;
    title: string | null;
    publishedAt: string | null;
    milestone: {
      title: string;
      achievedAt: string;
      focusedSecondsSnapshot: number;
      sessionsSnapshot: number;
    } | null;
    showFocusStats: boolean;
  }[];
}) {
  const t = useJournalText()
  const items = entries.map(entry => ({
    id: entry.id,
    date: entry.milestone?.achievedAt || entry.publishedAt || startedAt,
    title: entry.milestone?.title || entry.title || t('Project update', 'Actualización del proyecto'),
    href: `${base}/posts/${entry.slug}`,
    stats: entry.showFocusStats && entry.milestone ? `${duration(entry.milestone.focusedSecondsSnapshot)} · ${entry.milestone.sessionsSnapshot} sessions` : null
  })).sort((a, b) => b.date.localeCompare(a.date))
  return <section className="journal-card">
    <h2>{t('Project timeline', 'Cronología del proyecto')}</h2>
    <ol className="journal-timeline">
      {items.map(item => <li key={item.id}>
        <time dateTime={item.date}>{item.date.slice(0, 10)}</time>
        <Link href={item.href}>{item.title}</Link>
        {item.stats && <small>{item.stats}</small>}
      </li>)}
      <li>
        <time dateTime={startedAt}>{startedAt.slice(0, 10)}</time>
        <strong>{t('Project started', 'Proyecto iniciado')}</strong>
      </li>
    </ol>
  </section>
}
