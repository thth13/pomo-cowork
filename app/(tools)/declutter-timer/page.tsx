import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('declutter-timer')

export default function Page() {
  return <SeoLandingPage slug="declutter-timer" />
}
