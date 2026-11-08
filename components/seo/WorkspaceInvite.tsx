'use client'

import { useEffect, useState } from 'react'
import HomeLink from '@/components/HomeLink'
import { useI18n } from '@/components/I18nProvider'
import AuthModal from '@/components/AuthModal'
import { useAuthStore } from '@/store/useAuthStore'

export default function WorkspaceInvite() {
  const { language } = useI18n()
  const es = language === 'es'
  const [mounted, setMounted] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const isLoading = useAuthStore(state => state.isLoading)

  useEffect(() => setMounted(true), [])

  const signedIn = mounted && isAuthenticated

  return (
    <>
      <section className="seo-workspace-invite" aria-labelledby="workspace-invite-heading">
        <div>
          <h2 id="workspace-invite-heading">{es ? 'Reserva un espacio para concentrarte cada día' : 'Make room for your daily focus'}</h2>
          <p>{es ? 'Guarda tu progreso, organiza tus tareas y estudia en compañía en el espacio completo.' : 'Save your progress, organize tasks, and study together in the full workspace.'}</p>
        </div>
        <div className="seo-workspace-invite-actions">
          {signedIn ? (
            <HomeLink className="seo-button">{es ? 'Abrir el espacio de trabajo' : 'Open workspace'} <span aria-hidden="true">↗</span></HomeLink>
          ) : (
            <>
              <button className="seo-button" type="button" disabled={!mounted || isLoading} onClick={() => setAuthOpen(true)}>{es ? 'Crear una cuenta' : 'Create an account'}</button>
              <HomeLink className="seo-text-link">{es ? 'Explorar el espacio de trabajo' : 'Explore workspace'} <span aria-hidden="true">↗</span></HomeLink>
            </>
          )}
        </div>
      </section>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="register" />
    </>
  )
}
