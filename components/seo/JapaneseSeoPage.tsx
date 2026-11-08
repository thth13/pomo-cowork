import type { Metadata } from 'next'
import Link from 'next/link'
import JsonLd from '@/components/blog/JsonLd'
import JapaneseTimer from './JapaneseTimer'
import { japaneseSeoPages } from '@/lib/japaneseSeoPages'
import { japaneseSeoSlugs, type JapaneseSeoSlug } from '@/lib/japaneseSeoRoutes'

const siteUrl = 'https://pomo-co.work'

export function getJapaneseSeoMetadata(slug: JapaneseSeoSlug): Metadata {
  const page = japaneseSeoPages[slug]
  const url = `${siteUrl}/ja/${slug}`
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title: page.title, description: page.description, url,
      type: 'website', locale: 'ja_JP', siteName: 'Pomo Cowork',
      images: [{ url: '/assets/meta/og-main.png', width: 1200, height: 630, alt: page.label }],
    },
    twitter: { card: 'summary_large_image', title: page.title, description: page.description, images: ['/assets/meta/og-main.png'] },
  }
}

export default function JapaneseSeoPage({ slug }: { slug: JapaneseSeoSlug }) {
  const page = japaneseSeoPages[slug]
  const url = `${siteUrl}/ja/${slug}`
  return <main id="seo-content" className="seo-content ja-content" lang="ja">
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebPage', '@id': `${url}#page`, url, name: page.title, description: page.description, inLanguage: 'ja', mainEntity: { '@id': `${url}#timer` } },
        { '@type': 'WebApplication', '@id': `${url}#timer`, url, name: page.label, description: page.description, inLanguage: 'ja', applicationCategory: 'ProductivityApplication', operatingSystem: 'Web browser', isAccessibleForFree: true },
        { '@type': 'FAQPage', '@id': `${url}#faq`, inLanguage: 'ja', isPartOf: { '@id': `${url}#page` }, mainEntity: page.faq.map(({ question, answer }) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) },
      ],
    }} />
    <header className="seo-hero">
      <p className="ja-eyebrow">無料・登録不要・インストール不要</p>
      <h1>{page.label}</h1>
      <p className="seo-intro">{page.intro}</p>
    </header>
    <section id="timer" className="ja-timer-panel" aria-labelledby="timer-heading">
      <h2 id="timer-heading">{page.timerHeading}</h2>
      <JapaneseTimer key={slug} slug={slug} />
    </section>
    <section className="ja-guide" aria-labelledby="steps-heading">
      <h2 id="steps-heading">使い方</h2>
      <ol>{page.steps.map(step => <li key={step}>{step}</li>)}</ol>
    </section>
    {page.sections.map(section => <section className="ja-guide" key={section.heading}>
      <h2>{section.heading}</h2>
      {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    </section>)}
    <section className="seo-section seo-faq" aria-labelledby="faq-heading">
      <h2 id="faq-heading">よくある質問</h2>
      {page.faq.map(({ question, answer }) => <details key={question}>
        <summary><h3>{question}</h3><span className="seo-faq-mark" aria-hidden="true">+</span></summary>
        <p>{answer}</p>
      </details>)}
    </section>
    <nav className="seo-section ja-related" aria-labelledby="related-heading">
      <h2 id="related-heading">ほかのタイマーを使う</h2>
      <ul>{japaneseSeoSlugs.filter(other => other !== slug).map(other => <li key={other}><Link href={`/ja/${other}`}>{japaneseSeoPages[other].label}</Link></li>)}</ul>
    </nav>
  </main>
}
