import type { Metadata } from 'next'
export function journalMetadata(title: string, description: string, path: string, type: 'profile' | 'article' | 'website' = 'profile'): Metadata {
  const url = `https://pomo-co.work${path}`
  return {
    title,
    description,
    alternates: {
      canonical: url
    },
    robots: {
      index: true,
      follow: true
    },
    openGraph: {
      title,
      description,
      url,
      type,
      siteName: 'Pomo Cowork'
    }
  }
}
export const privateMetadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
}
