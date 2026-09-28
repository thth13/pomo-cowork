import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('pomodoro-timer')

export default function Page() {
  return <SeoLandingPage slug="pomodoro-timer" />
}
