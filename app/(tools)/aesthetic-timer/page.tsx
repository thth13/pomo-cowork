import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('aesthetic-timer')

export default function Page() {
  return <SeoLandingPage slug="aesthetic-timer" />
}
