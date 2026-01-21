'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useSocket } from '@/hooks/useSocket'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { checkAuth } = useAuthStore()
  
  // Initialize socket connection at app level
  useSocket()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return <>{children}</>
}
