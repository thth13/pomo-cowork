import { focusDuration, weekLabel, type WeeklyWrapped } from './analytics'
import { wrappedCopy } from '@/lib/i18n/wrapped'

export async function createShareCard(report: WeeklyWrapped, language: 'en' | 'es'): Promise<File> {
  await document.fonts.ready
  const copy = wrappedCopy[language]
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  // Export palette is the product's canonical light paper palette in DESIGN.md.
  const style = getComputedStyle(document.documentElement)
  const pixelFont = style.getPropertyValue('--font-pixel').trim() || 'monospace'
  ctx.fillStyle = '#fbfaf5'; ctx.fillRect(0, 0, 1080, 1350)
  ctx.fillStyle = '#e1e6d6'; ctx.fillRect(42, 42, 996, 1266)
  ctx.strokeStyle = '#b0b5a6'; ctx.lineWidth = 3; ctx.strokeRect(42, 42, 996, 1266)
  const text = (value: string, y: number, size: number, color = '#303a32', pixel = false) => {
    ctx.fillStyle = color
    ctx.font = `${pixel ? '' : '600 '}${size}px ${pixel ? pixelFont : 'Inter, system-ui, sans-serif'}`
    while (ctx.measureText(value).width > 880 && size > 16) {
      size -= 2
      ctx.font = `${pixel ? '' : '600 '}${size}px ${pixel ? pixelFont : 'Inter, system-ui, sans-serif'}`
    }
    ctx.fillText(value, 100, y)
  }
  text('POMO COWORK', 138, 23, '#647b5b', true)
  text(copy.yourWeek, 280, 34, '#303a32', true)
  text(weekLabel(report, language), 344, 32, '#656d61')
  text(focusDuration(report.totalFocusMinutes), 568, 104, '#b94e3e', true)
  text(copy.focused, 634, 40)
  text(`${report.completedSessions} ${copy.sessions}`, 775, 38)
  text(`${report.longestWeeklyStreak} ${copy.days}`, 842, 38)
  const max = Math.max(...report.days.map(day => day.focusMinutes), 1)
  report.days.forEach((day, i) => {
    const height = 20 + day.focusMinutes / max * 120
    ctx.fillStyle = day.focusMinutes ? '#647b5b' : '#b0b5a6'
    ctx.fillRect(100 + i * 127, 1040 - height, 102, height)
  })
  if (report.percentile !== null) text(`${report.percentile}% ${copy.community}`, 1120, 27)
  text('pomo-co.work', 1225, 29, '#656d61')
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Export failed')), 'image/png'))
  return new File([blob], `pomo-week-${report.weekStart}.png`, { type: 'image/png' })
}
export function downloadCard(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url; link.download = file.name
  document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
