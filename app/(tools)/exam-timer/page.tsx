import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('exam-timer')

export default function Page() {
  return <SeoLandingPage slug="exam-timer" />
}
