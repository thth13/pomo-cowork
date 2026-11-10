import type { Metadata } from 'next'
import Link from 'next/link'
import HomeLink from '@/components/HomeLink'
import JsonLd from '@/components/blog/JsonLd'
import SeoWorkspace from './SeoWorkspace'
import WorkspaceInvite from './WorkspaceInvite'
import LocalStudyTimer from './LocalStudyTimer'
import PracticeLandingPage from './PracticeLandingPage'
import localStyles from './LocalStudyTimer.module.css'
import { spanishSeoPages } from '@/lib/seoSpanishPages'
import { seoPages } from '@/lib/seoPages'
import { localizedSeoPaths, seoToolLabels, type SeoSlug } from '@/lib/seoRoutes'
import { SITE_URL as siteUrl } from '@/lib/site'

export function getSeoMetadata(slug: SeoSlug, language: 'en' | 'es' = 'en'): Metadata {
  const page = language === 'es' ? spanishSeoPages[slug] ?? seoPages[slug] : seoPages[slug]
  const languagePaths = localizedSeoPaths[slug]
  const url = `${siteUrl}${languagePaths?.[language] ?? `/${slug}`}`
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url, ...(languagePaths ? { languages: languagePaths } : {}) },
    robots: { index: true, follow: true },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      type: 'website',
      locale: language === 'es' ? 'es_ES' : 'en_US',
      siteName: 'Pomo Cowork',
      images: [{ url: '/assets/meta/og-main.png', width: 1200, height: 630, alt: language === 'es' ? 'Temporizador Pomodoro para estudiar y trabajar' : 'Pomo Cowork focus timer and shared workspace' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.description,
      images: ['/assets/meta/og-main.png'],
    },
  }
}

export default function SeoLandingPage({ slug, language = 'en' }: { slug: SeoSlug; language?: 'en' | 'es' }) {
  const page = language === 'es' ? spanishSeoPages[slug] ?? seoPages[slug] : seoPages[slug]
  if ('practice' in page) return <PracticeLandingPage slug={slug} page={page} />
  const languagePaths = localizedSeoPaths[slug]
  const url = `${siteUrl}${languagePaths?.[language] ?? `/${slug}`}`
  return (
    <main id="seo-content" data-local-timer={page.localTimer} className={`seo-content${page.minimalGuide ? ' seo-content-minimal-guide' : ''}${page.appearance === 'aesthetic' ? ' seo-content-aesthetic' : ''}${page.localTimer ? ` ${localStyles.page} ${localStyles[page.localTimer]}` : ''}`}>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage', '@id': `${url}#page`, url,
            name: page.title, description: page.description, inLanguage: language,
            about: { '@id': page.localTimer ? `${url}#application` : `${siteUrl}/#application` },
          },
          {
            '@type': 'WebApplication', '@id': page.localTimer ? `${url}#application` : `${siteUrl}/#application`,
            name: page.localTimer ? seoToolLabels[slug] : 'Pomo Cowork', url: page.localTimer ? url : siteUrl,
            applicationCategory: 'ProductivityApplication', operatingSystem: 'Web browser',
            description: language === 'es' || page.localTimer ? page.description : 'An online focus timer with live coworking sessions, tasks, and study rooms.',
          },
          {
            '@type': 'FAQPage', '@id': `${url}#faq`, url: `${url}#faq`, inLanguage: language,
            isPartOf: { '@id': `${url}#page` },
            mainEntity: page.faq.map(({ question, answer }) => ({
              '@type': 'Question', name: question,
              acceptedAnswer: { '@type': 'Answer', text: answer },
            })),
          },
        ],
      }} />
      <header className="seo-hero">
        {languagePaths && <nav aria-label={language === 'es' ? 'Idioma' : 'Language'}>
          <Link href={languagePaths.en} hrefLang="en" lang="en" aria-current={language === 'en' ? 'page' : undefined}>English</Link>
          {' · '}
          <Link href={languagePaths.es} hrefLang="es" lang="es" aria-current={language === 'es' ? 'page' : undefined}>Español</Link>
        </nav>}
        {!page.compactWorkspace && <p className="seo-eyebrow">Pomo Cowork · {language === 'es' ? page.social ? 'Tiempo en compañía' : 'Una tarea a la vez' : page.social ? 'Time together' : 'Make time for one thing'}</p>}
        <h1>{page.heading}</h1>
        <p className="seo-intro">{page.intro}</p>
        {!page.compactWorkspace && <div className="seo-hero-actions">
          <a className="seo-button" href="#focus-timer">{page.cta} <span aria-hidden="true">↓</span></a>
          {page.social && !page.compactWorkspace && <Link className="seo-text-link" href="/rooms">{language === 'es' ? 'Encuentra una sala para tu grupo' : 'Find a room for your group'}</Link>}
        </div>}
      </header>
      {page.localTimer ? <LocalStudyTimer key={slug} variant={page.localTimer} /> : <SeoWorkspace key={slug} title={page.title} defaults={page.defaults} timerNote={page.timerNote} minimalGuide={page.minimalGuide} compactWorkspace={page.compactWorkspace} workspaceTasks={page.workspaceTasks} social={page.social} socialHeading={page.socialHeading} socialCopy={page.socialCopy} appearance={page.appearance} experience={page.experience} />}
      {page.compactWorkspace && !page.minimalGuide && <WorkspaceInvite />}
      <div className="seo-guide">
        <section className="seo-explanation" aria-labelledby="explanation-heading">
          <h2 id="explanation-heading">{page.explanationHeading}</h2>
          {page.explanation.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {page.resources && (
            <div>
              <h3>{page.resourcesHeading ?? (language === 'es' ? 'Materiales de práctica e instrucciones' : 'Practice materials and exam instructions')}</h3>
              {page.resources.map(({ label, url }) => (
                <p key={url}><a className="seo-text-link" href={url}>{label} <span aria-hidden="true">↗</span></a></p>
              ))}
            </div>
          )}
        </section>
        {(!page.minimalGuide || page.showSteps) && <section className="seo-steps" aria-labelledby="steps-heading">
          <h2 id="steps-heading">{page.stepsHeading}</h2>
          <ol>{page.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        </section>}
      </div>
      {!page.minimalGuide && <>
      <section className="seo-section" aria-labelledby="benefits-heading">
        <h2 id="benefits-heading">{language === 'es' ? '¿Por qué usar este temporizador?' : 'Why use this timer?'}</h2>
        <div className="seo-benefits">{page.benefits.map((benefit) => (
          <div key={benefit.title}><h3>{benefit.title}</h3><p>{benefit.text}</p></div>
        ))}</div>
      </section>
      <section className="seo-section seo-audience" aria-labelledby="audience-heading">
        <h2 id="audience-heading">{page.audienceHeading}</h2>
        <dl>{page.audience.map((item) => <div key={item.title}><dt>{item.title}</dt><dd>{item.text}</dd></div>)}</dl>
      </section>
      <section className="seo-advantage" aria-labelledby="advantage-heading">
        <div><p className="seo-eyebrow">{language === 'es' ? 'Qué ofrece Pomo Cowork' : 'The Pomo Cowork difference'}</p><h2 id="advantage-heading">{page.advantageHeading}</h2></div>
        <div><p>{page.advantage}</p><HomeLink className="seo-text-link">{language === 'es' ? 'Explorar el espacio completo' : 'Explore the full workspace'} <span aria-hidden="true">↗</span></HomeLink>{page.social && <Link className="seo-text-link" href="/pricing">{language === 'es' ? 'Ver las opciones de salas y Pro' : 'See room and Pro options'}</Link>}</div>
      </section>
      </>}
      <section id="faq" className="seo-section seo-faq" aria-labelledby="faq-heading">
        <h2 id="faq-heading">{language === 'es' ? `Preguntas frecuentes sobre ${page.keyword.toLowerCase()}` : `Questions about ${page.keyword.toLowerCase()}`}</h2>
        {page.faq.map(({ question, answer }) => (
          <details key={question}>
            <summary><h3>{question}</h3><span className="seo-faq-mark" aria-hidden="true">+</span></summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>
      {language === 'es' ? <nav className="seo-section seo-related" aria-label="Más herramientas de concentración"><h2>Tu espacio para estudiar y trabajar</h2><Link href="/es">Temporizador Pomodoro online y salas de estudio <span aria-hidden="true">↗</span></Link>
        <ul>{page.related.filter(related => localizedSeoPaths[related]).map(related => <li key={related}><Link href={localizedSeoPaths[related]!.es}>{spanishSeoPages[related]?.keyword} <span aria-hidden="true">↗</span></Link></li>)}</ul>
      </nav> : <nav className="seo-section seo-related" aria-labelledby="related-heading">
        <h2 id="related-heading">Find the right space for your next session</h2>
        <ul>{page.related.map((related) => <li key={related}><Link href={`/${related}`}>{seoToolLabels[related]} <span aria-hidden="true">↗</span></Link></li>)}</ul>
      </nav>}
      {!page.minimalGuide && <section className="seo-final" aria-labelledby="final-heading">
        <h2 id="final-heading">{page.finalHeading}</h2>
        <p>{page.finalCopy}</p>
        {page.compactWorkspace ? <HomeLink className="seo-button">{language === 'es' ? 'Abrir el espacio de trabajo' : 'Open workspace'} <span aria-hidden="true">↗</span></HomeLink> : <a className="seo-button" href="#focus-timer">{page.cta} <span aria-hidden="true">↑</span></a>}
      </section>}
    </main>
  )
}
