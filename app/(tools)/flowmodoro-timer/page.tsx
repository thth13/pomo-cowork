import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('flowmodoro-timer')

export default function Page() {
  return <SeoLandingPage slug="flowmodoro-timer" />
}
