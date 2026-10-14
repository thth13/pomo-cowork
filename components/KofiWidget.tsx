'use client'

import { useEffect, useState } from 'react'
import { KoFiPanel } from 'react-kofi'
import CommunityDialog from '@/components/CommunityDialog'
import { useI18n } from '@/components/I18nProvider'
import { gardenCopy } from '@/lib/i18n/garden'
import { useAuthStore } from '@/store/useAuthStore'

const SUPPORT_COLOR = '#52664B'
const SUPPORT_TEXT = 'Support Pomo Cowork'

export default function KofiWidget() {
  const { language } = useI18n()
  const copy = gardenCopy[language]
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const isLoading = useAuthStore((state) => state.isLoading)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || isLoading) return null

  return (
    <>
      <div className="kofi-widget" translate="no">
        <button
          type="button"
          className="kofi-button"
          style={{ backgroundColor: SUPPORT_COLOR }}
          aria-label={copy.supportKofi}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          <span className="kofitext">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://ko-fi.com/img/cup-border.png" className="kofiimg" alt="" />
            {SUPPORT_TEXT}
          </span>
        </button>
      </div>
      <CommunityDialog
        open={open}
        title={copy.supportKofi}
        variant="kofi-support"
        dismissOnBackdrop
        onClose={() => setOpen(false)}
      >
        <KoFiPanel id="V1J428S4EF" />
        <a
          className="kofi-dialog-link"
          href="https://ko-fi.com/V1J428S4EF"
          target="_blank"
          rel="noopener noreferrer"
        >
          {copy.openKofi}
        </a>
      </CommunityDialog>
    </>
  )
}
