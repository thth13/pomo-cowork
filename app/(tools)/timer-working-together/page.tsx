import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('timer-working-together')

export default function Page() {
  return <SeoLandingPage slug="timer-working-together" />
}
