import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('animedoro-timer')

export default function Page() {
  return <SeoLandingPage slug="animedoro-timer" />
}
