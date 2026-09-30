import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('pomodoro-for-remote-work')

export default function Page() {
  return <SeoLandingPage slug="pomodoro-for-remote-work" />
}
