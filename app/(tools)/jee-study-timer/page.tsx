import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('jee-study-timer')

export default function Page() {
  return <SeoLandingPage slug="jee-study-timer" />
}
