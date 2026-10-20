import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('homework-timer')

export default function Page() {
  return <SeoLandingPage slug="homework-timer" />
}
