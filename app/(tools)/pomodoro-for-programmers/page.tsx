import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('pomodoro-for-programmers')

export default function Page() {
  return <SeoLandingPage slug="pomodoro-for-programmers" />
}
