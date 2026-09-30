import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('mcat-study-timer')

export default function Page() {
  return <SeoLandingPage slug="mcat-study-timer" />
}
