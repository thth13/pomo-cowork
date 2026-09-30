import type { Metadata } from 'next'
import Link from 'next/link'
import JsonLd from '@/components/blog/JsonLd'
import SeoWorkspace from './SeoWorkspace'
import { seoPages } from '@/lib/seoPages'
import { seoToolLabels, type SeoSlug } from '@/lib/seoRoutes'

const siteUrl = 'https://pomo-co.work'

export function getSeoMetadata(slug: SeoSlug): Metadata {
  const page = seoPages[slug]
  const url = `${siteUrl}/${slug}`
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      type: 'website',
      locale: 'en_US',
      siteName: 'Pomo Cowork',
      images: [{ url: '/assets/meta/og-main.png', width: 1200, height: 630, alt: 'Pomo Cowork focus timer and shared workspace' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.description,
      images: ['/assets/meta/og-main.png'],
    },
  }
}

export default function SeoLandingPage({ slug }: { slug: SeoSlug }) {
  const page = seoPages[slug]
  const url = `${siteUrl}/${slug}`
  return (
    <main id="seo-content" className={`seo-content${page.appearance === 'aesthetic' ? ' seo-content-aesthetic' : ''}`}>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage', '@id': `${url}#page`, url,
            name: page.title, description: page.description, inLanguage: 'en',
            about: { '@id': `${siteUrl}/#application` },
          },
          {
            '@type': 'WebApplication', '@id': `${siteUrl}/#application`,
            name: 'Pomo Cowork', url: siteUrl,
            applicationCategory: 'ProductivityApplication', operatingSystem: 'Web browser',
            description: 'An online focus timer with live coworking sessions, tasks, and study rooms.',
          },
          {
            '@type': 'FAQPage', '@id': `${url}#faq`, url: `${url}#faq`, inLanguage: 'en',
            isPartOf: { '@id': `${url}#page` },
            mainEntity: page.faq.map(({ question, answer }) => ({
              '@type': 'Question', name: question,
              acceptedAnswer: { '@type': 'Answer', text: answer },
            })),
          },
        ],
      }} />
      <header className="seo-hero">
        <p className="seo-eyebrow">Pomo Cowork · {page.social ? 'Time together' : 'Make time for one thing'}</p>
        <h1>{page.heading}</h1>
        <p className="seo-intro">{page.intro}</p>
        <div className="seo-hero-actions">
          <a className="seo-button" href="#focus-timer">{page.cta} <span aria-hidden="true">↓</span></a>
          {page.social && <Link className="seo-text-link" href="/rooms">Find a room for your group</Link>}
        </div>
      </header>
      <SeoWorkspace key={slug} title={page.title} defaults={page.defaults} timerNote={page.timerNote} social={page.social} socialHeading={page.socialHeading} socialCopy={page.socialCopy} appearance={page.appearance} />
      <div className="seo-guide">
        <section className="seo-explanation" aria-labelledby="explanation-heading">
          <h2 id="explanation-heading">{page.explanationHeading}</h2>
          {page.explanation.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {page.resources && (
            <div>
              <h3>Practice materials and exam instructions</h3>
              {page.resources.map(({ label, url }) => (
                <p key={url}><a className="seo-text-link" href={url}>{label} <span aria-hidden="true">↗</span></a></p>
              ))}
            </div>
          )}
        </section>
        <section className="seo-steps" aria-labelledby="steps-heading">
          <h2 id="steps-heading">{page.stepsHeading}</h2>
          <ol>{page.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        </section>
      </div>
      <section className="seo-section" aria-labelledby="benefits-heading">
        <h2 id="benefits-heading">Why use this timer?</h2>
        <div className="seo-benefits">{page.benefits.map((benefit) => (
          <div key={benefit.title}><h3>{benefit.title}</h3><p>{benefit.text}</p></div>
        ))}</div>
      </section>
      <section className="seo-section seo-audience" aria-labelledby="audience-heading">
        <h2 id="audience-heading">{page.audienceHeading}</h2>
        <dl>{page.audience.map((item) => <div key={item.title}><dt>{item.title}</dt><dd>{item.text}</dd></div>)}</dl>
      </section>
      <section className="seo-advantage" aria-labelledby="advantage-heading">
        <div><p className="seo-eyebrow">The Pomo Cowork difference</p><h2 id="advantage-heading">{page.advantageHeading}</h2></div>
        <div><p>{page.advantage}</p><Link className="seo-text-link" href="/">Explore the full workspace <span aria-hidden="true">↗</span></Link>{page.social && <Link className="seo-text-link" href="/pricing">See room and Pro options</Link>}</div>
      </section>
      <section id="faq" className="seo-section seo-faq" aria-labelledby="faq-heading">
        <h2 id="faq-heading">Questions about {page.keyword.toLowerCase()}</h2>
        {page.faq.map(({ question, answer }) => (
          <details key={question}>
            <summary><h3>{question}</h3><span className="seo-faq-mark" aria-hidden="true">+</span></summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>
      <nav className="seo-section seo-related" aria-labelledby="related-heading">
        <h2 id="related-heading">Find the right space for your next session</h2>
        <ul>{page.related.map((related) => <li key={related}><Link href={`/${related}`}>{seoToolLabels[related]} <span aria-hidden="true">↗</span></Link></li>)}</ul>
      </nav>
      <section className="seo-final" aria-labelledby="final-heading">
        <h2 id="final-heading">{page.finalHeading}</h2>
        <p>{page.finalCopy}</p>
        <a className="seo-button" href="#focus-timer">{page.cta} <span aria-hidden="true">↑</span></a>
      </section>
    </main>
  )
}
