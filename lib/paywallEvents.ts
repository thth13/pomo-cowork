import { useAuthStore } from '@/store/useAuthStore'

export async function logPaywallEvent(
  event: 'paywall_open' | 'paywall_checkout_click',
  plan?: 'monthly' | 'yearly',
) {
  try {
    const token = useAuthStore.getState().token ?? localStorage.getItem('token')
    const response = await fetch('/api/paywall/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ event, plan, pagePath: window.location.pathname }),
      keepalive: true,
    })
    if (!response.ok) console.error('Could not save paywall event:', response.status)
  } catch (error) {
    // Analytics failures must not interrupt opening the modal or checking out.
    console.error('Could not save paywall event:', error)
  }
}
