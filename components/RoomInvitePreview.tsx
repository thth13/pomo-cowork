'use client'

import { ArrowRight, DoorOpen, Globe2, Lock, MessageCircle, TrendingUp, Users } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { communityCopy } from '@/lib/i18n/community'

export interface InvitePreview {
  name: string
  privacy: 'PUBLIC' | 'PRIVATE'
  memberCount: number
}

export default function RoomInvitePreview({ room, onAuthenticate }: {
  room: InvitePreview
  onAuthenticate: (mode: 'login' | 'register') => void
}) {
  const { language } = useI18n()
  const copy = communityCopy[language]
  const invite = copy.roomInvitation
  return <div className="room-invitation-preview">
    <header className="room-detail-header">
      <div className="community-intro">
        <div><p className="community-eyebrow"><DoorOpen size={15} aria-hidden="true" />{copy.room}</p><h1>{room.name}</h1>
          <div className="community-actions mt-3">
            <span className="community-badge">{room.privacy === 'PRIVATE' ? <Lock size={12} aria-hidden="true" /> : <Globe2 size={12} aria-hidden="true" />}{room.privacy === 'PRIVATE' ? copy.private : copy.public}</span>
            <span className="community-badge"><Users size={12} aria-hidden="true" />{room.memberCount.toLocaleString(language)} {room.memberCount === 1 ? copy.participant : copy.participantPlural}</span>
          </div>
        </div>
        <span className="community-badge">{invite.preview}</span>
      </div>
    </header>
    <section className="community-panel room-invitation-welcome">
      <div className="room-invitation-emblem" aria-hidden="true"><DoorOpen size={36} strokeWidth={1.5} /></div>
      <div className="room-invitation-copy"><p className="community-eyebrow">{invite.label}</p><h2>{invite.title}</h2><p>{invite.hint}</p></div>
      <div className="room-invitation-actions">
        <button className="community-button community-button-primary" type="button" onClick={() => onAuthenticate('register')}>{invite.register}<ArrowRight size={16} aria-hidden="true" /></button>
        <button className="community-button" type="button" onClick={() => onAuthenticate('login')}>{copy.signIn}</button>
      </div>
    </section>
    <div className="room-invitation-panels">
      {[
        { title: copy.participants, hint: invite.people, Icon: Users },
        { title: copy.chatTab, hint: invite.chat, Icon: MessageCircle },
        { title: copy.weekly, hint: invite.activity, Icon: TrendingUp },
      ].map(({ title, hint, Icon }) => <section className="community-panel room-invitation-panel" key={title}>
        <header className="community-panel-heading"><h2><Icon size={18} aria-hidden="true" />{title}</h2></header>
        <div className="room-invitation-locked"><Lock size={22} strokeWidth={1.5} aria-hidden="true" /><strong>{invite.locked}</strong><p>{hint}</p></div>
      </section>)}
    </div>
  </div>
}
