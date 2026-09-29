'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { ranksCopy } from '@/lib/i18n/ranks'
import { RANKS, EXPERIENCE_PER_MINUTE, STREAK_BONUS_PER_DAY, MAX_STREAK_BONUS, calculateExperienceReward } from '@/lib/ranks'

export default function RanksGuide() {
  const { language, t } = useI18n()
  const copy = ranksCopy[language]
  const locale = language === 'es' ? 'es-ES' : 'en-US'
  const number = new Intl.NumberFormat(locale)
  const percent = new Intl.NumberFormat(locale, { style: 'percent' })
  const maxBonusDay = Math.ceil(MAX_STREAK_BONUS / STREAK_BONUS_PER_DAY) + 1

  return (
    <main className="ranks-guide" lang={language} data-i18n-ignore>
      <nav className="ranks-nav" aria-label={copy.eyebrow}>
        <Link href="/" className="ranks-link"><ArrowLeft size={15} aria-hidden="true" />{copy.timer}</Link>
        <Link href="/statistics" className="ranks-link">{copy.statistics}<ArrowUpRight size={15} aria-hidden="true" /></Link>
      </nav>
      <header className="ranks-intro">
        <p className="ranks-eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.intro}</p>
      </header>
      <div className="ranks-layout">
        <section className="ranks-ladder" aria-labelledby="all-ranks-title">
          <div className="ranks-ladder-heading"><h2 id="all-ranks-title">{copy.allRanks}</h2><p>{copy.thresholds}</p></div>
          <table>
            <thead><tr><th scope="col">{copy.rank}</th><th scope="col">{copy.experience}</th></tr></thead>
            <tbody>
              {RANKS.map((rank) => (
                <tr key={rank.id}>
                  <th scope="row"><span className="ranks-name"><span className="ranks-swatch" style={{ background: rank.ring }} aria-hidden="true" />{t.todayContribution.ranks[rank.id]}</span></th>
                  <td>{number.format(rank.minExperience)} <span>XP</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ranks-table-note">{copy.note}</p>
        </section>
        <div className="ranks-rules">
          <section aria-labelledby="ranks-earning"><h2 id="ranks-earning">{copy.earningTitle}</h2><p>{copy.earning(EXPERIENCE_PER_MINUTE)}</p><p className="ranks-detail">{copy.rounding}</p></section>
          <section aria-labelledby="ranks-streak"><h2 id="ranks-streak">{copy.streakTitle}</h2><p>{copy.streak(percent.format(STREAK_BONUS_PER_DAY), percent.format(MAX_STREAK_BONUS), maxBonusDay)}</p><p>{copy.streakRules}</p></section>
          <section className="ranks-example" aria-labelledby="ranks-example-title">
            <h3 id="ranks-example-title">{copy.exampleTitle}</h3>
            <dl>
              {[1, 2, maxBonusDay].map((day) => (
                <div key={day}>
                  <dt>{copy.day(day)}</dt>
                  <dd><strong>{number.format(calculateExperienceReward(25, day))} XP</strong><span>{copy.bonus}: {percent.format(Math.min((day - 1) * STREAK_BONUS_PER_DAY, MAX_STREAK_BONUS))}</span></dd>
                </div>
              ))}
            </dl>
          </section>
          <section aria-labelledby="ranks-progress"><h2 id="ranks-progress">{copy.progressTitle}</h2><p>{copy.progress}</p><p>{copy.appearance}</p></section>
        </div>
      </div>
    </main>
  )
}
