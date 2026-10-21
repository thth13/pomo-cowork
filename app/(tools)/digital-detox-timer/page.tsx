import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('digital-detox-timer')

export default function Page() {
  return <SeoLandingPage slug="digital-detox-timer" />
}
