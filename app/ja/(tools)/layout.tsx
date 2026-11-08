import Link from 'next/link'
import { japaneseSeoSlugs } from '@/lib/japaneseSeoRoutes'
import { japaneseSeoPages } from '@/lib/japaneseSeoPages'
import '../../(tools)/tools.css'
import './japanese-tools.css'

export default function JapaneseToolsLayout({ children }: { children: React.ReactNode }) {
  return <div className="seo-shell ja-shell" lang="ja" data-i18n-ignore>
    <a className="seo-skip" href="#seo-content">本文へ移動</a>
    <header className="seo-header">
      <Link className="seo-brand" href="/ja/pomodoro-timer" aria-label="Pomo Cowork ポモドーロタイマー">Pomo Cowork</Link>
      <nav aria-label="タイマーを選ぶ">{japaneseSeoSlugs.map(slug => <Link key={slug} href={`/ja/${slug}`}>{japaneseSeoPages[slug].label}</Link>)}</nav>
    </header>
    {children}
    <footer className="seo-footer"><p>Pomo Cowork · 勉強と仕事のための無料タイマー</p></footer>
  </div>
}
