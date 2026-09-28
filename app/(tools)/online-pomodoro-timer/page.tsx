import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('online-pomodoro-timer')

export default function Page() {
  return <SeoLandingPage slug="online-pomodoro-timer" />
}
