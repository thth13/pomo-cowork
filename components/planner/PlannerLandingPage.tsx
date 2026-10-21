import type { Metadata } from 'next'
import Link from 'next/link'
import JsonLd from '@/components/blog/JsonLd'
import StudyPlanner from './StudyPlanner'
import { plannerLabels, plannerPages, plannerSlugs, type PlannerSlug } from '@/lib/plannerPages'
import { seoToolLabels } from '@/lib/seoRoutes'

const siteUrl = 'https://pomo-co.work'

export function getPlannerMetadata(slug: PlannerSlug): Metadata {
  const page = plannerPages[slug]
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

export default function PlannerLandingPage({ slug }: { slug: PlannerSlug }) {
  const page = plannerPages[slug]
  const url = `${siteUrl}/${slug}`

  return (
    <main id="seo-content" className="seo-content planner-page" data-i18n-ignore>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage', '@id': `${url}#page`, url,
            name: page.title, description: page.description, inLanguage: 'en',
            about: { '@id': `${url}#application` },
            breadcrumb: { '@id': `${url}#breadcrumb` },
          },
          {
            '@type': 'WebApplication', '@id': `${url}#application`,
            name: plannerLabels[slug], url, description: page.description,
            applicationCategory: 'ProductivityApplication',
            operatingSystem: 'Web browser', browserRequirements: 'Requires JavaScript',
            isAccessibleForFree: true,
          },
          {
            '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Pomo Cowork', item: siteUrl },
              { '@type': 'ListItem', position: 2, name: plannerLabels[slug], item: url },
            ],
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
        <p className="seo-eyebrow">Pomo Cowork · Planners and templates</p>
        <h1>{page.heading}</h1>
        <p className="seo-intro">{page.intro}</p>
        <div className="seo-hero-actions">
          <a className="seo-button" href="#study-planner">{page.cta} <span aria-hidden="true">↓</span></a>
          <a className="seo-text-link" href="#planner-templates">See planning examples</a>
        </div>
      </header>
      <noscript><p className="seo-intro">Enable JavaScript to build a plan and use its timer. The planning examples and instructions below are available without JavaScript.</p></noscript>
      <StudyPlanner key={slug} mode={page.mode} />
      <div className="seo-guide">
        <section className="seo-explanation" aria-labelledby="explanation-heading">
          <h2 id="explanation-heading">{page.explanationHeading}</h2>
          {page.explanation.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>
        <section className="seo-steps" aria-labelledby="steps-heading">
          <h2 id="steps-heading">{page.stepsHeading}</h2>
          <ol>{page.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        </section>
      </div>
      <section id="planner-templates" className="seo-section" aria-labelledby="templates-heading">
        <h2 id="templates-heading">{page.templatesHeading}</h2>
        <div className="seo-benefits">
          {page.templates.map(({ title, text }) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>
      <section className="seo-section seo-audience" aria-labelledby="tips-heading">
        <h2 id="tips-heading">{page.tipsHeading}</h2>
        <dl>{page.tips.map(({ title, text }) => <div key={title}><dt>{title}</dt><dd>{text}</dd></div>)}</dl>
      </section>
      <section id="faq" className="seo-section seo-faq" aria-labelledby="faq-heading">
        <h2 id="faq-heading">Questions about the {plannerLabels[slug].toLowerCase()}</h2>
        {page.faq.map(({ question, answer }) => (
          <details key={question}>
            <summary><h3>{question}</h3><span className="seo-faq-mark" aria-hidden="true">+</span></summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>
      <nav className="seo-section seo-related" aria-labelledby="related-heading">
        <h2 id="related-heading">Plan the work, then make time for it</h2>
        <ul>
          {plannerSlugs.filter((related) => related !== slug).map((related) => (
            <li key={related}><Link href={`/${related}`}>{plannerLabels[related]} <span aria-hidden="true">↗</span></Link></li>
          ))}
          {page.related.map((related) => (
            <li key={related}><Link href={`/${related}`}>{seoToolLabels[related]} <span aria-hidden="true">↗</span></Link></li>
          ))}
        </ul>
      </nav>
      <section className="seo-final" aria-labelledby="final-heading">
        <h2 id="final-heading">{page.finalHeading}</h2>
        <p>{page.finalCopy}</p>
        <a className="seo-button" href="#study-planner">{page.cta} <span aria-hidden="true">↑</span></a>
      </section>
    </main>
  )
}
