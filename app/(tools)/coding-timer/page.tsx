import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('coding-timer')

export default function Page() {
  return <SeoLandingPage slug="coding-timer" />
}
