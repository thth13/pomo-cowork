'use client'

import HomeLink from '@/components/HomeLink'
import { ArrowLeft } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { leaderboardCopy } from '@/lib/i18n/leaderboard'
import styles from './BackToTimer.module.css'

export default function BackToTimer({ className = '' }: { className?: string }) {
  const { language } = useI18n()
  return <HomeLink className={`${styles.button} ${className}`}>
    <ArrowLeft size={16} aria-hidden="true" />
    {leaderboardCopy[language].backToTimer}
  </HomeLink>
}
