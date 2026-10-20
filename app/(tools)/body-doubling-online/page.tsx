import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('body-doubling-online')

export default function Page() {
  return <SeoLandingPage slug="body-doubling-online" />
}
