// Утилита для работы с Service Worker

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Service Worker not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })
    
    console.log('Service Worker registered:', registration)
    
    // Ждем, пока Service Worker станет активным
    if (registration.active) {
      console.log('Service Worker is active')
    } else if (registration.installing) {
      console.log('Service Worker is installing...')
      await waitForServiceWorker(registration.installing)
    } else if (registration.waiting) {
      console.log('Service Worker is waiting...')
      // Пропускаем ожидающий Service Worker
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      await waitForServiceWorker(registration.waiting)
    }

    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

function waitForServiceWorker(worker: ServiceWorker): Promise<void> {
  return new Promise((resolve) => {
    if (worker.state === 'activated') {
      resolve()
      return
    }

    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') {
        resolve()
      }
    })
  })
}

export function sendMessageToServiceWorker(message: any) {
  if (typeof window === 'undefined' || !navigator.serviceWorker.controller) {
    console.warn('Service Worker controller not available')
    return
  }

  navigator.serviceWorker.controller.postMessage(message)
}

export function listenToServiceWorker(callback: (message: any) => void) {
  if (typeof window === 'undefined') return () => {}

  const handler = (event: MessageEvent) => {
    callback(event.data)
  }

  navigator.serviceWorker.addEventListener('message', handler)

  return () => {
    navigator.serviceWorker.removeEventListener('message', handler)
  }
}

