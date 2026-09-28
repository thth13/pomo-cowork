import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('study-with-friends')

export default function Page() {
  return <SeoLandingPage slug="study-with-friends" />
}
