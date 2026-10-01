import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('aesthetic-pomodoro-timer')

export default function Page() {
  return <SeoLandingPage slug="aesthetic-pomodoro-timer" />
}
