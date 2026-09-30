'use client'

import { useEffect, useState } from 'react'
import NotificationToast from '@/components/NotificationToast'
export default function JournalToast() {
  const [message, setMessage] = useState('')
  useEffect(() => {
    const listener = (event: Event) => {
      const value = (event as CustomEvent<unknown>).detail
      if (typeof value === 'string') setMessage(value)
    }
    window.addEventListener('journal-feedback', listener)
    return () => window.removeEventListener('journal-feedback', listener)
  }, [])
  return <NotificationToast message={message} isVisible={Boolean(message)} type="success" onClose={() => setMessage('')} />
}
