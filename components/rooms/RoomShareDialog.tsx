'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Share2, UserPlus } from 'lucide-react'
import CommunityDialog from '@/components/CommunityDialog'
import { useI18n } from '@/components/I18nProvider'
import { roomPageCopy } from '@/lib/i18n/roomPage'
import { RoomPrivacy, type Room } from '@/types'

export default function RoomShareDialog({ room, open, isOwner, onClose, onInvite }: {
  room: Room
  open: boolean
  isOwner: boolean
  onClose: () => void
  onInvite: () => void
}) {
  const { language } = useI18n()
  const copy = roomPageCopy[language]
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [canShare, setCanShare] = useState(false)
  const linkRef = useRef<HTMLInputElement>(null)
  const pending = useRef(false)

  useEffect(() => {
    if (!open) return
    setUrl(new URL(`/rooms/${room.id}`, window.location.origin).href)
    setCanShare(typeof navigator.share === 'function')
    setCopied(false)
    setError('')
  }, [open, room.id])

  async function copyLink() {
    if (pending.current || !url) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setError(copy.copyError)
      linkRef.current?.focus()
      linkRef.current?.select()
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  async function share() {
    if (pending.current || !url) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await navigator.share({ title: room.name, text: `${copy.shareMessage} ${room.name}`, url })
    } catch (cause) {
      if (!(cause instanceof Error && cause.name === 'AbortError')) setError(copy.shareError)
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  return <CommunityDialog open={open} title={copy.shareTitle} description={copy.shareHint} busy={busy} onClose={onClose}>
    <label className="community-field" htmlFor="room-share-link"><span>{copy.link}</span>
      <input id="room-share-link" ref={linkRef} value={url} readOnly onFocus={event => event.currentTarget.select()} />
    </label>
    <p className="community-muted">{room.privacy === RoomPrivacy.PRIVATE ? copy.privateShare : copy.publicShare}</p>
    <div className="community-dialog-actions">
      {canShare && <button type="button" className="community-button" onClick={() => void share()} disabled={busy || !url}><Share2 size={16} aria-hidden="true" />{copy.nativeShare}</button>}
      <button type="button" className="community-button community-button-primary" onClick={() => void copyLink()} disabled={busy || !url} aria-busy={busy}>{copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{copy.copy}</button>
    </div>
    <p role="status" className="room-share-status">{copied ? copy.copied : '\u00a0'}</p>
    {error && <p className="community-error" role="alert">{error}</p>}
    {isOwner && <button type="button" className="community-link" onClick={onInvite} disabled={busy}><UserPlus size={15} aria-hidden="true" />{copy.inviteUsername}</button>}
  </CommunityDialog>
}
