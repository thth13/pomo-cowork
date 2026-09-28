'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface DocumentPictureInPicture {
  requestWindow: (options: { width: number; height: number }) => Promise<Window>
}

function getPictureInPicture() {
  return (window as Window & { documentPictureInPicture?: DocumentPictureInPicture })
    .documentPictureInPicture
}

function prepareDocument(pipWindow: Window) {
  const pipDocument = pipWindow.document
  const base = pipDocument.createElement('base')
  base.href = document.baseURI
  pipDocument.head.append(base)

  // Include CSSOM rules too: development styles can be inserted without text nodes.
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const style = pipDocument.createElement('style')
      style.textContent = Array.from(sheet.cssRules, rule => rule.cssText).join('\n')
      pipDocument.head.append(style)
    } catch {
      if (sheet.href) {
        const link = pipDocument.createElement('link')
        link.rel = 'stylesheet'
        link.href = sheet.href
        pipDocument.head.append(link)
      }
    }
  }

  pipDocument.documentElement.dataset.miniTimer = 'true'
  const syncAppearance = () => {
    for (const attribute of ['class', 'style', 'lang', 'dir']) {
      const value = document.documentElement.getAttribute(attribute)
      if (value === null) pipDocument.documentElement.removeAttribute(attribute)
      else pipDocument.documentElement.setAttribute(attribute, value)
    }
    pipDocument.body.className = document.body.className
  }
  syncAppearance()
  const observer = new MutationObserver(syncAppearance)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style', 'lang', 'dir'],
  })
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

export function useDocumentPictureInPicture() {
  const [pipWindow, setPipWindow] = useState<Window | null>(null)
  const [isSupported, setIsSupported] = useState<boolean | null>(null)
  const [isOpening, setIsOpening] = useState(false)
  const [error, setError] = useState<'unsupported' | 'openFailed' | null>(null)
  const windowRef = useRef<Window | null>(null)
  const openingRef = useRef(false)
  const requestRef = useRef(0)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    setIsSupported(window.isSecureContext && !!getPictureInPicture())
    return () => {
      requestRef.current += 1
      cleanupRef.current?.()
      cleanupRef.current = null
      windowRef.current?.close()
      windowRef.current = null
    }
  }, [])

  const close = useCallback(() => {
    windowRef.current?.close()
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const open = useCallback(async () => {
    if (openingRef.current) return
    if (windowRef.current && !windowRef.current.closed) {
      windowRef.current.focus()
      return
    }
    const api = getPictureInPicture()
    if (!window.isSecureContext || !api) {
      setError('unsupported')
      return
    }

    openingRef.current = true
    setIsOpening(true)
    setError(null)
    const request = ++requestRef.current
    let openedWindow: Window | null = null
    try {
      // Keep this before any await: the browser requires the user's click activation.
      openedWindow = await api.requestWindow({ width: 300, height: 180 })
      if (request !== requestRef.current || openedWindow.closed) {
        openedWindow.close()
        return
      }
      const stopSync = prepareDocument(openedWindow)
      const onPageHide = () => {
        cleanupRef.current?.()
        cleanupRef.current = null
        windowRef.current = null
        setPipWindow(null)
      }
      openedWindow.addEventListener('pagehide', onPageHide, { once: true })
      const activeWindow = openedWindow
      cleanupRef.current = () => {
        stopSync()
        activeWindow.removeEventListener('pagehide', onPageHide)
      }
      windowRef.current = openedWindow
      setPipWindow(openedWindow)
    } catch {
      openedWindow?.close()
      if (request === requestRef.current) setError('openFailed')
    } finally {
      openingRef.current = false
      if (request === requestRef.current) setIsOpening(false)
    }
  }, [])

  return { pipWindow, isSupported, isOpening, error, open, close, clearError }
}
