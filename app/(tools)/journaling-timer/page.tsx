import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('journaling-timer')

export default function Page() {
  return <SeoLandingPage slug="journaling-timer" />
}
