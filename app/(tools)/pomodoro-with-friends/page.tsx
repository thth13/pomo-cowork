import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('pomodoro-with-friends')

export default function Page() {
  return <SeoLandingPage slug="pomodoro-with-friends" />
}
