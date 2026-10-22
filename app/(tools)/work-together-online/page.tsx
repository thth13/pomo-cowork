import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('work-together-online')

export default function Page() {
  return <SeoLandingPage slug="work-together-online" />
}
