import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('active-recall-timer')

export default function Page() {
  return <SeoLandingPage slug="active-recall-timer" />
}
