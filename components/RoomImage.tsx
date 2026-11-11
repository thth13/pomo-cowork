'use client'

import { useState } from 'react'
import { DoorOpen } from 'lucide-react'

export default function RoomImage({ src, background = false }: { src?: string | null; background?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null)
  if (!src || failed === src) return background ? null : <span className="room-card-symbol"><DoorOpen size={22} aria-hidden="true" /></span>
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading={background ? 'lazy' : undefined} className={background ? 'room-background-image' : 'room-avatar-image'} onError={() => setFailed(src)} />
}
