'use client'

import { useState, type CSSProperties } from 'react'
import { Orbit } from 'lucide-react'
import type { FocusProject } from '@/lib/statistics'
import { SectionHeading, useStatisticsCopy } from './shared'

const positions = [{ x: 36, y: 47 }, { x: 70, y: 37 }, { x: 64, y: 75 }, { x: 15, y: 76 }, { x: 12, y: 24 }, { x: 86, y: 74 }]

export default function ProjectsGalaxy({ projects }: { projects: FocusProject[] }) {
  const { copy, duration, number } = useStatisticsCopy()
  const [selected, setSelected] = useState(0)
  const name = (project: FocusProject) => project.other ? copy.other : project.name || copy.untitled
  const active = projects[selected] ?? projects[0]
  if (!active) return null
  const description = (project: FocusProject) => `${name(project)} · ${duration(project.minutes)} · ${number(project.sessions)} ${copy.sessions} · ${Math.round(project.share)}% ${copy.share}`
  return <section className="insight-panel insight-galaxy">
    <SectionHeading title={copy.galaxy} caption={copy.galaxyCaption} aside={<span className="insight-tag">{copy.allTime}</span>} />
    <div className="insight-galaxy-layout">
      <div className="insight-galaxy-space" role="group" aria-label={copy.galaxy}>
        <div className="insight-galaxy-orbit" aria-hidden="true" />
        {projects.map((project, i) => <button key={i} type="button" className={`insight-planet insight-planet-${i}`} style={{ '--planet-x': `${positions[i].x}%`, '--planet-y': `${positions[i].y}%`, '--planet-size': `${58 + Math.sqrt(project.share / 100) * 122}px` } as CSSProperties} onClick={() => setSelected(i)} onFocus={() => setSelected(i)} onMouseEnter={() => setSelected(i)} aria-pressed={i === selected} aria-label={description(project)} title={description(project)}><span>{name(project)}</span><strong>{duration(project.minutes)}</strong></button>)}
      </div>
      <div className="insight-galaxy-list"><p className="insight-footnote">{copy.taskSource}</p><ol>{projects.map((project, i) => <li key={i}><button type="button" aria-pressed={i === selected} onClick={() => setSelected(i)}><span className={`insight-project-dot insight-project-dot-${i}`} /><span className="insight-project-name">{name(project)}<small>{number(project.sessions)} {copy.sessions}</small></span><strong>{duration(project.minutes)}<small>{Math.round(project.share)}%</small></strong></button></li>)}</ol></div>
    </div>
    <div className="insight-galaxy-detail" aria-live="polite"><Orbit size={18} aria-hidden="true" /><strong>{name(active)}</strong><span>{duration(active.minutes)} · {number(active.sessions)} {copy.sessions} · {Math.round(active.share)}% {copy.share}</span></div>
  </section>
}
