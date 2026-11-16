'use client'

import PixelSprout from '@/components/PixelSprout'
import { useI18n } from '@/components/I18nProvider'
import styles from './SiteLoader.module.css'

export default function SiteLoader({ fullscreen = false }: { fullscreen?: boolean }) {
  const { t } = useI18n()

  return (
    <div className={`${styles.loader}${fullscreen ? ` ${styles.fullscreen}` : ''}`} role="status" aria-live="polite" aria-label={t.common.loading}>
      <div className={styles.content}>
        <div className={styles.emblem} aria-hidden="true">
          <svg className={styles.dial} viewBox="0 0 160 160" fill="none">
            <circle className={styles.track} cx="80" cy="80" r="68" />
            <circle className={styles.ticks} cx="80" cy="80" r="59" />
            <g className={styles.orbit}>
              <circle className={styles.arc} cx="80" cy="80" r="68" />
              <circle className={styles.dot} cx="80" cy="12" r="3.5" />
            </g>
          </svg>
          <div className={styles.mascot}><PixelSprout happy /></div>
          <span className={styles.shadow} />
        </div>
        <div className={styles.wordmark} aria-hidden="true">pomo<span>.</span></div>
      </div>
    </div>
  )
}
