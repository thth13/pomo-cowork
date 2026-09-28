import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('study-with-me')

export default function Page() {
  return <SeoLandingPage slug="study-with-me" />
}
