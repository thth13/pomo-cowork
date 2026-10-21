import Link from 'next/link'
import JsonLd from '@/components/blog/JsonLd'
import type { PracticeSeoPage } from '@/lib/seoPracticePages'
import { seoToolLabels, type SeoSlug } from '@/lib/seoRoutes'
import type { PracticeVariant } from '@/lib/practiceTimerConfig'
import PracticeTimer from './PracticeTimer'
import styles from './PracticeLandingPage.module.css'

// Each motif comes from the activity itself; no fabricated results or live data.
function PracticeMotif({ variant }: { variant: PracticeVariant }) {
  return <div className={styles.motif} aria-hidden="true">
    {variant === 'flow' && <svg viewBox="0 0 320 180" focusable="false"><path d="M5 95C45 95 45 30 90 30S135 155 180 155 225 30 270 30 290 95 315 95" /><path d="M5 125C45 125 45 60 90 60S135 175 180 175 225 60 270 60 290 125 315 125" opacity=".35" /></svg>}
    {variant === 'blurt' && <div className={styles.scribble}><span>what I know</span><svg viewBox="0 0 260 100" focusable="false"><path d="m15 25 110-7M24 50l180-8M15 75l90-5m50 9 45 4m-7-67 18 13 32-27" /></svg><em>+ the missing pieces</em></div>}
    {variant === 'recall' && <div className={styles.flashcards}><span>QUESTION</span><strong>Can you explain<br />why?</strong><span>ANSWER AFTER THE ATTEMPT</span></div>}
    {variant === 'spaced' && <div className={styles.visits}><span>Learn</span><i /><span>Return</span><i /><span>Recall</span></div>}
    {variant === 'explain' && <div className={styles.explanationDrawing}><span>one idea</span><svg viewBox="0 0 260 90" focusable="false"><path d="M130 5v30M40 75V35h180v40M30 65l10 10 10-10m70 0 10 10 10-10m70 0 10 10 10-10M130 35v40" /></svg><div><span>why</span><span>how</span><span>example</span></div></div>}
    {variant === 'micro' && <div className={styles.lessonTicket}><span>A SMALL LESSON</span><strong>05 + 03 + 02</strong><span>learn · try · keep</span></div>}
    {variant === 'offline' && <div className={styles.phoneSleeve}><div /><span>back in a little while</span></div>}
    {variant === 'journal' && <div className={styles.journalLines}><span>Today,</span><i /><i /><i /><span>there is room for this.</span></div>}
    {variant === 'tidy' && <div className={styles.sortingBins}><span>keep</span><span>move</span><span>let go</span></div>}
    {variant === 'read' && <div className={styles.bookSpines}><span>one more page</span><span>a quiet hour</span><span>your own pace</span><span>bring a book</span></div>}
  </div>
}

export default function PracticeLandingPage({ slug, page }: { slug: SeoSlug; page: PracticeSeoPage }) {
  const url = `https://pomo-co.work/${slug}`
  return <main id="seo-content" className={`seo-content ${styles.page} ${styles[page.practice]}`} data-local-timer={page.practice} data-practice-timer={page.practice}>
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebPage', '@id': `${url}#page`, url, name: page.title, description: page.description, inLanguage: 'en', about: { '@id': `${url}#application` } },
        { '@type': 'WebApplication', '@id': `${url}#application`, url, name: seoToolLabels[slug], description: page.description, applicationCategory: 'ProductivityApplication', operatingSystem: 'Web browser', isAccessibleForFree: true },
        { '@type': 'FAQPage', '@id': `${url}#faq`, isPartOf: { '@id': `${url}#page` }, mainEntity: page.faq.map(({ question, answer }) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) },
        { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Pomo Cowork', item: 'https://pomo-co.work/' }, { '@type': 'ListItem', position: 2, name: seoToolLabels[slug], item: url }] },
      ],
    }} />
    <header className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.kicker}>{page.eyebrow}</p>
        <h1>{page.heading}</h1>
        <p className={styles.intro}>{page.intro}</p>
        <a className={styles.jump} href="#focus-timer">Open {page.keyword.toLowerCase()} <span aria-hidden="true">↓</span></a>
      </div>
      <PracticeMotif variant={page.practice} />
      <p className={styles.takeaway}>{page.takeaway}</p>
    </header>
    <PracticeTimer key={slug} variant={page.practice} />
    <div className={styles.guideLayout}>
      <article className={styles.guide} aria-label={`${seoToolLabels[slug]} guide`}>
        {page.guide.map(section => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>)}
      </article>
      <aside className={styles.fieldNotes} aria-label="A session to try">
        <section className={styles.method}><h2>{page.stepsHeading}</h2><ol>{page.steps.map(step => <li key={step}>{step}</li>)}</ol></section>
        <section className={styles.example}><h2>{page.example.heading}</h2><p>{page.example.text}</p></section>
        <section className={styles.resources}><h2>Further reading</h2><ul>{page.resources.map(resource => <li key={resource.url}><a href={resource.url}>{resource.label} <span aria-hidden="true">↗</span></a></li>)}</ul></section>
      </aside>
    </div>
    <section id="faq" className={styles.faq} aria-labelledby="practice-faq-heading">
      <h2 id="practice-faq-heading">Before you start</h2>
      {page.faq.map(({ question, answer }) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
    </section>
    <nav className={styles.related} aria-labelledby="practice-related-heading">
      <h2 id="practice-related-heading">Another way to spend the next few minutes</h2>
      <ul>{page.related.map(related => <li key={related}><Link href={`/${related}`}>{seoToolLabels[related]}<span aria-hidden="true">↗</span></Link></li>)}</ul>
    </nav>
    <footer className={styles.pageFooter}><span>Keep this session simple.</span><a href="#focus-timer">Back to the timer ↑</a><Link href="/">Explore Pomo Cowork ↗</Link></footer>
  </main>
}
