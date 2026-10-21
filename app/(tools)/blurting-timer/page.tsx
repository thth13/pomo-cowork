import SeoLandingPage, { getSeoMetadata } from '@/components/seo/SeoLandingPage'

export const metadata = getSeoMetadata('blurting-timer')

export default function Page() {
  return <SeoLandingPage slug="blurting-timer" />
}
