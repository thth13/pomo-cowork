import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('aesthetic-study-timer')

export default function Page() {
  return <SeoLandingPage slug="aesthetic-study-timer" />
}
