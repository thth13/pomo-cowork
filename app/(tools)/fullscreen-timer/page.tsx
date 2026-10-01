import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('fullscreen-timer')

export default function Page() {
  return <SeoLandingPage slug="fullscreen-timer" />
}
