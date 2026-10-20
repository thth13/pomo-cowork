import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('writing-sprint-timer')

export default function Page() {
  return <SeoLandingPage slug="writing-sprint-timer" />
}
