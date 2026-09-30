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
  const items = entries.map(entry => ({
    id: entry.id,
    date: entry.milestone?.achievedAt || entry.publishedAt || startedAt,
    title: entry.milestone?.title || entry.title || 'Project update',
    href: `${base}/posts/${entry.slug}`,
    stats: entry.showFocusStats && entry.milestone ? `${duration(entry.milestone.focusedSecondsSnapshot)} · ${entry.milestone.sessionsSnapshot} sessions` : null
  })).sort((a, b) => b.date.localeCompare(a.date))
  return <section className="journal-card">
    <h2>Project timeline</h2>
    <ol className="journal-timeline">
      {items.map(item => <li key={item.id}>
        <time dateTime={item.date}>{item.date.slice(0, 10)}</time>
        <Link href={item.href}>{item.title}</Link>
        {item.stats && <small>{item.stats}</small>}
      </li>)}
      <li>
        <time dateTime={startedAt}>{startedAt.slice(0, 10)}</time>
        <strong>Project started</strong>
      </li>
    </ol>
  </section>
}
