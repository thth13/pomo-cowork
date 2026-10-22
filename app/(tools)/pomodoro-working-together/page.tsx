import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('pomodoro-working-together')

export default function Page() {
  return <SeoLandingPage slug="pomodoro-working-together" />
}
