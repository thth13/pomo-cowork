import { prisma } from '@/lib/db'

const countryNames = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' })

export function getRequestCountry(request: Request): string | null {
  // Only trust the geolocation header when Vercel supplies it at the edge.
  if (process.env.VERCEL !== '1') return null

  const code = request.headers.get('x-vercel-ip-country')?.trim().toUpperCase()
  if (!code || !/^[A-Z]{2}$/.test(code) || ['XX', 'ZZ', 'EU', 'UN'].includes(code)) return null
  return countryNames.of(code) ? code : null
}

export async function recordUserCountry(request: Request, userId: string): Promise<void> {
  const countryCode = getRequestCountry(request)
  // Missing geolocation must not erase a previously detected country.
  if (!countryCode) return

  try {
    await prisma.user.updateMany({
      where: {
        id: userId,
        OR: [{ countryCode: null }, { countryCode: { not: countryCode } }],
      },
      data: { countryCode },
    })
  } catch (error) {
    // Optional geolocation must not prevent sign-in or starting a focus session.
    console.error('Failed to record user country:', error)
  }
}
