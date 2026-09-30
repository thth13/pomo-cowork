import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('pomodoro-for-students')

export default function Page() {
  return <SeoLandingPage slug="pomodoro-for-students" />
}
